import React, { useState, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ProductImageUploader = ({ images = [], onChange, maxImages = 6 }) => {
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceIndexRef = useRef(null);

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      addToast(`Invalid file type "${file.name}". Please upload JPEG, PNG, or WEBP images only.`, 'error');
      return false;
    }
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeBytes) {
      addToast(`File "${file.name}" exceeds 5MB limit. Please select a smaller image.`, 'error');
      return false;
    }
    return true;
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      addToast(`You can upload a maximum of ${maxImages} images per product.`, 'warning');
      return;
    }

    const validFiles = files.filter(validateFile);
    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('images', file);
      });

      const res = await api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.imageUrls) {
        const updated = [...images, ...res.data.imageUrls];
        onChange(updated);
        addToast(`${res.data.imageUrls.length} image(s) uploaded successfully!`, 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload images', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleReplaceUpload = async (e) => {
    const file = e.target.files?.[0];
    const index = replaceIndexRef.current;
    if (!file || index === null || index === undefined) return;

    if (!validateFile(file)) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.imageUrl) {
        const updated = [...images];
        updated[index] = res.data.imageUrl;
        onChange(updated);
        addToast('Image replaced successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to replace image', 'error');
    } finally {
      setUploading(false);
      replaceIndexRef.current = null;
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    addToast('Image removed', 'info');
  };

  const handleSetPrimary = (index) => {
    if (index === 0) return;
    const target = images[index];
    const remaining = images.filter((_, idx) => idx !== index);
    const updated = [target, ...remaining];
    onChange(updated);
    addToast('Primary image updated', 'success');
  };

  const handleAddUrl = (e) => {
    e.preventDefault();
    const clean = urlInput.trim();
    if (!clean) return;

    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/uploads/')) {
      addToast('Please enter a valid image URL starting with http://, https://, or /uploads/', 'error');
      return;
    }

    if (images.length >= maxImages) {
      addToast(`Maximum ${maxImages} images allowed.`, 'warning');
      return;
    }

    onChange([...images, clean]);
    setUrlInput('');
    setShowUrlInput(false);
    addToast('Image URL added', 'success');
  };

  return (
    <div className="product-image-uploader mb-3">
      {/* Upload Controls */}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="d-none"
          onChange={handleFileUpload}
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          className="d-none"
          onChange={handleFileUpload}
        />
        <input
          type="file"
          ref={replaceInputRef}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="d-none"
          onChange={handleReplaceUpload}
        />

        {/* Gallery / Computer Files Button */}
        <button
          type="button"
          disabled={uploading || images.length >= maxImages}
          className="btn btn-outline-primary btn-sm rounded-pill d-flex align-items-center gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="bi bi-folder2-open"></i> Choose Files / Gallery
        </button>

        {/* Camera Capture Button */}
        <button
          type="button"
          disabled={uploading || images.length >= maxImages}
          className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-2"
          onClick={() => cameraInputRef.current?.click()}
        >
          <i className="bi bi-camera"></i> Camera
        </button>

        {/* Web Image URL Button */}
        <button
          type="button"
          disabled={uploading || images.length >= maxImages}
          className="btn btn-outline-dark btn-sm rounded-pill d-flex align-items-center gap-2"
          onClick={() => setShowUrlInput(!showUrlInput)}
        >
          <i className="bi bi-link-45deg"></i> Add by URL
        </button>

        <span className="small text-muted ms-auto">
          {images.length} / {maxImages} images
        </span>
      </div>

      {/* URL Input Bar */}
      {showUrlInput && (
        <div className="input-group input-group-sm mb-3">
          <input
            type="url"
            placeholder="Paste image link (https://... or /uploads/...)"
            className="form-control"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={handleAddUrl}>
            Add Image
          </button>
          <button type="button" className="btn btn-light" onClick={() => setShowUrlInput(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* Uploading progress spinner */}
      {uploading && (
        <div className="d-flex align-items-center gap-2 p-2 mb-3 bg-light rounded text-primary small">
          <div className="spinner-border spinner-border-sm" role="status"></div>
          <span>Uploading and optimizing image(s)... Please wait.</span>
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 ? (
        <div className="row g-2">
          {images.map((imgUrl, idx) => (
            <div key={idx} className="col-4 col-sm-3 col-md-2">
              <div className="card h-100 position-relative border shadow-xs overflow-hidden group-hover-box">
                {/* Main image tag badge */}
                {idx === 0 && (
                  <span className="badge bg-primary position-absolute top-0 start-0 m-1 shadow-sm small py-1 px-2" style={{ zIndex: 2 }}>
                    Primary
                  </span>
                )}

                <div
                  style={{
                    height: '110px',
                    backgroundImage: `url(${imgUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#F1F5F9'
                  }}
                />

                <div className="card-footer p-1 d-flex justify-content-between bg-white border-top">
                  {idx !== 0 ? (
                    <button
                      type="button"
                      title="Set as Primary"
                      className="btn btn-link btn-xs p-0 text-muted"
                      onClick={() => handleSetPrimary(idx)}
                    >
                      <i className="bi bi-star"></i>
                    </button>
                  ) : (
                    <span className="small text-warning" title="Primary"><i className="bi bi-star-fill"></i></span>
                  )}

                  <button
                    type="button"
                    title="Replace Image"
                    className="btn btn-link btn-xs p-0 text-primary"
                    onClick={() => {
                      replaceIndexRef.current = idx;
                      replaceInputRef.current?.click();
                    }}
                  >
                    <i className="bi bi-arrow-repeat"></i>
                  </button>

                  <button
                    type="button"
                    title="Remove Image"
                    className="btn btn-link btn-xs p-0 text-danger"
                    onClick={() => handleRemoveImage(idx)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed rounded p-3 text-center bg-light text-muted small">
          <i className="bi bi-images display-6 d-block mb-1 text-secondary"></i>
          <div>No images selected yet.</div>
          <div className="text-secondary small">
            Upload from gallery, capture via camera, or attach image URL (Max 5MB: JPG, PNG, WEBP).
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImageUploader;