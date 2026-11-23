const Shop = require('../models/Shop');
const ScannerSettings = require('../models/ScannerSettings');
const Staff = require('../models/Staff');

const scannerFeatureEnabled = async (req, res, next) => {
  try {
    let shopId = req.user?.shopId;
    if (!shopId && req.user?.role === 'staff') {
      const staff = await Staff.findOne({ userId: req.user._id, isActive: true })
        .select('shopId')
        .lean();
      shopId = staff?.shopId;
    }
    if (!shopId) {
      const shop = await Shop.findOne({ isActive: true })
        .sort({ createdAt: 1, _id: 1 })
        .select('_id')
        .lean();
      shopId = shop?._id;
    }

    if (!shopId) {
      return res.status(503).json({
        success: false,
        code: 'SCANNER_SETTINGS_UNAVAILABLE',
        message: 'Scanner settings are unavailable because no active shop is configured.'
      });
    }

    const settings = await ScannerSettings.findOne({ shopId })
      .select('scannerActivated')
      .lean();

    if (settings?.scannerActivated === false) {
      return res.status(503).json({
        success: false,
        code: 'SCANNER_SYSTEM_DISABLED',
        message: 'Barcode and camera scanning are currently disabled by shop management.'
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Scanner availability could not be verified.'
    });
  }
};

module.exports = { scannerFeatureEnabled };
