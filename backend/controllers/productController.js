const Product = require('../models/Product');
const Category = require('../models/Category');
const Inventory = require('../models/Inventory');
const Shop = require('../models/Shop');
const xlsx = require('xlsx');
const { generateProductBarcode } = require('../utils/generateBarcode');

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

    const query = { isActive: true };

    if (shopId) {
      query.shopId = shopId;
    }

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { brand: { $regex: keyword, $options: 'i' } },
        { sku: { $regex: keyword, $options: 'i' } },
        { barcode: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } }
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

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
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
    let product;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).populate('category', 'name slug').populate('shopId', 'name gstNumber settings');
    } else {
      // Find by barcode or SKU
      product = await Product.findOne({
        $or: [{ barcode: id }, { sku: id.toUpperCase() }]
      }).populate('category', 'name slug').populate('shopId', 'name gstNumber settings');
    }

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

    const shopId = req.user.shopId || req.body.shopId;
    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Shop ID is required' });
    }

    // Final price calculation with GST
    const calculatedGst = ((sellingPrice || originalPrice) * gstPercent) / 100;
    const finalPrice = Math.round(((sellingPrice || originalPrice) + calculatedGst) * 100) / 100;

    const generatedBarcode = barcode || generateProductBarcode(sku || name);

    const product = await Product.create({
      name,
      sku: (sku || `SKU-${Date.now().toString().slice(-6)}`).toUpperCase(),
      barcode: generatedBarcode,
      brand: brand || 'SMP Fashion',
      category,
      shopId,
      description,
      costPrice: costPrice || Math.round(originalPrice * 0.6),
      originalPrice,
      sellingPrice: sellingPrice || originalPrice,
      discountPercent,
      gstPercent,
      finalPrice,
      availableQuantity,
      lowStockThreshold,
      images,
      sizes,
      colours,
      variants,
      isFeatured,
      isTrending,
      tags
    });

    // Create or update Inventory record
    await Inventory.findOneAndUpdate(
      { shopId, productId: product._id },
      {
        currentStock: availableQuantity,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        reorderLevel: lowStockThreshold,
        $push: {
          stockLogs: {
            type: 'PURCHASE',
            quantity: availableQuantity,
            previousStock: 0,
            newStock: availableQuantity,
            unitCost: product.costPrice,
            notes: 'Initial Product Stock Entry',
            performedBy: req.user._id
          }
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (discountPercent !== undefined) product.discountPercent = discountPercent;
    if (gstPercent !== undefined) product.gstPercent = gstPercent;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
    if (images !== undefined) product.images = images;
    if (sizes !== undefined) product.sizes = sizes;
    if (colours !== undefined) product.colours = colours;
    if (variants !== undefined) product.variants = variants;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isTrending !== undefined) product.isTrending = isTrending;
    if (tags !== undefined) product.tags = tags;
    if (isActive !== undefined) product.isActive = isActive;

    // Recalculate final price
    const gstRate = product.gstPercent || 5;
    const baseSelling = product.sellingPrice || product.originalPrice;
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

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Categories
 * @route   GET /api/products/categories/list
 * @access  Public
 */
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create Category
 * @route   POST /api/products/categories
 * @access  Private (Admin, Owner)
 */
const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;
    const shopId = req.user.shopId || req.body.shopId;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const category = await Category.create({
      name,
      slug,
      description,
      image: image || '',
      shopId
    });

    res.status(201).json({ success: true, category });
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
    const shop = await Shop.findOne({ isActive: true });
    const rules = (shop && shop.settings && shop.settings.deliverySettings) ? shop.settings.deliverySettings : {
      enabled: true,
      deliveryCharge: 50,
      freeDeliveryThreshold: 1000,
      chargeType: 'FLAT',
      description: 'Standard Express Shipping (2-3 business days)'
    };
    res.status(200).json({ success: true, delivery: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  importProductsExcel,
  exportProductsExcel,
  getShopDeliveryRules
};
