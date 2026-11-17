const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelMyOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('customer'), createOrder);
router.get('/my-orders', protect, authorize('customer'), getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, authorize('staff', 'admin', 'owner'), updateOrderStatus);
router.put('/:id/cancel', protect, authorize('customer'), cancelMyOrder);

module.exports = router;
