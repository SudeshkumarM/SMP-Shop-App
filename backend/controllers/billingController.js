const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Shop = require('../models/Shop');
const User = require('../models/User');
const WhatsAppService = require('../services/whatsappService');
const { generateInvoiceBarcode } = require('../utils/generateBarcode');
const { emitRealtimeUpdate } = require('../utils/realtime');

const generateInvoiceNumber = async (shopPrefix = 'SMP') => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Invoice.countDocuments();
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const sequence = String(count + 1).padStart(4, '0');
  return `${shopPrefix}-INV-${dateStr}-${sequence}-${randomSuffix}`;
};

/**
 * @desc    Search Product for POS Billing (by Barcode, SKU, or Name)
 * @route   GET /api/billing/search-product
 * @access  Private (Staff, Admin, Owner)
 */
const searchProductPOS = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      // Default to returning active products in store catalog
      const products = await Product.find({ isActive: true }).limit(10);
      return res.status(200).json({ success: true, products });
    }

    const shopId = req.user.shopId;
    const filter = { isActive: true };
    if (shopId) filter.shopId = shopId;

    filter.$or = [
      { barcode: query.trim() },
      { sku: query.toUpperCase().trim() },
      { name: { $regex: query.trim(), $options: 'i' } }
    ];

    const products = await Product.find(filter).limit(10);
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create POS Billing Transaction & Generate Invoice with Atomic Stock Updates
 * @route   POST /api/billing/create-bill
 * @access  Private (Staff, Admin, Owner)
 */
