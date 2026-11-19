const ScannerSettings = require('../models/ScannerSettings');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Shop = require('../models/Shop');
const { emitRealtimeUpdate } = require('../utils/realtime');

/**
 * @desc    Get Scanner Settings
 * @route   GET /api/settings/scanner
 * @access  Private (Admin, Owner, Staff)
 */
const getScannerSettings = async (req, res) => {
  try {
    let shopId = req.user?.shopId;
    if (!shopId) {
      const fallbackShop = await Shop.findOne({ isActive: true });
      shopId = fallbackShop?._id;
    }

    let settings = await ScannerSettings.findOne({ shopId });
    if (!settings) {
      settings = await ScannerSettings.create({
        shopId,
        scannerType: 'USB_BARCODE',
        barcodeFormat: 'CODE128',
        qrConfig: { prefix: 'smp:', payloadType: 'PRODUCT_OR_INVOICE', errorCorrection: 'M' },
        scannerActivated: true,
        defaultScanner: 'USB_BARCODE'
      });
    }

    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update Scanner Settings
 * @route   PUT /api/settings/scanner
 * @access  Private (Admin, Owner)
 */
const updateScannerSettings = async (req, res) => {
  try {
    let shopId = req.user?.shopId;
    if (!shopId) {
      const fallbackShop = await Shop.findOne({ isActive: true });
      shopId = fallbackShop?._id;
    }

    const {
      scannerType,
      barcodeFormat,
      qrConfig,
      scannerActivated,
      selectedCameraId,
      cameraPermissionStatus,
      defaultScanner
    } = req.body;

    let settings = await ScannerSettings.findOne({ shopId });
    if (!settings) {
      settings = new ScannerSettings({ shopId });
    }

    if (scannerType) settings.scannerType = scannerType;
    if (barcodeFormat) settings.barcodeFormat = barcodeFormat;
    if (qrConfig) settings.qrConfig = { ...settings.qrConfig, ...qrConfig };
    if (scannerActivated !== undefined) settings.scannerActivated = Boolean(scannerActivated);
    if (selectedCameraId !== undefined) settings.selectedCameraId = selectedCameraId;
    if (cameraPermissionStatus) settings.cameraPermissionStatus = cameraPermissionStatus;
    if (defaultScanner) settings.defaultScanner = defaultScanner;

    await settings.save();

    emitRealtimeUpdate(req.app, 'scanner:updated', { settings });

    res.status(200).json({
      success: true,
      message: 'Scanner configuration saved successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Test Scanner Input (Live Hardware / Camera Test without placing a bill)
 * @route   POST /api/settings/scanner/test
 * @access  Private (Admin, Owner, Staff)
 */
const testScanner = async (req, res) => {
  try {
    const scanInputRaw = req.body.scanData || req.body.scanInput || '';
    if (!scanInputRaw || !scanInputRaw.trim()) {
      return res.status(400).json({ success: false, message: 'Scan data or input is required for testing' });
    }

    const clean = scanInputRaw.trim();
    let matchedItem = null;
    let matchType = 'UNKNOWN';

    // 1. Check Product Barcode / SKU
    const product = await Product.findOne({
      $or: [
        { barcode: clean },
        { sku: clean.toUpperCase() },
        { qrCodeData: clean }
      ],
      isActive: true
    }).populate('category', 'name');

    if (product) {
      matchedItem = {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        barcodeFormat: product.barcodeFormat,
        sellingPrice: product.sellingPrice,
        category: product.category?.name || 'General'
      };
      matchType = 'PRODUCT';
    } else {
      // 2. Check Invoice Number
      const invoice = await Invoice.findOne({
        $or: [
          { invoiceNumber: clean },
          { invoiceNumber: clean.replace(/^smp:inv:/i, '') }
        ]
      });

      if (invoice) {
        matchedItem = {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerInfo?.name,
          grandTotal: invoice.grandTotal,
          paymentStatus: invoice.paymentStatus
        };
        matchType = 'INVOICE';
      }
    }

    // Update settings test status
    let shopId = req.user?.shopId;
    if (!shopId) {
      const fallbackShop = await Shop.findOne({ isActive: true });
      shopId = fallbackShop?._id;
    }

    await ScannerSettings.findOneAndUpdate(
      { shopId },
      {
        lastTestedAt: new Date(),
        testScanResult: clean,
        testScanType: matchType
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: matchedItem ? `Test scan verified: Matched ${matchType} successfully!` : 'Scan received. No matching database record found.',
      matchType,
      matchedItem,
      product: matchType === 'PRODUCT' ? matchedItem : null,
      scannedRaw: clean,
      rawInput: clean,
      testedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getScannerSettings,
  updateScannerSettings,
  testScanner
};
