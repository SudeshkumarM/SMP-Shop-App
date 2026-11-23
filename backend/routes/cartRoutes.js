const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  mergeGuestCart
} = require('../controllers/cartController');
const { optionalAuth, protect } = require('../middleware/authMiddleware');
const { customerSystemMaintenance } = require('../middleware/customerSystemMiddleware');

router.get('/', optionalAuth, customerSystemMaintenance, getCart);
router.post('/add', optionalAuth, customerSystemMaintenance, addToCart);
router.put('/update', optionalAuth, customerSystemMaintenance, updateCartItem);
router.delete('/item/:itemId', optionalAuth, customerSystemMaintenance, removeCartItem);
router.post('/merge', protect, customerSystemMaintenance, mergeGuestCart);

module.exports = router;
