const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Admin = require('../models/Admin');
const Owner = require('../models/Owner');
const Shop = require('../models/Shop');
const {
  OtpServiceError,
  createAndSendOtp,
  verifyOtp,
  consumeOtp
} = require('../services/otpService');
const { sendEmail, sendLoginNotification } = require('../services/emailService');
const {
  INDIAN_MOBILE_PATTERN,
  normalizeEmail,
  normalizeIndianMobile,
  normalizeUsername,
  isStrongPassword,
  validateRegistration
} = require('../utils/authValidation');
const respondAuthError = (res, error, operation, fallbackMessage) => {
  if (error instanceof OtpServiceError) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'An account with one or more of these details already exists.'
    });
  }
  console.error(`[Auth] ${operation} failed (${error?.code || error?.name || 'unknown error'}).`);
  return res.status(500).json({ success: false, message: fallbackMessage });
};

const getCustomerAccess = async () => {
  const shop = await Shop.findOne({ isActive: true }).select('settings.customerAccess');
  const access = shop?.settings?.customerAccess;
  return {
    customerLoginEnabled: access?.customerLoginEnabled !== false,
    customerRegistrationEnabled: access?.customerRegistrationEnabled !== false,
    temporaryUnavailable: access?.temporaryUnavailable === true,
    unavailableTitle: access?.unavailableTitle || 'Temporarily Unavailable',
    unavailableMessage: access?.unavailableMessage || ''
  };
};

const sendCustomerAccessDisabled = (res, access, action) => res.status(403).json({
  success: false,
  code: 'CUSTOMER_ACCESS_DISABLED',
  message: action === 'register'
    ? 'Customer registration is temporarily unavailable.'
    : 'Customer login is temporarily unavailable.',
  title: access.unavailableTitle,
  maintenanceMessage: access.unavailableMessage || 'Customer services are temporarily unavailable. Please try again later.',
  access
});

