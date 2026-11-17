const express = require('express');
const router = express.Router();
const {
  searchProductPOS,
  createBillingTransaction,
  getBillingHistory,
  getInvoiceById,
  updateBill,
  deleteBill,
  lookupCustomerByPhone
} = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('staff', 'admin', 'owner'));

router.get('/search-product', searchProductPOS);
router.get('/customer-lookup/:phone', lookupCustomerByPhone);
router.post('/create-bill', createBillingTransaction);
router.get('/history', getBillingHistory);
router.get('/invoice/:id', getInvoiceById);

// Bill correction and deletion
router.put('/invoice/:id', updateBill);
router.delete('/invoice/:id', authorize('admin', 'owner'), deleteBill);

module.exports = router;
