import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const { addToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [importing, setImporting] = useState(false);

  // New Product Form
  const [newProd, setNewProd] = useState({
    name: '',
    sku: '',
    barcode: '',
    brand: 'SMP Heritage',
    category: '',
    description: '',
    costPrice: 800,
    originalPrice: 1999,
    sellingPrice: 1499,
    discountPercent: 25,
    gstPercent: 5,
    availableQuantity: 30,
    lowStockThreshold: 5,
    sizes: 'S, M, L, XL',
    colours: 'Navy Blue, Maroon, Black',
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
    isFeatured: true,
    isTrending: false
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products', { params: { keyword, limit: 100 } }),
        api.get('/products/categories/list')
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.products || []);
      if (catRes.data.success) setCategories(catRes.data.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProd.category && categories.length > 0) {
      newProd.category = categories[0]._id;
    }

    try {
      const payload = {
        ...newProd,
        sizes: typeof newProd.sizes === 'string' ? newProd.sizes.split(',').map(s => s.trim()) : newProd.sizes,
        colours: typeof newProd.colours === 'string' ? newProd.colours.split(',').map(c => c.trim()) : newProd.colours,
        images: [newProd.imageUrl]
      };

      const res = await api.post('/products', payload);
      if (res.data.success) {
        addToast('Product created successfully', 'success');
        setShowAddModal(false);
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
        sizes: typeof editingProduct.sizes === 'string' ? editingProduct.sizes.split(',').map(s => s.trim()) : editingProduct.sizes,
        colours: typeof editingProduct.colours === 'string' ? editingProduct.colours.split(',').map(c => c.trim()) : editingProduct.colours
      };

      const res = await api.put(`/products/${editingProduct._id}`, payload);
      if (res.data.success) {
        addToast('Product updated', 'success');
        setEditingProduct(null);
        fetchProducts();
      }
    } catch (err) {
      addToast('Update failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this product?')) return;
    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        addToast('Product deleted', 'info');
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
          <h3 className="fw-bold brand-font mb-0">Product Catalog Management</h3>
          <small className="text-muted">Manage items, prices, barcodes, sizes, variants & bulk Excel sync</small>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {/* Excel Import button */}
          <label className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold cursor-pointer mb-0">
            <i className="bi bi-file-earmark-arrow-up me-1"></i>
            {importing ? 'Importing...' : 'Import Excel'}
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />
          </label>

          <button onClick={handleExportExcel} className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold">
            <i className="bi bi-file-earmark-excel me-1"></i> Export to Excel
          </button>

          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
            <i className="bi bi-plus-lg me-1"></i> Add Product
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div className="smp-card p-3 bg-white mb-4 shadow-sm">
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
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-tags display-4 text-secondary mb-2 d-block"></i>
            <h5>No Products Found</h5>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
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
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=100&q=80'}
                          alt={p.name}
                          className="rounded-2 object-fit-cover"
                          style={{ width: '45px', height: '45px' }}
                        />
                        <div>
                          <div className="fw-bold text-dark">{p.name}</div>
                          <small className="text-muted">{p.brand}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold">{p.sku}</div>
                      <small className="text-muted">{p.barcode}</small>
                    </td>
                    <td>{p.category?.name || 'Apparel'}</td>
                    <td>₹{p.costPrice}</td>
                    <td className="fw-semibold">₹{p.sellingPrice}</td>
                    <td>{p.gstPercent || 5}%</td>
                    <td className="fw-bold text-primary">₹{p.finalPrice}</td>
                    <td>
                      <span className={`badge ${p.availableQuantity <= 5 ? 'bg-danger' : 'bg-success'}`}>
                        {p.availableQuantity} in stock
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          onClick={() => setEditingProduct({
                            ...p,
                            sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : p.sizes,
                            colours: Array.isArray(p.colours) ? p.colours.join(', ') : p.colours
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
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Add New Product to Shop Catalog</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateProduct}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">Product Name *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={newProd.name}
                        onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Brand</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProd.brand}
                        onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">SKU (Auto or Custom)</label>
                      <input
                        type="text"
                        placeholder="e.g. SMP-DRS-09"
                        className="form-control text-uppercase"
                        value={newProd.sku}
                        onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Category *</label>
                      <select
                        className="form-select"
                        value={newProd.category}
                        onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                      >
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Stock Quantity *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        className="form-control"
                        value={newProd.availableQuantity}
                        onChange={(e) => setNewProd({ ...newProd, availableQuantity: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">Cost Price (₹) *</label>
                      <input
                        type="number"
                        required
                        className="form-control"
                        value={newProd.costPrice}
                        onChange={(e) => setNewProd({ ...newProd, costPrice: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">Original Price (₹) *</label>
                      <input
                        type="number"
                        required
                        className="form-control"
                        value={newProd.originalPrice}
                        onChange={(e) => setNewProd({ ...newProd, originalPrice: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">Selling Price (₹) *</label>
                      <input
                        type="number"
                        required
                        className="form-control"
                        value={newProd.sellingPrice}
                        onChange={(e) => setNewProd({ ...newProd, sellingPrice: Number(e.target.value) })}
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
                        <option value="18">18% (Accessories)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Available Sizes (Comma separated)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProd.sizes}
                        onChange={(e) => setNewProd({ ...newProd, sizes: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Available Colours</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProd.colours}
                        onChange={(e) => setNewProd({ ...newProd, colours: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Product Image URL</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        className="form-control"
                        value={newProd.imageUrl}
                        onChange={(e) => setNewProd({ ...newProd, imageUrl: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Product Description *</label>
                      <textarea
                        rows="3"
                        required
                        className="form-control"
                        value={newProd.description}
                        onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold">
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
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Edit Product ({editingProduct.sku})</h5>
                <button type="button" className="btn-close" onClick={() => setEditingProduct(null)}></button>
              </div>
              <form onSubmit={handleUpdateProduct}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">Product Name</label>
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

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">Cost Price (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editingProduct.costPrice}
                        onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">Selling Price (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editingProduct.sellingPrice}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">GST %</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editingProduct.gstPercent}
                        onChange={(e) => setEditingProduct({ ...editingProduct, gstPercent: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-3 col-6">
                      <label className="form-label small fw-semibold">Stock Quantity</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editingProduct.availableQuantity}
                        onChange={(e) => setEditingProduct({ ...editingProduct, availableQuantity: Number(e.target.value) })}
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

                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setEditingProduct(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold">
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
