const express = require('express');
const router = express.Router();
const {
  getAdminDashboardStats,
  getAdminCustomers,
  createAdminCustomer,
  updateAdminCustomer,
  deleteAdminCustomer,
  exportCustomersExcel,
  getAdminStaffList,
  createStaffAccount,
  updateStaffAccount,
  resetStaffPassword,
  deleteStaffAccount,
  getInventoryStatus,
  addPurchaseStockEntry,
  createSupplier,
  getShopSettings,
  updateShopSettings,
  getDeliverySettings,
  updateDeliverySettings,
  getGstSettings,
  updateGstSettings,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getWhatsAppLogs,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  sendOfferWhatsAppBroadcast
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'owner'));

router.get('/dashboard-stats', getAdminDashboardStats);

// Customer Management
router.get('/customers', getAdminCustomers);
router.post('/customers', createAdminCustomer);
router.put('/customers/:id', updateAdminCustomer);
router.delete('/customers/:id', deleteAdminCustomer);
router.get('/customers/export-excel', exportCustomersExcel);

// Staff Management
router.get('/staff', getAdminStaffList);
router.post('/staff', createStaffAccount);
router.put('/staff/:id', updateStaffAccount);
router.put('/staff/:id/reset-password', resetStaffPassword);
router.delete('/staff/:id', deleteStaffAccount);

// Inventory & Suppliers
router.get('/inventory', getInventoryStatus);
router.post('/inventory/purchase', addPurchaseStockEntry);
router.post('/suppliers', createSupplier);

// Delivery Settings
router.get('/delivery-settings', getDeliverySettings);
router.put('/delivery-settings', updateDeliverySettings);

// GST Settings
router.get('/gst-settings', getGstSettings);
router.put('/gst-settings', updateGstSettings);

// WhatsApp Settings & Logs
router.get('/whatsapp-settings', getWhatsAppSettings);
router.put('/whatsapp-settings', updateWhatsAppSettings);
router.get('/whatsapp-logs', getWhatsAppLogs);

// Coupons & Offers
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);
router.post('/send-offer-whatsapp', sendOfferWhatsAppBroadcast);

// Settings
router.get('/settings', getShopSettings);
router.put('/settings', updateShopSettings);

module.exports = router;
