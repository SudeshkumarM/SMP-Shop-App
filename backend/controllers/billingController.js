const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Shop = require('../models/Shop');
const QRCode = require('../models/QRCode');
const Branch = require('../models/Branch');
const WhatsAppService = require('../services/whatsappService');
const { generateInvoiceBarcode } = require('../utils/generateBarcode');
const { emitRealtimeUpdate } = require('../utils/realtime');
const { calculatePosBill, roundCurrency } = require('../utils/billingCalculations');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

const generateInvoiceNumber = async (shopPrefix = 'SMP', session) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countQuery = Invoice.countDocuments();
  if (session) countQuery.session(session);
  const count = await countQuery;
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const sequence = String(count + 1).padStart(4, '0');
  return `${shopPrefix}-INV-${dateStr}-${sequence}-${randomSuffix}`;
};

const resolveBillingContext = async (user, session) => {
  const staffQuery = Staff.findOne({ userId: user._id, isActive: true });
  if (session) staffQuery.session(session);
  const staff = await staffQuery;
  const assignedShopId = user.shopId || staff?.shopId;

  let shopQuery;
  if (assignedShopId) {
    shopQuery = Shop.findOne({ _id: assignedShopId, isActive: true });
  } else if (user.role === 'owner') {
    shopQuery = Shop.findOne({ ownerId: user._id, isActive: true }).sort({ createdAt: 1, _id: 1 });
  } else {
    shopQuery = Shop.findOne({ isActive: true }).sort({ createdAt: 1, _id: 1 });
  }
  if (session) shopQuery.session(session);
  const shop = await shopQuery;

  const branchId = user.branchId || staff?.branchId;
  let branch = null;
  if (shop && branchId) {
    const branchQuery = Branch.findOne({ _id: branchId, shopId: shop._id, isActive: true });
    if (session) branchQuery.session(session);
    branch = await branchQuery;
  }

  return { shop, staff, branch };
};

const formatAddress = (address = {}) => (
  [address.street, address.city, address.state, address.pincode, address.country]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ')
);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getDeliveryCharge = (settings, subtotal, requested) => {
  if (!requested) return 0;
  const delivery = settings || {};
  if (delivery.enabled !== true) {
    const error = new Error('Home delivery is not enabled for this shop.');
    error.statusCode = 400;
    throw error;
  }

  const fee = Number(delivery.deliveryCharge);
  const threshold = Number(delivery.freeDeliveryThreshold);
  if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(threshold) || threshold < 0) {
    const error = new Error('The saved delivery settings are invalid. Please contact an administrator.');
    error.statusCode = 500;
    throw error;
  }
  if (threshold > 0 && subtotal >= threshold) return 0;
  return roundCurrency(delivery.chargeType === 'PERCENT' ? subtotal * fee / 100 : fee);
};

const isValidPaymentQrImage = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) return false;
  const value = imageUrl.trim();
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const getBillingSettings = async (req, res) => {
  try {
    const { shop, staff, branch } = await resolveBillingContext(req.user);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No active shop is assigned to this account.' });
    }

    res.status(200).json({
      success: true,
      settings: {
        gstEnabled: shop.settings?.gstSettings?.enabled !== false,
        delivery: {
          enabled: shop.settings?.deliverySettings?.enabled === true,
          deliveryCharge: Number(shop.settings?.deliverySettings?.deliveryCharge) || 0,
          freeDeliveryThreshold: Number(shop.settings?.deliverySettings?.freeDeliveryThreshold) || 0,
          chargeType: shop.settings?.deliverySettings?.chargeType === 'PERCENT' ? 'PERCENT' : 'FLAT',
          description: shop.settings?.deliverySettings?.description || ''
        }
      },
      shopInfo: {
        name: shop.name,
        address: formatAddress(branch?.address || shop.address),
        phone: branch?.phone || shop.contactPhone || '',
        email: branch?.email || shop.contactEmail || '',
        gstNumber: shop.gstNumber || ''
      },
      branchInfo: branch ? {
        name: branch.name,
        address: formatAddress(branch.address),
        phone: branch.phone || '',
        email: branch.email || ''
      } : null,
      staffInfo: staff ? { fullName: staff.fullName, staffId: staff.staffId } : null
    });
  } catch (error) {
    console.error('[BillingController] Could not load billing settings:', error);
    res.status(500).json({ success: false, message: 'Billing settings could not be loaded.' });
  }
};

