const User = require('../models/User');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const Shop = require('../models/Shop');
const Coupon = require('../models/Coupon');
const WhatsAppLog = require('../models/WhatsAppLog');
const WhatsAppService = require('../services/whatsappService');
const { emitRealtimeUpdate } = require('../utils/realtime');
const xlsx = require('xlsx');

/**
 * @desc    Get Admin Dashboard Overview & Analytics
 * @route   GET /api/admin/dashboard-stats
 * @access  Private (Admin, Owner)
 */
const getAdminDashboardStats = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const filter = shopId ? { shopId } : {};

    // 1. KPI Counts
    const totalCustomers = await Customer.countDocuments();
    const totalStaff = await Staff.countDocuments({ ...filter, isActive: true });
    const totalProducts = await Product.countDocuments({ ...filter, isActive: true });
    const totalOrders = await Order.countDocuments(filter);

    // 2. Sales Math: Today's and Monthly Sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayOrders = await Order.find({ ...filter, createdAt: { $gte: today } });
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const monthOrders = await Order.find({ ...filter, createdAt: { $gte: firstDayOfMonth } });
    const monthlySales = monthOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    // 3. Low stock alerts
    const lowStockProducts = await Product.find({
      ...filter,
      isActive: true,
      $expr: { $lte: ['$availableQuantity', '$lowStockThreshold'] }
    }).select('name sku barcode availableQuantity lowStockThreshold finalPrice images');

    // 4. Recent Transactions
    const recentTransactions = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('staffId', 'fullName staffId');

    // 5. Daily Sales Chart Data (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const pastWeekOrders = await Order.find({
      ...filter,
      createdAt: { $gte: sevenDaysAgo }
    });

    const salesByDayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10); // MM-DD
      salesByDayMap[key] = { date: key, sales: 0, orders: 0 };
    }

    pastWeekOrders.forEach(order => {
      const key = order.createdAt.toISOString().slice(5, 10);
      if (salesByDayMap[key]) {
        salesByDayMap[key].sales += order.grandTotal;
        salesByDayMap[key].orders += 1;
      }
    });

    const salesChart = Object.values(salesByDayMap);

    res.status(200).json({
      success: true,
      kpis: {
        totalCustomers,
        totalStaff,
        totalProducts,
        totalOrders,
        todaySales: Math.round(todaySales * 100) / 100,
        monthlySales: Math.round(monthlySales * 100) / 100,
        lowStockCount: lowStockProducts.length
      },
      lowStockProducts,
      recentTransactions,
      salesChart
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * CUSTOMER MANAGEMENT (ADMIN)
 * ====================================================
 */
const getAdminCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({ success: true, total, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAdminCustomer = async (req, res) => {
  try {
    const { fullName, email, phone, street, city, state, pincode, password } = req.body;

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email or phone already exists.' });
    }

    const user = await User.create({
      name: fullName,
      email: email.toLowerCase(),
      phone,
      password: password || 'Customer123!',
      role: 'customer',
      isPhoneVerified: true
    });

    const custCount = await Customer.countDocuments();
    const customer = await Customer.create({
      userId: user._id,
      customerId: `CUST-${custCount + 1001}`,
      fullName,
      email: user.email,
      phone,
      isPhoneVerified: true,
      addresses: street ? [{
        title: 'Home',
        street,
        city: city || 'Chennai',
        state: state || 'Tamil Nadu',
        pincode: pincode || '600001',
        isDefault: true
      }] : []
    });

    res.status(201).json({ success: true, message: 'Customer created successfully', customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdminCustomer = async (req, res) => {
  try {
    const { fullName, email, phone, isBlocked, consentPromotionalWhatsApp } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (fullName) customer.fullName = fullName;
    if (email) customer.email = email.toLowerCase();
    if (phone) customer.phone = phone;
    if (isBlocked !== undefined) customer.isBlocked = isBlocked;
    if (consentPromotionalWhatsApp !== undefined) customer.consentPromotionalWhatsApp = Boolean(consentPromotionalWhatsApp);

    await customer.save();

    await User.findByIdAndUpdate(customer.userId, {
      name: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      isActive: !customer.isBlocked
    });

    res.status(200).json({ success: true, message: 'Customer updated successfully', customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAdminCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await User.findByIdAndDelete(customer.userId);
    await Customer.findByIdAndDelete(customer._id);

    res.status(200).json({ success: true, message: 'Customer removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const exportCustomersExcel = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    const data = customers.map(c => ({
      'Customer ID': c.customerId,
      'Full Name': c.fullName,
      'Email': c.email,
      'Phone': c.phone,
      'Total Purchases': c.totalPurchases,
      'Total Spent (₹)': c.totalSpent,
      'Loyalty Points': c.loyaltyPoints,
      'Status': c.isBlocked ? 'Blocked' : 'Active',
      'Joined Date': c.createdAt ? c.createdAt.toISOString().split('T')[0] : ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Customers');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="SMP_Customers_Export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * STAFF MANAGEMENT (ADMIN)
 * ====================================================
 */
const getAdminStaffList = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const filter = shopId ? { shopId } : {};

    const staffList = await Staff.find(filter)
      .populate('shopId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, staff: staffList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createStaffAccount = async (req, res) => {
  try {
    const { fullName, email, phone, department, jobRole, salary, tempPassword } = req.body;
    const shopId = req.user.shopId || req.body.shopId;

    if (!fullName || !email || !phone || !department) {
      return res.status(400).json({ success: false, message: 'Please provide all required staff fields' });
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email or phone already exists' });
    }

    const passwordToUse = tempPassword || 'Staff123!';

    // Generate unique Staff ID: STF-1001 onwards
    const staffCount = await Staff.countDocuments();
    const staffId = `STF-${staffCount + 1001}`;

    const user = await User.create({
      name: fullName,
      email: email.toLowerCase(),
      phone,
      password: passwordToUse,
      role: 'staff',
      shopId,
      branchId: req.user.branchId || null
    });

    const staff = await Staff.create({
      userId: user._id,
      staffId,
      shopId,
      branchId: req.user.branchId || null,
      fullName,
      email: user.email,
      phone,
      department,
      jobRole: jobRole || 'Billing / POS Operator',
      salary: salary || 0
    });

    res.status(201).json({
      success: true,
      message: `Staff account created with ID: ${staffId}`,
      staff,
      temporaryPassword: passwordToUse
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateStaffAccount = async (req, res) => {
  try {
    const { fullName, email, phone, department, jobRole, salary, isActive } = req.body;
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (fullName) staff.fullName = fullName;
    if (email) staff.email = email.toLowerCase();
    if (phone) staff.phone = phone;
    if (department) staff.department = department;
    if (jobRole) staff.jobRole = jobRole;
    if (salary !== undefined) staff.salary = salary;
    if (isActive !== undefined) staff.isActive = isActive;

    await staff.save();

    await User.findByIdAndUpdate(staff.userId, {
      name: staff.fullName,
      email: staff.email,
      phone: staff.phone,
      isActive: staff.isActive
    });

    res.status(200).json({ success: true, message: 'Staff details updated', staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetStaffPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    const pass = newPassword || 'Staff123!';
    const user = await User.findById(staff.userId);
    user.password = pass;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully', tempPassword: pass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteStaffAccount = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    await User.findByIdAndDelete(staff.userId);
    await Staff.findByIdAndDelete(staff._id);

    res.status(200).json({ success: true, message: 'Staff member removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * INVENTORY & SUPPLIER MANAGEMENT (ADMIN)
 * ====================================================
 */
const getInventoryStatus = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const filter = shopId ? { shopId } : {};

    const inventoryList = await Inventory.find(filter)
      .populate('productId', 'name sku barcode images availableQuantity lowStockThreshold sellingPrice costPrice')
      .sort({ currentStock: 1 });

    const totalStockUnits = inventoryList.reduce((sum, item) => sum + (item.currentStock || 0), 0);
    const lowStockItems = inventoryList.filter(item => item.currentStock <= item.reorderLevel);
    const outOfStockItems = inventoryList.filter(item => item.currentStock === 0);

    const suppliers = await Supplier.find(filter);

    res.status(200).json({
      success: true,
      stats: {
        totalStockUnits,
        totalItems: inventoryList.length,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length
      },
      inventory: inventoryList,
      suppliers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addPurchaseStockEntry = async (req, res) => {
  try {
    const { productId, quantity, unitCost, supplierId, invoiceNumber, notes } = req.body;
    const shopId = req.user.shopId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const qty = Number(quantity);
    const prevStock = product.availableQuantity;
    const newStock = prevStock + qty;

    product.availableQuantity = newStock;
    if (unitCost) product.costPrice = Number(unitCost);
    await product.save();

    await Inventory.findOneAndUpdate(
      { shopId, productId: product._id },
      {
        currentStock: newStock,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        lastRestockedAt: new Date(),
        $push: {
          stockLogs: {
            type: 'PURCHASE',
            quantity: qty,
            previousStock: prevStock,
            newStock,
            unitCost: unitCost || product.costPrice,
            referenceId: invoiceNumber || '',
            notes: notes || `Supplier Purchase: ${invoiceNumber || 'Stock In'}`,
            performedBy: req.user._id
          }
        }
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: `Stock updated successfully. Added ${qty} units. New Stock: ${newStock}`,
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone, gstNumber, street, city, state, pincode, paymentTerms } = req.body;
    const shopId = req.user.shopId;

    const supplier = await Supplier.create({
      shopId,
      companyName,
      contactPerson,
      email,
      phone,
      gstNumber,
      paymentTerms: paymentTerms || 'Net 30',
      address: { street, city, state, pincode }
    });

    res.status(201).json({ success: true, message: 'Supplier added successfully', supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getShopSettings = async (req, res) => {
  try {
    const shop = req.user.shopId
      ? await Shop.findById(req.user.shopId)
      : await Shop.findOne({ isActive: true }).sort({ createdAt: 1, _id: 1 });
    res.status(200).json({ success: true, shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShopSettings = async (req, res) => {
  try {
    const { name, contactPhone, contactEmail, gstNumber, address, settings } = req.body;
    const shop = req.user.shopId
      ? await Shop.findById(req.user.shopId)
      : await Shop.findOne({ isActive: true }).sort({ createdAt: 1, _id: 1 });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (name) shop.name = name;
    if (contactPhone) shop.contactPhone = contactPhone;
    if (contactEmail) shop.contactEmail = contactEmail;
    if (gstNumber) shop.gstNumber = gstNumber;
    if (address) shop.address = { ...shop.address, ...address };
    if (settings) {
      if (settings.lowStockThreshold !== undefined) {
        shop.settings.lowStockThreshold = Number(settings.lowStockThreshold);
      }
      if (settings.invoicePrefix !== undefined) {
        shop.settings.invoicePrefix = String(settings.invoicePrefix);
      }
      shop.settings.updatedAt = new Date();
      shop.settings.updatedBy = req.user._id;
    }

    await shop.save();
    res.status(200).json({ success: true, message: 'Shop settings updated successfully', shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * DELIVERY CHARGE SETTINGS
 * ====================================================
 */
const getDeliverySettings = async (req, res) => {
  try {
    const shop = (await Shop.findById(req.user.shopId)) || (await Shop.findOne({ isActive: true }));
    const delivery = (shop && shop.settings && shop.settings.deliverySettings) ? shop.settings.deliverySettings : {
      enabled: true,
      deliveryCharge: 50,
      freeDeliveryThreshold: 1000,
      chargeType: 'FLAT',
      description: 'Standard Express Shipping (2-3 business days)'
    };
    res.status(200).json({ success: true, settings: delivery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDeliverySettings = async (req, res) => {
  try {
    const shop = (await Shop.findById(req.user.shopId)) || (await Shop.findOne({ isActive: true }));
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    shop.settings = shop.settings || {};
    shop.settings.deliverySettings = {
      ...shop.settings.deliverySettings,
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user._id
    };
    await shop.save();
    emitRealtimeUpdate(req.app, 'settings:updated', { type: 'delivery', settings: shop.settings.deliverySettings });
    res.status(200).json({ success: true, message: 'Delivery settings updated successfully', settings: shop.settings.deliverySettings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * GST & TAX SETTINGS
 * ====================================================
 */
const getGstSettings = async (req, res) => {
  try {
    const shop = (await Shop.findById(req.user.shopId)) || (await Shop.findOne({ isActive: true }));
    const gst = (shop && shop.settings && shop.settings.gstSettings) ? shop.settings.gstSettings : {
      enabled: true,
      defaultGstPercent: 5,
      gstNumber: '33AAAAA0000A1Z5',
      compositionScheme: false
    };

    // Aggregate GST collections
    const taxStats = await Invoice.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalCgst: { $sum: '$cgstAmount' },
          totalSgst: { $sum: '$sgstAmount' },
          totalTaxableValue: { $sum: '$subtotal' },
          totalInvoicesCount: { $sum: 1 }
        }
      }
    ]);

    const stats = taxStats[0] || { totalCgst: 0, totalSgst: 0, totalTaxableValue: 0, totalInvoicesCount: 0 };
    stats.totalGstCollected = Math.round(((stats.totalCgst || 0) + (stats.totalSgst || 0)) * 100) / 100;

    res.status(200).json({ success: true, settings: gst, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateGstSettings = async (req, res) => {
  try {
    const shop = (await Shop.findById(req.user.shopId)) || (await Shop.findOne({ isActive: true }));
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    shop.settings = shop.settings || {};
    shop.settings.gstSettings = {
      ...shop.settings.gstSettings,
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user._id
    };
    if (req.body.gstNumber) {
      shop.gstNumber = req.body.gstNumber;
    }
    await shop.save();
    emitRealtimeUpdate(req.app, 'settings:updated', { type: 'gst', settings: shop.settings.gstSettings });
    res.status(200).json({ success: true, message: 'GST settings updated successfully', settings: shop.settings.gstSettings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * WHATSAPP BUSINESS NOTIFICATION SETTINGS & LOGS
 * ====================================================
 */
const getWhatsAppSettings = async (req, res) => {
  try {
    const shop = (await Shop.findById(req.user.shopId)) || (await Shop.findOne({ isActive: true }));
    const defaultSettings = {
      enabled: false,
      apiUrl: 'https://graph.facebook.com/v18.0',
      apiKey: '',
      phoneNumberId: '',
      businessAccountId: '',
      businessPhoneNumber: '+91 98400 12345',
      adminNotificationNumber: '+91 98400 23456',
      ownerNotificationNumber: '+91 98400 12345',
      notifyOnNewBill: true,
      notifyOnOrderConfirmation: true,
      notifyOnPaymentConfirmation: true,
      notifyOnOffer: false,
      notifyOnCoupon: false,
      notifyOnInvoice: true,
      notifyOnFailedMessage: true,
      notifyOnSystemAlerts: true,
      apiConnectionStatus: 'SIMULATED'
    };

    const whatsapp = (shop && shop.settings && shop.settings.whatsappSettings)
      ? { ...defaultSettings, ...shop.settings.whatsappSettings }
      : defaultSettings;

    res.status(200).json({ success: true, settings: whatsapp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateWhatsAppSettings = async (req, res) => {
  try {
    const shop = (await Shop.findById(req.user.shopId)) || (await Shop.findOne({ isActive: true }));
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    shop.settings = shop.settings || {};

    const existing = shop.settings.whatsappSettings || {};

    // Role-based field updates:
    // If Owner: master authority over all fields
    // If Admin: can update adminNotificationNumber and operational notification toggles
    let updated;
    if (req.user.role === 'owner') {
      updated = {
        ...existing,
        ...req.body
      };
    } else {
      // Admin role
      updated = {
        ...existing,
        adminNotificationNumber: req.body.adminNotificationNumber !== undefined ? req.body.adminNotificationNumber : existing.adminNotificationNumber,
        notifyOnNewBill: req.body.notifyOnNewBill !== undefined ? req.body.notifyOnNewBill : existing.notifyOnNewBill,
        notifyOnOrderConfirmation: req.body.notifyOnOrderConfirmation !== undefined ? req.body.notifyOnOrderConfirmation : existing.notifyOnOrderConfirmation,
        notifyOnPaymentConfirmation: req.body.notifyOnPaymentConfirmation !== undefined ? req.body.notifyOnPaymentConfirmation : existing.notifyOnPaymentConfirmation,
        notifyOnFailedMessage: req.body.notifyOnFailedMessage !== undefined ? req.body.notifyOnFailedMessage : existing.notifyOnFailedMessage,
        notifyOnSystemAlerts: req.body.notifyOnSystemAlerts !== undefined ? req.body.notifyOnSystemAlerts : existing.notifyOnSystemAlerts
      };
    }

    shop.settings.whatsappSettings = updated;
    shop.settings.whatsappSettings.updatedAt = new Date();
    shop.settings.whatsappSettings.updatedBy = req.user._id;
    await shop.save();

    emitRealtimeUpdate(req.app, 'whatsapp:settings:updated', { settings: updated, updatedBy: req.user.role });

    res.status(200).json({
      success: true,
      message: `${req.user.role === 'owner' ? 'Master' : 'Admin'} WhatsApp settings updated successfully`,
      settings: shop.settings.whatsappSettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Admin Operational Alerts & System Health (Billing Errors, Failed Notifications, Order Issues)
 * @route   GET /api/admin/operational-alerts
 * @access  Private (Admin, Owner)
 */
const getAdminOperationalAlerts = async (req, res) => {
  try {
    const failedMessages = await WhatsAppLog.find({ status: 'FAILED' }).sort({ createdAt: -1 }).limit(10);
    const lowStockItems = await Product.find({
      $expr: { $lte: ['$availableQuantity', '$lowStockThreshold'] },
      isActive: true
    }).select('name sku availableQuantity lowStockThreshold');

    const Invoice = require('../models/Invoice');
    const cancelledBills = await Invoice.find({ isDeleted: true }).sort({ updatedAt: -1 }).limit(10);

    res.status(200).json({
      success: true,
      alerts: {
        failedMessagesCount: failedMessages.length,
        failedMessages,
        lowStockCount: lowStockItems.length,
        lowStockItems,
        cancelledBillsCount: cancelledBills.length,
        cancelledBills
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWhatsAppLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    const filter = {};
    if (type) filter.messageType = type;
    if (status) filter.status = status;

    const total = await WhatsAppLog.countDocuments(filter);
    const logs = await WhatsAppLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({ success: true, total, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * COUPON & OFFER MANAGEMENT (WITH WHATSAPP DISPATCH)
 * ====================================================
 */
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCoupon = async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      discountPercent,
      minPurchaseAmount,
      validityDays = 10,
      eligibilityCriteria = 'ALL_CONSENTED',
      minLifetimeSpend = 0,
      minOrdersCount = 0,
      startDate = new Date(),
      expiryDate,
      isActive,
      sendWhatsApp
    } = req.body;

    if (!code || !title || !discountPercent) {
      return res.status(400).json({ success: false, message: 'Please fill all required coupon fields.' });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Coupon code ${code.toUpperCase()} already exists.` });
    }

    const calculatedExpiry = expiryDate ? new Date(expiryDate) : new Date(Date.now() + Number(validityDays) * 24 * 60 * 60 * 1000);

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      title,
      description,
      discountPercent: Number(discountPercent),
      minPurchaseAmount: Number(minPurchaseAmount || 0),
      validityDays: Number(validityDays || 10),
      eligibilityCriteria,
      minLifetimeSpend: Number(minLifetimeSpend || 0),
      minOrdersCount: Number(minOrdersCount || 0),
      startDate: new Date(startDate),
      expiryDate: calculatedExpiry,
      isActive: isActive !== undefined ? isActive : true,
      sendWhatsApp: Boolean(sendWhatsApp),
      createdBy: req.user._id,
      shopId: req.user.shopId || null
    });

    let whatsAppSummary = { eligible: 0, sent: 0, optedOut: 0, failed: 0, skippedDuplicate: 0 };

    // If WhatsApp notification is ENABLED, check eligibility and consent
    if (sendWhatsApp && coupon.isActive) {
      const now = new Date();
      if (now >= coupon.startDate && now <= coupon.expiryDate) {
        // Query consented customers
        const customerQuery = { consentPromotionalWhatsApp: true };
        if (eligibilityCriteria === 'RETURNING_CUSTOMERS') {
          customerQuery.totalPurchases = { $gt: 0 };
        } else if (eligibilityCriteria === 'NEW_CUSTOMERS') {
          customerQuery.totalPurchases = { $lte: 0 };
        } else if (eligibilityCriteria === 'MIN_PURCHASE' && minLifetimeSpend > 0) {
          customerQuery.totalSpend = { $gte: minLifetimeSpend };
        }

        const eligibleCustomers = await Customer.find(customerQuery);
        whatsAppSummary.eligible = eligibleCustomers.length;

        for (const cust of eligibleCustomers) {
          if (!cust.phone) continue;
          const cleanP = cust.phone.replace(/\D/g, '').slice(-10);

          // Prevent duplicate notification for same campaign
          if (coupon.notifiedCustomerPhones && coupon.notifiedCustomerPhones.includes(cleanP)) {
            whatsAppSummary.skippedDuplicate++;
            continue;
          }

          const msgResult = await WhatsAppService.sendMessage({
            phone: cust.phone,
            customerName: cust.fullName,
            customerId: cust._id,
            messageType: 'COUPON',
            templateName: 'coupon_voucher',
            content: WhatsAppService.buildCouponMessage({
              customerName: cust.fullName,
              couponCode: coupon.code,
              discountPercent: coupon.discountPercent,
              minPurchase: coupon.minPurchaseAmount,
              expiryDate: coupon.expiryDate
            }),
            shopId: req.user.shopId,
            sentBy: req.user._id,
            requiresConsent: true
          });

          if (msgResult.status === 'SENT' || msgResult.status === 'SIMULATED') {
            whatsAppSummary.sent++;
            coupon.notifiedCustomerPhones.push(cleanP);
          } else if (msgResult.status === 'OPTED_OUT') {
            whatsAppSummary.optedOut++;
          } else {
            whatsAppSummary.failed++;
          }
        }
        await coupon.save();
      }
    }

    emitRealtimeUpdate(req.app, 'coupon:updated', { coupon });

    res.status(201).json({
      success: true,
      message: `Coupon ${coupon.code} created successfully.${sendWhatsApp ? ` WhatsApp notifications dispatched to ${whatsAppSummary.sent} eligible consented customer(s).` : ''}`,
      coupon,
      whatsAppSummary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    Object.assign(coupon, req.body);
    if (req.body.code) coupon.code = req.body.code.toUpperCase().trim();
    await coupon.save();

    res.status(200).json({ success: true, message: 'Coupon updated successfully', coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.status(200).json({ success: true, message: `Coupon ${coupon.code} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendOfferWhatsAppBroadcast = async (req, res) => {
  try {
    const { offerName, offerDescription, discountPercent, couponCode, startDate, endDate, sendWhatsApp } = req.body;
    if (!offerName || !discountPercent || !couponCode) {
      return res.status(400).json({ success: false, message: 'Offer Name, Discount %, and Coupon Code are required.' });
    }

    if (!sendWhatsApp) {
      return res.status(200).json({ success: true, message: 'Offer saved (WhatsApp notification disabled).' });
    }

    const consentedCustomers = await Customer.find({ consentPromotionalWhatsApp: true });
    let sentCount = 0;
    let optedOutCount = 0;
    let failedCount = 0;

    for (const cust of consentedCustomers) {
      if (!cust.phone) continue;
      const result = await WhatsAppService.sendMessage({
        phone: cust.phone,
        customerName: cust.fullName,
        customerId: cust._id,
        messageType: 'OFFER',
        templateName: 'offer_notification',
        content: WhatsAppService.buildOfferMessage({
          customerName: cust.fullName,
          offerName,
          discountPercent,
          couponCode
        }),
        shopId: req.user.shopId,
        sentBy: req.user._id,
        requiresConsent: true
      });

      if (result.status === 'SENT' || result.status === 'SIMULATED') {
        sentCount++;
      } else if (result.status === 'OPTED_OUT') {
        optedOutCount++;
      } else {
        failedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Promotional offer dispatched to ${sentCount} consented customer(s).`,
      summary: { totalEligible: consentedCustomers.length, sentCount, optedOutCount, failedCount }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdminDashboardStats,
  getAdminCustomers,
  createAdminCustomer,
  updateAdminCustomer,
  deleteAdminCustomer,
  exportCustomersExcel,
  getAdminStaffList,
  createStaffAccount,
  updateStaffAccount,
  resetStaffPassword,
  deleteStaffAccount,
  getInventoryStatus,
  addPurchaseStockEntry,
  createSupplier,
  getShopSettings,
  updateShopSettings,
  getDeliverySettings,
  updateDeliverySettings,
  getGstSettings,
  updateGstSettings,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getWhatsAppLogs,
  getAdminOperationalAlerts,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  sendOfferWhatsAppBroadcast
};
