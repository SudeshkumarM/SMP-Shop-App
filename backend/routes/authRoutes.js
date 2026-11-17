const express = require('express');
const router = express.Router();
const {
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

// Password recovery
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Profile
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
