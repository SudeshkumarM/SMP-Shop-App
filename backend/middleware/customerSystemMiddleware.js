const Shop = require('../models/Shop');

const DEFAULT_MAINTENANCE_REASON =
  'Our customer services are temporarily unavailable due to scheduled system maintenance.';

const getCustomerSystemSettings = async (shopId = null) => {
  const shopQuery = shopId
    ? Shop.findById(shopId)
    : Shop.findOne({ isActive: true }).sort({ createdAt: 1, _id: 1 });
  const shop = await shopQuery
    .select('settings.customerSystem settings.customerAccess')
    .lean();

  const system = shop?.settings?.customerSystem;
  const access = shop?.settings?.customerAccess;
  const hasAuthoritativeSystem = Boolean(system?.updatedAt || system?.updatedBy);
  const customerSystemEnabled = hasAuthoritativeSystem
    ? system.customerSystemEnabled !== false
    : access?.customerRegistrationEnabled !== false &&
      access?.customerLoginEnabled !== false &&
      access?.temporaryUnavailable !== true;
  const maintenanceMode = hasAuthoritativeSystem
    ? system.maintenanceMode === true
    : access?.temporaryUnavailable === true;

  return {
    customerSystemEnabled,
    maintenanceMode,
    maintenanceTitle: (hasAuthoritativeSystem && system?.maintenanceTitle) ||
      access?.unavailableTitle ||
      'Temporarily Unavailable',
    maintenanceReason: (hasAuthoritativeSystem && system?.maintenanceReason) ||
      access?.unavailableMessage ||
      DEFAULT_MAINTENANCE_REASON
  };
};

const customerSystemMaintenance = async (req, res, next) => {
  try {
    if (req.user && ['owner', 'admin', 'staff'].includes(req.user.role)) {
      return next();
    }

    const settings = await getCustomerSystemSettings();
    if (!settings.customerSystemEnabled || settings.maintenanceMode) {
      return res.status(503).json({
        success: false,
        code: 'CUSTOMER_SYSTEM_TEMPORARILY_UNAVAILABLE',
        message: 'Customer services are temporarily unavailable.',
        title: settings.maintenanceTitle,
        reason: settings.maintenanceReason,
        maintenanceTitle: settings.maintenanceTitle,
        maintenanceReason: settings.maintenanceReason
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Customer system availability could not be verified.'
    });
  }
};

module.exports = {
  DEFAULT_MAINTENANCE_REASON,
  getCustomerSystemSettings,
  customerSystemMaintenance
};
