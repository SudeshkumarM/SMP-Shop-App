import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ProductImageUploader from '../../components/common/ProductImageUploader';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const { addToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [importing, setImporting] = useState(false);

  const initialNewProd = {
    name: '',
    sku: '',
    barcode: '',
    brand: 'SMP',
    category: '',
    description: '',
    costPrice: '',
    originalPrice: '',
    sellingPrice: '',
    discountPercent: 0,
    gstPercent: 5,
    availableQuantity: '',
    lowStockThreshold: 5,
    sizes: '',
    colours: '',
    images: [],
    isFeatured: false,
    isTrending: false
  };

  const [newProd, setNewProd] = useState(initialNewProd);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products', { params: { keyword, limit: 100 } }),
        api.get('/products/categories/list')
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.products || []);
      if (catRes.data.success) {
        const catList = catRes.data.categories || [];
        setCategories(catList);
        if (catList.length > 0 && !newProd.category) {
          setNewProd(prev => ({ ...prev, category: catList[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAddModal = () => {
    setNewProd({
      ...initialNewProd,
      category: categories.length > 0 ? categories[0]._id : ''
    });
    setShowAddModal(true);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!newProd.category) {
      addToast('A Category is required. Please create a Category first.', 'error');
      return;
    }

    try {
      const payload = {
        ...newProd,
        costPrice: Number(newProd.costPrice) || 0,
        originalPrice: Number(newProd.originalPrice) || 0,
        sellingPrice: Number(newProd.sellingPrice) || 0,
        availableQuantity: Number(newProd.availableQuantity) || 0,
        discountPercent: Number(newProd.discountPercent) || 0,
        gstPercent: Number(newProd.gstPercent) || 5,
        sizes: typeof newProd.sizes === 'string' ? newProd.sizes.split(',').map(s => s.trim()).filter(Boolean) : newProd.sizes,
        colours: typeof newProd.colours === 'string' ? newProd.colours.split(',').map(c => c.trim()).filter(Boolean) : newProd.colours,
        images: newProd.images || []
      };

      const res = await api.post('/products', payload);
      if (res.data.success) {
        addToast('Product created successfully in catalog', 'success');
        setShowAddModal(false);
        setNewProd(initialNewProd);
        fetchProducts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create product', 'error');
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editingProduct,
        costPrice: Number(editingProduct.costPrice) || 0,
        originalPrice: Number(editingProduct.originalPrice) || 0,
        sellingPrice: Number(editingProduct.sellingPrice) || 0,
        availableQuantity: Number(editingProduct.availableQuantity) || 0,
        discountPercent: Number(editingProduct.discountPercent) || 0,
        gstPercent: Number(editingProduct.gstPercent) || 5,
        sizes: typeof editingProduct.sizes === 'string' ? editingProduct.sizes.split(',').map(s => s.trim()).filter(Boolean) : editingProduct.sizes,
        colours: typeof editingProduct.colours === 'string' ? editingProduct.colours.split(',').map(c => c.trim()).filter(Boolean) : editingProduct.colours,
        images: editingProduct.images || []
      };

      const res = await api.put(`/products/${editingProduct._id}`, payload);
      if (res.data.success) {
        addToast('Product updated successfully', 'success');
        setEditingProduct(null);
        fetchProducts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Update failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this product?')) return;
    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        addToast('Product deleted from active catalog', 'info');
        fetchProducts();
      }
    } catch (e) {
      addToast('Delete failed', 'error');
    }
  };

  const handleExportExcel = () => {
    window.open('/api/products/export-excel', '_blank');
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const res = await api.post('/products/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        addToast(res.data.message, 'success');
        fetchProducts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0 text-slate-900">Product Catalog Management</h3>
          <small className="text-muted">Manage items, prices, barcodes, sizes, variants & bulk Excel sync</small>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {/* Excel Import */}
          <label className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold cursor-pointer mb-0">
            <i className="bi bi-file-earmark-arrow-up me-1"></i>
            {importing ? 'Importing...' : 'Import Excel'}
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />
          </label>

          <button onClick={handleExportExcel} className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold">
            <i className="bi bi-file-earmark-excel me-1"></i> Export to Excel
          </button>

          <button onClick={handleOpenAddModal} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
            <i className="bi bi-plus-lg me-1"></i> Add Product
          </button>
        </div>
      </div>

      {/* Category First Warning Banner */}
      {categories.length === 0 && !loading && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between shadow-sm rounded-3 mb-4">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
            <div>
              <strong>No Categories Found:</strong> You must create at least one category before adding products to the catalog.
            </div>
          </div>
          <Link to="/admin/categories" className="btn btn-warning btn-sm fw-bold text-dark px-3 rounded-pill">
            <i className="bi bi-plus-circle me-1"></i> Create Category First
          </Link>
        </div>
      )}

      {/* Search Header */}
      <div className="smp-card p-3 mb-4 bg-white shadow-sm">
        <div className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Search by Product Name, SKU, Barcode, or Brand..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button onClick={fetchProducts} className="btn btn-primary px-4 fw-semibold">
            Search
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="small text-muted mt-2">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-box-seam display-4 text-secondary mb-2 d-block"></i>
            <h5 className="text-dark fw-bold">No Products in Catalog</h5>
            <p className="small mb-3 text-muted">
              {categories.length === 0
                ? 'Create your first Category before adding products.'
                : "Click 'Add Product' above or import via Excel to add items to your shop."}
            </p>
            {categories.length === 0 ? (
              <Link to="/admin/categories" className="btn btn-warning text-dark btn-sm px-3 rounded-pill fw-bold">
                <i className="bi bi-plus-circle me-1"></i> Create Category
              </Link>
            ) : (
              <button onClick={handleOpenAddModal} className="btn btn-primary btn-sm px-3 rounded-pill fw-semibold">
                <i className="bi bi-plus-lg me-1"></i> Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU / Barcode</th>
                  <th>Category</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>GST %</th>
                  <th>Final Price</th>
                  <th>Stock</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {p.images && p.images[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="rounded-2 object-fit-cover border"
                            style={{ width: '45px', height: '45px' }}
                          />
                        ) : (
                          <div
                            className="rounded-2 bg-light d-flex align-items-center justify-content-center text-muted border"
                            style={{ width: '45px', height: '45px' }}
                          >
                            <i className="bi bi-image"></i>
                          </div>
                        )}
                        <div>
                          <div className="fw-bold text-dark">{p.name}</div>
                          <small className="text-muted">{p.brand || 'SMP'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{p.sku}</div>
                      <small className="text-muted">{p.barcode}</small>
                    </td>
                    <td>
                      <span className="badge bg-light text-primary border">
                        {p.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td>₹{p.costPrice}</td>
                    <td className="fw-semibold text-dark">₹{p.sellingPrice}</td>
                    <td>{p.gstPercent || 5}%</td>
                    <td className="fw-bold text-primary">₹{p.finalPrice}</td>
                    <td>
                      <span className={`badge ${p.availableQuantity <= (p.lowStockThreshold || 5) ? 'bg-danger' : 'bg-success'}`}>
                        {p.availableQuantity} in stock
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          onClick={() => setEditingProduct({
                            ...p,
                            category: p.category?._id || p.category,
                            sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || ''),
                            colours: Array.isArray(p.colours) ? p.colours.join(', ') : (p.colours || ''),
                            images: Array.isArray(p.images) ? p.images : []
                          })}
                          className="btn btn-outline-secondary"
                          title="Edit"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="btn btn-outline-danger"
                          title="Delete"
                        >
                          <i className="bi bi-trash3"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-50 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-box-seam text-primary me-2"></i>Add New Product
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateProduct}>
                <div className="modal-body p-4">
                  {categories.length === 0 && (
                    <div className="alert alert-danger small mb-3">
                      <strong>Category Required:</strong> You cannot save a product without a Category. Please close this and create a category first.
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">Product Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="e.g. Premium Silk Saree"
                        value={newProd.name}
                        onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Brand</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. SMP"
                        value={newProd.brand}
                        onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Category <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        required
                        value={newProd.category}
                        onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                      >
                        <option value="">-- Select Category --</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">SKU (Auto or Custom)</label>
                      <input
                        type="text"
                        placeholder="e.g. SMP-DRS-01"
                        className="form-control text-uppercase"
                        value={newProd.sku}
                        onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Stock Quantity <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="0"
                        className="form-control"
                        value={newProd.availableQuantity}
                        onChange={(e) => setNewProd({ ...newProd, availableQuantity: e.target.value })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">Cost Price (₹) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="0"
                        className="form-control"
                        value={newProd.costPrice}
                        onChange={(e) => setNewProd({ ...newProd, costPrice: e.target.value })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">Original Price (₹) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="0"
                        className="form-control"
                        value={newProd.originalPrice}
                        onChange={(e) => setNewProd({ ...newProd, originalPrice: e.target.value })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">Selling Price (₹) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="0"
                        className="form-control"
                        value={newProd.sellingPrice}
                        onChange={(e) => setNewProd({ ...newProd, sellingPrice: e.target.value })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">GST Rate (%)</label>
                      <select
                        className="form-select"
                        value={newProd.gstPercent}
                        onChange={(e) => setNewProd({ ...newProd, gstPercent: Number(e.target.value) })}
                      >
                        <option value="5">5% (Standard Apparel)</option>
                        <option value="12">12% (Luxury Apparel)</option>
                        <option value="18">18% (Accessories / Footwear)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Available Sizes (Comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. S, M, L, XL"
                        className="form-control"
                        value={newProd.sizes}
                        onChange={(e) => setNewProd({ ...newProd, sizes: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Available Colours (Comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. Navy Blue, Maroon, Teal"
                        className="form-control"
                        value={newProd.colours}
                        onChange={(e) => setNewProd({ ...newProd, colours: e.target.value })}
                      />
                    </div>

                    {/* Multi-Image Upload */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Product Images (Gallery / Camera / Files)</label>
                      <ProductImageUploader
                        images={newProd.images}
                        onChange={(imgs) => setNewProd({ ...newProd, images: imgs })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Product Description <span className="text-danger">*</span></label>
                      <textarea
                        rows="3"
                        required
                        placeholder="Enter comprehensive product details, fabric, fit, and care instructions..."
                        className="form-control"
                        value={newProd.description}
                        onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={categories.length === 0}
                    className="btn btn-primary rounded-pill px-4 fw-semibold"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal show d-block bg-dark bg-opacity-50 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-pencil-square text-primary me-2"></i>Edit Product ({editingProduct.sku})
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingProduct(null)}></button>
              </div>
              <form onSubmit={handleUpdateProduct}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">Product Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Brand</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingProduct.brand}
                        onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Category <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        required
                        value={editingProduct.category}
                        onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      >
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Stock Quantity <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        className="form-control"
                        value={editingProduct.availableQuantity}
                        onChange={(e) => setEditingProduct({ ...editingProduct, availableQuantity: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Cost Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editingProduct.costPrice}
                        onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Original Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editingProduct.originalPrice}
                        onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Selling Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editingProduct.sellingPrice}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">GST %</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editingProduct.gstPercent}
                        onChange={(e) => setEditingProduct({ ...editingProduct, gstPercent: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Available Sizes</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingProduct.sizes}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sizes: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Available Colours</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingProduct.colours}
                        onChange={(e) => setEditingProduct({ ...editingProduct, colours: e.target.value })}
                      />
                    </div>

                    {/* Multi-Image Upload */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Product Images</label>
                      <ProductImageUploader
                        images={editingProduct.images || []}
                        onChange={(imgs) => setEditingProduct({ ...editingProduct, images: imgs })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Description</label>
                      <textarea
                        rows="3"
                        className="form-control"
                        value={editingProduct.description}
                        onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setEditingProduct(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;