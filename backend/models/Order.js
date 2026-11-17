const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  }, // e.g. ORD-20261117-001
  orderType: {
    type: String,
    enum: ['ONLINE', 'POS'],
    default: 'ONLINE',
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
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },
  customerDetails: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    shippingAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    }
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    sku: { type: String },
    barcode: { type: String },
    image: { type: String },
    size: { type: String },
    colour: { type: String },
    quantity: { type: Number, required: true },
    costPrice: { type: Number, default: 0 },
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
  totalGst: {
    type: Number,
    default: 0
  },
  shippingFee: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'ONLINE', 'POS_CASH', 'POS_CARD', 'POS_UPI'],
    required: true,
    default: 'COD'
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  orderStatus: {
    type: String,
    enum: ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PLACED'
  },
  refundStatus: {
    type: String,
    enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED'],
    default: 'NONE'
  },
  trackingNumber: {
    type: String,
    default: ''
  },
  invoiceNumber: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

orderSchema.index({ shopId: 1, orderNumber: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
