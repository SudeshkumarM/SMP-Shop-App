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
    const { fullName, email, phone, isBlocked } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (fullName) customer.fullName = fullName;
    if (email) customer.email = email.toLowerCase();
    if (phone) customer.phone = phone;
    if (isBlocked !== undefined) customer.isBlocked = isBlocked;

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
    const shop = await Shop.findById(req.user.shopId);
    res.status(200).json({ success: true, shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShopSettings = async (req, res) => {
  try {
    const { name, contactPhone, contactEmail, gstNumber, address, settings } = req.body;
    const shop = await Shop.findById(req.user.shopId);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (name) shop.name = name;
    if (contactPhone) shop.contactPhone = contactPhone;
    if (contactEmail) shop.contactEmail = contactEmail;
    if (gstNumber) shop.gstNumber = gstNumber;
    if (address) shop.address = { ...shop.address, ...address };
    if (settings) shop.settings = { ...shop.settings, ...settings };

    await shop.save();
    res.status(200).json({ success: true, message: 'Shop settings updated successfully', shop });
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
  updateShopSettings
};
