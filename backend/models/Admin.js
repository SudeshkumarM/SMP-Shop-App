const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  adminId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  }, // e.g. ADM-101
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
  permissions: {
    manageCustomers: { type: Boolean, default: true },
    manageStaff: { type: Boolean, default: true },
    manageProducts: { type: Boolean, default: true },
    manageInventory: { type: Boolean, default: true },
    manageOrders: { type: Boolean, default: true },
    manageBills: { type: Boolean, default: true },
    viewReports: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);
