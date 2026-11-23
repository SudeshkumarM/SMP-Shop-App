import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useToast } from '../../context/ToastContext';
import QRCodeVisual from '../../components/common/QRCodeVisual';

const AdminQRManagement = ({ role = 'admin' }) => {
  const { addToast } = useToast();

  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editQr, setEditQr] = useState(null);
  const [viewQr, setViewQr] = useState(null);
  const [printQr, setPrintQr] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    qrType: 'PRODUCT',
    targetId: '',
    targetName: '',
    qrData: '',
    imageUrl: '',
    description: '',
    status: 'ACTIVE'
  });

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/qr-codes/list', {
        params: {
          search: search.trim() || undefined,
          type: typeFilter !== 'ALL' ? typeFilter : undefined
        }
      });
      if (res.data?.success) {
        setQrCodes(res.data.qrCodes || []);
      }
    } catch (err) {
      console.error('Fetch QR codes error:', err);
      addToast(err.response?.data?.message || 'Error loading QR codes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, [search, typeFilter]);

  // Real-time update listeners
  useEffect(() => {
    const handleQrChange = () => fetchQRCodes();
    socket.on('qrcode:created', handleQrChange);
    socket.on('qrcode:updated', handleQrChange);
    socket.on('qrcode:deleted', handleQrChange);

    return () => {
      socket.off('qrcode:created', handleQrChange);
      socket.off('qrcode:updated', handleQrChange);
      socket.off('qrcode:deleted', handleQrChange);
    };
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      qrType: 'PRODUCT',
      targetId: '',
      targetName: '',
      qrData: '',
      imageUrl: '',
      description: '',
      status: 'ACTIVE'
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (q) => {
    setEditQr(q);
    setFormData({
      title: q.title || '',
      qrType: q.qrType || 'PRODUCT',
      targetId: q.targetId || '',
      targetName: q.targetName || '',
      qrData: q.qrData || '',
      imageUrl: q.imageUrl || '',
      description: q.description || '',
      status: q.status || 'ACTIVE'
    });
  };

  const handleUploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      addToast('Choose a JPG, PNG, WEBP, or GIF image.', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('QR images must be 5 MB or smaller.', 'error');
      event.target.value = '';
      return;
    }

    const body = new FormData();
    body.append('image', file);
    setUploadingImage(true);
    try {
      const response = await api.post('/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (!response.data?.success || !response.data.imageUrl) {
        throw new Error(response.data?.message || 'Image upload did not return a saved URL.');
      }
      setFormData((current) => ({ ...current, imageUrl: response.data.imageUrl }));
      addToast('QR image uploaded. Save the QR code to apply it.', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || error.message || 'QR image upload failed.', 'error');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleSaveQR = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.qrData.trim()) {
      addToast('Title and QR data payload are required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (editQr) {
        const res = await api.put(`/products/qr-codes/${editQr._id}`, formData);
        if (res.data?.success) {
          addToast('QR Code updated successfully', 'success');
          setEditQr(null);
          fetchQRCodes();
        }
      } else {
        const res = await api.post('/products/qr-codes/generate', formData);
        if (res.data?.success) {
          addToast('New QR Code generated successfully', 'success');
          setShowAddModal(false);
          fetchQRCodes();
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save QR Code', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQR = async (q) => {
    if (!window.confirm(`Permanently delete QR code "${q.title}"?`)) return;

    try {
      const res = await api.delete(`/products/qr-codes/${q._id}`);
      if (res.data?.success) {
        addToast('QR Code deleted', 'success');
        fetchQRCodes();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete QR Code', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fade-in pb-5">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold brand-font text-white mb-1">
            <i className="bi bi-qr-code-scan text-primary me-2"></i>QR Code Management
          </h2>
          <p className="text-muted mb-0">
            Generate, customize, manage, download and print QR codes for Products, UPI Payments, and Invoices.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={fetchQRCodes}
            className="btn btn-outline-primary btn-sm"
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            className="btn btn-teal btn-sm px-3 fw-bold"
          >
            <i className="bi bi-plus-circle me-1"></i> Generate QR Code
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="smp-card p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-md-7 col-lg-8">
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by title, target ID or QR payload data..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch('')}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>
          <div className="col-md-5 col-lg-4 d-flex align-items-center gap-2">
            <label className="text-muted small fw-semibold text-nowrap">QR Type:</label>
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All QR Types</option>
              <option value="PRODUCT">Product Lookups</option>
              <option value="PAYMENT">UPI & Payments</option>
              <option value="INVOICE">Digital Invoices</option>
              <option value="CUSTOM">Custom URLs / Payloads</option>
            </select>
          </div>
        </div>
      </div>

      {/* QR Code Cards Grid */}
      <div className="row g-3 mb-4">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : qrCodes.length === 0 ? (
          <div className="col-12 text-center py-5 smp-card text-muted">
            <i className="bi bi-qr-code fs-1 d-block mb-2 text-secondary"></i>
            No QR codes found matching your criteria.
          </div>
        ) : (
          qrCodes.map((q) => {
            const badgeClass =
              q.qrType === 'PRODUCT'
                ? 'bg-primary'
                : q.qrType === 'PAYMENT'
                ? 'bg-success'
                : q.qrType === 'INVOICE'
                ? 'bg-info text-dark'
                : 'bg-secondary';

            return (
              <div className="col-xl-4 col-md-6" key={q._id}>
                <div className="smp-card p-3 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <span className={`badge ${badgeClass} font-monospace`}>
                        {q.qrType}
                      </span>
                      <span
                        className={`badge ${
                          q.status === 'ACTIVE'
                            ? 'bg-outline-success border border-success text-success'
                            : 'bg-secondary'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>

                    <h5 className="fw-bold text-white mb-1">{q.title}</h5>
                    {q.targetName && (
                      <small className="text-info d-block mb-2">
                        Target: <strong>{q.targetName}</strong> {q.targetId && `(${q.targetId})`}
                      </small>
                    )}

                    <div className="text-center py-3">
                      {q.imageUrl ? (
                        <img src={q.imageUrl} alt={`${q.title} QR code`} style={{ width: 130, height: 130, objectFit: 'contain' }} />
                      ) : (
                        <QRCodeVisual value={q.qrData} size={130} includeDownload={false} />
                      )}
                    </div>

                    <p className="small text-muted mb-2 font-monospace text-truncate" title={q.qrData}>
                      <i className="bi bi-link-45deg me-1"></i>
                      {q.qrData}
                    </p>

                    {q.description && (
                      <p className="small text-secondary mb-0">{q.description}</p>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-3 mt-3 border-top border-secondary">
                    <small className="text-muted">
                      Scans: <strong>{q.scanCount || 0}</strong>
                    </small>
                    <div className="btn-group btn-group-sm">
                      <button
                        onClick={() => setViewQr(q)}
                        className="btn btn-info text-white"
                        title="View enlarged & details"
                      >
                        <i className="bi bi-eye-fill"></i>
                      </button>
                      <button
                        onClick={() => setPrintQr(q)}
                        className="btn btn-download text-white"
                        title="Print QR sticker"
                      >
                        <i className="bi bi-printer-fill"></i>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(q)}
                        className="btn btn-purple"
                        title="Edit QR configuration"
                      >
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteQR(q)}
                        className="btn btn-danger"
                        title="Delete QR code"
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit QR Modal */}
      {(showAddModal || editQr) && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom border-secondary">
                <h5 className="modal-title fw-bold text-white">
                  <i className={`bi ${editQr ? 'bi-pencil-square text-info' : 'bi-plus-circle text-teal'} me-2`}></i>
                  {editQr ? 'Edit QR Code' : 'Generate New QR Code'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditQr(null);
                  }}
                ></button>
              </div>

              <form onSubmit={handleSaveQR}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-white">QR Code Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Counter UPI QR / Shirt Product QR"
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold text-white">QR Type</label>
                      <select
                        className="form-select"
                        value={formData.qrType}
                        onChange={(e) => setFormData({ ...formData, qrType: e.target.value })}
                      >
                        <option value="PRODUCT">PRODUCT (Item lookup / POS scan)</option>
                        <option value="PAYMENT">PAYMENT (UPI / Bank transfer)</option>
                        <option value="INVOICE">INVOICE (Digital bill lookup)</option>
                        <option value="CUSTOM">CUSTOM (URL / Marketing)</option>
                      </select>
                    </div>

                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold text-white">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold text-white">Target Name (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.targetName}
                        onChange={(e) => setFormData({ ...formData, targetName: e.target.value })}
                        placeholder="e.g. Shirt / Counter 1"
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold text-white">Target ID (Optional)</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        value={formData.targetId}
                        onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                        placeholder="e.g. SMP-SHIRT-001"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-white">QR Data Payload *</label>
                    <textarea
                      rows="3"
                      className="form-control font-monospace"
                      value={formData.qrData}
                      onChange={(e) => setFormData({ ...formData, qrData: e.target.value })}
                      placeholder="e.g. smp:product:SMP-SHIRT-001 or upi://pay?pa=... or https://..."
                      required
                    ></textarea>
                    <small className="text-muted">
                      Encoded text, product URI, or UPI string read by cameras and scanners.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-white">Existing QR Image (Optional)</label>
                    <div className="d-flex align-items-center gap-3 mb-2">
                      {formData.imageUrl && (
                        <img src={formData.imageUrl} alt="Uploaded QR preview" style={{ width: 72, height: 72, objectFit: 'contain', background: '#fff' }} />
                      )}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="d-none"
                        onChange={handleUploadImage}
                      />
                      <button type="button" className="btn btn-outline-info btn-sm" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()}>
                        {uploadingImage ? 'Uploading...' : 'Upload QR image'}
                      </button>
                    </div>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="Or paste an HTTPS image URL"
                    />
                    <small className="text-muted">Optional for an existing payment QR; otherwise a QR image is generated from the payload.</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-white">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Operational purpose or instructions"
                    />
                  </div>

                  {formData.qrData && !formData.imageUrl && (
                    <div className="text-center p-3 bg-secondary rounded-3 border border-secondary">
                      <small className="text-muted d-block mb-2">Live QR Preview:</small>
                      <QRCodeVisual value={formData.qrData} size={110} />
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top border-secondary">
                  <button
                    type="button"
                    className="btn btn-cancel"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditQr(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn ${editQr ? 'btn-info text-white' : 'btn-teal text-white'} fw-bold`}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editQr ? 'Update QR Code' : 'Create QR Code'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Enlarge Modal */}
      {viewQr && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-center p-4">
              <h5 className="modal-title fw-bold text-white mb-1">{viewQr.title}</h5>
              <p className="text-muted small mb-3">
                Type: <strong>{viewQr.qrType}</strong> | Target: <strong>{viewQr.targetName || 'General'}</strong>
              </p>

              <div className="p-3 bg-white rounded-3 d-inline-block shadow my-2">
                {viewQr.imageUrl ? (
                  <img src={viewQr.imageUrl} alt={`${viewQr.title} QR code`} style={{ width: 220, height: 220, objectFit: 'contain' }} />
                ) : (
                  <QRCodeVisual value={viewQr.qrData} size={220} />
                )}
              </div>

              <div className="my-3 p-2 bg-secondary rounded font-monospace small text-info text-break">
                {viewQr.qrData}
              </div>

              <div className="d-flex justify-content-center gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setViewQr(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const q = viewQr;
                    setViewQr(null);
                    setPrintQr(q);
                  }}
                >
                  <i className="bi bi-printer me-1"></i> Print Sticker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print QR Sticker Modal */}
      {printQr && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom border-secondary no-print">
                <h5 className="modal-title fw-bold text-white">
                  <i className="bi bi-printer-fill text-primary me-2"></i>
                  Print QR Sticker
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setPrintQr(null)}
                ></button>
              </div>

              <div className="modal-body p-4 text-center">
                <div
                  id="printable-qr-sticker"
                  className="p-4 bg-white rounded border border-dark d-inline-block text-dark"
                  style={{ minWidth: '260px' }}
                >
                  <h6 className="fw-bold mb-1 text-uppercase">SMP</h6>
                  <p className="small text-muted mb-2">{printQr.title}</p>
                  <div className="my-2">
                    {printQr.imageUrl ? (
                      <img src={printQr.imageUrl} alt={`${printQr.title} QR code`} style={{ width: 160, height: 160, objectFit: 'contain' }} />
                    ) : (
                      <QRCodeVisual value={printQr.qrData} size={160} />
                    )}
                  </div>
                  <small className="fw-bold d-block text-truncate" style={{ maxWidth: '220px' }}>
                    {printQr.targetName || printQr.targetId || 'Scan with Camera / POS'}
                  </small>
                </div>
              </div>

              <div className="modal-footer border-top border-secondary no-print">
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setPrintQr(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold"
                  onClick={handlePrint}
                >
                  <i className="bi bi-printer me-1"></i> Print Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQRManagement;
