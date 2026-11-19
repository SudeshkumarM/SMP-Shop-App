const express = require('express');
const router = express.Router();
const {
  initiateCustomerRegister,
  completeCustomerRegister,
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

// Customer Auth
router.post('/customer/register-initiate', initiateCustomerRegister);
router.post('/customer/register-verify', completeCustomerRegister);
router.post('/customer/login', loginCustomer);

// Staff Auth
router.post('/staff/login', loginStaff);

// Admin Auth
router.post('/admin/login', loginAdmin);

// Owner Auth
router.post('/owner/login', loginOwner);
router.post('/owner/setup-initial', setupInitialOwner);

// Password recovery
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/forgot-password-email', forgotPasswordEmail);
router.post('/reset-password/:token', resetPasswordWithToken);

// Profile
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/verify-email-change', protect, verifyEmailChange);
router.put('/change-password', protect, changePassword);

module.exports = router;
