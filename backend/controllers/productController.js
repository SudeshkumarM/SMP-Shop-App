const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Inventory = require('../models/Inventory');
const Shop = require('../models/Shop');
const Coupon = require('../models/Coupon');
const QRCode = require('../models/QRCode');
const xlsx = require('xlsx');
const { generateProductBarcode } = require('../utils/generateBarcode');
const { emitRealtimeUpdate } = require('../utils/realtime');

const isValidCategoryImage = (image) => {
  if (typeof image !== 'string') return false;
  const value = image.trim();
  if (!value) return true;
  if (value.startsWith('/images/') || value.startsWith('/uploads/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const buildCategoryFilter = (searchValue, statusValue) => {
  const status = String(statusValue || 'ACTIVE').trim().toUpperCase();
  if (!['ALL', 'ACTIVE', 'INACTIVE'].includes(status)) {
    return { error: 'Status must be ALL, ACTIVE, or INACTIVE.' };
  }

  const clauses = [];
  if (status === 'ACTIVE') {
    clauses.push({
      $or: [
        { status: /^ACTIVE$/i },
        { status: { $exists: false }, isActive: true }
      ]
    });
  } else if (status === 'INACTIVE') {
    clauses.push({
      $or: [
        { status: /^INACTIVE$/i },
        { status: { $exists: false }, isActive: false }
      ]
    });
  }

  if (typeof searchValue === 'string' && searchValue.trim()) {
    const search = searchValue.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clauses.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { categoryId: { $regex: search, $options: 'i' } }
      ]
    });
  }

  if (clauses.length === 0) return { filter: {} };
  if (clauses.length === 1) return { filter: clauses[0] };
  return { filter: { $and: clauses } };
};

/**
 * @desc    Get All Products with full filtering and search
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res) => {
  try {
    const {
      keyword,
      category,
      brand,
      size,
      colour,
      minPrice,
      maxPrice,
      inStock,
      isFeatured,
      isTrending,
      sort,
      shopId,
      page = 1,
      limit = 24
    } = req.query;

    const canManageInactive = Boolean(
      req.user && ['admin', 'owner'].includes(req.user.role)
    );
    const query = canManageInactive ? {} : { isActive: true };

    if (req.user?.shopId && req.user.role !== 'owner') {
      query.shopId = req.user.shopId;
    } else if (shopId) {
      query.shopId = shopId;
    } else if (req.user && ['admin', 'staff'].includes(req.user.role)) {
      const activeShop = await Shop.findOne({ isActive: true })
        .sort({ createdAt: 1, _id: 1 })
        .select('_id')
        .lean();
      if (activeShop) query.shopId = activeShop._id;
    }

    if (keyword) {
      const escapedKeyword = String(keyword).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedKeyword, $options: 'i' } },
        { brand: { $regex: escapedKeyword, $options: 'i' } },
        { sku: { $regex: escapedKeyword, $options: 'i' } },
        { barcode: { $regex: escapedKeyword, $options: 'i' } },
        { tags: { $in: [new RegExp(escapedKeyword, 'i')] } }
      ];
    }

    if (category) {
      // Check if category is slug or ObjectId
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const cat = await Category.findOne({ slug: category.toLowerCase() });
        if (cat) query.category = cat._id;
      }
    }

    if (brand) {
      query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
    }

    if (size) {
      query.sizes = size;
    }

    if (colour) {
      query.colours = { $regex: new RegExp(colour, 'i') };
    }

    if (minPrice || maxPrice) {
      query.finalPrice = {};
      if (minPrice) query.finalPrice.$gte = Number(minPrice);
      if (maxPrice) query.finalPrice.$lte = Number(maxPrice);
    }

    if (inStock === 'true') {
      query.availableQuantity = { $gt: 0 };
    }

    if (isFeatured === 'true') {
      query.isFeatured = true;
    }

    if (isTrending === 'true') {
      query.isTrending = true;
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'price_asc') sortOptions = { finalPrice: 1 };
    else if (sort === 'price_desc') sortOptions = { finalPrice: -1 };
    else if (sort === 'rating') sortOptions = { rating: -1 };
    else if (sort === 'popular') sortOptions = { numReviews: -1 };

    const parsedPage = Number.parseInt(page, 10);
    const parsedLimit = Number.parseInt(limit, 10);
    const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limitNum = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 24;
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Single Product by ID or Barcode
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const filter = {};
    if (!req.user || !['admin', 'owner'].includes(req.user.role)) {
      filter.isActive = true;
    }
    if (req.user?.shopId && req.user.role !== 'owner') {
      filter.shopId = req.user.shopId;
    }

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      filter._id = id;
    } else {
      filter.$or = [{ barcode: id }, { sku: id.toUpperCase() }];
    }
    const product = await Product.findOne(filter)
      .populate('category', 'name slug')
      .populate('shopId', 'name gstNumber settings');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Get related products in same category
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    }).limit(4);

    res.status(200).json({
      success: true,
      product,
      relatedProducts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create Product (Admin/Staff)
 * @route   POST /api/products
 * @access  Private (Admin, Owner, Staff)
 */