const createCustomerCode = () =>
  `CUST-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const createCustomerAddresses = ({ address, city, state, pincode }) => {
  if (!address || !city || !state || !pincode) return [];
  return [{
    title: 'Home',
    street: address,
    city,
    state,
    pincode,
    country: 'India',
    isDefault: true
  }];
};

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
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * @desc    Create a customer account
 * @route   POST /api/auth/customer/register
 * @access  Public
 */
const registerCustomer = async (req, res) => {
  let user;
  let customer;
  try {
    const access = await getCustomerAccess();
    if (access.temporaryUnavailable || !access.customerRegistrationEnabled) {
      return sendCustomerAccessDisabled(res, access, 'register');
    }
    const validation = validateRegistration(req.body);
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const { fullName, username, email, phone, password } = validation.value;
    const duplicate = await User.findOne({
      $or: [{ email }, { phone }, { username }]
    }).select('_id username email phone');
    if (duplicate) {
      const field = duplicate.username === username
        ? 'username'
        : duplicate.email === email
          ? 'email'
          : 'mobile number';
      return res.status(409).json({
        success: false,
        message: `An account with this ${field} already exists.`
      });
    }

    const registration = {
      fullName,
      username,
      email,
      phone,
      address: String(req.body.address || '').trim(),
      city: String(req.body.city || '').trim(),
      state: String(req.body.state || '').trim(),
      pincode: String(req.body.pincode || '').trim()
    };
    const defaultShop = await Shop.findOne({ isActive: true }).select('_id');
    const customerId = createCustomerCode();
    
    // Create User with real password (bcrypt hashed by pre-save hook)
    user = await User.create({
      name: fullName,
      username,
      email,
      phone,
      password,
      role: 'customer',
      isPhoneVerified: false,
      shopId: defaultShop ? defaultShop._id : null
    });

    customer = await Customer.create({
      userId: user._id,
      customerId,
      fullName: user.name,
      username,
      email: user.email,
      phone,
      isPhoneVerified: false,
      addresses: createCustomerAddresses(registration)
    });

    await createAndSendOtp(email, 'EMAIL_VERIFICATION', { channel: 'email' });

    return res.status(202).json({
      success: true,
      requiresEmailVerification: true,
      welcomeMessage: `Welcome ${user.name}!`,
      message: `Registration successful. A verification code was sent to ${email}.`,
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
    if (customer?._id) {
      await Customer.deleteOne({ _id: customer._id }).catch(() => {
        console.error('[Auth] Customer profile rollback failed.');
      });
    }
    if (user?._id) {
      await User.deleteOne({ _id: user._id }).catch(() => {
        console.error('[Auth] User profile rollback failed.');
      });
    }
    return respondAuthError(res, error, 'customer registration', 'Registration could not be completed. Please try again.');
  }
};

const verifyCustomerEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address and 6-digit verification code.' });
    }

    const result = await verifyOtp(email, code, 'EMAIL_VERIFICATION', 'email');
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const user = await User.findOne({ email, role: 'customer' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer account was not found.' });
    }

    user.isEmailVerified = true;
    await user.save();
    await consumeOtp(result.otpId, 'EMAIL_VERIFICATION');

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now sign in.',
      user: { id: user._id, email: user.email, role: user.role, isEmailVerified: true }
    });
  } catch (error) {
    return respondAuthError(res, error, 'email verification', 'Email verification could not be completed.');
  }
};

const resendCustomerEmailVerification = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    const user = await User.findOne({ email, role: 'customer' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer account was not found.' });
    }
    if (user.isEmailVerified) {
      return res.status(200).json({ success: true, message: 'This email is already verified.' });
    }

    await createAndSendOtp(email, 'EMAIL_VERIFICATION', { channel: 'email' });
    return res.status(200).json({ success: true, message: 'A new verification code was sent.' });
  } catch (error) {
    return respondAuthError(res, error, 'email verification resend', 'Could not resend the verification code.');
  }
};

/**
 * @desc    Customer Login (supports Username OR Email + Password)
 * @route   POST /api/auth/customer/login
 * @access  Public
 */
const loginCustomer = async (req, res) => {
  try {
    const access = await getCustomerAccess();
    if (access.temporaryUnavailable || !access.customerLoginEnabled) {
      return sendCustomerAccessDisabled(res, access, 'login');
    }
    const { identifier, username, email, password } = req.body;
    const inputId = String(identifier || username || email || '').trim();

    if (!inputId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide your username, email, or mobile number and password.' });
    }

    const normalizedPhone = normalizeIndianMobile(inputId);
    const phoneFilters = INDIAN_MOBILE_PATTERN.test(normalizedPhone)
      ? [{ phone: normalizedPhone }, { phone: `+91${normalizedPhone}` }]
      : [{ phone: inputId }];
    
    const user = await User.findOne({
      $or: [
        { email: normalizeEmail(inputId) },
        { username: normalizeUsername(inputId) },
        ...phoneFilters
      ]
    }).select('+password');

    if (!user || user.role !== 'customer') {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    if (user.requiresPasswordReset) {
      return res.status(403).json({
        success: false,
        message: 'Password reset required. Please use the forgot password flow to set a new password.',
        requiresPasswordReset: true
      });
    }

    User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } }).exec().catch(() => {});

    const customer = await Customer.findOne({ userId: user._id }).lean();
    const token = generateToken(user);

    // Send login notification email (non-blocking)
    if (user.email) {
      sendLoginNotification({
        to: user.email,
        name: user.name,
        role: 'Customer',
        timestamp: new Date()
      }).catch(err => console.error('[Auth] Login notification failed:', err.message));
    }

    // Welcome greeting
    const welcomeGreeting = user.name.toLowerCase().includes('kumar')
      ? 'Welcome Kumar!'
      : `Welcome ${user.name}!`;

    return res.status(200).json({
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
    return respondAuthError(res, error, 'customer login', 'Login could not be completed. Please try again.');
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

    User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } }).exec().catch(() => {});

    const token = generateToken(user);

    // Send login notification email (non-blocking)
    if (user.email) {
      sendLoginNotification({
        to: user.email,
        name: user.name,
        role: 'Staff',
        timestamp: new Date()
      }).catch(err => console.error('[Auth] Login notification failed:', err.message));
    }

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
    return respondAuthError(res, error, 'staff login', 'Login could not be completed. Please try again.');
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

    User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } }).exec().catch(() => {});

    const token = generateToken(user);

    // Send login notification email (non-blocking)
    if (user.email) {
      sendLoginNotification({
        to: user.email,
        name: user.name,
        role: 'Admin',
        timestamp: new Date()
      }).catch(err => console.error('[Auth] Login notification failed:', err.message));
    }

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
    return respondAuthError(res, error, 'admin login', 'Login could not be completed. Please try again.');
  }
};

/**
 * @desc    One-Time Initial Master Owner Setup (Locked once an owner exists)
 * @route   POST /api/auth/owner/setup-initial
 * @access  Protected One-Time Setup
 */
const setupInitialOwner = async (req, res) => {
  try {
    const setupToken = process.env.OWNER_SETUP_TOKEN;
    const providedToken = req.get('x-owner-setup-token') || '';
    if (!setupToken || setupToken.length < 32) {
      return res.status(503).json({
        success: false,
        message: 'Secure owner initialization is not configured. Use the authorized owner setup procedure.'
      });
    }
    const expectedBuffer = Buffer.from(setupToken);
    const providedBuffer = Buffer.from(providedToken);
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return res.status(401).json({ success: false, message: 'Owner initialization is not authorized.' });
    }

    const existingOwnerCount = await User.countDocuments({ role: 'owner' });
    if (existingOwnerCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Security Policy: Master Owner account has already been configured. Public creation is disabled.'
      });
    }

    const { name, username, email, password, phone } = req.body;
    const validation = validateRegistration({
      fullName: name,
      username,
      email,
      phone,
      password
    });
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const credentials = validation.value;
    const user = await User.create({
      name: credentials.fullName,
      username: credentials.username,
      email: credentials.email,
      password: credentials.password,
      phone: credentials.phone,
      role: 'owner',
      isActive: true,
      isEmailVerified: false
    });

    const owner = await Owner.create({
      userId: user._id,
      ownerId: 'OWN-001',
      username: user.username,
      fullName: user.name,
      email: user.email,
      phone: user.phone,
      isMasterOwner: true
    });

    const token = generateToken(user);
    res.status(201).json({
      success: true,
      message: 'Master Owner configured successfully. Initial setup is now permanently locked.',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: 'owner',
        ownerId: owner.ownerId
      }
    });
  } catch (err) {
    return respondAuthError(res, err, 'owner initialization', 'Owner account could not be initialized.');
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
      return res.status(400).json({ success: false, message: 'Please provide Owner Username, Email, or Mobile Number and password' });
    }

    const normalizedPhone = normalizeIndianMobile(inputId);
    const phoneFilters = INDIAN_MOBILE_PATTERN.test(normalizedPhone)
      ? [{ phone: normalizedPhone }, { phone: `+91${normalizedPhone}` }]
      : [{ phone: inputId }];

    const user = await User.findOne({
      $or: [
        { email: inputId.toLowerCase() },
        { username: inputId.toLowerCase() },
        ...phoneFilters
      ]
    }).select('+password');

    if (!user || user.role !== 'owner') {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Username/Email or Password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Owner account has been deactivated.' });
    }

    User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } }).exec().catch(() => {});

    const owner = await Owner.findOne({ userId: user._id }).lean();
    const token = generateToken(user);

    // Send login notification email (non-blocking)
    if (user.email) {
      sendLoginNotification({
        to: user.email,
        name: user.name,
        role: 'Owner',
        timestamp: new Date()
      }).catch(err => console.error('[Auth] Login notification failed:', err.message));
    }

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
    return respondAuthError(res, error, 'owner login', 'Login could not be completed. Please try again.');
  }
};

/**
 * @desc    Forgot Password - Send OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { identifier, channel: requestedChannel } = req.body;
    const cleanIdentifier = String(identifier || '').trim();
    const channel = requestedChannel || (cleanIdentifier.includes('@') ? 'email' : 'sms');
    if (!cleanIdentifier || !['sms', 'email'].includes(channel)) {
      return res.status(400).json({
        success: false,
        message: 'Enter the registered email address or mobile number and choose its matching recovery method.'
      });
    }

    const normalizedIdentifier = channel === 'email'
      ? normalizeEmail(cleanIdentifier)
      : normalizeIndianMobile(cleanIdentifier);
    if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) {
      return res.status(400).json({ success: false, message: 'Enter a valid registered email address.' });
    }
    if (channel === 'sms' && !/^[6-9]\d{9}$/.test(normalizedIdentifier)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number.' });
    }

    const user = await User.findOne(
      channel === 'email' ? { email: normalizedIdentifier } : { phone: normalizedIdentifier }
    ).select('_id email phone');

    if (user) {
      const destination = channel === 'email' ? user.email : user.phone;
      await createAndSendOtp(destination, 'FORGOT_PASSWORD', { channel });
    }

    return res.status(202).json({
      success: true,
      channel,
      message: 'If an account matches those details, a verification code has been requested for the selected recovery method.'
    });
  } catch (error) {
    return respondAuthError(res, error, 'password recovery code request', 'Could not start password recovery. Please try again.');
  }
};

/**
 * @desc    Reset Password with OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { identifier, otp, newPassword, channel: requestedChannel } = req.body;
    const cleanIdentifier = String(identifier || '').trim();
    const channel = requestedChannel || (cleanIdentifier.includes('@') ? 'email' : 'sms');

    if (!cleanIdentifier || !otp || !newPassword || !['sms', 'email'].includes(channel)) {
      return res.status(400).json({ success: false, message: 'Recovery method, identifier, code, and new password are required.' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8-128 characters and include uppercase, lowercase, and numeric characters.'
      });
    }

    const normalizedIdentifier = channel === 'email'
      ? normalizeEmail(cleanIdentifier)
      : normalizeIndianMobile(cleanIdentifier);
    const verification = await verifyOtp(normalizedIdentifier, otp, 'FORGOT_PASSWORD', channel);
    if (!verification.success) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    const user = await User.findOne(
      channel === 'email' ? { email: normalizedIdentifier } : { phone: normalizedIdentifier }
    ).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    user.requiresPasswordReset = false;
    await user.save();
    await consumeOtp(verification.otpId, 'FORGOT_PASSWORD');

    return res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    return respondAuthError(res, error, 'password reset', 'Password could not be reset. Please try again.');
  }
};

/**
 * @desc    Forgot Password - Email Recovery Token
 * @route   POST /api/auth/forgot-password-email
 * @access  Public
 */
const forgotPasswordEmail = async (req, res) => {
  req.body = { ...req.body, identifier: req.body?.email, channel: 'email' };
  return forgotPassword(req, res);
};

/**
 * @desc    Reset Password with Token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPasswordWithToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8-128 characters and include uppercase, lowercase, and numeric characters.'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link. Please request a new one.'
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.requiresPasswordReset = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    return respondAuthError(res, error, 'legacy password reset', 'Password could not be reset. Please try again.');
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
    return respondAuthError(res, error, 'profile retrieval', 'Profile could not be loaded. Please try again.');
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

    let emailPendingVerification = false;
    if (email && email.trim().toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: user._id } });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another account.' });
      }

      if (user.role === 'owner') {
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.pendingEmail = email.trim().toLowerCase();
        user.emailVerificationToken = verifyCode;
        user.emailVerificationExpire = new Date(Date.now() + 15 * 60 * 1000);
        emailPendingVerification = true;

        await sendEmail({
          to: user.pendingEmail,
          subject: 'SMP Master Owner - Verify Your New Email Address',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #1E3A70; border-radius: 8px; background: #101B3F; color: #FFFFFF;">
              <h2 style="color: #38BDF8; margin-top: 0;">SMP Master Owner Security</h2>
              <p>You requested to update your Master Owner email address to <strong>${user.pendingEmail}</strong>.</p>
              <p>Use the following 6-digit verification code to activate your new email:</p>
              <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #F97316; margin: 15px 0;">${verifyCode}</div>
              <p style="color: #94A3B8; font-size: 13px;">This code will expire in 15 minutes. If you did not request this change, please ignore this email.</p>
            </div>
          `
        });
      } else {
        user.email = email.trim().toLowerCase();
      }
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
      requiresEmailVerification: emailPendingVerification,
      message: emailPendingVerification
        ? `Profile saved. A 6-digit verification code was sent to ${user.pendingEmail}. Please verify to activate it.`
        : 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        pendingEmail: user.pendingEmail,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    return respondAuthError(res, error, 'profile update', 'Profile could not be updated. Please try again.');
  }
};