const getBillingPaymentQrs = async (req, res) => {
  try {
    const { shop } = await resolveBillingContext(req.user);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No active shop is assigned to this account.' });
    }

    const savedPaymentQrs = await QRCode.find({
      shopId: shop._id,
      qrType: 'PAYMENT',
      status: 'ACTIVE'
    })
      .select('title targetName qrData imageUrl description createdAt')
      .sort({ createdAt: -1 })
      .lean();
    const paymentQrs = savedPaymentQrs.map((qr) => ({
      ...qr,
      imageUrl: isValidPaymentQrImage(qr.imageUrl) ? qr.imageUrl.trim() : ''
    })).filter((qr) => qr.imageUrl || (typeof qr.qrData === 'string' && qr.qrData.trim()));

    res.status(200).json({
      success: true,
      shopName: shop.name,
      paymentQrs
    });
  } catch (error) {
    console.error('[BillingController] Could not load payment QR settings:', error);
    res.status(500).json({ success: false, message: 'Payment QR settings could not be loaded.' });
  }
};

const lookupProductPOS = async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code || code.length > 128) {
      return res.status(400).json({ success: false, message: 'Enter a valid product barcode or SKU.' });
    }

    const { shop, staff } = await resolveBillingContext(req.user);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No active shop is assigned to this account.' });
    }
    if (req.user.role === 'staff' && !staff) {
      return res.status(403).json({ success: false, message: 'The active staff profile could not be found.' });
    }

    const product = await Product.findOne({
      shopId: shop._id,
      isActive: true,
      $or: [
        { barcode: { $regex: `^${escapeRegex(code)}$`, $options: 'i' } },
        { sku: code.toUpperCase() },
        { qrCodeData: code }
      ]
    }).select('name sku barcode sellingPrice gstPercent availableQuantity sizes colours images').lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('[BillingController] POS barcode lookup failed:', error);
    return res.status(500).json({ success: false, message: 'Product lookup could not be completed.' });
  }
};

/**
 * @desc    Search Product for POS Billing (by Barcode, SKU, or Name)
 * @route   GET /api/billing/search-product
 * @access  Private (Staff, Admin, Owner)
 */
