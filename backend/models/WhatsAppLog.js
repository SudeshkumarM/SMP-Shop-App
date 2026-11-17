const mongoose = require('mongoose');

const whatsAppLogSchema = new mongoose.Schema({
  recipientPhone: {
    type: String,
    required: true,
    index: true
  },
  recipientName: {
    type: String,
    default: 'Customer'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  messageType: {
    type: String,
    enum: ['OFFER', 'COUPON', 'INVOICE', 'TRANSACTIONAL'],
    required: true
  },
  templateName: {
    type: String,
    default: 'general_notice'
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['SENT', 'SIMULATED', 'FAILED', 'OPTED_OUT', 'SKIPPED'],
    required: true,
    default: 'SENT'
  },
  providerResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WhatsAppLog', whatsAppLogSchema);
