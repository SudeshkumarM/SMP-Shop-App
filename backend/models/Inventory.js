const mongoose = require('mongoose');

const stockLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    default: 0
  },
  referenceId: {
    type: String, // e.g. Order ID, Purchase Invoice, Adjustment note
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
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
  currentStock: {
    type: Number,
    required: true,
    default: 0
  },
  reorderLevel: {
    type: Number,
    default: 10
  },
  costPrice: {
    type: Number,
    default: 0
  },
  sellingPrice: {
    type: Number,
    default: 0
  },
  lastRestockedAt: {
    type: Date,
    default: Date.now
  },
  stockLogs: [stockLogSchema]
}, {
  timestamps: true
});

inventorySchema.index({ shopId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
