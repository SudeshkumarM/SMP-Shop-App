const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
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
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

const excelMimeTypes = {
  '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']
};
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (excelMimeTypes[extension]?.includes(file.mimetype.toLowerCase())) {
      callback(null, true);
      return;
    }
    callback(new Error('Please upload an Excel file (.xlsx or .xls).'));
  }
}).single('file');

const handleExcelUpload = (req, res, next) => {
  excelUpload(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({
        success: false,
        message: tooLarge ? 'Excel files must be 5 MB or smaller.' : error.message
      });
    }

    return res.status(400).json({ success: false, message: error.message });
  });
};

// Public endpoints
router.get('/', getProducts);
router.get('/delivery/rules', getShopDeliveryRules);
router.get('/offers/active', getActiveCoupons);
router.get('/categories/list', getCategories);
router.get('/export-excel', protect, authorize('admin', 'owner'), exportProductsExcel);

// Barcode & QR Scanner Lookup (accessible to staff, admin, owner)
router.get('/by-barcode/:barcode', protect, authorize('staff', 'admin', 'owner'), lookupProductByBarcode);
router.get('/by-qr', protect, authorize('staff', 'admin', 'owner'), lookupByQR);
router.get('/by-qr/:qrData', protect, authorize('staff', 'admin', 'owner'), lookupByQR);

// Barcode Management endpoints
router.get('/barcodes/list', protect, authorize('admin', 'owner', 'staff'), getBarcodesList);
router.post('/barcodes/assign', protect, authorize('admin', 'owner'), assignOrUpdateBarcode);
router.delete('/barcodes/:productId', protect, authorize('admin', 'owner'), deleteBarcode);

// QR Code Management endpoints
router.get('/qr-codes/list', protect, authorize('admin', 'owner', 'staff'), getQRCodesList);
router.post('/qr-codes/generate', protect, authorize('admin', 'owner'), createQRCode);
router.put('/qr-codes/:id', protect, authorize('admin', 'owner'), updateQRCode);
router.delete('/qr-codes/:id', protect, authorize('admin', 'owner'), deleteQRCode);

// Category CRUD endpoints (must be before /:id)
router.post('/categories', protect, authorize('admin', 'owner'), createCategory);
router.put('/categories/:id', protect, authorize('admin', 'owner'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin', 'owner'), deleteCategory);

// Protected Product CRUD endpoints
router.post('/', protect, authorize('admin', 'owner', 'staff'), createProduct);
router.put('/:id', protect, authorize('admin', 'owner'), updateProduct);
router.delete('/:id', protect, authorize('admin', 'owner'), deleteProduct);
router.post('/import-excel', protect, authorize('admin', 'owner'), handleExcelUpload, importProductsExcel);
router.get('/:id', getProductById);

module.exports = router;