const searchProductPOS = async (req, res) => {
  try {
    const { query } = req.query;
    const { shop } = await resolveBillingContext(req.user);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No active shop is assigned to this account.' });
    }

    const filter = { shopId: shop._id, isActive: true };
    if (query && String(query).trim()) {
      const cleanQuery = String(query).trim();
      const escapedQuery = escapeRegex(cleanQuery);
      filter.$or = [
        { barcode: cleanQuery },
        { sku: cleanQuery.toUpperCase() },
        { name: { $regex: escapedQuery, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).limit(10);
    res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('[BillingController] POS product search failed:', error);
    res.status(500).json({ success: false, message: 'Products could not be searched.' });
  }
};

/**
 * @desc    Create POS Billing Transaction & Generate Invoice with Atomic Stock Updates
 * @route   POST /api/billing/create-bill
 * @access  Private (Staff, Admin, Owner)
 */
const createBillingTransaction = async (req, res) => {
  const { requestId } = req.body;
  let session;
  const requestKey = typeof requestId === 'string'
    ? `${req.user._id}:${requestId.trim()}`
    : null;

  try {
    const {
      items,
      discountType = 'flat',
      discountValue = 0,
      hasDelivery = false,
      customerPhone,
      customerName,
      customerEmail,
      paymentMethod = 'POS_CASH'
    } = req.body;

    if (typeof requestId !== 'string' || requestId.trim().length < 8 || requestId.length > 64) {
      return res.status(400).json({ success: false, message: 'A valid billing request ID is required.' });
    }
    const rawExpectedGrandTotal = req.body.expectedGrandTotal;
    const expectedGrandTotal = Number(rawExpectedGrandTotal);
    if (
      !['number', 'string'].includes(typeof rawExpectedGrandTotal) ||
      String(rawExpectedGrandTotal).trim() === '' ||
      !Number.isFinite(expectedGrandTotal) ||
      expectedGrandTotal < 0
    ) {
      return res.status(400).json({ success: false, message: 'A valid expected payment amount is required.' });
    }
    if (!['POS_CASH', 'POS_CARD', 'POS_UPI', 'POS_UPI_QR'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'The selected payment method is not supported.' });
    }
    if (req.body.paymentReference !== undefined && typeof req.body.paymentReference !== 'string') {
      return res.status(400).json({ success: false, message: 'Payment reference must be text.' });
    }
    const paymentReference = String(req.body.paymentReference || '').trim();
    if (paymentReference.length > 128) {
      return res.status(400).json({ success: false, message: 'Payment reference must be 128 characters or fewer.' });
    }
    if (['POS_UPI', 'POS_UPI_QR'].includes(paymentMethod) && !paymentReference) {
      return res.status(400).json({ success: false, message: 'Enter the UPI transaction reference before completing the bill.' });
    }
    if (paymentMethod === 'POS_UPI_QR' && !mongoose.Types.ObjectId.isValid(req.body.paymentQrId)) {
      return res.status(400).json({ success: false, message: 'Select an active Owner-configured payment QR.' });
    }
    if (!Array.isArray(items) || items.length === 0 || items.some((item) => (
      !item || !mongoose.Types.ObjectId.isValid(item.productId)
    ))) {
      return res.status(400).json({ success: false, message: 'The bill must contain valid product selections.' });
    }
    if (typeof hasDelivery !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Delivery selection is invalid.' });
    }
    if (typeof customerName !== 'string' || !customerName.trim() || customerName.trim().length > 120) {
      return res.status(400).json({ success: false, message: 'A valid customer name is required.' });
    }
    const normalizedPhone = String(customerPhone || '').replace(/[^\d+]/g, '');
    if (!/^\+?\d{10,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'A valid customer phone number is required.' });
    }
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customerEmail).trim())) {
      return res.status(400).json({ success: false, message: 'Customer email address is invalid.' });
    }

    session = await Invoice.startSession();
    let order;
    let invoice;
    let shop;
    let customer;
    let staff;
    let paymentQr;
    let billItems;
    const cleanRequestId = requestKey;

    await session.withTransaction(async () => {
      const existingInvoice = await Invoice.findOne({ requestId: cleanRequestId }).session(session);
      if (existingInvoice) {
        if (roundCurrency(expectedGrandTotal) !== roundCurrency(existingInvoice.grandTotal)) {
          const error = new Error('This billing request ID was already used for a different payment amount.');
          error.statusCode = 409;
          throw error;
        }
        invoice = existingInvoice;
        order = existingInvoice.orderId
          ? await Order.findById(existingInvoice.orderId).session(session)
          : null;
        return;
      }

      const context = await resolveBillingContext(req.user, session);
      ({ shop, staff } = context);
      if (!shop) {
        const error = new Error('No active shop is assigned to this account.');
        error.statusCode = 404;
        throw error;
      }
      if (req.user.role === 'staff' && !staff) {
        const error = new Error('The active staff profile could not be found.');
        error.statusCode = 403;
        throw error;
      }
      if (paymentMethod === 'POS_UPI_QR') {
        paymentQr = await QRCode.findOne({
          _id: req.body.paymentQrId,
          shopId: shop._id,
          qrType: 'PAYMENT',
          status: 'ACTIVE'
        }).session(session);
        if (!paymentQr || (!isValidPaymentQrImage(paymentQr.imageUrl) && !String(paymentQr.qrData || '').trim())) {
          const error = new Error('The selected payment QR is no longer available. Refresh payment settings and try again.');
          error.statusCode = 409;
          throw error;
        }
      }

      const productIds = [...new Set(items.map((item) => String(item.productId || '')))];
      const productsQuery = Product.find({
        _id: { $in: productIds },
        shopId: shop._id,
        isActive: true
      }).session(session);
      const products = await productsQuery;
      const productsById = new Map(products.map((product) => [String(product._id), product]));
      const totals = calculatePosBill({
        items,
        productsById,
        discountType,
        discountValue,
        gstEnabled: shop.settings?.gstSettings?.enabled !== false
      });
      totals.deliveryCharge = getDeliveryCharge(
        shop.settings?.deliverySettings,
        totals.subtotal,
        hasDelivery === true
      );
      totals.grandTotal = roundCurrency(
        totals.subtotal - totals.totalDiscount + totals.totalGst + totals.deliveryCharge
      );
      const grandTotal = totals.grandTotal;

      if (roundCurrency(expectedGrandTotal) !== grandTotal) {
        const error = new Error('The bill total changed. Refresh the products and confirm the payment amount again.');
        error.statusCode = 409;
        throw error;
      }

      if (paymentMethod === 'POS_CASH') {
        if (
          req.body.amountReceived === undefined ||
          req.body.amountReceived === null ||
          req.body.amountReceived === ''
        ) {
          const error = new Error('Enter the amount received before completing the bill.');
          error.statusCode = 400;
          throw error;
        }
        const rawReceivedAmount = req.body.amountReceived;
        const received = Number(rawReceivedAmount);
        if (
          !['number', 'string'].includes(typeof rawReceivedAmount) ||
          String(rawReceivedAmount).trim() === '' ||
          !Number.isFinite(received) ||
          received < grandTotal
        ) {
          const error = new Error('Amount received must cover the total payable.');
          error.statusCode = 400;
          throw error;
        }
      } else if (req.body.paymentConfirmed !== true) {
        const error = new Error('Confirm that payment was received before completing this bill.');
        error.statusCode = 400;
        throw error;
      }

      const branchId = context.branch?._id || null;
      customer = await Customer.findOne({ phone: normalizedPhone }).session(session);
      const customerInfo = {
        name: customerName.trim(),
        phone: normalizedPhone,
        email: String(customerEmail || customer?.email || '').trim(),
        address: 'In-Store Counter Terminal'
      };
      const invoiceNumber = await generateInvoiceNumber(shop.settings?.invoicePrefix || 'SMP', session);
      const orderNumber = `POS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      for (const item of totals.billItems) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            shopId: shop._id,
            availableQuantity: { $gte: item.quantity },
            isActive: true
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
          referenceId: invoiceNumber,
          notes: `POS Bill: ${invoiceNumber}`,
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
            branchId,
            currentStock: newStock,
            costPrice: item.costPrice,
            sellingPrice: item.unitPrice,
            stockLogs: [stockLog]
          }], { session });
        }
      }

      const paymentDetails = {
        amount: grandTotal,
        confirmationMethod: paymentMethod === 'POS_CASH' ? 'cash-received' : 'cashier-verified',
        confirmedBy: req.user._id,
        confirmedAt: new Date()
      };
      if (paymentReference) paymentDetails.transactionRef = paymentReference;
      if (paymentQr) {
        paymentDetails.paymentQrId = paymentQr._id;
        paymentDetails.paymentQrTitle = paymentQr.title;
      }
      if (paymentMethod === 'POS_CASH') {
        paymentDetails.amountReceived = roundCurrency(Number(req.body.amountReceived));
        paymentDetails.changeDue = roundCurrency(paymentDetails.amountReceived - grandTotal);
      }

      [order] = await Order.create([{
        orderNumber,
        orderType: 'POS',
        shopId: shop._id,
        branchId,
        staffId: staff?._id || null,
        customerId: customer?._id || null,
        customerDetails: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email
        },
        items: totals.billItems,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        totalGst: totals.totalGst,
        deliveryCharge: totals.deliveryCharge,
        shippingFee: totals.deliveryCharge,
        grandTotal,
        totalCost: totals.totalCost,
        paymentMethod,
        paymentStatus: 'PAID',
        paymentDetails,
        orderStatus: 'DELIVERED',
        invoiceNumber
      }], { session });

      [invoice] = await Invoice.create([{
        requestId: cleanRequestId,
        invoiceNumber,
        orderId: order._id,
        shopId: shop._id,
        branchId,
        staffId: staff?._id || null,
        customerId: customer?._id || null,
        shopInfo: {
          name: shop.name,
          address: formatAddress(context.branch?.address || shop.address),
          phone: context.branch?.phone || shop.contactPhone || '',
          email: context.branch?.email || shop.contactEmail || '',
          gstNumber: shop.gstNumber || ''
        },
        branchInfo: context.branch ? {
          name: context.branch.name,
          address: formatAddress(context.branch.address),
          phone: context.branch.phone || '',
          email: context.branch.email || ''
        } : undefined,
        staffInfo: staff ? { fullName: staff.fullName, staffId: staff.staffId } : undefined,
        customerInfo,
        items: totals.billItems,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        deliveryCharge: totals.deliveryCharge,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: 0,
        grandTotal,
        paymentMethod,
        paymentStatus: 'PAID',
        paymentDetails,
        deliveryStatus: 'PENDING',
        barcode: generateInvoiceBarcode(invoiceNumber),
        printedCount: 1
      }], { session });

      if (staff) {
        staff.totalBillsGenerated = (staff.totalBillsGenerated || 0) + 1;
        staff.totalSalesValue = (staff.totalSalesValue || 0) + grandTotal;
        await staff.save({ session });
      }

      if (customer) {
        customer.totalPurchases = (customer.totalPurchases || 0) + 1;
        customer.totalSpend = (customer.totalSpend || 0) + grandTotal;
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + Math.floor(grandTotal / 100);
        customer.lastPurchaseDate = new Date();
        await customer.save({ session });
      }
      billItems = totals.billItems;
    });

    if (!invoice) {
      return res.status(500).json({ success: false, message: 'Bill transaction was not completed.' });
    }

    let notificationResult = null;
    if (billItems && (!invoice.deliveryStatus || invoice.deliveryStatus === 'PENDING')) {
      try {
        notificationResult = await WhatsAppService.sendBillNotificationWithFallback({
          phone: normalizedPhone,
          customerName: customerName.trim(),
          invoiceNumber: invoice.invoiceNumber,
          grandTotal: invoice.grandTotal,
          itemCount: (invoice.items || []).reduce((sum, item) => sum + item.quantity, 0),
          paymentMethod,
          shopId: invoice.shopId,
          sentBy: req.user._id,
          customerId: invoice.customerId
        });
        if (notificationResult?.deliveryStatus) {
          invoice.deliveryStatus = notificationResult.deliveryStatus;
          try {
            await invoice.save();
          } catch (saveError) {
            console.error('[BillingController] Could not persist invoice notification status:', saveError);
            notificationResult.statusPersistenceFailed = true;
          }
        }
      } catch (notificationError) {
        console.error('[BillingController] Notification error:', notificationError);
        notificationResult = { deliveryStatus: 'Failed' };
        invoice.deliveryStatus = 'Failed';
        try {
          await invoice.save();
        } catch (saveError) {
          console.error('[BillingController] Could not persist failed invoice notification status:', saveError);
          notificationResult.statusPersistenceFailed = true;
        }
      }
    }

    if (billItems) {
      emitRealtimeUpdate(req.app, 'inventory:updated', { billItems, invoiceNumber: invoice.invoiceNumber });
      emitRealtimeUpdate(req.app, 'bill:created', { invoice });
    }

    res.status(billItems ? 201 : 200).json({
      success: true,
      message: billItems ? 'Billing completed and invoice generated successfully.' : 'This billing request was already completed.',
      invoice,
      order,
      deliveryStatus: notificationResult?.deliveryStatus || invoice.deliveryStatus || 'Skipped',
      notificationChannel: notificationResult?.channel || 'None',
      notificationStatusPersistenceFailed: notificationResult?.statusPersistenceFailed || false,
      duplicate: !billItems
    });
  } catch (error) {
    if (error.code === 11000 && requestKey) {
      try {
        const existingInvoice = await Invoice.findOne({ requestId: requestKey });
        if (existingInvoice) {
          const existingOrder = existingInvoice.orderId
            ? await Order.findById(existingInvoice.orderId)
            : null;
          return res.status(200).json({
            success: true,
            message: 'This billing request was already completed.',
            invoice: existingInvoice,
            order: existingOrder,
            deliveryStatus: existingInvoice.deliveryStatus || 'Skipped',
            duplicate: true
          });
        }
      } catch (lookupError) {
        console.error('[BillingController] Duplicate billing lookup failed:', lookupError);
      }
    }
    const statusCode = Number(error.statusCode) || 500;
    if (statusCode >= 500) {
      console.error('[BillingController] Billing transaction failed:', error);
    }
    res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? 'Billing could not be completed. No changes were committed.' : error.message
    });
  } finally {
    if (session) await session.endSession();
  }
};

/**
 * @desc    Verify QR Payment Reference & Complete Billing
 * @route   POST /api/billing/verify-qr-payment
 * @access  Private (Staff, Admin, Owner)
 */
const verifyQrPaymentAndBill = async (req, res) => {
  return res.status(503).json({
    success: false,
    code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
    message: 'QR payment cannot be completed until a payment provider is configured.'
  });
};

/**
 * @desc    Get Billing History
 * @route   GET /api/billing/history
 * @access  Private (Staff, Admin, Owner)
 */
const getBillingHistory = async (req, res) => {
  try {
    const { search, startDate, endDate, staffId, page = 1, limit = 20, includeDeleted = 'false' } = req.query;
    const filter = {};

    if (includeDeleted !== 'true') {
      filter.isDeleted = false;
    }

    if (req.user.shopId) {
      filter.shopId = req.user.shopId;
    }

    if (staffId) {
      filter.staffId = staffId;
    }

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search.trim(), $options: 'i' } },
        { 'customerInfo.name': { $regex: search.trim(), $options: 'i' } },
        { 'customerInfo.phone': { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('staffId', 'fullName staffId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      invoices
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Complete Bill History (Admin & Owner) with full historical records & summary KPIs
 * @route   GET /api/billing/complete-history
 * @access  Private (Admin, Owner)
 */
const getCompleteBillHistory = async (req, res) => {
  try {
    const {
      search,
      staffId,
      date,
      startDate,
      endDate,
      month,
      year,
      paymentStatus,
      billStatus,
      page = 1,
      limit = 20,
      exportAll = 'false'
    } = req.query;

    const filter = {};

    // Only scope by shopId if non-owner or specifically selected
    if (req.user.shopId && req.user.role !== 'owner') {
      filter.shopId = req.user.shopId;
    }

    // Bill Status filter (ACTIVE, CANCELLED, EDITED)
    if (billStatus === 'CANCELLED') {
      filter.isDeleted = true;
    } else if (billStatus === 'EDITED') {
      filter.isDeleted = false;
      filter['editHistory.0'] = { $exists: true };
    } else if (billStatus === 'ACTIVE') {
      filter.isDeleted = false;
    }

    // Payment Status filter
    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus.toUpperCase();
    }

    // Staff filter
    if (staffId && staffId !== 'all') {
      filter.staffId = staffId;
    }

    // Search filter (Invoice number, Customer Name, Mobile Number)
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { 'customerInfo.name': { $regex: q, $options: 'i' } },
        { 'customerInfo.phone': { $regex: q, $options: 'i' } }
      ];
    }

    // Date filters: specific date, month, year, or custom range
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (year || (month && month !== 'all')) {
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      let startMonth = 0;
      let endMonth = 11;
      if (month && month !== 'all') {
        const m = parseInt(month) - 1;
        startMonth = m;
        endMonth = m;
      }
      const start = new Date(currentYear, startMonth, 1, 0, 0, 0);
      const end = new Date(currentYear, endMonth + 1, 0, 23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // 1. Calculate Summary KPIs across ALL matching database records
    const allMatching = await Invoice.find(filter);
    const summary = {
      totalBills: allMatching.length,
      totalSales: 0,
      totalGst: 0,
      totalDiscounts: 0,
      totalDeliveryCharges: 0,
      totalCancelledBills: 0,
      totalSuccessfulPayments: 0
    };

    for (const inv of allMatching) {
      if (inv.isDeleted) {
        summary.totalCancelledBills++;
      } else {
        summary.totalSales += (inv.grandTotal || 0);
        summary.totalGst += ((inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0));
        summary.totalDiscounts += (inv.totalDiscount || 0);
        summary.totalDeliveryCharges += (inv.deliveryCharge || 0);
        if (inv.paymentStatus === 'PAID') {
          summary.totalSuccessfulPayments++;
        }
      }
    }

    summary.totalSales = Math.round(summary.totalSales * 100) / 100;
    summary.totalGst = Math.round(summary.totalGst * 100) / 100;
    summary.totalDiscounts = Math.round(summary.totalDiscounts * 100) / 100;
    summary.totalDeliveryCharges = Math.round(summary.totalDeliveryCharges * 100) / 100;

    // 2. Fetch Invoices (either paginated or all if exportAll === 'true')
    let invoicesQuery = Invoice.find(filter)
      .populate('staffId', 'fullName staffId username')
      .populate('shopId', 'name gstNumber')
      .sort({ createdAt: -1 });

    const total = allMatching.length;
    let invoices = [];
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (exportAll === 'true') {
      invoices = await invoicesQuery; // Return all matching records for complete PDF / Excel export
    } else {
      invoices = await invoicesQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    res.status(200).json({
      success: true,
      summary,
      total,
      totalPages: exportAll === 'true' ? 1 : Math.ceil(total / limitNum),
      currentPage: exportAll === 'true' ? 1 : pageNum,
      invoices
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Export All Matching Bills to Excel (.xlsx)
 * @route   GET /api/billing/export-excel
 * @access  Private (Admin, Owner)
 */
const exportAllBillsExcel = async (req, res) => {
  try {
    const {
      search,
      staffId,
      date,
      startDate,
      endDate,
      month,
      year,
      paymentStatus,
      billStatus
    } = req.query;

    const filter = {};
    if (req.user.shopId && req.user.role !== 'owner') {
      filter.shopId = req.user.shopId;
    }

    if (billStatus === 'CANCELLED') {
      filter.isDeleted = true;
    } else if (billStatus === 'EDITED') {
      filter.isDeleted = false;
      filter['editHistory.0'] = { $exists: true };
    } else if (billStatus === 'ACTIVE') {
      filter.isDeleted = false;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus.toUpperCase();
    }

    if (staffId && staffId !== 'all') {
      filter.staffId = staffId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { 'customerInfo.name': { $regex: q, $options: 'i' } },
        { 'customerInfo.phone': { $regex: q, $options: 'i' } }
      ];
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (year || (month && month !== 'all')) {
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      let startMonth = 0;
      let endMonth = 11;
      if (month && month !== 'all') {
        const m = parseInt(month) - 1;
        startMonth = m;
        endMonth = m;
      }
      const start = new Date(currentYear, startMonth, 1, 0, 0, 0);
      const end = new Date(currentYear, endMonth + 1, 0, 23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const invoices = await Invoice.find(filter)
      .populate('staffId', 'fullName staffId username')
      .sort({ createdAt: -1 });

    const rows = invoices.map((inv, idx) => ({
      'S.No': idx + 1,
      'Invoice Number': inv.invoiceNumber,
      'Bill Date': new Date(inv.createdAt).toLocaleString('en-IN'),
      'Customer Name': inv.customerInfo?.name || 'Walk-in',
      'Mobile Number': inv.customerInfo?.phone || 'N/A',
      'Products': (inv.items || []).map(i => `${i.productName} (${i.quantity})`).join(', '),
      'Total Qty': (inv.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0),
      'Subtotal (INR)': inv.subtotal || 0,
      'Total GST (INR)': (inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0),
      'Discount (INR)': inv.totalDiscount || 0,
      'Delivery Charge (INR)': inv.deliveryCharge || 0,
      'Grand Total (INR)': inv.grandTotal || 0,
      'Payment Method': inv.paymentMethod || 'N/A',
      'Payment Status': inv.paymentStatus || 'PAID',
      'Staff Name': inv.staffId?.fullName || 'Cashier',
      'Bill Status': inv.isDeleted ? 'CANCELLED' : ((inv.editHistory && inv.editHistory.length > 0) ? 'EDITED' : 'ACTIVE')
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'SMP Complete Bill History');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=SMP_Complete_Bill_History_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Invoice By ID
 * @route   GET /api/billing/invoice/:id
 * @access  Private
 */
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('staffId', 'fullName staffId username')
      .populate('orderId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    invoice.printedCount += 1;
    await invoice.save();

    res.status(200).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Edit/Update an existing Bill (Admin or Owner)
 * @route   PUT /api/billing/invoice/:id
 * @access  Private (Admin, Owner)
 */
const updateBill = async (req, res) => {
  try {
    if (!['admin', 'owner'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only Admin or Owner users can edit bills.' });
    }

    const { id } = req.params;
    const { items, discountType = 'flat', discountValue = 0, customerName, customerPhone, customerEmail, paymentMethod, reason = 'Invoice correction' } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice || invoice.isDeleted) {
      return res.status(404).json({ success: false, message: 'Invoice not found or deleted' });
    }

    if (
      req.user.role === 'admin' &&
      req.user.shopId &&
      invoice.shopId?.toString() !== req.user.shopId.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Admins can only edit bills from their assigned shop.' });
    }

    // Save previous snapshot for audit trail
    const previousSnapshot = {
      items: invoice.items,
      subtotal: invoice.subtotal,
      totalDiscount: invoice.totalDiscount,
      grandTotal: invoice.grandTotal,
      customerInfo: invoice.customerInfo
    };

    // Restore old stock before re-evaluating new items
    for (const oldItem of invoice.items) {
      if (oldItem.productId) {
        await Product.findByIdAndUpdate(oldItem.productId, { $inc: { availableQuantity: oldItem.quantity } });
      }
    }

    let subtotal = 0;
    let totalItemsGst = 0;
    let totalCost = 0;
    const newBillItems = [];
    const decrementedProducts = [];

    // Deduct new items atomically
    for (const line of items) {
      const lineQty = Number(line.quantity) || 1;
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: line.productId,
          availableQuantity: { $gte: lineQty },
          isActive: true
        },
        { $inc: { availableQuantity: -lineQty } },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback new decrements and restore old state
        for (const doneItem of decrementedProducts) {
          await Product.findByIdAndUpdate(doneItem.productId, { $inc: { availableQuantity: doneItem.quantity } });
        }
        for (const oldItem of invoice.items) {
          if (oldItem.productId) {
            await Product.findByIdAndUpdate(oldItem.productId, { $inc: { availableQuantity: -oldItem.quantity } });
          }
        }
        return res.status(400).json({ success: false, message: `Insufficient stock for product ${line.productName || line.productId}` });
      }

      decrementedProducts.push({ productId: updatedProduct._id, quantity: lineQty });

      const unitPrice = Number(line.unitPrice || updatedProduct.sellingPrice);
      const lineGstPercent = Number(line.gstPercent !== undefined ? line.gstPercent : (updatedProduct.gstPercent || 5));
      const lineDiscount = Number(line.discountAmount || 0);

      const lineBase = (unitPrice * lineQty) - lineDiscount;
      const lineGst = (lineBase * lineGstPercent) / 100;
      const lineTotal = lineBase + lineGst;

      subtotal += lineBase;
      totalItemsGst += lineGst;
      totalCost += (updatedProduct.costPrice || 0) * lineQty;

      newBillItems.push({
        productId: updatedProduct._id,
        productName: updatedProduct.name,
        sku: updatedProduct.sku,
        barcode: updatedProduct.barcode,
        size: line.size || 'M',
        colour: line.colour || 'White',
        quantity: lineQty,
        costPrice: updatedProduct.costPrice,
        unitPrice,
        discountAmount: lineDiscount,
        gstPercent: lineGstPercent,
        gstAmount: Math.round(lineGst * 100) / 100,
        totalAmount: Math.round(lineTotal * 100) / 100
      });
    }

    let overallDiscount = 0;
    if (discountType === 'percent' && discountValue > 0) {
      overallDiscount = (subtotal * discountValue) / 100;
    } else if (discountType === 'flat' && discountValue > 0) {
      overallDiscount = Number(discountValue);
    }

    const netSubtotal = Math.max(0, subtotal - overallDiscount);
    const cgstAmount = Math.round((totalItemsGst / 2) * 100) / 100;
    const sgstAmount = Math.round((totalItemsGst / 2) * 100) / 100;
    const grandTotal = Math.round((netSubtotal + totalItemsGst) * 100) / 100;

    invoice.items = newBillItems;
    invoice.subtotal = Math.round(subtotal * 100) / 100;
    invoice.totalDiscount = Math.round(overallDiscount * 100) / 100;
    invoice.cgstAmount = cgstAmount;
    invoice.sgstAmount = sgstAmount;
    invoice.grandTotal = grandTotal;
    if (customerName) invoice.customerInfo.name = customerName;
    if (customerPhone) invoice.customerInfo.phone = customerPhone;
    if (customerEmail) invoice.customerInfo.email = customerEmail;
    if (paymentMethod) invoice.paymentMethod = paymentMethod;

    invoice.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      reason,
      previousData: previousSnapshot
    });

    await invoice.save();

    if (invoice.orderId) {
      await Order.findByIdAndUpdate(invoice.orderId, {
        items: newBillItems,
        subtotal: invoice.subtotal,
        totalDiscount: invoice.totalDiscount,
        totalGst: Math.round(totalItemsGst * 100) / 100,
        grandTotal,
        totalCost: Math.round(totalCost * 100) / 100
      });
    }

    res.status(200).json({ success: true, message: 'Bill updated successfully with audit trail.', invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Permanently delete a Bill (Admin or Owner), restoring stock for active bills
 * @route   DELETE /api/billing/invoice/:id
 * @access  Private (Admin, Owner)
 */
const deleteBill = async (req, res) => {
  let session;
  try {
    if (!['admin', 'owner'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only Admin or Owner users can delete bills.' });
    }

    const { id } = req.params;
    const rawReason = req.body?.reason;
    if (rawReason !== undefined && typeof rawReason !== 'string') {
      return res.status(400).json({ success: false, message: 'Deletion reason must be text.' });
    }
    const reason = rawReason === undefined ? 'Permanently deleted by Admin/Owner' : rawReason.trim();
    if (!reason || reason.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'A deletion reason of 1 to 500 characters is required.'
      });
    }

    session = await Invoice.startSession();
    let invoiceNumber;

    await session.withTransaction(async () => {
      const invoice = await Invoice.findById(id).session(session);
      if (!invoice) {
        const error = new Error('Invoice not found');
        error.statusCode = 404;
        throw error;
      }

      if (
        req.user.role === 'admin' &&
        req.user.shopId &&
        invoice.shopId?.toString() !== req.user.shopId.toString()
      ) {
        const error = new Error('Admins can only delete bills from their assigned shop.');
        error.statusCode = 403;
        throw error;
      }

      invoiceNumber = invoice.invoiceNumber;

      // Older soft-deleted bills already had their stock restored.
      if (!invoice.isDeleted) {
        for (const item of invoice.items) {
          if (item.productId) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { availableQuantity: item.quantity } },
              { session }
            );
            await Inventory.findOneAndUpdate(
              { productId: item.productId },
              {
                $inc: { currentStock: item.quantity },
                $push: {
                  stockLogs: {
                    type: 'RETURN',
                    quantity: item.quantity,
                    referenceId: invoice.invoiceNumber,
                    notes: `Bill deleted: ${invoice.invoiceNumber}. Reason: ${reason}`,
                    performedBy: req.user._id
                  }
                }
              },
              { session }
            );
          }
        }

        if (invoice.orderId) {
          await Order.findByIdAndUpdate(
            invoice.orderId,
            { orderStatus: 'CANCELLED', paymentStatus: 'REFUNDED' },
            { session }
          );
        }
      }

      const deletedInvoice = await Invoice.findByIdAndDelete(id, { session });
      if (!deletedInvoice) {
        const error = new Error('Invoice was already deleted');
        error.statusCode = 404;
        throw error;
      }
    });

    res.status(200).json({
      success: true,
      message: `Invoice #${invoiceNumber} permanently deleted.`
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  } finally {
    if (session) await session.endSession();
  }
};

