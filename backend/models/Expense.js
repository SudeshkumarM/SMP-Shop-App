const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expenseId: {
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
      'Store Rent',
      'Employee Salaries',
      'Electricity & Utilities',
      'Marketing & Advertising',
      'Store Maintenance & Repairs',
      'Packaging & Shopping Bags',
      'Courier & Logistics',
      'Software & IT Subscriptions',
      'Miscellaneous Expenses'
    ],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'Corporate Card'],
    default: 'Bank Transfer'
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  vendorName: {
    type: String,
    default: ''
  },
  invoiceNumber: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

expenseSchema.index({ shopId: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
