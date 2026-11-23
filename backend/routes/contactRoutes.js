const express = require('express');
const router = express.Router();
const { submitContact, getContacts, updateContactStatus } = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public endpoint
router.post('/', submitContact);

// Admin/Owner endpoints
router.get('/', protect, authorize('admin', 'owner'), getContacts);
router.put('/:id', protect, authorize('admin', 'owner'), updateContactStatus);

module.exports = router;
