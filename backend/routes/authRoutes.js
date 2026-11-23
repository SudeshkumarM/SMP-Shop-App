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
  changePassword,
  verifyCustomerEmail,
  resendCustomerEmailVerification
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { customerSystemMaintenance } = require('../middleware/customerSystemMiddleware');
const {
  loginRateLimiter,
  registrationRateLimiter,
  recoveryRateLimiter
} = require('../middleware/rateLimiter');

// Customer Auth
router.post('/customer/register', registrationRateLimiter, customerSystemMaintenance, registerCustomer);
router.post('/customer/login', loginRateLimiter, customerSystemMaintenance, loginCustomer);
router.post('/customer/verify-email', registrationRateLimiter, customerSystemMaintenance, verifyCustomerEmail);
router.post('/customer/resend-verification', registrationRateLimiter, customerSystemMaintenance, resendCustomerEmailVerification);

// Staff Auth
router.post('/staff/login', loginRateLimiter, loginStaff);

// Admin Auth
router.post('/admin/login', loginRateLimiter, loginAdmin);

// Owner Auth
router.post('/owner/login', loginRateLimiter, loginOwner);
router.post('/owner/setup-initial', recoveryRateLimiter, setupInitialOwner);

// Password recovery
router.post('/forgot-password', recoveryRateLimiter, customerSystemMaintenance, forgotPassword);
router.post('/reset-password', recoveryRateLimiter, customerSystemMaintenance, resetPassword);
router.post('/forgot-password-email', recoveryRateLimiter, customerSystemMaintenance, forgotPasswordEmail);
router.post('/reset-password/:token', recoveryRateLimiter, customerSystemMaintenance, resetPasswordWithToken);

// Profile
router.get('/me', protect, customerSystemMaintenance, getMe);
router.put('/profile', protect, customerSystemMaintenance, updateProfile);
router.post('/verify-email-change', protect, customerSystemMaintenance, verifyEmailChange);
router.put('/change-password', protect, customerSystemMaintenance, changePassword);

module.exports = router;
