const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  staffId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  }, // e.g. STF-1001
  username: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    index: true
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
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    default: 'Billing & POS'
  },
  designation: {
    type: String,
    required: true,
    default: 'Cashier / Billing Executive'
  },
  jobRole: {
    type: String,
    required: true,
    default: 'Cashier / Billing Executive'
  },
  canEditBills: {
    type: Boolean,
    default: false
  },
  salary: {
    type: Number,
    default: 0
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening', 'General', 'Night'],
    default: 'General'
  },
  totalBillsGenerated: {
    type: Number,
    default: 0
  },
  totalSalesValue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

staffSchema.index({ staffId: 1, isActive: 1 });
staffSchema.index({ shopId: 1, branchId: 1, isActive: 1 });

module.exports = mongoose.model('Staff', staffSchema);
