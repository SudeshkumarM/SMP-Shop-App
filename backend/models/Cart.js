const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    size: { type: String, default: '' },
    colour: { type: String, default: '' }
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  gstPercent: {
    type: Number,
    default: 5
  },
  finalPrice: {
    type: Number,
    required: true
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  guestSessionId: {
    type: String,
    default: null
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  items: [cartItemSchema],
  subtotal: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  gstAmount: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

cartSchema.index({ userId: 1 });
cartSchema.index({ guestSessionId: 1 });

module.exports = mongoose.model('Cart', cartSchema);
