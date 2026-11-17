const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' }
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''
  },
  isMainBranch: {
    type: Boolean,
    default: false
  },
  managerStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

branchSchema.index({ shopId: 1, branchCode: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);
