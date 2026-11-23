import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ProductImageUploader = ({
  images = [],
  onChange,
  onUploadStateChange,
  maxImages = 6
}) => {
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [selectedPreviews, setSelectedPreviews] = useState([]);
  const previewUrlsRef = useRef([]);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceIndexRef = useRef(null);

  const clearSelectedPreviews = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setSelectedPreviews([]);
  };

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError(`"${file.name}" is not a supported image. Choose PNG, JPG, JPEG, or WEBP.`);
      return false;
    }
    const maxSizeBytes = 4 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError(`"${file.name}" exceeds the 4 MB upload limit. Choose a smaller image.`);
      return false;
    }
    return true;
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadError('');
    if (images.length + files.length > maxImages) {
      addToast(`You can upload a maximum of ${maxImages} images per product.`, 'warning');
      e.target.value = '';
      return;
    }

    const validFiles = files.filter(validateFile);
    if (validFiles.length !== files.length) {
      e.target.value = '';
      return;
    }
    if (validFiles.length === 0) return;
    const previewUrls = validFiles.map(file => URL.createObjectURL(file));
    clearSelectedPreviews();
    previewUrlsRef.current = previewUrls;
    setSelectedPreviews(previewUrls);

    setUploading(true);
    onUploadStateChange?.(true);
    setUploadProgress(0);
    const uploadedUrls = [];
    try {
      const totalBytes = validFiles.reduce((total, file) => total + file.size, 0);
      let completedBytes = 0;

      for (const file of validFiles) {
        const body = new FormData();
        body.append('image', file);
        const res = await api.post('/upload/product-image', body, {
          onUploadProgress: (event) => {
            if (!event.total) return;
            const uploadedBytes = completedBytes + event.loaded;
            setUploadProgress(Math.min(99, Math.round((uploadedBytes / totalBytes) * 100)));
          }
        });

        if (!res.data?.success || !res.data.imageUrl) {
          throw new Error(res.data?.message || `Image storage did not return a URL for "${file.name}".`);
        }

        uploadedUrls.push(res.data.imageUrl);
        completedBytes += file.size;
      }

      onChange([...images, ...uploadedUrls]);
      setUploadProgress(100);
      clearSelectedPreviews();
      addToast(`${uploadedUrls.length} image(s) uploaded successfully!`, 'success');
    } catch (err) {
      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls]);
        clearSelectedPreviews();
      }
      const errorMsg = err.response?.data?.message || err.message || 'Image upload failed. Please try again.';
      setUploadError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
      setTimeout(() => setUploadProgress(0), 1200);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleReplaceUpload = async (e) => {
    const file = e.target.files?.[0];
    const index = replaceIndexRef.current;
    if (!file || index === null || index === undefined) return;

    setUploadError('');
    if (!validateFile(file)) {
      replaceIndexRef.current = null;
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      return;
    }

    setUploading(true);
    onUploadStateChange?.(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/upload/product-image', formData, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      });

      if (!res.data?.success || !res.data.imageUrl) {
        throw new Error(res.data?.message || 'Image storage did not return a URL.');
      }
      const updated = [...images];
      updated[index] = res.data.imageUrl;
      onChange(updated);
      setUploadProgress(100);
      addToast('Image replaced successfully!', 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Image replacement failed. Please try again.';
      setUploadError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
      setTimeout(() => setUploadProgress(0), 1200);
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

    let parsedUrl;
    try {
      parsedUrl = new URL(clean);
    } catch {
      addToast('Please enter a valid image URL starting with http:// or https://.', 'error');
      return;
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      addToast('Please enter a complete image URL starting with http:// or https://.', 'error');
      return;
    }

    if (images.length >= maxImages) {
      addToast(`Maximum ${maxImages} images allowed.`, 'warning');
      return;
    }

    onChange([...images, clean]);
    setUploadError('');
    clearSelectedPreviews();
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
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
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
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
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
          <i className="bi bi-folder2-open"></i> Choose Image / Upload
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
            placeholder="Paste a complete image URL (https://...)"
            className="form-control"
            disabled={uploading}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={handleAddUrl} disabled={uploading}>
            Add Image
          </button>
          <button type="button" className="btn btn-light" onClick={() => setShowUrlInput(false)} disabled={uploading}>
            Cancel
          </button>
        </div>
      )}

      {/* Uploading progress spinner */}
      {uploading && (
        <div className="d-flex align-items-center gap-2 p-2 mb-3 bg-light rounded text-primary small">
          <div className="spinner-border spinner-border-sm" role="status"></div>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between">
              <span>Uploading image(s)...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="progress mt-2" style={{ height: '6px' }}>
              <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        </div>
      )}
      {uploadError && (
        <div className="alert alert-danger py-2 small" role="alert">
          {uploadError}
        </div>
      )}

      {/* Image Preview Grid */}
      {selectedPreviews.length > 0 && (
        <div className="row g-2 mb-3" aria-label="Selected image previews">
          {selectedPreviews.map((previewUrl, idx) => (
            <div key={previewUrl} className="col-4 col-sm-3 col-md-2">
              <img
                src={previewUrl}
                alt={`Selected preview ${idx + 1}`}
                className="rounded border"
                style={{ width: '100%', height: '110px', objectFit: 'cover', backgroundColor: '#F1F5F9' }}
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            </div>
          ))}
        </div>
      )}
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
                      disabled={uploading}
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
                    disabled={uploading}
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
                    disabled={uploading}
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
            Upload from gallery, capture via camera, or attach an image URL (Max 4 MB per file: JPG, PNG, WEBP).
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImageUploader;