const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: '/images/category-default.svg'
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

categorySchema.index({ shopId: 1, slug: 1 }, { unique: true });

// Pre-save hook to keep isActive and status in sync
categorySchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.isActive = this.status === 'ACTIVE';
  } else if (this.isModified('isActive')) {
    this.status = this.isActive ? 'ACTIVE' : 'INACTIVE';
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
