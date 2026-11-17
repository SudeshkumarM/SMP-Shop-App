const Customer = require('../models/Customer');
const Product = require('../models/Product');

/**
 * @desc    Get Customer Wishlist
 * @route   GET /api/customer/wishlist
 * @access  Private (Customer)
 */
const getWishlist = async (req, res) => {
  try {
    const customer = await Customer.findOne({ userId: req.user._id }).populate('wishlist');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found' });
    }
    res.status(200).json({ success: true, wishlist: customer.wishlist || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add Product to Wishlist
 * @route   POST /api/customer/wishlist/:productId
 * @access  Private (Customer)
 */
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const customer = await Customer.findOne({ userId: req.user._id });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found' });
    }

    if (!customer.wishlist.includes(productId)) {
      customer.wishlist.push(productId);
      await customer.save();
    }

    await customer.populate('wishlist');
    res.status(200).json({ success: true, message: 'Added to wishlist', wishlist: customer.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove Product from Wishlist
 * @route   DELETE /api/customer/wishlist/:productId
 * @access  Private (Customer)
 */
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const customer = await Customer.findOne({ userId: req.user._id });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found' });
    }

    customer.wishlist = customer.wishlist.filter(id => id.toString() !== productId);
    await customer.save();

    await customer.populate('wishlist');
    res.status(200).json({ success: true, message: 'Removed from wishlist', wishlist: customer.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Customer Addresses
 * @route   GET /api/customer/addresses
 * @access  Private (Customer)
 */
const getAddresses = async (req, res) => {
  try {
    const customer = await Customer.findOne({ userId: req.user._id });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.status(200).json({ success: true, addresses: customer.addresses || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add New Address
 * @route   POST /api/customer/addresses
 * @access  Private (Customer)
 */
const addAddress = async (req, res) => {
  try {
    const { title, street, city, state, pincode, isDefault } = req.body;
    const customer = await Customer.findOne({ userId: req.user._id });

    if (!street || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: 'Please provide all address details' });
    }

    if (isDefault) {
      customer.addresses.forEach(addr => addr.isDefault = false);
    }

    customer.addresses.push({
      title: title || 'Home',
      street,
      city,
      state,
      pincode,
      isDefault: isDefault || customer.addresses.length === 0
    });

    await customer.save();
    res.status(201).json({ success: true, message: 'Address saved successfully', addresses: customer.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete Address
 * @route   DELETE /api/customer/addresses/:addressId
 * @access  Private (Customer)
 */
const deleteAddress = async (req, res) => {
  try {
    const customer = await Customer.findOne({ userId: req.user._id });
    customer.addresses.pull(req.params.addressId);
    await customer.save();
    res.status(200).json({ success: true, message: 'Address deleted', addresses: customer.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAddresses,
  addAddress,
  deleteAddress
};
