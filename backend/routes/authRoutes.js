const express = require('express');
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
const {
  loginRateLimiter,
  registrationRateLimiter,
  recoveryRateLimiter
} = require('../middleware/rateLimiter');

// Customer Auth
router.post('/customer/register', registrationRateLimiter, registerCustomer);
router.post('/customer/login', loginRateLimiter, loginCustomer);

// Staff Auth
router.post('/staff/login', loginRateLimiter, loginStaff);

// Admin Auth
router.post('/admin/login', loginRateLimiter, loginAdmin);

// Owner Auth
router.post('/owner/login', loginRateLimiter, loginOwner);
router.post('/owner/setup-initial', recoveryRateLimiter, setupInitialOwner);

// Password recovery
router.post('/forgot-password', recoveryRateLimiter, forgotPassword);
router.post('/reset-password', recoveryRateLimiter, resetPassword);
router.post('/forgot-password-email', recoveryRateLimiter, forgotPasswordEmail);
router.post('/reset-password/:token', recoveryRateLimiter, resetPasswordWithToken);

// Profile
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/verify-email-change', protect, verifyEmailChange);
router.put('/change-password', protect, changePassword);

module.exports = router;
