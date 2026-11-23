const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
const isVercel = Boolean(process.env.VERCEL);
const useCloudinary = cloudinaryConfigured;
const maxFileSize = 5 * 1024 * 1024;
const maxProductImageSize = 4 * 1024 * 1024;
const uploadDir = path.resolve(__dirname, '..', 'uploads');

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const allowedMimeTypes = {
  '.gif': ['image/gif'],
  '.jpeg': ['image/jpeg', 'image/jpg'],
  '.jpg': ['image/jpeg', 'image/jpg'],
  '.png': ['image/png'],
  '.webp': ['image/webp']
};
const productImageMimeTypes = {
  '.jpeg': ['image/jpeg', 'image/jpg'],
  '.jpg': ['image/jpeg', 'image/jpg'],
  '.png': ['image/png'],
  '.webp': ['image/webp']
};

class UploadValidationError extends Error {
  constructor(message, uploadDetails = {}) {
    super(message);
    this.uploadDetails = uploadDetails;
  }
}

const fileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const acceptedMimeTypes = allowedMimeTypes[extension];

  if (acceptedMimeTypes && acceptedMimeTypes.includes(file.mimetype.toLowerCase())) {
    callback(null, true);
    return;
  }

  callback(new UploadValidationError('Only JPEG, JPG, PNG, WEBP, and GIF image files are permitted.'));
};

const productFileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const acceptedMimeTypes = productImageMimeTypes[extension];

  if (acceptedMimeTypes && acceptedMimeTypes.includes(file.mimetype.toLowerCase())) {
    callback(null, true);
    return;
  }

  callback(new UploadValidationError(
    'Only JPEG, JPG, PNG, and WEBP product images are permitted.',
    {
      fieldName: file.fieldname,
      mimeType: file.mimetype,
      fileSizeBytes: null
    }
  ));
};

const localStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdir(uploadDir, { recursive: true }, (error) => {
      callback(error, error ? undefined : uploadDir);
    });
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `smp_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${extension}`);
  }
});

const upload = multer({
  storage: isVercel || useCloudinary ? multer.memoryStorage() : localStorage,
  limits: { fileSize: maxFileSize, files: 8 },
  fileFilter
});

const productImageUpload = multer({
  storage: isVercel || useCloudinary ? multer.memoryStorage() : localStorage,
  limits: { fileSize: maxProductImageSize, files: 1 },
  fileFilter: productFileFilter
});

const uploadToCloudinary = (file) => new Promise((resolve, reject) => {
  const publicId = `smp_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const stream = cloudinary.uploader.upload_stream({
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'smp-products',
    public_id: publicId,
    resource_type: 'image',
    overwrite: false
  }, (error, result) => {
    if (error) {
      reject(error);
      return;
    }

    if (!result?.secure_url || !result.public_id) {
      reject(new Error('Cloudinary returned an incomplete image upload result.'));
      return;
    }

    resolve({
      url: result.secure_url,
      filename: result.public_id,
      publicId: result.public_id
    });
  });

  stream.on('error', reject);
  Readable.from([file.buffer]).pipe(stream);
});

const storeFile = async (file) => {
  if (!useCloudinary) {
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename
    };
  }

  return uploadToCloudinary(file);
};

const removeCloudinaryFile = async (file) => {
  try {
    const result = await cloudinary.uploader.destroy(file.publicId, { resource_type: 'image' });
    if (result.result !== 'ok' && result.result !== 'not found') {
      console.error(`[Upload] Cloudinary cleanup did not complete for ${file.publicId}.`);
    }
  } catch (error) {
    console.error(`[Upload] Cloudinary cleanup failed for ${file.publicId}:`, error.message);
  }
};

const storeMultipleFiles = async (files) => {
  const storedFiles = [];

  try {
    for (const file of files) {
      storedFiles.push(await storeFile(file));
    }
    return storedFiles;
  } catch (error) {
    if (useCloudinary) {
      await Promise.all(storedFiles.map(removeCloudinaryFile));
    }
    throw error;
  }
};

const sendUploadError = (error, res, next, fileSizeLimit) => {
  if (error instanceof multer.MulterError) {
    const isSizeError = error.code === 'LIMIT_FILE_SIZE';
    const message = isSizeError
      ? `Each image must be ${fileSizeLimit / (1024 * 1024)} MB or smaller.`
      : error.code === 'LIMIT_FILE_COUNT'
        ? 'You can upload a maximum of 8 images at a time.'
        : error.code === 'LIMIT_UNEXPECTED_FILE'
          ? `Unexpected file field "${error.field || 'unknown'}". Check that the upload field is named "image".`
        : error.message;
    return res.status(isSizeError ? 413 : 400).json({ success: false, message });
  }

  if (error instanceof UploadValidationError) {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (useCloudinary) {
    console.error('[Upload] Cloudinary image upload failed:', {
      errorName: error.name,
      errorCode: error.http_code || error.code
    });
    return res.status(502).json({
      success: false,
      message: 'Image storage is temporarily unavailable. Please try again.'
    });
  }

  return next(error);
};

const logProductImageDiagnostics = (req, details = {}) => {
  const file = req.file;
  console.info('[Upload] Product image request', {
    expectedFieldName: 'image',
    fieldName: details.fieldName ?? file?.fieldname ?? null,
    mimeType: details.mimeType ?? file?.mimetype ?? null,
    fileSizeBytes: Number.isFinite(file?.size) ? file.size : (details.fileSizeBytes ?? null),
    reqFileExists: Boolean(file)
  });
};

const runUpload = (middleware, handler, fileSizeLimit = maxFileSize, productImageDiagnostics = false) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (error) {
      if (productImageDiagnostics) {
        logProductImageDiagnostics(req, error.uploadDetails || {
          fieldName: error.field || null
        });
      }
      sendUploadError(error, res, next, fileSizeLimit);
      return;
    }

    if (productImageDiagnostics) {
      logProductImageDiagnostics(req);
    }

    Promise.resolve(handler(req, res)).catch((uploadError) => {
      sendUploadError(uploadError, res, next, fileSizeLimit);
    });
  });
};

const requireCloudinaryConfig = (req, res, next) => {
  if (isVercel && !cloudinaryConfigured) {
    return res.status(503).json({
      success: false,
      message: 'Permanent image storage is not configured for Vercel. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the Vercel project environment.'
    });
  }
  return next();
};

const handleSingleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No image file was received in multipart field 'image'."
    });
  }

  const storedFile = await storeFile(req.file);
  return res.status(200).json({
    success: true,
    url: storedFile.url,
    imageUrl: storedFile.url,
    filename: storedFile.filename
  });
};

router.post('/', protect, authorize('admin', 'owner'), requireCloudinaryConfig, runUpload(upload.single('image'), handleSingleUpload));

router.post(
  '/product-image',
  protect,
  authorize('admin', 'owner'),
  requireCloudinaryConfig,
  runUpload(productImageUpload.single('image'), handleSingleUpload, maxProductImageSize, true)
);

router.post('/multiple', protect, authorize('admin', 'owner'), requireCloudinaryConfig, runUpload(upload.array('images', 8), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'Please select at least one image file' });
  }

  const storedFiles = await storeMultipleFiles(req.files);
  const urls = storedFiles.map((file) => file.url);

  return res.status(200).json({
    success: true,
    count: storedFiles.length,
    urls,
    imageUrls: urls,
    files: storedFiles.map((file) => ({ url: file.url, filename: file.filename }))
  });
}));

module.exports = router;
