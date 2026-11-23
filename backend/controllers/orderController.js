const Order = require('../models/Order');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Cart = require('../models/Cart');
const Customer = require('../models/Customer');
const Shop = require('../models/Shop');
const { sendOrderConfirmation } = require('../services/emailService');
const { emitRealtimeUpdate } = require('../utils/realtime');
const { calculatePosBill, roundCurrency } = require('../utils/billingCalculations');

const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${dateStr}-${rand}`;
};

/**
 * @desc    Create New Online Order
 * @route   POST /api/orders
 * @access  Private (Customer)
 */
const createOrder = async (req, res) => {
  const { requestId, shippingAddress, paymentMethod, notes, expectedGrandTotal } = req.body;
  let session;
  const requestKey = typeof requestId === 'string'
    ? `${req.user._id}:${requestId.trim()}`
    : null;

  try {
    if (paymentMethod === 'ONLINE') {
      return res.status(503).json({
        success: false,
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Online payment is unavailable until a verified payment provider is configured. Choose Cash on Delivery.'
      });
    }
    if (paymentMethod !== 'COD') {
      return res.status(400).json({ success: false, message: 'The selected payment method is not supported.' });
    }
    if (typeof requestId !== 'string' || requestId.trim().length < 8 || requestId.length > 64) {
      return res.status(400).json({ success: false, message: 'A valid order request ID is required.' });
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      return res.status(400).json({ success: false, message: 'Order notes must be 500 characters or fewer.' });
    }

    session = await Order.startSession();
    const cleanRequestId = requestKey;
    let order;
    let orderItems;
    let shop;
    let customer;

    await session.withTransaction(async () => {
      customer = await Customer.findOne({ userId: req.user._id }).session(session);
      if (!customer) {
        const error = new Error('Customer record not found.');
        error.statusCode = 404;
        throw error;
      }

      const existingOrder = await Order.findOne({
        requestId: cleanRequestId,
        customerId: customer._id
      }).session(session);
      if (existingOrder) {
        order = existingOrder;
        shop = await Shop.findById(existingOrder.shopId).session(session);
        return;
      }

      const cart = await Cart.findOne({ userId: req.user._id }).session(session);
      if (!cart || cart.items.length === 0) {
        const error = new Error('Your cart is empty.');
        error.statusCode = 400;
        throw error;
      }
      if (!cart.shopId) {
        const error = new Error('The cart is not assigned to a shop.');
        error.statusCode = 409;
        throw error;
      }

      shop = await Shop.findOne({ _id: cart.shopId, isActive: true }).session(session);
      if (!shop) {
        const error = new Error('The shop assigned to this cart is unavailable.');
        error.statusCode = 409;
        throw error;
      }
      const deliverySettings = shop.settings?.deliverySettings;
      if (deliverySettings?.enabled === false) {
        const error = new Error('Home delivery is not currently available for this shop.');
        error.statusCode = 400;
        throw error;
      }

      const productIds = [...new Set(cart.items.map((item) => String(item.productId)))];
      const products = await Product.find({
        _id: { $in: productIds },
        shopId: shop._id,
        isActive: true
      }).session(session);
      const productsById = new Map(products.map((product) => [String(product._id), product]));
      const totals = calculatePosBill({
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        productsById,
        gstEnabled: shop.settings?.gstSettings?.enabled !== false
      });
      orderItems = totals.billItems.map((billItem, index) => {
        const cartItem = cart.items[index];
        const product = productsById.get(String(cartItem.productId));
        return {
          ...billItem,
          image: product.images?.[0] || '',
          size: cartItem.variant?.size || '',
          colour: cartItem.variant?.colour || ''
        };
      });

      let deliveryCharge = 0;
      if (deliverySettings?.enabled === true) {
        const fee = Number(deliverySettings.deliveryCharge);
        const threshold = Number(deliverySettings.freeDeliveryThreshold);
        if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(threshold) || threshold < 0) {
          const error = new Error('The saved delivery settings are invalid.');
          error.statusCode = 500;
          throw error;
        }
        if (!(threshold > 0 && totals.subtotal >= threshold)) {
          deliveryCharge = deliverySettings.chargeType === 'PERCENT'
            ? roundCurrency(totals.subtotal * fee / 100)
            : roundCurrency(fee);
        }
      }
      const grandTotal = roundCurrency(totals.grandTotal + deliveryCharge);
      const expectedTotal = Number(expectedGrandTotal);
      if (!Number.isFinite(expectedTotal) || roundCurrency(expectedTotal) !== grandTotal) {
        const error = new Error('Your cart total changed. Refresh checkout and review the updated price before placing the order.');
        error.statusCode = 409;
        throw error;
      }
      const orderNumber = generateOrderNumber();

      for (const item of orderItems) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            shopId: shop._id,
            isActive: true,
            availableQuantity: { $gte: item.quantity }
          },
          { $inc: { availableQuantity: -item.quantity } },
          { new: true, session }
        );
        if (!updatedProduct) {
          const error = new Error(`Insufficient stock or product availability changed for ${item.productName}.`);
          error.statusCode = 409;
          throw error;
        }

        const inventory = await Inventory.findOne({
          productId: item.productId,
          shopId: shop._id
        }).session(session);
        const previousStock = inventory
          ? Number(inventory.currentStock)
          : Number(updatedProduct.availableQuantity) + item.quantity;
        if (inventory && previousStock < item.quantity) {
          const error = new Error(`Inventory ledger stock is insufficient for ${item.productName}.`);
          error.statusCode = 409;
          throw error;
        }
        const newStock = previousStock - item.quantity;
        const stockLog = {
          type: 'SALE',
          quantity: item.quantity,
          previousStock,
          newStock,
          unitCost: item.costPrice,
          referenceId: orderNumber,
          notes: `Online Order: ${orderNumber}`,
          performedBy: req.user._id
        };
        if (inventory) {
          inventory.currentStock = newStock;
          inventory.stockLogs.push(stockLog);
          await inventory.save({ session });
        } else {
          await Inventory.create([{
            productId: item.productId,
            shopId: shop._id,
            branchId: productsById.get(String(item.productId))?.branchId || null,
            currentStock: newStock,
            costPrice: item.costPrice,
            sellingPrice: item.unitPrice,
            stockLogs: [stockLog]
          }], { session });
        }
      }

      const chosenAddress = shippingAddress ||
        customer.addresses.find((address) => address.isDefault) ||
        customer.addresses[0];
      if (!chosenAddress || !chosenAddress.street || !chosenAddress.city ||
          !chosenAddress.state || !chosenAddress.pincode) {
        const error = new Error('A complete shipping address is required.');
        error.statusCode = 400;
        throw error;
      }

      [order] = await Order.create([{
        requestId: cleanRequestId,
        orderNumber,
        orderType: 'ONLINE',
        shopId: shop._id,
        customerId: customer._id,
        customerDetails: {
          name: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          shippingAddress: chosenAddress
        },
        items: orderItems,
        subtotal: totals.subtotal,
        totalGst: totals.totalGst,
        deliveryCharge,
        shippingFee: deliveryCharge,
        grandTotal,
        totalCost: totals.totalCost,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        paymentDetails: { confirmationMethod: 'cash-on-delivery' },
        orderStatus: 'PLACED',
        invoiceNumber: `INV-${orderNumber}`,
        notes: notes || ''
      }], { session });

      customer.totalPurchases = (customer.totalPurchases || 0) + 1;
      customer.lastPurchaseDate = new Date();
      await customer.save({ session });

      cart.items = [];
      cart.subtotal = 0;
      cart.discountAmount = 0;
      cart.gstAmount = 0;
      cart.deliveryCharge = 0;
      cart.grandTotal = 0;
      await cart.save({ session });
    });

    if (!order) {
      const error = new Error('Order transaction was not completed.');
      error.statusCode = 500;
      throw error;
    }

    if (orderItems) {
      const shopInfo = {
        name: shop.name,
        address: [shop.address?.street, shop.address?.city, shop.address?.state, shop.address?.pincode]
          .filter(Boolean).join(', '),
        phone: shop.contactPhone || '',
        email: shop.contactEmail || '',
        gstNumber: shop.gstNumber || ''
      };
      sendOrderConfirmation(order).catch((error) => {
        console.error('[OrderController] Order confirmation email failed:', error);
      });
      emitRealtimeUpdate(req.app, 'inventory:updated', { items: orderItems });
      res.status(201).json({
        success: true,
        message: 'Order placed successfully. Payment is due on delivery.',
        order,
        shopInfo,
        payment: { status: order.paymentStatus, paymentMethod: order.paymentMethod }
      });
      return;
    }

    const shopInfo = shop ? {
      name: shop.name,
      address: [shop.address?.street, shop.address?.city, shop.address?.state, shop.address?.pincode]
        .filter(Boolean).join(', '),
      phone: shop.contactPhone || '',
      email: shop.contactEmail || '',
      gstNumber: shop.gstNumber || ''
    } : null;
    res.status(200).json({
      success: true,
      message: 'This order request was already completed.',
      order,
      shopInfo,
      payment: { status: order.paymentStatus, paymentMethod: order.paymentMethod },
      duplicate: true
    });
  } catch (error) {
    if (error.code === 11000 && requestKey) {
      try {
        const duplicateCustomer = await Customer.findOne({ userId: req.user._id }).select('_id');
        const existingOrder = duplicateCustomer
          ? await Order.findOne({ requestId: requestKey, customerId: duplicateCustomer._id })
          : null;
        if (existingOrder) {
          const existingShop = await Shop.findById(existingOrder.shopId);
          return res.status(200).json({
            success: true,
            message: 'This order request was already completed.',
            order: existingOrder,
            shopInfo: existingShop ? {
              name: existingShop.name,
              address: [
                existingShop.address?.street,
                existingShop.address?.city,
                existingShop.address?.state,
                existingShop.address?.pincode
              ].filter(Boolean).join(', '),
              phone: existingShop.contactPhone || '',
              email: existingShop.contactEmail || '',
              gstNumber: existingShop.gstNumber || ''
            } : null,
            payment: { status: existingOrder.paymentStatus, paymentMethod: existingOrder.paymentMethod },
            duplicate: true
          });
        }
      } catch (lookupError) {
        console.error('[OrderController] Duplicate order lookup failed:', lookupError);
      }
    }
    const statusCode = Number(error.statusCode) || 500;
    if (statusCode >= 500) console.error('[OrderController] Order transaction failed:', error);
    res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? 'Order could not be completed. No changes were committed.' : error.message
    });
  } finally {
    if (session) await session.endSession();
  }
};

/**
 * @desc    Get Current Customer's Orders
 * @route   GET /api/orders/my-orders
 * @access  Private (Customer)
 */
const getMyOrders = async (req, res) => {
  try {
    const customer = await Customer.findOne({ userId: req.user._id });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found' });
    }

    const orders = await Order.find({ customerId: customer._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrdersForManagement = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role !== 'owner') {
      if (!req.user.shopId) {
        return res.status(403).json({ success: false, message: 'Your account is not assigned to a shop.' });
      }

      filter.shopId = req.user.shopId;
      if (req.user.branchId) filter.branchId = req.user.branchId;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Order By ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
  try {
    let orderQuery;
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ userId: req.user._id }).select('_id');
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }
      orderQuery = Order.findOne({ _id: req.params.id, customerId: customer._id });
    } else if (req.user.role === 'owner') {
      orderQuery = Order.findById(req.params.id);
    } else if (['admin', 'staff'].includes(req.user.role) && req.user.shopId) {
      const filter = { _id: req.params.id, shopId: req.user.shopId };
      if (req.user.branchId) filter.branchId = req.user.branchId;
      orderQuery = Order.findOne(filter);
    } else {
      return res.status(403).json({ success: false, message: 'Your account is not assigned to a shop.' });
    }

    const order = await orderQuery
      .populate('shopId', 'name gstNumber contactEmail contactPhone address')
      .populate('staffId', 'fullName staffId');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const restoreOrderStock = async (order, performedBy, session) => {
  for (const item of order.items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.productId, shopId: order.shopId },
      { $inc: { availableQuantity: item.quantity } },
      { new: true, session }
    );
    if (!product) {
      const error = new Error(`Product "${item.productName}" could not be found while restoring stock.`);
      error.statusCode = 409;
      throw error;
    }

    const inventory = await Inventory.findOne({
      productId: item.productId,
      shopId: order.shopId
    }).session(session);
    const newStock = Number(product.availableQuantity);
    const previousStock = newStock - item.quantity;
    const stockLog = {
      type: 'RETURN',
      quantity: item.quantity,
      previousStock,
      newStock,
      unitCost: item.costPrice || 0,
      referenceId: order.orderNumber,
      notes: `Restored from cancelled order ${order.orderNumber}`,
      performedBy
    };

    if (inventory) {
      inventory.currentStock = Number(inventory.currentStock) + item.quantity;
      inventory.stockLogs.push({
        ...stockLog,
        previousStock: Number(inventory.currentStock) - item.quantity,
        newStock: Number(inventory.currentStock)
      });
      await inventory.save({ session });
    } else {
      await Inventory.create([{
        productId: item.productId,
        shopId: order.shopId,
        branchId: product.branchId || order.branchId || null,
        currentStock: newStock,
        costPrice: item.costPrice || 0,
        sellingPrice: item.unitPrice,
        stockLogs: [stockLog]
      }], { session });
    }
  }

  if (order.requestId && order.customerId) {
    const customer = await Customer.findById(order.customerId).session(session);
    if (customer) {
      customer.totalPurchases = Math.max(0, (customer.totalPurchases || 0) - 1);
      if (order.paymentStatus === 'PAID') {
        customer.totalSpend = Math.max(0, (customer.totalSpend || 0) - order.grandTotal);
        customer.loyaltyPoints = Math.max(
          0,
          (customer.loyaltyPoints || 0) - Math.floor(order.grandTotal / 100)
        );
      }
      await customer.save({ session });
    }
  }
};

/**
 * @desc    Update Order Status (Admin/Staff)
 * @route   PUT /api/orders/:id/status
 * @access  Private (Admin, Staff, Owner)
 */
const updateOrderStatus = async (req, res) => {
  let session;
  try {
    const { orderStatus, trackingNumber, paymentStatus, paymentConfirmed } = req.body;
    const allowedStatuses = ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (orderStatus && !allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: 'Order status is invalid.' });
    }
    if (trackingNumber !== undefined &&
        (typeof trackingNumber !== 'string' || trackingNumber.length > 100)) {
      return res.status(400).json({ success: false, message: 'Tracking number is invalid.' });
    }

    session = await Order.startSession();
    let order;
    await session.withTransaction(async () => {
      const filter = { _id: req.params.id };
      if (req.user.role !== 'owner') {
        if (!req.user.shopId) {
          const error = new Error('Your account is not assigned to a shop.');
          error.statusCode = 403;
          throw error;
        }
        filter.shopId = req.user.shopId;
        if (req.user.branchId) filter.branchId = req.user.branchId;
      }
      order = await Order.findOne(filter).session(session);
      if (!order) {
        const error = new Error('Order not found.');
        error.statusCode = 404;
        throw error;
      }

      if (order.orderStatus === 'CANCELLED' && orderStatus && orderStatus !== 'CANCELLED') {
        const error = new Error('A cancelled order cannot be reopened without placing a new order.');
        error.statusCode = 409;
        throw error;
      }
      if (orderStatus === 'CANCELLED' && order.orderStatus !== 'CANCELLED') {
        if (['SHIPPED', 'DELIVERED'].includes(order.orderStatus)) {
          const error = new Error('An order that has shipped cannot be cancelled through this workflow.');
          error.statusCode = 409;
          throw error;
        }
        if (order.paymentStatus === 'PAID' || paymentStatus === 'PAID') {
          const error = new Error('A paid order cannot be cancelled until a refund is processed.');
          error.statusCode = 409;
          throw error;
        }
        await restoreOrderStock(order, req.user._id, session);
        order.orderStatus = 'CANCELLED';
      } else if (orderStatus) {
        order.orderStatus = orderStatus;
      }
      if (trackingNumber !== undefined) order.trackingNumber = trackingNumber.trim();

      if (paymentStatus && paymentStatus !== order.paymentStatus) {
        if (paymentStatus !== 'PAID' || order.paymentMethod !== 'COD' ||
            order.paymentStatus !== 'PENDING' || order.orderStatus === 'CANCELLED' ||
            paymentConfirmed !== true) {
          const error = new Error('Only received Cash on Delivery payments can be marked paid.');
          error.statusCode = 400;
          throw error;
        }
        order.paymentStatus = 'PAID';
        order.paymentDetails = {
          ...(order.paymentDetails || {}),
          confirmationMethod: 'cod-collected',
          confirmedBy: req.user._id,
          confirmedAt: new Date()
        };
        if (order.customerId) {
          const customer = await Customer.findById(order.customerId).session(session);
          if (customer) {
            customer.totalSpend = (customer.totalSpend || 0) + order.grandTotal;
            customer.loyaltyPoints = (customer.loyaltyPoints || 0) + Math.floor(order.grandTotal / 100);
            await customer.save({ session });
          }
        }
      }
      await order.save({ session });
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${order.orderStatus}`,
      order
    });
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    if (statusCode >= 500) console.error('[OrderController] Order update failed:', error);
    res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? 'Order update could not be completed.' : error.message
    });
  } finally {
    if (session) await session.endSession();
  }
};

