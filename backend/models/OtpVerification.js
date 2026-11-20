const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
  identifier: {
    type: String, // phone number or email
    required: true,
    trim: true,
    index: true
  },
  purpose: {
    type: String,
    enum: ['REGISTRATION', 'LOGIN', 'FORGOT_PASSWORD', 'CHECKOUT'],
    required: true
  },
  otpHash: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  resendCount: {
    type: Number,
    default: 0
  },
  lastResentAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '10m' } // TTL index automatically cleans up expired records
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
