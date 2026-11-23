import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useToast } from '../../context/ToastContext';
import BarcodeVisual from '../../components/common/BarcodeVisual';

const AdminBarcodeManagement = ({ role = 'admin' }) => {
  const { addToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [categories, setCategories] = useState([]);

  // Modals State
  const [viewProduct, setViewProduct] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [printProduct, setPrintProduct] = useState(null);
  const [printQuantity, setPrintQuantity] = useState(12);
  const [submitting, setSubmitting] = useState(false);

  // Edit / Assign Form State
  const [editForm, setEditForm] = useState({
    barcode: '',
    barcodeFormat: 'CODE128'
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/barcodes/list', {
        params: {
          search: search.trim() || undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined
        }
      });
      if (res.data?.success) {
        setProducts(res.data.products || res.data.barcodes || []);
      }
    } catch (err) {
      console.error('Fetch barcodes error:', err);
      addToast(err.response?.data?.message || 'Error loading barcode catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories/list');
      if (res.data?.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search, categoryFilter]);

  // Real-time update listeners
  useEffect(() => {
    const handleProductChange = () => {
      fetchProducts();
    };

    socket.on('product:updated', handleProductChange);
    socket.on('product:created', handleProductChange);

    return () => {
      socket.off('product:updated', handleProductChange);
      socket.off('product:created', handleProductChange);
    };
  }, []);

  const handleOpenEdit = (p) => {
    setEditProduct(p);
    setEditForm({
      barcode: p.barcode || '',
      barcodeFormat: p.barcodeFormat || 'CODE128'
    });
  };

  const handleSaveBarcode = async (e) => {
    e.preventDefault();
    if (!editProduct) return;

    setSubmitting(true);
    try {
      const res = await api.put(`/products/${editProduct._id}/barcode`, editForm);
      if (res.data?.success) {
        addToast(`Barcode updated for ${editProduct.name}`, 'success');
        setEditProduct(null);
        fetchProducts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update barcode', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerate = async (p) => {
    if (!window.confirm(`Generate a brand new unique barcode for ${p.name}?`)) return;

    try {
      const res = await api.put(`/products/${p._id}/barcode`, {
        regenerate: true,
        barcodeFormat: p.barcodeFormat || 'CODE128'
      });
      if (res.data?.success) {
        addToast(`New barcode generated: ${res.data.barcode}`, 'success');
        fetchProducts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to regenerate barcode', 'error');
    }
  };

  const handleDeleteBarcode = async (p) => {
    if (!window.confirm(`Are you sure you want to remove the barcode from ${p.name}?`)) return;

    try {
      const res = await api.delete(`/products/${p._id}/barcode`);
      if (res.data?.success) {
        addToast(`Barcode removed from ${p.name}`, 'success');
        fetchProducts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete barcode', 'error');
    }
  };

  const handleDownloadPng = (p) => {
    const svgElem = document.getElementById(`barcode-svg-${p._id}`);
    if (!svgElem) {
      addToast('Barcode element not found for download.', 'warning');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElem);
    const canvas = document.createElement('canvas');
    const svgSize = svgElem.getBoundingClientRect();
    canvas.width = svgSize.width * 2 || 300;
    canvas.height = svgSize.height * 2 || 120;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.download = `SMP_Barcode_${p.sku}_${p.barcode}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      addToast('Barcode PNG downloaded!', 'success');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintSheet = (p) => {
    setPrintProduct(p);
  };

  const executePrint = () => {
    window.print();
  };

  return (
    <div className="fade-in pb-5">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold brand-font text-white mb-1">
            <i className="bi bi-upc text-primary me-2"></i>Barcode Management
          </h2>
          <p className="text-muted mb-0">
            Generate, customize, edit, download and print barcode tags for retail inventory.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={fetchProducts}
            className="btn btn-outline-primary btn-sm"
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
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
                placeholder="Search by product name, SKU or barcode digits..."
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
            <label className="text-muted small fw-semibold text-nowrap">Category:</label>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Barcode Products Table */}
      <div className="smp-card overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table align-middle mb-0" style={{ minWidth: '950px' }}>
            <thead>
              <tr>
                <th style={{ width: '45px' }}>#</th>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Barcode Visual</th>
                <th>Format</th>
                <th>Category</th>
                <th className="text-end">Price</th>
                <th className="text-center">Stock</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((p, idx) => {
                  const catName = typeof p.category === 'object' ? p.category?.name : (p.category || 'Apparel');
                  const stockQty = p.availableQuantity ?? p.stock ?? 0;

                  return (
                    <tr key={p._id}>
                      <td className="text-muted small">{idx + 1}</td>
                      <td>
                        <span className="badge bg-secondary font-monospace text-info border border-secondary">
                          {p.sku}
                        </span>
                      </td>
                      <td>
                        <span className="fw-bold text-white d-block">{p.name}</span>
                        <small className="text-muted font-monospace">{p.barcode || 'NO BARCODE'}</small>
                      </td>
                      <td>
                        <div id={`barcode-svg-${p._id}`}>
                          <BarcodeVisual
                            value={p.barcode}
                            format={p.barcodeFormat || 'CODE128'}
                            width={1.3}
                            height={34}
                            fontSize={10}
                          />
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary font-monospace text-light">
                          {p.barcodeFormat || 'CODE128'}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted small">{catName}</span>
                      </td>
                      <td className="text-end font-monospace text-white fw-bold">
                        ₹{(p.sellingPrice || 0).toFixed(2)}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${stockQty > 5 ? 'bg-primary' : 'bg-danger'}`}>
                          {stockQty} in stock
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            onClick={() => setViewProduct(p)}
                            className="btn btn-info text-white"
                            title="View enlarged barcode"
                          >
                            <i className="bi bi-eye-fill"></i>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="btn btn-purple"
                            title="Edit / Replace barcode digits"
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button
                            onClick={() => handleRegenerate(p)}
                            className="btn btn-teal text-white"
                            title="Regenerate clean unique barcode"
                          >
                            <i className="bi bi-arrow-repeat"></i>
                          </button>
                          <button
                            onClick={() => handlePrintSheet(p)}
                            className="btn btn-download text-white"
                            title="Print label tags"
                          >
                            <i className="bi bi-printer-fill"></i>
                          </button>
                          <button
                            onClick={() => handleDownloadPng(p)}
                            className="btn btn-secondary"
                            title="Download PNG image"
                          >
                            <i className="bi bi-download"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteBarcode(p)}
                            className="btn btn-danger"
                            title="Remove barcode"
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Enlarge Modal */}
      {viewProduct && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-center p-4">
              <h5 className="modal-title fw-bold text-white mb-2">Barcode Preview: {viewProduct.name}</h5>
              <p className="text-muted small mb-3">
                SKU: <strong>{viewProduct.sku}</strong> | Format: <strong>{viewProduct.barcodeFormat || 'CODE128'}</strong>
              </p>

              <div className="p-3 bg-white rounded-3 d-inline-block shadow my-2">
                <BarcodeVisual
                  value={viewProduct.barcode}
                  format={viewProduct.barcodeFormat || 'CODE128'}
                  width={2.2}
                  height={75}
                  fontSize={14}
                />
              </div>

              <div className="mt-3">
                <h4 className="fw-bold text-primary mb-1">₹{(viewProduct.sellingPrice || 0).toFixed(2)}</h4>
                <small className="text-muted">Standard POS Shelf Price</small>
              </div>

              <div className="d-flex justify-content-center gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setViewProduct(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-download"
                  onClick={() => handleDownloadPng(viewProduct)}
                >
                  <i className="bi bi-download me-1"></i> Download PNG
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const p = viewProduct;
                    setViewProduct(null);
                    handlePrintSheet(p);
                  }}
                >
                  <i className="bi bi-printer me-1"></i> Print Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Replace Barcode Modal */}
      {editProduct && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom border-secondary">
                <h5 className="modal-title fw-bold text-white">
                  <i className="bi bi-pencil-square text-purple me-2"></i>
                  Edit Barcode for {editProduct.name}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditProduct(null)}
                ></button>
              </div>
              <form onSubmit={handleSaveBarcode}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-white">Barcode Digits / Code *</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={editForm.barcode}
                      onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                      placeholder="e.g. 8901234567890"
                      required
                    />
                    <small className="text-muted">
                      Type manufacturer barcode digits or scan directly with USB barcode scanner into this box.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-white">Barcode Format Standard</label>
                    <select
                      className="form-select font-monospace"
                      value={editForm.barcodeFormat}
                      onChange={(e) => setEditForm({ ...editForm, barcodeFormat: e.target.value })}
                    >
                      <option value="CODE128">Code 128</option>
                      <option value="EAN13">EAN-13</option>
                      <option value="EAN8">EAN-8</option>
                      <option value="UPCA">UPC-A</option>
                      <option value="UPCE">UPC-E</option>
                      <option value="CODE39">Code 39</option>
                    </select>
                  </div>

                  {editForm.barcode && (
                    <div className="text-center p-3 bg-secondary rounded-3 border border-secondary">
                      <small className="text-muted d-block mb-2">Live Format Preview:</small>
                      <BarcodeVisual
                        value={editForm.barcode}
                        format={editForm.barcodeFormat}
                        width={1.6}
                        height={45}
                      />
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top border-secondary">
                  <button
                    type="button"
                    className="btn btn-cancel"
                    onClick={() => setEditProduct(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-purple fw-bold"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Barcode'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Print Barcode Label Sheet Modal */}
      {printProduct && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-bottom border-secondary">
                <h5 className="modal-title fw-bold text-white">
                  <i className="bi bi-printer-fill text-info me-2"></i>
                  Print Label Sheet: {printProduct.name} ({printProduct.sku})
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setPrintProduct(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3 align-items-center mb-3 no-print">
                  <div className="col-sm-6">
                    <label className="form-label small text-muted">Number of Labels to Print:</label>
                    <select
                      className="form-select"
                      value={printQuantity}
                      onChange={(e) => setPrintQuantity(parseInt(e.target.value))}
                    >
                      <option value="6">6 Labels (Small Batch)</option>
                      <option value="12">12 Labels (Standard Sheet)</option>
                      <option value="24">24 Labels (Double Sheet)</option>
                      <option value="36">36 Labels (Bulk Batch)</option>
                    </select>
                  </div>
                  <div className="col-sm-6 text-sm-end">
                    <button
                      className="btn btn-primary fw-bold"
                      onClick={executePrint}
                    >
                      <i className="bi bi-printer me-1"></i> Send to Printer
                    </button>
                  </div>
                </div>

                {/* Printable Label Grid */}
                <div
                  id="printable-barcode-sheet"
                  className="p-3 bg-white rounded border"
                  style={{ color: '#000000' }}
                >
                  <div className="row g-2">
                    {Array.from({ length: printQuantity }).map((_, i) => (
                      <div className="col-4" key={i}>
                        <div
                          className="border border-dark p-2 text-center rounded"
                          style={{ minHeight: '120px' }}
                        >
                          <small className="fw-bold d-block text-truncate" style={{ fontSize: '11px' }}>
                            SMP – {printProduct.name}
                          </small>
                          <div className="my-1">
                            <BarcodeVisual
                              value={printProduct.barcode}
                              format={printProduct.barcodeFormat || 'CODE128'}
                              width={1.2}
                              height={32}
                              fontSize={9}
                            />
                          </div>
                          <div className="d-flex justify-content-between px-1" style={{ fontSize: '10px' }}>
                            <span>SKU: {printProduct.sku}</span>
                            <span className="fw-bold">₹{printProduct.sellingPrice}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top border-secondary no-print">
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setPrintProduct(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBarcodeManagement;