const createProduct = async (req, res) => {
  let session;
  try {
    const {
      name,
      sku,
      barcode,
      brand,
      category,
      description,
      costPrice,
      originalPrice,
      sellingPrice,
      discountPercent = 0,
      gstPercent = 5,
      availableQuantity = 0,
      lowStockThreshold = 5,
      images = [],
      sizes = [],
      colours = [],
      variants = [],
      isFeatured = false,
      isTrending = false,
      tags = []
    } = req.body;

    if (!name?.trim() || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name and description are required.'
      });
    }

    const numericFields = {
      costPrice: costPrice === undefined || costPrice === '' ? 0 : Number(costPrice),
      originalPrice: Number(originalPrice),
      sellingPrice: sellingPrice === undefined || sellingPrice === ''
        ? Number(originalPrice)
        : Number(sellingPrice),
      availableQuantity: Number(availableQuantity),
      lowStockThreshold: Number(lowStockThreshold),
      discountPercent: Number(discountPercent),
      gstPercent: Number(gstPercent)
    };
    if (
      Object.values(numericFields).some((value) => !Number.isFinite(value) || value < 0) ||
      !Number.isInteger(numericFields.availableQuantity) ||
      !Number.isInteger(numericFields.lowStockThreshold) ||
      numericFields.discountPercent > 100 ||
      numericFields.gstPercent > 100
    ) {
      return res.status(400).json({ success: false, message: 'Product prices, stock, and tax values are invalid.' });
    }

    // Strict Category-First Validation
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'A valid Category is required. Please create and select a Category before adding products.'
      });
    }

    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'The selected Category was not found. Please select or create an existing Category.'
      });
    }

    let shopId = req.user?.shopId ||
      (req.user?.role === 'owner' ? req.body?.shopId : null);
    if (!shopId) {
      const defaultShop = await Shop.findOne({ isActive: true }).sort({ createdAt: 1, _id: 1 });
      if (defaultShop) {
        shopId = defaultShop._id;
      } else {
        return res.status(400).json({ success: false, message: 'Shop ID is required' });
      }
    }
    if (existingCategory.shopId && String(existingCategory.shopId) !== String(shopId)) {
      return res.status(400).json({ success: false, message: 'The selected category does not belong to this shop.' });
    }

    const targetBarcode = typeof barcode === 'string' && barcode.trim()
      ? barcode.trim()
      : generateProductBarcode(sku || name);
    const duplicateBarcode = await Product.findOne({
      shopId,
      barcode: targetBarcode
    }).select('_id');
    if (duplicateBarcode) {
      return res.status(409).json({ success: false, message: 'This barcode is already assigned to another active product.' });
    }

    // Process multiple images
    let productImages = [];
    if (Array.isArray(images) && images.length > 0) {
      productImages = images.filter(img => typeof img === 'string' && img.trim() !== '');
    } else if (req.body.imageUrl && typeof req.body.imageUrl === 'string') {
      productImages = [req.body.imageUrl];
    }

    // Final price calculation with GST
    const baseSellingPrice = numericFields.sellingPrice;
    const finalPrice = Math.round((baseSellingPrice + (baseSellingPrice * numericFields.gstPercent) / 100) * 100) / 100;
    session = await mongoose.startSession();
    session.startTransaction();

    const [product] = await Product.create([{
      name: name.trim(),
      sku: (sku || `SKU-${Date.now().toString().slice(-6)}`).toUpperCase(),
      barcode: targetBarcode,
      brand: brand || 'SMP Fashion',
      category: existingCategory._id,
      shopId,
      description,
      costPrice: costPrice === undefined || costPrice === '' ? Math.round(numericFields.originalPrice * 0.6) : numericFields.costPrice,
      originalPrice: numericFields.originalPrice,
      sellingPrice: baseSellingPrice,
      discountPercent: numericFields.discountPercent,
      gstPercent: numericFields.gstPercent,
      finalPrice,
      availableQuantity: numericFields.availableQuantity,
      lowStockThreshold: numericFields.lowStockThreshold,
      images: productImages,
      sizes,
      colours,
      variants,
      isFeatured,
      isTrending,
      tags
    }], { session });

    await Inventory.findOneAndUpdate(
      { shopId, productId: product._id },
      {
        currentStock: numericFields.availableQuantity,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        reorderLevel: numericFields.lowStockThreshold,
        $push: {
          stockLogs: {
            type: 'PURCHASE',
            quantity: numericFields.availableQuantity,
            previousStock: 0,
            newStock: numericFields.availableQuantity,
            unitCost: product.costPrice,
            notes: 'Initial Product Stock Entry',
            performedBy: req.user._id
          }
        }
      },
      { upsert: true, new: true, session }
    );
    await session.commitTransaction();

    emitRealtimeUpdate(req.app, 'product:updated', { product });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    if (session?.inTransaction()) await session.abortTransaction();
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A product with this SKU or barcode already exists in this shop.' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Product could not be saved. No product or inventory changes were committed.' });
  } finally {
    if (session) await session.endSession();
  }
};

