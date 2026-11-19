const express = require('express');
const router = express.Router();
const {
  getScannerSettings,
  updateScannerSettings,
  testScanner
} = require('../controllers/scannerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/scanner', authorize('admin', 'owner', 'staff'), getScannerSettings);
router.put('/scanner', authorize('admin', 'owner'), updateScannerSettings);
router.post('/scanner/test', authorize('admin', 'owner', 'staff'), testScanner);

module.exports = router;
