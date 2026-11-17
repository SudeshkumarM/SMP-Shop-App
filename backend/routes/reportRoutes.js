const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getProductSalesReport,
  getStaffReport,
  getGstReport,
  getInventoryReport,
  exportReportExcel
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'owner'));

router.get('/sales', getSalesReport);
router.get('/products', getProductSalesReport);
router.get('/staff', getStaffReport);
router.get('/gst', getGstReport);
router.get('/inventory', getInventoryReport);
router.post('/export-excel', exportReportExcel);

module.exports = router;