/**
 * @desc    Update Product
 * @route   PUT /api/products/:id
 * @access  Private (Admin, Owner)
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name,
      brand,
      category,
      description,
      costPrice,
      originalPrice,
      sellingPrice,
      discountPercent,
      gstPercent,
      availableQuantity,
      lowStockThreshold,
      images,
      sizes,
      colours,
      variants,
      isFeatured,
      isTrending,
      tags,
      isActive
    } = req.body;

    if (name !== undefined) product.name = name;
    if (brand !== undefined) product.brand = brand;
    if (category !== undefined) {
      const existingCategory = await Category.findById(category);
      if (!existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'The selected Category was not found. Please select an existing Category.'
        });
      }
      product.category = existingCategory._id;
    }
    if (description !== undefined) product.description = description;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (discountPercent !== undefined) product.discountPercent = discountPercent;
    if (gstPercent !== undefined) product.gstPercent = gstPercent;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
    if (images !== undefined) {
      if (Array.isArray(images)) {
        product.images = images.filter(img => typeof img === 'string' && img.trim() !== '');
      } else if (typeof images === 'string') {
        product.images = [images];
      }
    }
    if (sizes !== undefined) product.sizes = sizes;
    if (colours !== undefined) product.colours = colours;
    if (variants !== undefined) product.variants = variants;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isTrending !== undefined) product.isTrending = isTrending;
    if (tags !== undefined) product.tags = tags;
    if (isActive !== undefined) product.isActive = isActive;

    // Recalculate final price
    const gstRate = Number.isFinite(Number(product.gstPercent)) ? Number(product.gstPercent) : 5;
    const baseSelling = Number.isFinite(Number(product.sellingPrice))
      ? Number(product.sellingPrice)
      : Number(product.originalPrice);
    const gstVal = (baseSelling * gstRate) / 100;
    product.finalPrice = Math.round((baseSelling + gstVal) * 100) / 100;

    // Update quantity if explicitly changed
    if (availableQuantity !== undefined && availableQuantity !== product.availableQuantity) {
      const diff = availableQuantity - product.availableQuantity;
      const prev = product.availableQuantity;
      product.availableQuantity = availableQuantity;

      await Inventory.findOneAndUpdate(
        { productId: product._id },
        {
          currentStock: availableQuantity,
          $push: {
            stockLogs: {
              type: diff >= 0 ? 'PURCHASE' : 'ADJUSTMENT',
              quantity: Math.abs(diff),
              previousStock: prev,
              newStock: availableQuantity,
              notes: 'Manual stock update from admin edit',
              performedBy: req.user._id
            }
          }
        }
      );
    }

    await product.save();

    emitRealtimeUpdate(req.app, 'product:updated', { product });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete Product
 * @route   DELETE /api/products/:id
 * @access  Private (Admin, Owner)
 */
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    emitRealtimeUpdate(req.app, 'product:updated', { product });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Categories with search, status filtering, and linked products count
 * @route   GET /api/products/categories/list
 * @access  Public / Private
 */
