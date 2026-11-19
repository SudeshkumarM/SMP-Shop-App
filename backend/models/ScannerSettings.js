const mongoose = require('mongoose');

const scannerSettingsSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    unique: true
  },
  scannerType: {
    type: String,
    enum: ['USB_BARCODE', 'CAMERA_BARCODE', 'CAMERA_QR'],
    default: 'USB_BARCODE'
  },
  barcodeFormat: {
    type: String,
    enum: ['CODE128', 'EAN13', 'UPCA'],
    default: 'CODE128'
  },
  qrConfig: {
    prefix: { type: String, default: 'smp:' },
    payloadType: { type: String, default: 'PRODUCT_OR_INVOICE' },
    errorCorrection: { type: String, enum: ['L', 'M', 'Q', 'H'], default: 'M' }
  },
  scannerActivated: {
    type: Boolean,
    default: true
  },
  selectedCameraId: {
    type: String,
    default: ''
  },
  cameraPermissionStatus: {
    type: String,
    enum: ['granted', 'prompt', 'denied'],
    default: 'prompt'
  },
  defaultScanner: {
    type: String,
    enum: ['USB_BARCODE', 'CAMERA_BARCODE', 'CAMERA_QR'],
    default: 'USB_BARCODE'
  },
  lastTestedAt: {
    type: Date,
    default: null
  },
  testScanResult: {
    type: String,
    default: ''
  },
  testScanType: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScannerSettings', scannerSettingsSchema);
