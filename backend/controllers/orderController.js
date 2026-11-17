const Order = require('../models/Order');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Cart = require('../models/Cart');
const Customer = require('../models/Customer');
const { createPaymentIntent } = require('../services/paymentService');
const { sendOrderConfirmation } = require('../services/emailService');

const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${rand}`;
};

/**
 * @desc    Create New Online Order
 * @route   POST /api/orders
 * @access  Private (Customer)
 */
const createOrder = async (req, res) => {
  try {
    const {
      shippingAddress,
      paymentMethod, // 'COD' or 'ONLINE'
      notes
    } = req.body;

    const customer = await Customer.findOne({ userId: req.user._id });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found' });
    }

    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    // Validate inventory and prepare order items
    const orderItems = [];
    let subtotal = 0;
    let totalGst = 0;
    let totalCost = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.productId._id);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Product ${item.productId.name} is no longer available.` });
      }

      if (product.availableQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.availableQuantity}`
        });
      }

      const itemCost = product.costPrice * item.quantity;
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemGst = (itemSubtotal * (item.gstPercent || 5)) / 100;
      const itemTotal = itemSubtotal + itemGst;

      subtotal += itemSubtotal;
      totalGst += itemGst;
      totalCost += itemCost;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        image: product.images && product.images[0] ? product.images[0] : '',
        size: item.variant.size,
        colour: item.variant.colour,
        quantity: item.quantity,
        costPrice: product.costPrice,
        unitPrice: item.unitPrice,
        gstPercent: item.gstPercent,
        gstAmount: Math.round(itemGst * 100) / 100,
        totalAmount: Math.round(itemTotal * 100) / 100
      });
    }

    const grandTotal = Math.round((subtotal + totalGst) * 100) / 100;
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      orderType: 'ONLINE',
      shopId: cart.shopId,
      customerId: customer._id,
      customerDetails: {
        name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        shippingAddress: shippingAddress || (customer.addresses[0] || {})
      },
      items: orderItems,
      subtotal: Math.round(subtotal * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      grandTotal,
      totalCost: Math.round(totalCost * 100) / 100,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
      orderStatus: 'PLACED',
      notes: notes || ''
    });

    // Deduct Stock and log into Inventory
    for (const item of orderItems) {
      const prod = await Product.findById(item.productId);
      const prevStock = prod.availableQuantity;
      const newStock = Math.max(0, prevStock - item.quantity);
      prod.availableQuantity = newStock;
      await prod.save();

      await Inventory.findOneAndUpdate(
        { productId: item.productId },
        {
          currentStock: newStock,
          $push: {
            stockLogs: {
              type: 'SALE',
              quantity: item.quantity,
              previousStock: prevStock,
              newStock,
              referenceId: order.orderNumber,
              notes: `Online Order: ${order.orderNumber}`
            }
          }
        }
      );
    }

    // Process payment intent
    const paymentResult = await createPaymentIntent({
      orderId: order._id,
      amount: grandTotal,
      customerId: customer._id,
      shopId: cart.shopId,
      paymentMethod
    });

    // Update customer stats
    customer.totalPurchases += 1;
    customer.totalSpent += grandTotal;
    customer.loyaltyPoints += Math.floor(grandTotal / 100);
    await customer.save();

    // Clear user cart
    await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], subtotal: 0, gstAmount: 0, grandTotal: 0 });

    // Send order confirmation email asynchronously
    sendOrderConfirmation(order).catch(e => console.log('Email delivery note:', e.message));

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order,
      payment: paymentResult
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

/**
 * @desc    Get Order By ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
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

/**
 * @desc    Update Order Status (Admin/Staff)
 * @route   PUT /api/orders/:id/status
 * @access  Private (Admin, Staff, Owner)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, trackingNumber, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    // If cancelled, restore stock
    if (orderStatus === 'CANCELLED' && order.orderStatus !== 'CANCELLED') {
      for (const item of order.items) {
        const prod = await Product.findById(item.productId);
        if (prod) {
          const prev = prod.availableQuantity;
          const restored = prev + item.quantity;
          prod.availableQuantity = restored;
          await prod.save();

          await Inventory.findOneAndUpdate(
            { productId: item.productId },
            {
              currentStock: restored,
              $push: {
                stockLogs: {
                  type: 'RETURN',
                  quantity: item.quantity,
                  previousStock: prev,
                  newStock: restored,
                  notes: `Restored from Cancelled Order ${order.orderNumber}`
                }
              }
            }
          );
        }
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${order.orderStatus}`,
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Customer Cancel Order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private (Customer)
 */
const cancelMyOrder = async (req, res) => {
  try {
    const customer = await Customer.findOne({ userId: req.user._id });
    const order = await Order.findOne({ _id: req.params.id, customerId: customer._id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (['SHIPPED', 'DELIVERED'].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: 'Orders that are already shipped cannot be cancelled directly.' });
    }

    order.orderStatus = 'CANCELLED';
    await order.save();

    // Restore stock
    for (const item of order.items) {
      const prod = await Product.findById(item.productId);
      if (prod) {
        prod.availableQuantity += item.quantity;
        await prod.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully. If paid, refund will be processed within 3-5 days.',
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelMyOrder
};
