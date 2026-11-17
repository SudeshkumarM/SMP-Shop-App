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
  updateShopSettings
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

// Settings
router.get('/settings', getShopSettings);
router.put('/settings', updateShopSettings);

module.exports = router;