/**
 * @desc    Customer Cancel Order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private (Customer)
 */
const cancelMyOrder = async (req, res) => {
  let session;
  try {
    session = await Order.startSession();
    let order;
    let alreadyCancelled = false;
    await session.withTransaction(async () => {
      const customer = await Customer.findOne({ userId: req.user._id }).session(session);
      if (!customer) {
        const error = new Error('Order not found.');
        error.statusCode = 404;
        throw error;
      }
      order = await Order.findOne({
        _id: req.params.id,
        customerId: customer._id
      }).session(session);
      if (!order) {
        const error = new Error('Order not found.');
        error.statusCode = 404;
        throw error;
      }
      if (order.orderStatus === 'CANCELLED') {
        alreadyCancelled = true;
        return;
      }
      if (['SHIPPED', 'DELIVERED'].includes(order.orderStatus)) {
        const error = new Error('Orders that have already shipped cannot be cancelled.');
        error.statusCode = 409;
        throw error;
      }
      if (order.paymentStatus === 'PAID') {
        const error = new Error('A paid order cannot be cancelled until a refund is processed.');
        error.statusCode = 409;
        throw error;
      }
      await restoreOrderStock(order, req.user._id, session);
      order.orderStatus = 'CANCELLED';
      await order.save({ session });
    });

    res.status(200).json({
      success: true,
      message: alreadyCancelled ? 'Order was already cancelled.' : 'Order cancelled successfully.',
      order
    });
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    if (statusCode >= 500) console.error('[OrderController] Order cancellation failed:', error);
    res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? 'Order cancellation could not be completed.' : error.message
    });
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrdersForManagement,
  getOrderById,
  updateOrderStatus,
  cancelMyOrder
};
