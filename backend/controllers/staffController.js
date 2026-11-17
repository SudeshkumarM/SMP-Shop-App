const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');

/**
 * @desc    Get Staff Dashboard Overview
 * @route   GET /api/staff/dashboard-stats
 * @access  Private (Staff, Admin, Owner)
 */
const getStaffDashboardStats = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseFilter = { createdAt: { $gte: today } };
    if (shopId) baseFilter.shopId = shopId;

    // Today's POS Orders
    const todayOrders = await Order.find(baseFilter);
    const todaySales = todayOrders.reduce((sum, order) => sum + (order.grandTotal || 0), 0);
    const totalBills = todayOrders.length;

    // Unique customers served today
    const customerSet = new Set();
    todayOrders.forEach(o => {
      if (o.customerDetails && o.customerDetails.phone) {
        customerSet.add(o.customerDetails.phone);
      }
    });

    // Recent 10 transactions
    const recentFilter = shopId ? { shopId } : {};
    const recentTransactions = await Invoice.find(recentFilter)
      .sort({ createdAt: -1 })
      .limit(10);

    // Pending Orders
    const pendingOrdersCount = await Order.countDocuments({
      ...recentFilter,
      orderStatus: { $in: ['PLACED', 'CONFIRMED', 'PROCESSING'] }
    });

    // Available Products count
    const availableProducts = await Product.countDocuments({
      ...recentFilter,
      isActive: true,
      availableQuantity: { $gt: 0 }
    });

    // Staff profile info
    const staff = await Staff.findOne({ userId: req.user._id }).populate('shopId').populate('branchId');

    res.status(200).json({
      success: true,
      stats: {
        todaySales: Math.round(todaySales * 100) / 100,
        totalBills,
        totalCustomersServed: customerSet.size,
        pendingOrders: pendingOrdersCount,
        availableProducts,
        staffLifetimeBills: staff ? staff.totalBillsHandled : 0,
        staffLifetimeRevenue: staff ? staff.totalRevenueGenerated : 0
      },
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Customers for Staff
 * @route   GET /api/staff/customers
 * @access  Private (Staff, Admin, Owner)
 */
const getCustomers = async (req, res) => {
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

    res.status(200).json({
      success: true,
      total,
      customers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Quick Add Customer from Billing screen
 * @route   POST /api/staff/customers/quick-add
 * @access  Private (Staff, Admin, Owner)
 */
const addCustomerQuick = async (req, res) => {
  try {
    const { fullName, phone, email, city, street, pincode } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, message: 'Customer name and phone number are required' });
    }

    let existing = await Customer.findOne({ phone: phone.trim() });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Customer already exists',
        customer: existing
      });
    }

    const custCount = await Customer.countDocuments();
    const customerId = `CUST-${custCount + 1001}`;

    const customer = await Customer.create({
      userId: req.user._id,
      customerId,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : `pos_${phone.trim()}@smp.customer`,
      addresses: street || city ? [{
        title: 'Primary',
        street: street || '',
        city: city || '',
        state: 'Tamil Nadu',
        pincode: pincode || '600001',
        country: 'India',
        isDefault: true
      }] : []
    });

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      customer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Product Stock & Availability for Staff
 * @route   GET /api/staff/product-availability
 * @access  Private (Staff, Admin, Owner)
 */
const getProductAvailability = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (req.user.shopId) {
      filter.shopId = req.user.shopId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name')
      .sort({ availableQuantity: 1, name: 1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStaffDashboardStats,
  getCustomers,
  addCustomerQuick,
  getProductAvailability
};
