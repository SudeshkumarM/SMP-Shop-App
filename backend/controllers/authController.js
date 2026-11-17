const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Admin = require('../models/Admin');
const Owner = require('../models/Owner');
const Shop = require('../models/Shop');
const { createAndSendOtp, verifyOtp } = require('../services/otpService');
const { sendEmail } = require('../services/emailService');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      shopId: user.shopId,
      branchId: user.branchId
    },
    process.env.JWT_SECRET || 'smp_super_secure_jwt_secret_key_2026_production_ready',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * @desc    Step 1: Initiate Customer Registration and send Mobile OTP
 * @route   POST /api/auth/customer/register-initiate
 * @access  Public
 */
const initiateCustomerRegister = async (req, res) => {
  try {
    const { fullName, username, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const cleanUsername = username ? username.trim().toLowerCase() : email.split('@')[0].toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Check if user already exists
    const queryOr = [{ email: cleanEmail }, { phone: cleanPhone }];
    if (cleanUsername) queryOr.push({ username: cleanUsername });

    const existingUser = await User.findOne({ $or: queryOr });

    if (existingUser) {
      if (existingUser.username && existingUser.username === cleanUsername) {
        return res.status(400).json({ success: false, message: 'This username is already taken. Please choose another.' });
      }
      return res.status(400).json({
        success: false,
        message: 'An account with this email or mobile number already exists.'
      });
    }

    // Mandatory Mobile OTP only (No email OTP required per requirements)
    const otpResult = await createAndSendOtp(cleanPhone, 'REGISTRATION');

    res.status(200).json({
      success: true,
      message: 'Mobile OTP sent successfully. Please enter the OTP to complete registration.',
      phone: cleanPhone,
      email: cleanEmail,
      username: cleanUsername,
      expiresInMinutes: otpResult.expiresInMinutes,
      devOtp: otpResult.devOtp
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Step 2: Complete Customer Registration after successful Mobile OTP verification
 * @route   POST /api/auth/customer/register-verify
 * @access  Public
 */
const completeCustomerRegister = async (req, res) => {
  try {
    const { fullName, username, email, phone, password, address, city, state, pincode, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Mobile OTP is required' });
    }

    const cleanPhone = phone ? phone.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanUsername = username ? username.trim().toLowerCase() : cleanEmail.split('@')[0];

    // Verify Mobile OTP
    const verification = await verifyOtp(cleanPhone, otp, 'REGISTRATION');
    if (!verification.success) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    // Double check user doesn't already exist
    let user = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }, { username: cleanUsername }]
    });
    if (user) {
      return res.status(400).json({ success: false, message: 'User with these credentials already exists.' });
    }

    const defaultShop = await Shop.findOne({ isActive: true });

    // Create User record in MongoDB
    user = await User.create({
      name: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      password,
      role: 'customer',
      isPhoneVerified: true,
      shopId: defaultShop ? defaultShop._id : null
    });

    const customerCount = await Customer.countDocuments();
    const customerId = `CUST-${customerCount + 1001}`;

    const customer = await Customer.create({
      userId: user._id,
      customerId,
      fullName: user.name,
      username: cleanUsername,
      email: user.email,
      phone: cleanPhone,
      isPhoneVerified: true,
      addresses: address && city && state && pincode ? [{
        title: 'Home',
        street: address,
        city,
        state,
        pincode,
        country: 'India',
        isDefault: true
      }] : []
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      welcomeMessage: `Welcome ${user.name}!`,
      message: `Registration successful! Welcome to SMP, ${fullName}.`,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        customerId: customer.customerId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Customer Login (supports Username OR Email + Password)
 * @route   POST /api/auth/customer/login
 * @access  Public
 */
const loginCustomer = async (req, res) => {
  try {
    const { identifier, username, email, password } = req.body;
    const inputId = (identifier || username || email || '').trim();

    if (!inputId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide Username/Email and password' });
    }

    // Match by username, email, or phone
    const user = await User.findOne({
      $or: [
        { email: inputId.toLowerCase() },
        { username: inputId.toLowerCase() },
        { phone: inputId }
      ]
    }).select('+password');

    if (!user || user.role !== 'customer') {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const customer = await Customer.findOne({ userId: user._id });
    const token = generateToken(user);

    // Welcome greeting
    const welcomeGreeting = user.name.toLowerCase().includes('kumar')
      ? 'Welcome Kumar!'
      : `Welcome ${user.name}!`;

    res.status(200).json({
      success: true,
      welcomeMessage: welcomeGreeting,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username || user.email.split('@')[0],
        email: user.email,
        phone: user.phone,
        role: user.role,
        customerId: customer ? customer.customerId : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Staff Login (supports Username OR Email + Password)
 * @route   POST /api/auth/staff/login
 * @access  Public
 */
const loginStaff = async (req, res) => {
  try {
    const { staffIdOrEmail, identifier, username, email, password } = req.body;
    const inputId = (staffIdOrEmail || identifier || username || email || '').trim();

    if (!inputId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide Staff ID, Username or Email and password' });
    }

    // 1. Search Staff profile
    let staff = await Staff.findOne({
      $or: [
        { staffId: inputId.toUpperCase() },
        { email: inputId.toLowerCase() },
        { username: inputId.toLowerCase() }
      ]
    }).populate('shopId').populate('branchId');

    let user = null;
    if (staff) {
      user = await User.findById(staff.userId).select('+password');
    } else {
      user = await User.findOne({
        $or: [
          { email: inputId.toLowerCase() },
          { username: inputId.toLowerCase() }
        ]
      }).select('+password');
      if (user && user.role === 'staff') {
        staff = await Staff.findOne({ userId: user._id }).populate('shopId').populate('branchId');
      }
    }

    if (!user || !staff || user.role !== 'staff') {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    if (!staff.isActive || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Staff account has been deactivated. Please contact your Admin.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    const welcomeGreeting = user.name.toLowerCase().includes('kumar')
      ? 'Welcome Kumar!'
      : `Welcome ${user.name}!`;

    res.status(200).json({
      success: true,
      welcomeMessage: welcomeGreeting,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username || staff.username || user.email.split('@')[0],
        email: user.email,
        phone: user.phone,
        role: 'staff',
        staffId: staff.staffId,
        department: staff.department,
        jobRole: staff.jobRole || staff.designation,
        designation: staff.designation,
        canEditBills: staff.canEditBills || false,
        shopId: staff.shopId ? staff.shopId._id : null,
        shopName: staff.shopId ? staff.shopId.name : 'SMP Shop',
        branchId: staff.branchId ? staff.branchId._id : null,
        branchName: staff.branchId ? staff.branchId.name : 'Flagship Store'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Admin Login (supports Username OR Email + Password)
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
const loginAdmin = async (req, res) => {
  try {
    const { adminIdOrEmail, identifier, username, email, password } = req.body;
    const inputId = (adminIdOrEmail || identifier || username || email || '').trim();

    if (!inputId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide Admin ID, Username or Email and password' });
    }

    let admin = await Admin.findOne({
      $or: [
        { adminId: inputId.toUpperCase() },
        { email: inputId.toLowerCase() },
        { username: inputId.toLowerCase() }
      ]
    }).populate('shopId').populate('branchId');

    let user = null;
    if (admin) {
      user = await User.findById(admin.userId).select('+password');
    } else {
      user = await User.findOne({
        $or: [
          { email: inputId.toLowerCase() },
          { username: inputId.toLowerCase() }
        ]
      }).select('+password');
      if (user && user.role === 'admin') {
        admin = await Admin.findOne({ userId: user._id }).populate('shopId').populate('branchId');
      }
    }

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Admin account has been deactivated.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      welcomeMessage: `Welcome ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username || (admin ? admin.username : user.email.split('@')[0]),
        email: user.email,
        phone: user.phone,
        role: 'admin',
        adminId: admin ? admin.adminId : 'ADM-101',
        shopId: admin && admin.shopId ? admin.shopId._id : user.shopId,
        shopName: admin && admin.shopId ? admin.shopId.name : 'SMP Elite Fashions',
        branchId: admin && admin.branchId ? admin.branchId._id : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Owner Login (supports Username OR Email + Password)
 * @route   POST /api/auth/owner/login
 * @access  Public
 */
const loginOwner = async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body;
    const inputId = (email || username || identifier || '').trim();

    if (!inputId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide Owner Username or Email and password' });
    }

    const user = await User.findOne({
      $or: [
        { email: inputId.toLowerCase() },
        { username: inputId.toLowerCase() }
      ]
    }).select('+password');

    if (!user || user.role !== 'owner') {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const owner = await Owner.findOne({ userId: user._id });
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      welcomeMessage: `Welcome ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username || (owner ? owner.username : 'owner'),
        email: user.email,
        phone: user.phone,
        role: 'owner',
        ownerId: owner ? owner.ownerId : 'OWN-001',
        isMasterOwner: owner ? owner.isMasterOwner : true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Forgot Password - Send OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Please provide registered email, username or mobile number' });
    }

    const clean = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: clean },
        { username: clean },
        { phone: identifier.trim() }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account registered with this Username, Email, or Mobile.' });
    }

    const phoneOrEmail = user.phone || user.email;
    const otpResult = await createAndSendOtp(phoneOrEmail, 'FORGOT_PASSWORD');

    res.status(200).json({
      success: true,
      message: `Verification code sent to registered ${user.phone ? 'phone ending in ' + user.phone.slice(-4) : 'email'}.`,
      identifier: phoneOrEmail,
      devOtp: otpResult.devOtp
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Reset Password with OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const verification = await verifyOtp(identifier, otp, 'FORGOT_PASSWORD');
    if (!verification.success) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { username: identifier.toLowerCase().trim() },
        { phone: identifier.trim() }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Current User Profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let extraData = {};

    if (user.role === 'customer') {
      extraData = await Customer.findOne({ userId: user._id });
    } else if (user.role === 'staff') {
      extraData = await Staff.findOne({ userId: user._id }).populate('shopId').populate('branchId');
    } else if (user.role === 'admin') {
      extraData = await Admin.findOne({ userId: user._id }).populate('shopId').populate('branchId');
    } else if (user.role === 'owner') {
      extraData = await Owner.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      profile: extraData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update Profile Details
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, username, email, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    if (username && username.trim().toLowerCase() !== user.username) {
      const exists = await User.findOne({ username: username.trim().toLowerCase(), _id: { $ne: user._id } });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Username is already taken by another account.' });
      }
      user.username = username.trim().toLowerCase();
    }

    if (email && email.trim().toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: user._id } });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another account.' });
      }
      user.email = email.trim().toLowerCase();
    }

    await user.save();

    if (user.role === 'customer') {
      await Customer.findOneAndUpdate(
        { userId: user._id },
        { fullName: user.name, username: user.username, email: user.email, phone: user.phone }
      );
    } else if (user.role === 'staff') {
      await Staff.findOneAndUpdate(
        { userId: user._id },
        { fullName: user.name, username: user.username, email: user.email, phone: user.phone }
      );
    } else if (user.role === 'admin') {
      await Admin.findOneAndUpdate(
        { userId: user._id },
        { fullName: user.name, username: user.username, email: user.email, phone: user.phone }
      );
    } else if (user.role === 'owner') {
      await Owner.findOneAndUpdate(
        { userId: user._id },
        { fullName: user.name, username: user.username, email: user.email, phone: user.phone }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Change Password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  initiateCustomerRegister,
  completeCustomerRegister,
  loginCustomer,
  loginStaff,
  loginAdmin,
  loginOwner,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword
};
