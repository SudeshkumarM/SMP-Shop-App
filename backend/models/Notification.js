const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  role: {
    type: String,
    enum: ['customer', 'staff', 'admin', 'owner', 'all'],
    default: 'all'
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['ORDER', 'STOCK_ALERT', 'BILLING', 'PAYMENT', 'PROMO', 'SYSTEM'],
    default: 'SYSTEM'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  link: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ role: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
