const Shop = require('../models/Shop');
const Branch = require('../models/Branch');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Investment = require('../models/Investment');
const Expense = require('../models/Expense');
const Invoice = require('../models/Invoice');

/**
 * @desc    Get Owner Master Dashboard & Corporate Analytics
 * @route   GET /api/owner/dashboard-stats
 * @access  Private (Owner)
 */
const getOwnerDashboardStats = async (req, res) => {
  try {
    // 1. High-Level Entity Counts
    const totalShops = await Shop.countDocuments();
    const totalBranches = await Branch.countDocuments();
    const totalAdmins = await Admin.countDocuments({ isActive: true });
    const totalStaff = await Staff.countDocuments({ isActive: true });
    const totalCustomers = await Customer.countDocuments();
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();

    // 2. Financial Calculations
    // A. Total Revenue & Cost of Goods Sold
    const orders = await Order.find({ paymentStatus: { $in: ['PAID', 'PENDING'] } });
    const totalRevenue = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const totalPurchaseCost = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const gstCollection = Math.round(orders.reduce((sum, o) => sum + (o.totalGst || 0), 0) * 100) / 100;
    const totalBills = await Invoice.countDocuments({ isDeleted: false });

    // B. Total Operating Expenses
    const expenses = await Expense.find();
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // C. Total Investments
    const investments = await Investment.find();
    const totalInvestment = investments.reduce((sum, i) => sum + (i.amount || 0), 0);

    // D. True Mathematical Profit
    // Gross Profit = Revenue - Purchase Cost of sold items
    const grossProfit = Math.round((totalRevenue - totalPurchaseCost) * 100) / 100;
    // Net Profit = Gross Profit - Operating Expenses
    const netProfit = Math.round((grossProfit - totalExpenses) * 100) / 100;

    // E. Time-sliced profits (Daily, Monthly, Yearly)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const todayOrders = orders.filter(o => o.createdAt >= startOfToday);
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const todayCost = todayOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const todayExpenses = expenses.filter(e => e.date >= startOfToday).reduce((sum, e) => sum + (e.amount || 0), 0);
    const dailyProfit = Math.round(((todaySales - todayCost) - todayExpenses) * 100) / 100;

    const monthOrders = orders.filter(o => o.createdAt >= startOfMonth);
    const monthSales = monthOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const monthCost = monthOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const monthExpenses = expenses.filter(e => e.date >= startOfMonth).reduce((sum, e) => sum + (e.amount || 0), 0);
    const monthlyProfit = Math.round(((monthSales - monthCost) - monthExpenses) * 100) / 100;

    const yearOrders = orders.filter(o => o.createdAt >= startOfYear);
    const yearSales = yearOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const yearCost = yearOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const yearExpenses = expenses.filter(e => e.date >= startOfYear).reduce((sum, e) => sum + (e.amount || 0), 0);
    const yearlyProfit = Math.round(((yearSales - yearCost) - yearExpenses) * 100) / 100;

    // F. Business Performance Rating
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    let businessPerformance = 'Healthy Growth';
    if (netProfit > 50000) businessPerformance = 'Exceptional - High Margin';
    else if (netProfit > 0) businessPerformance = 'Positive Operational Net';
    else if (netProfit < 0) businessPerformance = 'Initial Scaling Phase (Capex Absorption)';

    // 3. Shop-Wise Performance Breakdown
    const shops = await Shop.find().sort({ createdAt: -1 });
    const shopPerformance = await Promise.all(
      shops.map(async (s) => {
        const sOrders = await Order.find({ shopId: s._id });
        const sRevenue = sOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        const sCost = sOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
        const sExpenses = await Expense.find({ shopId: s._id });
        const sExpTotal = sExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const sStaffCount = await Staff.countDocuments({ shopId: s._id });
        const sProductCount = await Product.countDocuments({ shopId: s._id });

        const sGross = sRevenue - sCost;
        const sNet = sGross - sExpTotal;

        return {
          shopId: s._id,
          name: s.name,
          category: s.category,
          isActive: s.isActive,
          revenue: Math.round(sRevenue * 100) / 100,
          expenses: Math.round(sExpTotal * 100) / 100,
          netProfit: Math.round(sNet * 100) / 100,
          ordersCount: sOrders.length,
          staffCount: sStaffCount,
          productCount: sProductCount
        };
      })
    );

    // 4. Monthly Trend Data (Last 6 Months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const mOrders = await Order.find({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } });
      const mRev = mOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      const mCost = mOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);

      const mExpenses = await Expense.find({ date: { $gte: startOfMonth, $lte: endOfMonth } });
      const mExp = mExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      const mGross = mRev - mCost;
      const mNet = mGross - mExp;

      const monthName = d.toLocaleString('default', { month: 'short' });
      monthlyTrends.push({
        month: monthName,
        revenue: Math.round(mRev),
        expenses: Math.round(mExp),
        grossProfit: Math.round(mGross),
        netProfit: Math.round(mNet)
      });
    }

    res.status(200).json({
      success: true,
      kpis: {
        totalShops,
        totalBranches,
        totalAdmins,
        totalStaff,
        totalCustomers,
        totalProducts,
        totalOrders,
        totalInvestment: Math.round(totalInvestment * 100) / 100,
        totalSales: Math.round(totalRevenue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalPurchaseCost: Math.round(totalPurchaseCost * 100) / 100,
        grossProfit,
        netProfit,
        dailyProfit,
        monthlyProfit,
        yearlyProfit,
        gstCollection,
        totalBills,
        businessPerformance,
        grossMarginPercent: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
        netMarginPercent: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0
      },
      shopPerformance,
      monthlyTrends
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * STORE MANAGEMENT (OWNER)
 * ====================================================
 */
const getShops = async (req, res) => {
  try {
    const shops = await Shop.find().populate('ownerId', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, shops });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createShop = async (req, res) => {
  try {
    const { name, category, shopCode, contactEmail, contactPhone, street, city, state, pincode, gstNumber, description } = req.body;

    const existingCode = await Shop.findOne({ shopCode: shopCode.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ success: false, message: 'Shop Code already exists' });
    }

    const shop = await Shop.create({
      shopCode: shopCode.toUpperCase().trim(),
      name: name.trim(),
      category: category || 'Dress & Apparel',
      description: description || '',
      contactEmail: contactEmail.toLowerCase().trim(),
      contactPhone: contactPhone.trim(),
      gstNumber: gstNumber || '33AAAAA0000A1Z5',
      address: { street, city, state, pincode, country: 'India' },
      ownerId: req.user._id,
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        defaultGstPercent: 5,
        lowStockThreshold: 10,
        invoicePrefix: shopCode.toUpperCase().slice(0, 3)
      }
    });

    // Create Main Branch for this shop automatically
    await Branch.create({
      branchCode: `${shopCode.toUpperCase()}-B01`,
      shopId: shop._id,
      name: `${name} - Main Branch`,
      address: { street, city, state, pincode },
      phone: contactPhone,
      email: contactEmail,
      isMainBranch: true
    });

    res.status(201).json({ success: true, message: 'Shop created successfully', shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    res.status(200).json({ success: true, message: 'Shop details updated', shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    shop.isActive = false;
    await shop.save();
    res.status(200).json({ success: true, message: 'Shop deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * BRANCH MANAGEMENT (OWNER)
 * ====================================================
 */
const getBranches = async (req, res) => {
  try {
    const { shopId } = req.query;
    const filter = shopId ? { shopId } : {};
    const branches = await Branch.find(filter).populate('shopId', 'name category').sort({ createdAt: -1 });
    res.status(200).json({ success: true, branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBranch = async (req, res) => {
  try {
    const { shopId, branchCode, name, phone, email, street, city, state, pincode } = req.body;

    const branch = await Branch.create({
      shopId,
      branchCode: branchCode.toUpperCase().trim(),
      name: name.trim(),
      phone,
      email,
      address: { street, city, state, pincode }
    });

    res.status(201).json({ success: true, message: 'Branch created successfully', branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * ADMIN ACCOUNTS MANAGEMENT (OWNER)
 * ====================================================
 */
const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().populate('shopId', 'name').populate('branchId', 'name').sort({ createdAt: -1 });
    res.status(200).json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { fullName, email, phone, shopId, branchId, password } = req.body;

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email or phone already exists' });
    }

    const adminCount = await Admin.countDocuments();
    const adminId = `ADM-${adminCount + 101}`;

    const user = await User.create({
      name: fullName,
      email: email.toLowerCase(),
      phone,
      password: password || 'Admin123!',
      role: 'admin',
      shopId,
      branchId: branchId || null
    });

    const admin = await Admin.create({
      userId: user._id,
      adminId,
      shopId,
      branchId: branchId || null,
      fullName,
      email: user.email,
      phone
    });

    res.status(201).json({ success: true, message: 'Admin account created successfully', admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { fullName, email, phone, shopId, isActive } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (fullName) admin.fullName = fullName;
    if (email) admin.email = email.toLowerCase();
    if (phone) admin.phone = phone;
    if (shopId) admin.shopId = shopId;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();
    await User.findByIdAndUpdate(admin.userId, {
      name: admin.fullName,
      email: admin.email,
      phone: admin.phone,
      shopId: admin.shopId,
      isActive: admin.isActive
    });

    res.status(200).json({ success: true, message: 'Admin updated successfully', admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    await User.findByIdAndDelete(admin.userId);
    await Admin.findByIdAndDelete(admin._id);
    res.status(200).json({ success: true, message: 'Admin deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * INVESTMENT MANAGEMENT (OWNER)
 * ====================================================
 */
const getInvestments = async (req, res) => {
  try {
    const { shopId } = req.query;
    const filter = shopId ? { shopId } : {};
    const investments = await Investment.find(filter).populate('shopId', 'name').sort({ date: -1 });

    const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);

    res.status(200).json({ success: true, totalInvestment, investments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createInvestment = async (req, res) => {
  try {
    const { title, amount, category, shopId, branchId, sourceOfFunds, notes, date } = req.body;

    const count = await Investment.countDocuments();
    const investmentId = `INV-${Date.now().toString().slice(-6)}-${count + 1}`;

    const investment = await Investment.create({
      investmentId,
      shopId,
      branchId: branchId || null,
      title,
      amount: Number(amount),
      category,
      sourceOfFunds: sourceOfFunds || 'Owner Equity',
      notes: notes || '',
      date: date || new Date(),
      recordedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Investment recorded successfully', investment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * EXPENSE MANAGEMENT (OWNER)
 * ====================================================
 */
const getExpenses = async (req, res) => {
  try {
    const { shopId, category } = req.query;
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (category) filter.category = category;

    const expenses = await Expense.find(filter).populate('shopId', 'name').sort({ date: -1 });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.status(200).json({ success: true, totalExpenses, expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const { title, amount, category, shopId, branchId, paymentMethod, vendorName, invoiceNumber, notes, date } = req.body;

    const count = await Expense.countDocuments();
    const expenseId = `EXP-${Date.now().toString().slice(-6)}-${count + 1}`;

    const expense = await Expense.create({
      expenseId,
      shopId,
      branchId: branchId || null,
      title,
      amount: Number(amount),
      category,
      paymentMethod: paymentMethod || 'Bank Transfer',
      vendorName: vendorName || '',
      invoiceNumber: invoiceNumber || '',
      notes: notes || '',
      date: date || new Date(),
      approvedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Expense recorded successfully', expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ====================================================
 * PROFIT & LOSS MANAGEMENT (OWNER)
 * ====================================================
 */
const getProfitLossReport = async (req, res) => {
  try {
    const { shopId, startDate, endDate } = req.query;

    const orderFilter = { paymentStatus: { $in: ['PAID', 'PENDING'] } };
    const expFilter = {};

    if (shopId) {
      orderFilter.shopId = shopId;
      expFilter.shopId = shopId;
    }

    if (startDate || endDate) {
      orderFilter.createdAt = {};
      expFilter.date = {};
      if (startDate) {
        orderFilter.createdAt.$gte = new Date(startDate);
        expFilter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        orderFilter.createdAt.$lte = end;
        expFilter.date.$lte = end;
      }
    }

    const orders = await Order.find(orderFilter);
    const expenses = await Expense.find(expFilter);

    // Revenue
    const totalSalesRevenue = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    // Cost of Goods Sold (Purchase Cost)
    const costOfGoodsSold = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    // Gross Profit
    const grossProfit = Math.round((totalSalesRevenue - costOfGoodsSold) * 100) / 100;

    // Operating Expenses breakdown by category
    const expenseBreakdown = {};
    let totalOperatingExpenses = 0;
    expenses.forEach(e => {
      totalOperatingExpenses += e.amount;
      expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount;
    });

    // Net Profit
    const netProfit = Math.round((grossProfit - totalOperatingExpenses) * 100) / 100;

    // Margins
    const grossMarginPercent = totalSalesRevenue > 0 ? Math.round((grossProfit / totalSalesRevenue) * 1000) / 10 : 0;
    const netMarginPercent = totalSalesRevenue > 0 ? Math.round((netProfit / totalSalesRevenue) * 1000) / 10 : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
        costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
        grossProfit,
        totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
        netProfit,
        grossMarginPercent,
        netMarginPercent,
        ordersProcessed: orders.length
      },
      expenseBreakdown
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOwnerDashboardStats,
  getShops,
  createShop,
  updateShop,
  deleteShop,
  getBranches,
  createBranch,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getInvestments,
  createInvestment,
  getExpenses,
  createExpense,
  getProfitLossReport
};
