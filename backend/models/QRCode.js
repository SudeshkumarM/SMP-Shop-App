const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  qrType: {
    type: String,
    enum: ['PRODUCT', 'PAYMENT', 'INVOICE', 'CUSTOM'],
    default: 'PRODUCT',
    required: true
  },
  targetId: {
    type: String,
    default: ''
  },
  targetName: {
    type: String,
    default: ''
  },
  qrData: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  scanCount: {
    type: Number,
    default: 0
  },
  lastScannedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QRCode', qrCodeSchema);
