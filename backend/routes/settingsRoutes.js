const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const {
  getScannerSettings,
  updateScannerSettings,
  testScanner
} = require('../controllers/scannerController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getCustomerSystemSettings } = require('../middleware/customerSystemMiddleware');
const { scannerFeatureEnabled } = require('../middleware/scannerFeatureMiddleware');

const parseBoolean = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
};

const getCustomerSystem = async (req, res) => {
  try {
    const settings = await getCustomerSystemSettings();
    res.status(200).json({
      success: true,
      settings,
      customerSystem: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Customer system availability could not be loaded.'
    });
  }
};

const updateCustomerSystem = async (req, res) => {
  try {
    const shop = await Shop.findOne({ isActive: true }).sort({ createdAt: 1, _id: 1 });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop settings record not found.' });
    }

    const existing = shop.settings?.customerSystem || {};
    const currentSettings = await getCustomerSystemSettings(shop._id);
    const customerSystemEnabled = parseBoolean(
      req.body.customerSystemEnabled,
      currentSettings.customerSystemEnabled
    );
    const maintenanceMode = parseBoolean(
      req.body.maintenanceMode,
      currentSettings.maintenanceMode
    );
    const maintenanceTitle = typeof req.body.maintenanceTitle === 'string'
      ? req.body.maintenanceTitle.trim().slice(0, 120) || 'Temporarily Unavailable'
      : existing.maintenanceTitle || currentSettings.maintenanceTitle;
    const maintenanceReason = typeof req.body.maintenanceReason === 'string'
      ? req.body.maintenanceReason.slice(0, 1000)
      : existing.maintenanceReason || currentSettings.maintenanceReason;

    shop.settings = shop.settings || {};
    shop.settings.customerSystem = {
      customerSystemEnabled,
      maintenanceMode,
      maintenanceTitle,
      maintenanceReason,
      updatedAt: new Date(),
      updatedBy: req.user._id.toString()
    };
    shop.settings.customerAccess = {
      customerLoginEnabled: customerSystemEnabled,
      customerRegistrationEnabled: customerSystemEnabled,
      temporaryUnavailable: maintenanceMode,
      unavailableTitle: maintenanceTitle,
      unavailableMessage: maintenanceReason,
      updatedAt: new Date(),
      updatedBy: req.user._id.toString()
    };

    await shop.save();

    res.status(200).json({
      success: true,
      message: 'Customer system availability saved successfully',
      settings: shop.settings.customerSystem,
      customerSystem: shop.settings.customerSystem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Customer system availability could not be saved.'
    });
  }
};

const getLegacyCustomerAccess = async (req, res) => {
  try {
    const settings = await getCustomerSystemSettings();
    res.status(200).json({
      success: true,
      access: {
        customerLoginEnabled: settings.customerSystemEnabled,
        customerRegistrationEnabled: settings.customerSystemEnabled,
        temporaryUnavailable: settings.maintenanceMode,
        unavailableTitle: settings.maintenanceTitle,
        unavailableMessage: settings.maintenanceReason
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Customer access settings could not be loaded.' });
  }
};

const updateLegacyCustomerAccess = async (req, res, next) => {
  try {
    const currentSettings = await getCustomerSystemSettings();
    const loginEnabled = parseBoolean(
      req.body.customerLoginEnabled,
      currentSettings.customerSystemEnabled
    );
    const registrationEnabled = parseBoolean(
      req.body.customerRegistrationEnabled,
      currentSettings.customerSystemEnabled
    );
    req.body = {
      customerSystemEnabled: loginEnabled && registrationEnabled,
      maintenanceMode: parseBoolean(req.body.temporaryUnavailable, currentSettings.maintenanceMode),
      maintenanceTitle: req.body.unavailableTitle,
      maintenanceReason: req.body.unavailableMessage
    };
    return updateCustomerSystem(req, res, next);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Customer access settings could not be saved.' });
  }
};

router.get('/customer-system', getCustomerSystem);
router.get('/customer-system/availability', getCustomerSystem);
router.put('/customer-system', protect, authorize('admin', 'owner'), updateCustomerSystem);
router.put('/customer-system/availability', protect, authorize('admin', 'owner'), updateCustomerSystem);
router.get('/customer-access', getLegacyCustomerAccess);
router.put('/customer-access', protect, authorize('admin', 'owner'), updateLegacyCustomerAccess);

router.use(protect);

router.get('/scanner', authorize('admin', 'owner', 'staff'), getScannerSettings);
router.put('/scanner', authorize('admin', 'owner'), updateScannerSettings);
router.post('/scanner/test', authorize('admin', 'owner', 'staff'), scannerFeatureEnabled, testScanner);

module.exports = router;
