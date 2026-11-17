const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  investmentId: {
    type: String,
    required: true,
    unique: true
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: [
      'Initial Capital',
      'Store Renovation & Interior',
      'Machinery & Equipment',
      'IT & POS Hardware',
      'Inventory Capital',
      'Marketing & Launch Fund',
      'Additional Working Capital'
    ],
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  sourceOfFunds: {
    type: String,
    default: 'Owner Equity'
  },
  notes: {
    type: String,
    default: ''
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

investmentSchema.index({ shopId: 1, date: -1 });

module.exports = mongoose.model('Investment', investmentSchema);
