const express = require('express');
const router = express.Router();
const {
  getOwnerDashboardStats,
  getShops,
  createShop,
  updateShop,
  deleteShop,
  getBranches,
  createBranch,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getInvestments,
  createInvestment,
  getExpenses,
  createExpense,
  getProfitLossReport
} = require('../controllers/ownerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('owner'));

router.get('/dashboard-stats', getOwnerDashboardStats);

// Shop Management
router.get('/shops', getShops);
router.post('/shops', createShop);
router.put('/shops/:id', updateShop);
router.delete('/shops/:id', deleteShop);

// Branch Management
router.get('/branches', getBranches);
router.post('/branches', createBranch);

// Admin Management
router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);
router.delete('/admins/:id', deleteAdmin);

// Investment Management
router.get('/investments', getInvestments);
router.post('/investments', createInvestment);

// Expense Management
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);

// Profit & Loss
router.get('/profit-loss', getProfitLossReport);

module.exports = router;
