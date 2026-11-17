const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
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
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Public endpoints
router.get('/', getProducts);
router.get('/delivery/rules', getShopDeliveryRules);
router.get('/categories/list', getCategories);
router.get('/export-excel', protect, authorize('admin', 'owner'), exportProductsExcel);
router.get('/:id', getProductById);

// Protected Admin/Staff endpoints
router.post('/', protect, authorize('admin', 'owner', 'staff'), createProduct);
router.put('/:id', protect, authorize('admin', 'owner'), updateProduct);
router.delete('/:id', protect, authorize('admin', 'owner'), deleteProduct);
router.post('/categories', protect, authorize('admin', 'owner'), createCategory);
router.post('/import-excel', protect, authorize('admin', 'owner'), upload.single('file'), importProductsExcel);

module.exports = router;
