const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  ownerId: {
    type: String,
    default: 'OWN-001',
    unique: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    index: true
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
  isMasterOwner: {
    type: Boolean,
    default: true
  },
  panNumber: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Owner', ownerSchema);
