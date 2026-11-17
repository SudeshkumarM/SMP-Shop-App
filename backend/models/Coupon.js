const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  discountPercent: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  minPurchaseAmount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sendWhatsApp: {
    type: Boolean,
    default: false
  },
  validityDays: {
    type: Number,
    default: 10
  },
  eligibilityCriteria: {
    type: String,
    enum: ['ALL_CONSENTED', 'MIN_PURCHASE', 'RETURNING_CUSTOMERS', 'NEW_CUSTOMERS'],
    default: 'ALL_CONSENTED'
  },
  minLifetimeSpend: {
    type: Number,
    default: 0
  },
  minOrdersCount: {
    type: Number,
    default: 0
  },
  notifiedCustomerPhones: [{
    type: String
  }],
  usageCount: {
    type: Number,
    default: 0
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);
