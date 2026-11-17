const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    default: ''
  },
  barcode: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: ''
  },
  colour: {
    type: String,
    default: ''
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  costPrice: {
    type: Number,
    default: 0
  },
  unitPrice: {
    type: Number,
    required: true
  },
  discountPercent: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  gstPercent: {
    type: Number,
    default: 5
  },
  gstAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
