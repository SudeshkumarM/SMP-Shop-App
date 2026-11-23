const express = require('express');
const router = express.Router();
const {
  getBillingSettings,
  getBillingPaymentQrs,
  lookupProductPOS,
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
const { scannerFeatureEnabled } = require('../middleware/scannerFeatureMiddleware');

const requireAdminOrOwnerForBillManagement = (req, res, next) => {
  if (!['admin', 'owner'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Only Admin or Owner users can edit or delete bills.'
    });
  }
  return next();
};

router.use(protect);
router.use(authorize('staff', 'admin', 'owner'));

router.get('/settings', getBillingSettings);
router.get('/payment-qrs', getBillingPaymentQrs);
router.get('/lookup-product/:code', scannerFeatureEnabled, lookupProductPOS);
router.get('/search-product', searchProductPOS);
router.get('/customer-lookup/:phone', lookupCustomerByPhone);
router.post('/create-bill', createBillingTransaction);
router.post('/verify-qr-payment', verifyQrPaymentAndBill);
router.get('/history', getBillingHistory);
router.get('/complete-history', authorize('admin', 'owner'), getCompleteBillHistory);
router.get('/export-excel', authorize('admin', 'owner'), exportAllBillsExcel);
router.get('/invoice/:id', getInvoiceById);

// Bill correction and deletion
router.put('/invoice/:id', requireAdminOrOwnerForBillManagement, updateBill);
router.delete('/invoice/:id', requireAdminOrOwnerForBillManagement, deleteBill);

module.exports = router;
