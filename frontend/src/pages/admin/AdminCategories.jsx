import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', description: '', image: '' });
  const { addToast } = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/categories/list');
      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCat.name) return;
    try {
      const res = await api.post('/products/categories', newCat);
      if (res.data.success) {
        addToast('Category created successfully', 'success');
        setShowAddModal(false);
        setNewCat({ name: '', description: '', image: '' });
        fetchCategories();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create category', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold brand-font mb-0">Product Category Taxonomy</h3>
          <small className="text-muted">Organize apparel into structured ethnic, formal, western & kids categories</small>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
          <i className="bi bi-plus-lg me-1"></i> Add Category
        </button>
      </div>

      <div className="row g-3">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="col-12 text-center py-4 text-muted">No categories created yet.</div>
        ) : (
          categories.map((cat) => (
            <div className="col-md-4 col-sm-6" key={cat._id}>
              <div className="smp-card p-3 bg-white h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <img
                      src={cat.image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80'}
                      alt={cat.name}
                      className="rounded-3 object-fit-cover shadow-sm"
                      style={{ width: '56px', height: '56px' }}
                    />
                    <div>
                      <h6 className="fw-bold mb-0">{cat.name}</h6>
                      <small className="text-primary font-monospace">/{cat.slug}</small>
                    </div>
                  </div>
                  <p className="small text-muted mb-0">{cat.description || 'Exclusive fashion collection'}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Create New Category</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateCategory}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Category Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Silk Sarees & Drapes"
                      className="form-control"
                      value={newCat.name}
                      onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Image URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="form-control"
                      value={newCat.image}
                      onChange={(e) => setNewCat({ ...newCat, image: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Description</label>
                    <textarea
                      rows="2"
                      className="form-control"
                      value={newCat.description}
                      onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Save Category
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

export default AdminCategories;
