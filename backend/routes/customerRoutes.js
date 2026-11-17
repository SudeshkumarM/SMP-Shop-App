const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAddresses,
  addAddress,
  deleteAddress
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('customer'));

router.get('/wishlist', getWishlist);
router.post('/wishlist/:productId', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.delete('/addresses/:addressId', deleteAddress);

module.exports = router;