/**
 * @desc    Verify and activate new Email Address for Owner/User
 * @route   POST /api/auth/verify-email-change
 * @access  Private
 */
const verifyEmailChange = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide the 6-digit verification code.' });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.pendingEmail || !user.emailVerificationToken) {
      return res.status(400).json({ success: false, message: 'No pending email change request found.' });
    }

    if (user.emailVerificationExpire && user.emailVerificationExpire < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please update email again.' });
    }

    if (user.emailVerificationToken !== code.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
    }

    user.email = user.pendingEmail;
    user.isEmailVerified = true;
    user.pendingEmail = null;
    user.emailVerificationToken = null;
    user.emailVerificationExpire = null;
    await user.save();

    if (user.role === 'owner') {
      await Owner.findOneAndUpdate(
        { userId: user._id },
        { email: user.email }
      );
    }

    res.status(200).json({
      success: true,
      message: 'New email address verified and activated successfully!',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: true
      }
    });
  } catch (error) {
    return respondAuthError(res, error, 'email verification', 'Email verification could not be completed. Please try again.');
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

    if (!user || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    }

    const mongoPasswordMatches = await user.matchPassword(currentPassword);
    if (!mongoPasswordMatches) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8-128 characters and include uppercase, lowercase, and numeric characters.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return respondAuthError(res, error, 'password change', 'Password could not be changed. Please try again.');
  }
};

module.exports = {
  registerCustomer,
  loginCustomer,
  loginStaff,
  loginAdmin,
  loginOwner,
  setupInitialOwner,
  forgotPassword,
  resetPassword,
  forgotPasswordEmail,
  resetPasswordWithToken,
  getMe,
  updateProfile,
  verifyEmailChange,
  changePassword,
  verifyCustomerEmail,
  resendCustomerEmailVerification,
  generateToken
};
