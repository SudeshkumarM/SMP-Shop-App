const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  size: { type: String, trim: true, default: '' },
  colour: { type: String, trim: true, default: '' },
  colourHex: { type: String, default: '#000000' },
  stock: { type: Number, required: true, default: 0 },
  sku: { type: String, trim: true },
  barcode: { type: String, trim: true },
  price: { type: Number }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  barcode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  barcodeFormat: {
    type: String,
    enum: ['CODE128', 'EAN13', 'EAN8', 'UPCA', 'UPCE', 'CODE39'],
    default: 'CODE128'
  },
  qrCodeData: {
    type: String,
    default: ''
  },
  qrCodeType: {
    type: String,
    enum: ['PRODUCT', 'PAYMENT', 'INVOICE', 'CUSTOM'],
    default: 'PRODUCT'
  },
  brand: {
    type: String,
    required: true,
    trim: true,
    default: 'SMP Fashion'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  description: {
    type: String,
    required: true
  },
  costPrice: {
    type: Number,
    required: true,
    default: 0
  },
  originalPrice: {
    type: Number,
    required: true
  },
  sellingPrice: {
    type: Number,
    required: true
  },
  discountPercent: {
    type: Number,
    default: 0
  },
  gstPercent: {
    type: Number,
    default: 5
  },
  finalPrice: {
    type: Number,
    required: true
  },
  availableQuantity: {
    type: Number,
    required: true,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  },
  images: [{
    type: String
  }],
  sizes: [{
    type: String
  }], // e.g. ['S', 'M', 'L', 'XL', 'XXL']
  colours: [{
    type: String
  }], // e.g. ['Red', 'Navy Blue', 'Black']
  variants: [variantSchema],
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String
  }]
}, {
  timestamps: true
});

productSchema.index({ shopId: 1, sku: 1 }, { unique: true });
productSchema.index({ shopId: 1, barcode: 1 });
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ isActive: 1, isTrending: 1 });
productSchema.index({ shopId: 1, availableQuantity: 1 });

module.exports = mongoose.model('Product', productSchema);
