const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const mongoose = require('mongoose');

const calculateCartTotals = (items) => {
  let subtotal = 0;
  let gstAmount = 0;
  let discountAmount = 0;

  for (const item of items) {
    const itemTotal = item.unitPrice * item.quantity;
    subtotal += itemTotal;
    const itemGst = (itemTotal * (Number(item.gstPercent) || 0)) / 100;
    gstAmount += itemGst;
  }

  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const roundedGstAmount = Math.round(gstAmount * 100) / 100;
  const roundedDiscountAmount = Math.round(discountAmount * 100) / 100;
  const grandTotal = Math.round(
    (roundedSubtotal + roundedGstAmount - roundedDiscountAmount) * 100
  ) / 100;

  return {
    subtotal: roundedSubtotal,
    gstAmount: roundedGstAmount,
    discountAmount: roundedDiscountAmount,
    grandTotal
  };
};

const getCartFilter = (req, guestSessionId) => {
  if (req.user) return { userId: req.user._id };
  if (typeof guestSessionId === 'string' && guestSessionId.trim()) {
    return { guestSessionId: guestSessionId.trim() };
  }
  const error = new Error('User or guest session ID is required.');
  error.statusCode = 400;
  throw error;
};

const respondWithCartError = (res, error) => {
  const statusCode = Number(error.statusCode) || 500;
  if (statusCode >= 500) console.error('[CartController] Cart operation failed:', error);
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Cart operation could not be completed.' : error.message
  });
};

