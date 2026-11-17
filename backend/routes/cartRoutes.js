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

router.get('/', optionalAuth, getCart);
router.post('/add', optionalAuth, addToCart);
router.put('/update', optionalAuth, updateCartItem);
router.delete('/item/:itemId', optionalAuth, removeCartItem);
router.post('/merge', protect, mergeGuestCart);

module.exports = router;
