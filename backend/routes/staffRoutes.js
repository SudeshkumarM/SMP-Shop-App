const express = require('express');
const router = express.Router();
const {
  getStaffDashboardStats,
  getCustomers,
  addCustomerQuick,
  getProductAvailability
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('staff', 'admin', 'owner'));

router.get('/dashboard-stats', getStaffDashboardStats);
router.get('/customers', getCustomers);
router.post('/customers/quick-add', addCustomerQuick);
router.get('/product-availability', getProductAvailability);

module.exports = router;