const getCategories = async (req, res) => {
  try {
    const { search, status } = req.query;
    const result = buildCategoryFilter(search, status);
    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    const categories = await Category.find(result.filter).sort({ displayOrder: 1, createdAt: -1 });

    // Compute products count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productsCount = await Product.countDocuments({ category: cat._id, isActive: true });
        return {
          ...cat.toObject(),
          productsCount,
          productCount: productsCount
        };
      })
    );

    res.status(200).json({ success: true, count: categoriesWithCount.length, categories: categoriesWithCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create Category (Does NOT automatically generate products)
 * @route   POST /api/products/categories
 * @access  Private (Admin, Owner)
 */
const createCategory = async (req, res) => {
  try {
    const { name, description, image, categoryId, status } = req.body;
    if (image !== undefined && !isValidCategoryImage(image)) {
      return res.status(400).json({
        success: false,
        message: 'Category image must be an HTTP(S) URL or an application image path.'
      });
    }
    let shopId = req.user?.shopId || req.body.shopId;
    if (!shopId) {
      const fallbackShop = await Shop.findOne({ isActive: true });
      shopId = fallbackShop?._id;
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category Name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check duplicate name or slug in this shop
    const existing = await Category.findOne({
      shopId,
      $or: [{ name: name.trim() }, { slug }]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Category with name "${name}" already exists` });
    }

    const autoCatId = categoryId && categoryId.trim()
      ? categoryId.trim().toUpperCase()
      : `CAT-${Date.now().toString().slice(-4)}`;

    const category = await Category.create({
      categoryId: autoCatId,
      name: name.trim(),
      slug,
      description: description || '',
      image: typeof image === 'string' && image.trim()
        ? image.trim()
        : '/images/category-default.svg',
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      isActive: status !== 'INACTIVE',
      shopId
    });

    emitRealtimeUpdate(req.app, 'category:updated', { action: 'CREATE', category });

    res.status(201).json({ success: true, message: 'Category created successfully', category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update / Rename / Toggle Status of Category
 * @route   PUT /api/products/categories/:id
 * @access  Private (Admin, Owner)
 */
const updateCategory = async (req, res) => {
  try {
    const { name, description, image, categoryId, status } = req.body;
    if (image !== undefined && !isValidCategoryImage(image)) {
      return res.status(400).json({
        success: false,
        message: 'Category image must be an HTTP(S) URL or an application image path.'
      });
    }
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name && name.trim()) {
      category.name = name.trim();
      category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (categoryId && categoryId.trim()) category.categoryId = categoryId.trim().toUpperCase();

    if (status) {
      category.status = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
      category.isActive = category.status === 'ACTIVE';
    }

    await category.save();

    emitRealtimeUpdate(req.app, 'category:updated', { action: 'UPDATE', category });

    res.status(200).json({ success: true, message: 'Category updated successfully', category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete Category
 * @route   DELETE /api/products/categories/:id
 * @access  Private (Admin, Owner)
 */
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const linkedProductsCount = await Product.countDocuments({ category: category._id, isActive: true });
    if (linkedProductsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${linkedProductsCount} active product(s) are linked to it. Please reassign or remove products first.`
      });
    }

    await Category.findByIdAndDelete(category._id);

    emitRealtimeUpdate(req.app, 'category:updated', { action: 'DELETE', categoryId: category._id });

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Barcode Management List
 * @route   GET /api/products/barcodes/list
 * @access  Private (Admin, Owner, Staff)
 */
const getBarcodesList = async (req, res) => {
  try {
    const { search, format } = req.query;
    const filter = { isActive: true };

    if (format && format !== 'all') {
      filter.barcodeFormat = format;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter)
      .populate('category', 'name categoryId')
      .sort({ createdAt: -1 });

    const barcodeList = products.map((p) => ({
      productId: p._id,
      productName: p.name,
      sku: p.sku,
      barcode: p.barcode,
      barcodeFormat: p.barcodeFormat || 'CODE128',
      categoryName: p.category?.name || 'General',
      sellingPrice: p.sellingPrice,
      stock: p.availableQuantity,
      status: p.isActive ? 'ACTIVE' : 'INACTIVE',
      createdAt: p.createdAt
    }));

    res.status(200).json({
      success: true,
      count: barcodeList.length,
      barcodes: barcodeList,
      products: barcodeList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Assign, Edit or Regenerate Barcode for Product
 * @route   POST /api/products/barcodes/assign
 * @access  Private (Admin, Owner)
 */
const assignOrUpdateBarcode = async (req, res) => {
  try {
    const { productId, barcode, barcodeFormat = 'CODE128' } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let targetBarcode = barcode && barcode.trim()
      ? barcode.trim()
      : generateProductBarcode(product.sku || 'SMP');

    // Ensure barcode uniqueness
    const existing = await Product.findOne({
      barcode: targetBarcode,
      _id: { $ne: product._id },
      isActive: true
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Barcode "${targetBarcode}" is already assigned to "${existing.name}" (SKU: ${existing.sku}). Barcodes must be unique.`
      });
    }

    product.barcode = targetBarcode;
    product.barcodeFormat = barcodeFormat;
    await product.save();

    emitRealtimeUpdate(req.app, 'product:updated', { product });

    res.status(200).json({
      success: true,
      message: 'Barcode assigned successfully',
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        barcodeFormat: product.barcodeFormat
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete / Clear Barcode for Product
 * @route   DELETE /api/products/barcodes/:productId
 * @access  Private (Admin, Owner)
 */
const deleteBarcode = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Assign fallback barcode so product remains queryable and unique
    product.barcode = generateProductBarcode(`DEL-${Date.now().toString().slice(-4)}`);
    await product.save();

    emitRealtimeUpdate(req.app, 'product:updated', { product });

    res.status(200).json({ success: true, message: 'Barcode cleared and reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Lookup Product by Barcode (Used by Staff POS Barcode Scanner)
 * @route   GET /api/products/by-barcode/:barcode
 * @access  Private (Staff, Admin, Owner)
 */
const lookupProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const cleanBarcode = String(barcode).trim();

    const product = await Product.findOne({
      $or: [
        { barcode: cleanBarcode },
        { sku: cleanBarcode.toUpperCase() },
        { barcode: { $regex: cleanBarcode, $options: 'i' } }
      ],
      isActive: true
    }).populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `No active product found matching barcode: ${cleanBarcode}`
      });
    }

    res.status(200).json({
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        barcodeFormat: product.barcodeFormat || 'CODE128',
        sellingPrice: product.sellingPrice,
        costPrice: product.costPrice,
        gstPercent: product.gstPercent || 5,
        availableQuantity: product.availableQuantity,
        sizes: product.sizes,
        colours: product.colours,
        images: product.images
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get QR Codes Directory
 * @route   GET /api/products/qr-codes/list
 * @access  Private (Admin, Owner, Staff)
 */
const getQRCodesList = async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = {};

    if (type && type !== 'all') {
      filter.qrType = type.toUpperCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { targetName: { $regex: q, $options: 'i' } },
        { qrData: { $regex: q, $options: 'i' } }
      ];
    }

    const qrCodes = await QRCode.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: qrCodes.length, qrCodes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Generate / Create QR Code
 * @route   POST /api/products/qr-codes/generate
 * @access  Private (Admin, Owner)
 */
const createQRCode = async (req, res) => {
  try {
    const { title, qrType, targetId, targetName, qrData, imageUrl, description, status } = req.body;
    let shopId = req.user?.shopId || req.body.shopId;
    if (!shopId) {
      const fallbackShop = await Shop.findOne({ isActive: true });
      shopId = fallbackShop?._id;
    }

    if (!title || !qrData) {
      return res.status(400).json({ success: false, message: 'Title and QR Data are required' });
    }
    if (imageUrl && !isValidQrImageUrl(imageUrl)) {
      return res.status(400).json({ success: false, message: 'QR image must use an HTTP(S) URL or an uploaded /uploads/ image path.' });
    }

    const qr = await QRCode.create({
      title: title.trim(),
      qrType: (qrType || 'PRODUCT').toUpperCase(),
      targetId: targetId || '',
      targetName: targetName || '',
      qrData: qrData.trim(),
      imageUrl: imageUrl || '',
      description: description || '',
      shopId,
      status: (status || 'ACTIVE').toUpperCase()
    });

    res.status(201).json({ success: true, message: 'QR Code generated successfully', qrCode: qr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update QR Code
 * @route   PUT /api/products/qr-codes/:id
 * @access  Private (Admin, Owner)
 */
const updateQRCode = async (req, res) => {
  try {
    const { title, qrType, targetId, targetName, qrData, imageUrl, description, status } = req.body;
    const qr = await QRCode.findById(req.params.id);

    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR Code not found' });
    }

    if (title) qr.title = title.trim();
    if (qrType) qr.qrType = qrType.toUpperCase();
    if (targetId !== undefined) qr.targetId = targetId;
    if (targetName !== undefined) qr.targetName = targetName;
    if (qrData) qr.qrData = qrData.trim();
    if (imageUrl !== undefined && imageUrl && !isValidQrImageUrl(imageUrl)) {
      return res.status(400).json({ success: false, message: 'QR image must use an HTTP(S) URL or an uploaded /uploads/ image path.' });
    }
    if (imageUrl !== undefined) qr.imageUrl = imageUrl;
    if (description !== undefined) qr.description = description;
    if (status) qr.status = status.toUpperCase();

    await qr.save();

    res.status(200).json({ success: true, message: 'QR Code updated successfully', qrCode: qr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const isValidQrImageUrl = (value) => {
  if (typeof value !== 'string') return false;
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * @desc    Delete QR Code
 * @route   DELETE /api/products/qr-codes/:id
 * @access  Private (Admin, Owner)
 */
const deleteQRCode = async (req, res) => {
  try {
    const qr = await QRCode.findByIdAndDelete(req.params.id);
    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR Code not found' });
    }
    res.status(200).json({ success: true, message: 'QR Code deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Lookup by QR Code (Used by Staff POS QR Scanner)
 * @route   GET /api/products/by-qr/:qrData
 * @access  Private (Staff, Admin, Owner)
 */
const lookupByQR = async (req, res) => {
  try {
    const rawData = req.params.qrData || req.query.qrData || '';
    const cleanData = decodeURIComponent(rawData).trim();

    // Check if QR matches a Product by SKU, barcode, or explicit qrCodeData
    const product = await Product.findOne({
      $or: [
        { qrCodeData: cleanData },
        { sku: cleanData.replace(/^smp:product:/i, '').trim().toUpperCase() },
        { barcode: cleanData },
        { _id: cleanData.match(/^[0-9a-fA-F]{24}$/) ? cleanData : null }
      ].filter(Boolean),
      isActive: true
    }).populate('category', 'name');

    if (product) {
      return res.status(200).json({
        success: true,
        type: 'PRODUCT',
        product: product,
        item: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          gstPercent: product.gstPercent || 5,
          availableQuantity: product.availableQuantity,
          sizes: product.sizes,
          colours: product.colours,
          images: product.images,
          categoryName: product.category?.name || 'General'
        }
      });
    }

    // Check if QR matches an Invoice
    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.findOne({
      invoiceNumber: cleanData.replace(/^smp:inv:/i, '').trim()
    });

    if (invoice) {
      return res.status(200).json({
        success: true,
        type: 'INVOICE',
        item: invoice
      });
    }

    res.status(404).json({
      success: false,
      message: `No product or invoice found matching scanned QR data: ${cleanData}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Import Products from Excel
 * @route   POST /api/products/import-excel
 * @access  Private (Admin, Owner)
 */
const importProductsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx or .xls)' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded Excel file contains no data rows.' });
    }

    const shopId = req.user.shopId;
    let defaultCategory = await Category.findOne({ shopId });
    if (!defaultCategory) {
      defaultCategory = await Category.create({
        name: 'General Apparel',
        slug: 'general-apparel',
        shopId
      });
    }

    let importedCount = 0;

    for (const row of sheetData) {
      const name = row['Product Name'] || row['name'] || row['Title'];
      if (!name) continue;

      const sku = (row['SKU'] || `IMP-${Date.now().toString().slice(-6)}-${importedCount}`).toUpperCase();
      const barcode = row['Barcode'] || generateProductBarcode(sku);
      const originalPrice = Number(row['Original Price'] || row['price'] || 999);
      const sellingPrice = Number(row['Selling Price'] || originalPrice * 0.9);
      const costPrice = Number(row['Cost Price'] || sellingPrice * 0.6);
      const stock = Number(row['Stock'] || row['Quantity'] || 10);
      const gstPercent = Number(row['GST %'] || 5);
      const brand = row['Brand'] || 'SMP Fashion';
      const description = row['Description'] || `High quality ${name} from SMP.`;

      const finalPrice = Math.round((sellingPrice + (sellingPrice * gstPercent) / 100) * 100) / 100;

      const product = await Product.findOneAndUpdate(
        { shopId, sku },
        {
          name,
          sku,
          barcode,
          brand,
          category: defaultCategory._id,
          shopId,
          description,
          costPrice,
          originalPrice,
          sellingPrice,
          gstPercent,
          finalPrice,
          availableQuantity: stock,
          sizes: ['M', 'L', 'XL'],
          colours: ['Blue', 'Black', 'White'],
          isActive: true
        },
        { upsert: true, new: true }
      );

      await Inventory.findOneAndUpdate(
        { shopId, productId: product._id },
        {
          currentStock: stock,
          costPrice,
          sellingPrice,
          reorderLevel: 5
        },
        { upsert: true }
      );

      importedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Successfully imported ${importedCount} products from Excel.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Export Products to Excel
 * @route   GET /api/products/export-excel
 * @access  Private (Admin, Owner)
 */
const exportProductsExcel = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const filter = shopId ? { shopId, isActive: true } : { isActive: true };
    const products = await Product.find(filter).populate('category', 'name');

    const data = products.map((p) => ({
      'Product ID': p._id.toString(),
      'Product Name': p.name,
      'SKU': p.sku,
      'Barcode': p.barcode,
      'Brand': p.brand,
      'Category': p.category ? p.category.name : '',
      'Cost Price (₹)': p.costPrice,
      'Original Price (₹)': p.originalPrice,
      'Selling Price (₹)': p.sellingPrice,
      'GST %': p.gstPercent,
      'Final Price (₹)': p.finalPrice,
      'Available Stock': p.availableQuantity,
      'Low Stock Alert': p.lowStockThreshold,
      'Rating': p.rating,
      'Created Date': p.createdAt ? p.createdAt.toISOString().split('T')[0] : ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="SMP_Products_Export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getShopDeliveryRules = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.shopId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.shopId)) {
        return res.status(400).json({ success: false, message: 'Shop ID is invalid.' });
      }
      filter._id = req.query.shopId;
    }
    const shop = await Shop.findOne(filter).sort({ createdAt: 1, _id: 1 });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Delivery rules are unavailable for this shop.' });
    }
    const rules = shop.settings?.deliverySettings;
    res.status(200).json({ success: true, delivery: rules });
  } catch (error) {
    console.error('[ProductController] Could not load shop delivery rules:', error);
    res.status(500).json({ success: false, message: 'Delivery rules could not be loaded.' });
  }
};

const getActiveCoupons = async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gte: now }
    }).sort({ discountPercent: -1 });

    res.status(200).json({ success: true, count: coupons.length, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  buildCategoryFilter,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBarcodesList,
  assignOrUpdateBarcode,
  deleteBarcode,
  lookupProductByBarcode,
  getQRCodesList,
  createQRCode,
  updateQRCode,
  deleteQRCode,
  lookupByQR,
  importProductsExcel,
  exportProductsExcel,
  getShopDeliveryRules,
  getActiveCoupons
};
