const express = require('express');
const router = express.Router();
const {
  searchProductPOS,
  createBillingTransaction,
  verifyQrPaymentAndBill,
  getBillingHistory,
  getCompleteBillHistory,
  exportAllBillsExcel,
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
router.post('/verify-qr-payment', verifyQrPaymentAndBill);
router.get('/history', getBillingHistory);
router.get('/complete-history', authorize('admin', 'owner'), getCompleteBillHistory);
router.get('/export-excel', authorize('admin', 'owner'), exportAllBillsExcel);
router.get('/invoice/:id', getInvoiceById);

// Bill correction and deletion
router.put('/invoice/:id', updateBill);
router.delete('/invoice/:id', authorize('admin', 'owner'), deleteBill);

module.exports = router;
