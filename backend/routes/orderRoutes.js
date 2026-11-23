const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrdersForManagement,
  getOrderById,
  updateOrderStatus,
  cancelMyOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { customerSystemMaintenance } = require('../middleware/customerSystemMiddleware');

const maintenanceForCustomer = (req, res, next) => (
  req.user.role === 'customer'
    ? customerSystemMaintenance(req, res, next)
    : next()
);

router.post('/', protect, authorize('customer'), customerSystemMaintenance, createOrder);
router.get('/', protect, authorize('staff', 'admin', 'owner'), getOrdersForManagement);
router.get('/my-orders', protect, authorize('customer'), customerSystemMaintenance, getMyOrders);
router.get('/:id', protect, authorize('customer', 'staff', 'admin', 'owner'), maintenanceForCustomer, getOrderById);
router.put('/:id/status', protect, authorize('staff', 'admin', 'owner'), updateOrderStatus);
router.put('/:id/cancel', protect, authorize('customer'), customerSystemMaintenance, cancelMyOrder);

module.exports = router;
