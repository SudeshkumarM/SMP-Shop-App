const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  requestId: {
    type: String,
    trim: true,
    maxlength: 128,
    default: undefined
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
    index: true
  },
  shopInfo: {
    name: { type: String, required: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    gstNumber: { type: String, default: '' }
  },
  branchInfo: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  staffInfo: {
    fullName: { type: String, default: '' },
    staffId: { type: String, default: '' }
  },
  customerInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    gstNumber: { type: String, default: '' }
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    sku: { type: String },
    barcode: { type: String },
    size: { type: String },
    colour: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 5 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  cgstAmount: {
    type: Number,
    default: 0
  },
  sgstAmount: {
    type: Number,
    default: 0
  },
  igstAmount: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    default: 'PAID'
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  deliveryStatus: {
    type: String,
    default: 'PENDING'
  },
  barcode: {
    type: String
  },
  printedCount: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deleteReason: {
    type: String,
    default: ''
  },
  editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
    previousData: { type: mongoose.Schema.Types.Mixed }
  }]
}, {
  timestamps: true
});

invoiceSchema.index({ shopId: 1, invoiceNumber: 1 });
invoiceSchema.index({ requestId: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ 'customerInfo.phone': 1 });
invoiceSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
invoiceSchema.index({ shopId: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
