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
    invoicePrefix: { type: String, default: 'SMP' },
    deliverySettings: {
      enabled: { type: Boolean, default: true },
      deliveryCharge: { type: Number, default: 50 },
      freeDeliveryThreshold: { type: Number, default: 1000 },
      chargeType: { type: String, enum: ['FLAT', 'PERCENT'], default: 'FLAT' },
      description: { type: String, default: 'Standard Express Shipping (2-3 business days)' }
    },
    gstSettings: {
      enabled: { type: Boolean, default: true },
      defaultGstPercent: { type: Number, default: 5 },
      gstNumber: { type: String, default: '33AAAAA0000A1Z5' },
      compositionScheme: { type: Boolean, default: false }
    },
    whatsappSettings: {
      enabled: { type: Boolean, default: false },
      apiUrl: { type: String, default: 'https://graph.facebook.com/v18.0' },
      apiKey: { type: String, default: '' },
      phoneNumberId: { type: String, default: '' },
      businessAccountId: { type: String, default: '' },
      notifyOnOffer: { type: Boolean, default: false },
      notifyOnCoupon: { type: Boolean, default: false },
      notifyOnInvoice: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Shop', shopSchema);