const createBillingTransaction = async (req, res) => {
  try {
    const {
      items, // [{ productId, size, colour, quantity, unitPrice, discountAmount, gstPercent }]
      discountType = 'flat',
      discountValue = 0,
      deliveryCharge = 0,
      customerPhone,
      customerName,
      customerEmail,
      consentPromotionalWhatsApp,
      sendWhatsAppInvoice = false,
      paymentMethod = 'POS_CASH',
      paymentStatus = 'PAID'
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one product to the bill.' });
    }

    // QR Payment Verification Guard
    const { transactionRef } = req.body;
    if (paymentMethod === 'POS_UPI_QR') {
      if (!transactionRef || String(transactionRef).trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: A valid UPI Transaction Reference / UTR (at least 6 digits) is required for QR payment.'
        });
      }
      const existingTxn = await Order.findOne({ 'paymentDetails.transactionRef': String(transactionRef).trim() });
      if (existingTxn) {
        return res.status(400).json({
          success: false,
          message: 'This UPI Reference Number has already been recorded on a previous invoice.'
        });
      }
    }

    const shopId = req.user.shopId;
    const shop = (await Shop.findById(shopId)) || (await Shop.findOne({ isActive: true }));
    const staff = await Staff.findOne({ userId: req.user._id });

    // Customer resolution or quick counter enrollment
    let customer = null;
    if (customerPhone) {
      customer = await Customer.findOne({ phone: customerPhone.trim() });
      if (!customer && customerName) {
        try {
          const uniqueId = `WALKIN-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          customer = await Customer.create({
            userId: null,
            customerId: uniqueId,
            fullName: customerName,
            phone: customerPhone.trim(),
            email: customerEmail || `walkin_${Date.now()}_${Math.random().toString(36).substring(2, 5)}@walkin.smp`,
            consentPromotionalWhatsApp: Boolean(consentPromotionalWhatsApp)
          });
        } catch (cErr) {
          customer = await Customer.findOne({ phone: customerPhone.trim() });
        }
      } else if (customer && consentPromotionalWhatsApp !== undefined) {
        customer.consentPromotionalWhatsApp = Boolean(consentPromotionalWhatsApp);
      }
    }

    let subtotal = 0;
    let totalItemsGst = 0;
    let totalCost = 0;
    const billItems = [];
    const decrementedProducts = [];

    // Atomic Stock Validation & Deduction (Concurreny Safe for 1000 users)
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
        // Rollback any items already decremented in this transaction
        for (const rolled of decrementedProducts) {
          await Product.findByIdAndUpdate(rolled.productId, { $inc: { availableQuantity: rolled.quantity } });
        }
        return res.status(400).json({
          success: false,
          message: `Insufficient stock or concurrent purchase conflict for item: ${line.productName || line.productId}. Transaction aborted.`
        });
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

      billItems.push({
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

    // Overall discount calculation
    let overallDiscount = 0;
    if (discountType === 'percent' && discountValue > 0) {
      overallDiscount = (subtotal * discountValue) / 100;
    } else if (discountType === 'flat' && discountValue > 0) {
      overallDiscount = Number(discountValue);
    }

    const netSubtotal = Math.max(0, subtotal - overallDiscount);
    const cgstAmount = Math.round((totalItemsGst / 2) * 100) / 100;
    const sgstAmount = Math.round((totalItemsGst / 2) * 100) / 100;
    const deliveryAmount = Math.max(0, Number(deliveryCharge) || 0);
    const grandTotal = Math.round((netSubtotal + totalItemsGst + deliveryAmount) * 100) / 100;

    const invoiceNumber = await generateInvoiceNumber(shop ? shop.settings.invoicePrefix : 'SMP');
    const orderNumber = `POS-${Date.now().toString().slice(-8)}`;

    // Create Order Record
    const order = await Order.create({
      orderNumber,
      orderType: 'POS',
      shopId: shop ? shop._id : null,
      branchId: req.user.branchId || null,
      staffId: staff ? staff._id : null,
      customerId: customer ? customer._id : null,
      customerDetails: {
        name: customerName || (customer ? customer.fullName : 'Walk-in Customer'),
        phone: customerPhone || (customer ? customer.phone : 'N/A'),
        email: customerEmail || (customer ? customer.email : '')
      },
      items: billItems,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(overallDiscount * 100) / 100,
      totalGst: Math.round(totalItemsGst * 100) / 100,
      deliveryCharge: deliveryAmount,
      shippingFee: deliveryAmount,
      grandTotal,
      totalCost: Math.round(totalCost * 100) / 100,
      paymentMethod,
      paymentStatus,
      paymentDetails: { transactionRef: transactionRef || null },
      orderStatus: 'DELIVERED',
      invoiceNumber
    });

    // Create Invoice Record
    const invoice = await Invoice.create({
      invoiceNumber,
      orderId: order._id,
      shopId: shop ? shop._id : null,
      branchId: req.user.branchId || null,
      staffId: staff ? staff._id : null,
      customerId: customer ? customer._id : null,
      shopInfo: {
        name: shop ? shop.name : 'SMP',
        address: shop && shop.address ? `${shop.address.street}, ${shop.address.city}` : 'SMP Central Retail Mall',
        phone: shop ? shop.contactPhone : '+91 98765 43210',
        email: shop ? shop.contactEmail : 'billing@smp.com',
        gstNumber: shop ? shop.gstNumber : '33AAAAA0000A1Z5'
      },
      customerInfo: {
        name: customerName || (customer ? customer.fullName : 'Walk-in Customer'),
        phone: customerPhone || (customer ? customer.phone : 'N/A'),
        email: customerEmail || (customer ? customer.email : ''),
        address: 'In-Store Counter Terminal'
      },
      items: billItems,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(overallDiscount * 100) / 100,
      deliveryCharge: deliveryAmount,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      grandTotal,
      paymentMethod,
      paymentStatus,
      paymentDetails: { transactionRef: transactionRef || null },
      deliveryStatus: 'PENDING',
      barcode: generateInvoiceBarcode(invoiceNumber),
      printedCount: 1
    });

    // Inventory ledger logging
    for (const item of billItems) {
      await Inventory.findOneAndUpdate(
        { productId: item.productId },
        {
          $inc: { currentStock: -item.quantity },
          $push: {
            stockLogs: {
              type: 'SALE',
              quantity: item.quantity,
              referenceId: invoiceNumber,
              notes: `POS Bill: ${invoiceNumber}`,
              performedBy: req.user._id
            }
          }
        }
      );
    }

    if (staff) {
      staff.totalBillsGenerated = (staff.totalBillsGenerated || 0) + 1;
      staff.totalSalesValue = (staff.totalSalesValue || 0) + grandTotal;
      await staff.save();
    }

    if (customer) {
      customer.totalPurchases = (customer.totalPurchases || 0) + 1;
      customer.totalSpend = (customer.totalSpend || 0) + grandTotal;
      customer.loyaltyPoints = (customer.loyaltyPoints || 0) + Math.floor(grandTotal / 100);
      customer.lastPurchaseDate = new Date();
      await customer.save();
    }

    // Step 7: Send WhatsApp or SMS fallback bill notification
    let notificationResult = null;
    if (customerPhone && String(customerPhone).trim().length >= 10) {
      try {
        notificationResult = await WhatsAppService.sendBillNotificationWithFallback({
          phone: String(customerPhone).trim(),
          customerName: customerName || (customer ? customer.fullName : 'Customer'),
          invoiceNumber,
          grandTotal,
          itemCount: billItems.reduce((acc, curr) => acc + curr.quantity, 0),
          paymentMethod,
          shopId: shop ? shop._id : null,
          sentBy: req.user._id,
          customerId: customer ? customer._id : null
        });
        if (notificationResult?.deliveryStatus) {
          invoice.deliveryStatus = notificationResult.deliveryStatus;
          await invoice.save();
        }
      } catch (notifErr) {
        console.error('[BillingController] Notification error:', notifErr.message);
        notificationResult = { deliveryStatus: 'Failed', error: notifErr.message };
        invoice.deliveryStatus = 'Failed';
        await invoice.save();
      }
    }

    // Emit real-time inventory & billing update across all clients
    emitRealtimeUpdate(req.app, 'inventory:updated', { billItems, invoiceNumber });
    emitRealtimeUpdate(req.app, 'bill:created', { invoice });

    res.status(201).json({
      success: true,
      message: 'Billing completed and invoice generated successfully.',
      invoice,
      order,
      deliveryStatus: notificationResult?.deliveryStatus || 'Skipped',
      notificationChannel: notificationResult?.channel || 'None'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Verify QR Payment Reference & Complete Billing
 * @route   POST /api/billing/verify-qr-payment
 * @access  Private (Staff, Admin, Owner)
 */
const verifyQrPaymentAndBill = async (req, res) => {
  req.body.paymentMethod = 'POS_UPI_QR';
  req.body.paymentStatus = 'PAID';
  return createBillingTransaction(req, res);
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
 * @desc    Edit/Update an existing Bill (Admin, Owner, or authorized Staff)
 * @route   PUT /api/billing/invoice/:id
 * @access  Private (Admin, Owner, Staff with canEditBills)
 */
const updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, discountType = 'flat', discountValue = 0, customerName, customerPhone, customerEmail, paymentMethod, reason = 'Invoice correction' } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice || invoice.isDeleted) {
      return res.status(404).json({ success: false, message: 'Invoice not found or deleted' });
    }

    // Permission check for Staff
    if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ userId: req.user._id });
      if (!staff || !staff.canEditBills) {
        return res.status(403).json({ success: false, message: 'Staff bill correction permission is not enabled by Admin.' });
      }
      if (invoice.staffId && invoice.staffId.toString() !== staff._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only edit your own bills.' });
      }
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
 * @desc    Delete a Bill (Admin, Owner) - Restores Stock & Records Audit Log
 * @route   DELETE /api/billing/invoice/:id
 * @access  Private (Admin, Owner)
 */
const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled bill' } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice || invoice.isDeleted) {
      return res.status(404).json({ success: false, message: 'Invoice not found or already deleted' });
    }

    // Restore stock for all items in the invoice
    for (const item of invoice.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { availableQuantity: item.quantity } });
        await Inventory.findOneAndUpdate(
          { productId: item.productId },
          {
            $inc: { currentStock: item.quantity },
            $push: {
              stockLogs: {
                type: 'RETURN',
                quantity: item.quantity,
                referenceId: invoice.invoiceNumber,
                notes: `Bill cancelled: ${invoice.invoiceNumber}. Reason: ${reason}`,
                performedBy: req.user._id
              }
            }
          }
        );
      }
    }

    invoice.isDeleted = true;
    invoice.deletedBy = req.user._id;
    invoice.deletedAt = new Date();
    invoice.deleteReason = reason;
    await invoice.save();

    if (invoice.orderId) {
      await Order.findByIdAndUpdate(invoice.orderId, { orderStatus: 'CANCELLED', paymentStatus: 'REFUNDED' });
    }

    res.status(200).json({ success: true, message: `Invoice #${invoice.invoiceNumber} deleted and stock restored successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
  searchProductPOS,
  createBillingTransaction,
  verifyQrPaymentAndBill,
  getBillingHistory,
  getInvoiceById,
  updateBill,
  deleteBill,
  lookupCustomerByPhone
};
