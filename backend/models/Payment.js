const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true
  }, // e.g. PAY-20261117-001
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'ONLINE', 'POS_CASH', 'POS_CARD', 'POS_UPI'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  transactionRef: {
    type: String,
    default: ''
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
