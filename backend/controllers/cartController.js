const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Shop = require('../models/Shop');

const calculateCartTotals = (items) => {
  let subtotal = 0;
  let gstAmount = 0;
  let discountAmount = 0;

  for (const item of items) {
    const itemTotal = item.unitPrice * item.quantity;
    subtotal += itemTotal;
    const itemGst = (itemTotal * (item.gstPercent || 5)) / 100;
    gstAmount += itemGst;
  }

  const grandTotal = Math.round((subtotal + gstAmount - discountAmount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    grandTotal
  };
};

/**
 * @desc    Get Cart for User or Guest
 * @route   GET /api/cart
 * @access  Public / Optional Auth
 */
const getCart = async (req, res) => {
  try {
    const { guestSessionId } = req.query;
    let query = null;

    if (req.user) {
      query = { userId: req.user._id };
    } else if (guestSessionId) {
      query = { guestSessionId };
    }

    if (!query) {
      return res.status(200).json({
        success: true,
        cart: { items: [], subtotal: 0, gstAmount: 0, grandTotal: 0 }
      });
    }

    const cart = await Cart.findOne(query).populate('items.productId');

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: { items: [], subtotal: 0, gstAmount: 0, grandTotal: 0 }
      });
    }

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add Item to Cart
 * @route   POST /api/cart/add
 * @access  Public / Optional Auth
 */
const addToCart = async (req, res) => {
  try {
    const { productId, size = 'Standard', colour = 'Default', quantity = 1, guestSessionId } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not available' });
    }

    if (product.availableQuantity < quantity) {
      return res.status(400).json({ success: false, message: `Only ${product.availableQuantity} items in stock.` });
    }

    let filter = null;
    if (req.user) {
      filter = { userId: req.user._id };
    } else if (guestSessionId) {
      filter = { guestSessionId };
    } else {
      return res.status(400).json({ success: false, message: 'User or Guest Session ID required' });
    }

    let cart = await Cart.findOne(filter);
    if (!cart) {
      const defaultShop = await Shop.findOne({ isActive: true });
      cart = new Cart({
        userId: req.user ? req.user._id : null,
        guestSessionId: req.user ? null : guestSessionId,
        shopId: product.shopId || (defaultShop ? defaultShop._id : null),
        items: []
      });
    }

    const existingIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variant.size === size &&
        item.variant.colour === colour
    );

    const unitPrice = product.sellingPrice || product.originalPrice;
    const gstPercent = product.gstPercent || 5;
    const finalPrice = Math.round((unitPrice + (unitPrice * gstPercent) / 100) * 100) / 100;

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + Number(quantity);
      if (newQty > product.availableQuantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. Maximum available stock is ${product.availableQuantity}.`
        });
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({
        productId: product._id,
        variant: { size, colour },
        quantity: Number(quantity),
        unitPrice,
        gstPercent,
        finalPrice
      });
    }

    const totals = calculateCartTotals(cart.items);
    cart.subtotal = totals.subtotal;
    cart.gstAmount = totals.gstAmount;
    cart.discountAmount = totals.discountAmount;
    cart.grandTotal = totals.grandTotal;

    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({
      success: true,
      message: `${product.name} added to cart`,
      cart
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update Cart Item Quantity
 * @route   PUT /api/cart/update
 * @access  Public / Optional Auth
 */
const updateCartItem = async (req, res) => {
  try {
    const { itemId, quantity, guestSessionId } = req.body;

    let filter = req.user ? { userId: req.user._id } : { guestSessionId };
    const cart = await Cart.findOne(filter);

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      cart.items.pull(itemId);
    } else {
      item.quantity = quantity;
    }

    const totals = calculateCartTotals(cart.items);
    cart.subtotal = totals.subtotal;
    cart.gstAmount = totals.gstAmount;
    cart.discountAmount = totals.discountAmount;
    cart.grandTotal = totals.grandTotal;

    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove Item from Cart
 * @route   DELETE /api/cart/item/:itemId
 * @access  Public / Optional Auth
 */
const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { guestSessionId } = req.query;

    let filter = req.user ? { userId: req.user._id } : { guestSessionId };
    const cart = await Cart.findOne(filter);

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items.pull(itemId);

    const totals = calculateCartTotals(cart.items);
    cart.subtotal = totals.subtotal;
    cart.gstAmount = totals.gstAmount;
    cart.discountAmount = totals.discountAmount;
    cart.grandTotal = totals.grandTotal;

    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({ success: true, message: 'Item removed from cart', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Merge Guest Cart with User Cart upon login
 * @route   POST /api/cart/merge
 * @access  Private
 */
const mergeGuestCart = async (req, res) => {
  try {
    const { guestSessionId } = req.body;
    if (!guestSessionId) {
      return res.status(200).json({ success: true });
    }

    const guestCart = await Cart.findOne({ guestSessionId });
    if (!guestCart || guestCart.items.length === 0) {
      return res.status(200).json({ success: true });
    }

    let userCart = await Cart.findOne({ userId: req.user._id });
    if (!userCart) {
      guestCart.userId = req.user._id;
      guestCart.guestSessionId = null;
      await guestCart.save();
      return res.status(200).json({ success: true, cart: guestCart });
    }

    // Merge items
    for (const gItem of guestCart.items) {
      const existing = userCart.items.find(
        (uItem) =>
          uItem.productId.toString() === gItem.productId.toString() &&
          uItem.variant.size === gItem.variant.size &&
          uItem.variant.colour === gItem.variant.colour
      );

      if (existing) {
        existing.quantity += gItem.quantity;
      } else {
        userCart.items.push(gItem);
      }
    }

    const totals = calculateCartTotals(userCart.items);
    userCart.subtotal = totals.subtotal;
    userCart.gstAmount = totals.gstAmount;
    userCart.discountAmount = totals.discountAmount;
    userCart.grandTotal = totals.grandTotal;

    await userCart.save();
    await Cart.findByIdAndDelete(guestCart._id);

    await userCart.populate('items.productId');
    res.status(200).json({ success: true, cart: userCart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  mergeGuestCart
};