const refreshCartPricing = async (cart) => {
  const shop = await Shop.findOne({ _id: cart.shopId, isActive: true });
  if (!shop) {
    const error = new Error('The shop assigned to this cart is unavailable.');
    error.statusCode = 409;
    throw error;
  }

  const productIds = [...new Set(cart.items.map((item) => String(item.productId)))];
  const products = await Product.find({ _id: { $in: productIds }, shopId: shop._id });
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  for (const item of cart.items) {
    const product = productsById.get(String(item.productId));
    if (!product) {
      item.unitPrice = 0;
      item.gstPercent = 0;
      item.finalPrice = 0;
      item.isAvailable = false;
      continue;
    }

    const unitPrice = Number(product.sellingPrice);
    const gstPercent = shop.settings?.gstSettings?.enabled === false
      ? 0
      : Number(product.gstPercent);
    if (!Number.isFinite(unitPrice) || unitPrice < 0 ||
        !Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
      const error = new Error(`Saved pricing for "${product.name}" is invalid.`);
      error.statusCode = 409;
      throw error;
    }

    item.unitPrice = unitPrice;
    item.gstPercent = gstPercent;
    item.finalPrice = Math.round((unitPrice + unitPrice * gstPercent / 100) * 100) / 100;
    item.isAvailable = product.isActive && item.quantity <= product.availableQuantity;
  }

  const totals = calculateCartTotals(cart.items);
  const deliverySettings = shop.settings?.deliverySettings;
  let deliveryCharge = 0;
  if (cart.items.length > 0 && deliverySettings?.enabled === true) {
    const fee = Number(deliverySettings.deliveryCharge);
    const threshold = Number(deliverySettings.freeDeliveryThreshold);
    if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(threshold) || threshold < 0) {
      const error = new Error('Saved delivery settings are invalid.');
      error.statusCode = 409;
      throw error;
    }
    if (!(threshold > 0 && totals.subtotal >= threshold)) {
      deliveryCharge = deliverySettings.chargeType === 'PERCENT'
        ? totals.subtotal * fee / 100
        : fee;
    }
  }
  cart.deliveryCharge = Math.round(deliveryCharge * 100) / 100;
  cart.subtotal = totals.subtotal;
  cart.gstAmount = totals.gstAmount;
  cart.discountAmount = totals.discountAmount;
  cart.grandTotal = Math.round((totals.grandTotal + cart.deliveryCharge) * 100) / 100;
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
        cart: { items: [], subtotal: 0, gstAmount: 0, deliveryCharge: 0, grandTotal: 0 }
      });
    }

    const cart = await Cart.findOne(query);

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: { items: [], subtotal: 0, gstAmount: 0, deliveryCharge: 0, grandTotal: 0 }
      });
    }

    await refreshCartPricing(cart);
    await cart.save();
    await cart.populate('items.productId');
    res.status(200).json({ success: true, cart });
  } catch (error) {
    respondWithCartError(res, error);
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
    const quantityNumber = Number(quantity);
    if (!mongoose.Types.ObjectId.isValid(productId) ||
        !Number.isInteger(quantityNumber) || quantityNumber <= 0) {
      return res.status(400).json({ success: false, message: 'A valid product and positive whole-number quantity are required.' });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not available' });
    }

    if (product.availableQuantity < quantityNumber) {
      return res.status(400).json({ success: false, message: `Only ${product.availableQuantity} items in stock.` });
    }

    const filter = getCartFilter(req, guestSessionId);
    let cart = await Cart.findOne(filter);
    if (!cart) {
      cart = new Cart({
        userId: req.user ? req.user._id : null,
        guestSessionId: req.user ? null : guestSessionId,
        shopId: product.shopId,
        items: []
      });
    }
    if (String(cart.shopId) !== String(product.shopId)) {
      return res.status(409).json({ success: false, message: 'A cart cannot contain products from different shops.' });
    }

    const existingIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variant.size === size &&
        item.variant.colour === colour
    );

    const shop = await Shop.findOne({ _id: product.shopId, isActive: true });
    if (!shop) {
      return res.status(409).json({ success: false, message: 'The product shop is unavailable.' });
    }
    const unitPrice = Number(product.sellingPrice);
    const gstPercent = shop.settings?.gstSettings?.enabled === false ? 0 : Number(product.gstPercent);
    if (!Number.isFinite(unitPrice) || unitPrice < 0 ||
        !Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
      return res.status(409).json({ success: false, message: 'Saved product pricing is invalid.' });
    }
    const finalPrice = Math.round((unitPrice + (unitPrice * gstPercent) / 100) * 100) / 100;

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantityNumber;
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
        quantity: quantityNumber,
        unitPrice,
        gstPercent,
        finalPrice
      });
    }

    await refreshCartPricing(cart);

    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({
      success: true,
      message: `${product.name} added to cart`,
      cart
    });
  } catch (error) {
    respondWithCartError(res, error);
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
    const quantityNumber = Number(quantity);
    if (!Number.isInteger(quantityNumber) || quantityNumber < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a non-negative whole number.' });
    }

    const filter = getCartFilter(req, guestSessionId);
    const cart = await Cart.findOne(filter);

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    if (quantityNumber === 0) {
      cart.items.pull(itemId);
    } else {
      const product = await Product.findOne({
        _id: item.productId,
        shopId: cart.shopId,
        isActive: true
      });
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product is no longer available.' });
      }
      if (quantityNumber > product.availableQuantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.availableQuantity} items are currently in stock.`
        });
      }
      item.quantity = quantityNumber;
    }

    await refreshCartPricing(cart);
    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({ success: true, cart });
  } catch (error) {
    respondWithCartError(res, error);
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

    const filter = getCartFilter(req, guestSessionId);
    const cart = await Cart.findOne(filter);

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    if (!cart.items.id(itemId)) {
      return res.status(404).json({ success: false, message: 'Item not found in cart.' });
    }
    cart.items.pull(itemId);

    await refreshCartPricing(cart);
    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({ success: true, message: 'Item removed from cart', cart });
  } catch (error) {
    respondWithCartError(res, error);
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
      await refreshCartPricing(guestCart);
      await guestCart.save();
      await guestCart.populate('items.productId');
      return res.status(200).json({ success: true, cart: guestCart });
    }
    if (String(guestCart.shopId) !== String(userCart.shopId)) {
      return res.status(409).json({ success: false, message: 'Guest and customer carts belong to different shops.' });
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

    const products = await Product.find({
      _id: { $in: userCart.items.map((item) => item.productId) },
      shopId: userCart.shopId,
      isActive: true
    });
    const stockById = new Map(products.map((product) => [String(product._id), product.availableQuantity]));
    for (const item of userCart.items) {
      if (Number(item.quantity) > Number(stockById.get(String(item.productId)) || 0)) {
        return res.status(409).json({
          success: false,
          message: `Cart merge exceeds available stock for product ${item.productId}.`
        });
      }
    }
    await refreshCartPricing(userCart);
    await userCart.save();
    await Cart.findByIdAndDelete(guestCart._id);

    await userCart.populate('items.productId');
    res.status(200).json({ success: true, cart: userCart });
  } catch (error) {
    respondWithCartError(res, error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  mergeGuestCart
};