/**
 * @desc    Lookup customer by phone for POS Billing, returning previous history & invoices
 * @route   GET /api/billing/customer-lookup/:phone
 * @access  Private (Staff, Admin, Owner)
 */
const lookupCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const customer = await Customer.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: { $regex: cleanPhone + '$' } }
      ]
    }).lean();

    if (!customer) {
      return res.status(200).json({
        success: true,
        exists: false,
        customer: null,
        message: 'No existing customer record found with this phone number.'
      });
    }

    // Fetch previous invoices
    const previousInvoices = await Invoice.find({
      $or: [
        { customerId: customer._id },
        { 'customerInfo.phone': { $regex: cleanPhone + '$' } }
      ],
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('invoiceNumber createdAt grandTotal subtotal totalDiscount items paymentMethod paymentStatus')
    .lean();

    res.status(200).json({
      success: true,
      exists: true,
      customer: {
        _id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        totalPurchases: customer.totalPurchases || 0,
        totalSpend: customer.totalSpend || 0,
        lastPurchaseDate: customer.lastPurchaseDate || null,
        loyaltyPoints: customer.loyaltyPoints || 0,
        consentPromotionalWhatsApp: customer.consentPromotionalWhatsApp || false
      },
      previousInvoices
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBillingSettings,
  getBillingPaymentQrs,
  lookupProductPOS,
  searchProductPOS,
  createBillingTransaction,
  verifyQrPaymentAndBill,
  getBillingHistory,
  getCompleteBillHistory,
  exportAllBillsExcel,
  getInvoiceById,
  updateBill,
  deleteBill,
  lookupCustomerByPhone
};
