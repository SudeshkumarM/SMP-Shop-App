const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shopCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Dress & Apparel',
      'Clothing Shop',
      'Electronics',
      'Grocery & Supermarket',
      'Footwear',
      'Accessories',
      'Multi-Department Retail'
    ],
    default: 'Dress & Apparel'
  },
  description: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  gstNumber: {
    type: String,
    trim: true,
    default: '33AAAAA0000A1Z5'
  },
  contactEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  settings: {
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    defaultGstPercent: { type: Number, default: 5 },
    lowStockThreshold: { type: Number, default: 10 },
    enablePosBarcodeScan: { type: Boolean, default: true },
    invoicePrefix: { type: String, default: 'SMP' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Shop', shopSchema);
