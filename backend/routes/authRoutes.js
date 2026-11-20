const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
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
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification requests. Please try again later.' }
});

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' }
});

// Customer Auth
router.post('/customer/register', registrationLimiter, registerCustomer);
router.post('/customer/login', loginLimiter, loginCustomer);

// Staff Auth
router.post('/staff/login', loginLimiter, loginStaff);

// Admin Auth
router.post('/admin/login', loginLimiter, loginAdmin);

// Owner Auth
router.post('/owner/login', loginLimiter, loginOwner);
router.post('/owner/setup-initial', verificationLimiter, setupInitialOwner);

// Password recovery
router.post('/forgot-password', verificationLimiter, forgotPassword);
router.post('/reset-password', verificationLimiter, resetPassword);
router.post('/forgot-password-email', verificationLimiter, forgotPasswordEmail);
router.post('/reset-password/:token', verificationLimiter, resetPasswordWithToken);

// Profile
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/verify-email-change', protect, verifyEmailChange);
router.put('/change-password', protect, changePassword);

module.exports = router;
