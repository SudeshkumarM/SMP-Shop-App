import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const DEFAULT_CATEGORY_IMAGE = '/images/category-default.svg';

const CategoryImagePicker = ({ image, onChange }) => {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(image || DEFAULT_CATEGORY_IMAGE);
  const [temporaryPreview, setTemporaryPreview] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreview(image || DEFAULT_CATEGORY_IMAGE);
  }, [image]);

  useEffect(() => () => {
    if (temporaryPreview) URL.revokeObjectURL(temporaryPreview);
  }, [temporaryPreview]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      addToast('Choose a JPG, PNG, or WEBP image.', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Category images must be 5 MB or smaller.', 'error');
      event.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setTemporaryPreview(objectUrl);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const body = new FormData();
      body.append('image', file);
      const response = await api.post('/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (!response.data?.success || !response.data.imageUrl) {
        throw new Error(response.data?.message || 'Image upload did not return a saved URL.');
      }

      onChange(response.data.imageUrl);
      setPreview(response.data.imageUrl);
      URL.revokeObjectURL(objectUrl);
      setTemporaryPreview('');
      addToast('Category image uploaded. Save the category to apply it.', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || error.message || 'Category image upload failed.', 'error');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const applyUrl = () => {
    const candidate = imageUrl.trim();
    try {
      const parsed = new URL(candidate);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
      onChange(candidate);
      setPreview(candidate);
      setImageUrl('');
      addToast('Image URL added. Save the category to apply it.', 'success');
    } catch {
      addToast('Enter a valid HTTP or HTTPS image URL.', 'error');
    }
  };

  const selectDefault = () => {
    onChange(DEFAULT_CATEGORY_IMAGE);
    setPreview(DEFAULT_CATEGORY_IMAGE);
    setImageUrl('');
  };

  return (
    <div className="mb-3">
      <label className="form-label small fw-semibold text-dark">Category Image</label>
      <div className="d-flex align-items-center gap-3 mb-2">
        <img
          src={preview || DEFAULT_CATEGORY_IMAGE}
          alt="Category image preview"
          className="rounded border"
          style={{ width: 96, height: 72, objectFit: 'cover', background: '#0f172a' }}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = DEFAULT_CATEGORY_IMAGE;
          }}
        />
        <div className="d-flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="d-none"
            onChange={handleFile}
          />
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? 'Uploading...' : 'Upload image'}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={selectDefault}>
            Use system default
          </button>
        </div>
      </div>
      <div className="input-group input-group-sm">
        <input
          type="url"
          className="form-control"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="Or enter an HTTPS image URL"
        />
        <button type="button" className="btn btn-outline-primary" disabled={!imageUrl.trim()} onClick={applyUrl}>
          Use URL
        </button>
      </div>
      <small className="text-muted">JPG, PNG, or WEBP up to 5 MB. Uploaded files require configured persistent storage in production.</small>
    </div>
  );
};

export default CategoryImagePicker;
