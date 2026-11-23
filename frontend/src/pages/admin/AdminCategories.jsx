import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useToast } from '../../context/ToastContext';
import CategoryImagePicker from '../../components/common/CategoryImagePicker';

const DEFAULT_CATEGORY_IMAGE = '/images/category-default.svg';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    image: DEFAULT_CATEGORY_IMAGE,
    status: 'ACTIVE'
  });

  const { addToast } = useToast();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/categories/list', {
        params: { search, status: statusFilter }
      });
      if (res.data?.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      addToast(err.response?.data?.message || 'Error loading categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search, statusFilter]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const handleCategoryEvent = () => {
      fetchCategories();
    };

    socket.on('category:created', handleCategoryEvent);
    socket.on('category:updated', handleCategoryEvent);
    socket.on('category:deleted', handleCategoryEvent);

    return () => {
      socket.off('category:created', handleCategoryEvent);
      socket.off('category:updated', handleCategoryEvent);
      socket.off('category:deleted', handleCategoryEvent);
    };
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      categoryId: `CAT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      description: '',
      image: DEFAULT_CATEGORY_IMAGE,
      status: 'ACTIVE'
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (cat) => {
    setEditCategory(cat);
    setFormData({
      categoryId: cat.categoryId || '',
      name: cat.name || '',
      description: cat.description || '',
      image: cat.image || DEFAULT_CATEGORY_IMAGE,
      status: cat.status || (cat.isActive ? 'ACTIVE' : 'INACTIVE')
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Category name is required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (editCategory) {
        const res = await api.put(`/products/categories/${editCategory._id}`, formData);
        if (res.data?.success) {
          addToast('Category updated successfully!', 'success');
          setEditCategory(null);
          fetchCategories();
        }
      } else {
        const res = await api.post('/products/categories', formData);
        if (res.data?.success) {
          addToast('New category created successfully!', 'success');
          setShowAddModal(false);
          fetchCategories();
        }
      }
    } catch (err) {
      console.error('Save category error:', err);
      addToast(err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const res = await api.delete(`/products/categories/${deleteConfirm._id}`);
      if (res.data?.success) {
        addToast('Category deleted successfully', 'success');
        setDeleteConfirm(null);
        fetchCategories();
      }
    } catch (err) {
      console.error('Delete category error:', err);
      addToast(err.response?.data?.message || 'Cannot delete category with linked products', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (cat) => {
    const newStatus = (cat.status === 'ACTIVE' || cat.isActive) ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.put(`/products/categories/${cat._id}`, {
        name: cat.name,
        categoryId: cat.categoryId,
        description: cat.description,
        image: cat.image,
        status: newStatus
      });
      if (res.data?.success) {
        addToast(`Category ${cat.name} marked ${newStatus}`, 'success');
        fetchCategories();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update category status', 'error');
    }
  };

  return (
    <div className="fade-in pb-5">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold brand-font text-dark mb-1">
            <i className="bi bi-tags-fill text-primary me-2"></i>Category Management
          </h2>
          <p className="text-muted mb-0">
            Create, edit, organize and monitor product categories across SMP.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={fetchCategories}
            className="btn btn-outline-primary btn-sm rounded-pill px-3"
            title="Refresh list"
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            className="btn btn-primary btn-sm px-3 fw-bold rounded-pill"
          >
            <i className="bi bi-plus-circle me-1"></i> Add Category
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
                placeholder="Search by category name, ID or description..."
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
            <label className="text-muted small fw-semibold text-nowrap">Status:</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories Table View */}
      <div className="smp-card overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Category ID</th>
                <th>Category Name</th>
                <th>Description</th>
                <th className="text-center">Linked Products</th>
                <th className="text-center">Status</th>
                <th>Created Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                    No categories found matching your filters.
                  </td>
                </tr>
              ) : (
                categories.map((cat, idx) => {
                  const isActive = cat.status === 'ACTIVE' || cat.isActive;
                  return (
                    <tr key={cat._id}>
                      <td className="text-muted small">{idx + 1}</td>
                      <td>
                        <span className="badge bg-secondary font-monospace text-info border border-secondary">
                          {cat.categoryId || `CAT-${cat._id.slice(-4).toUpperCase()}`}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-3 bg-secondary d-flex align-items-center justify-content-center text-primary fw-bold"
                            style={{ width: '38px', height: '38px', overflow: 'hidden' }}
                          >
                            <img
                              src={cat.image || DEFAULT_CATEGORY_IMAGE}
                              alt={cat.name}
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = DEFAULT_CATEGORY_IMAGE;
                              }}
                            />
                          </div>
                          <div>
                            <span className="fw-bold text-dark d-block">{cat.name}</span>
                            <small className="text-muted font-monospace">/{cat.slug || cat.name.toLowerCase()}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted line-clamp-1" style={{ maxWidth: '280px', display: 'inline-block' }}>
                          {cat.description || 'No description provided.'}
                        </small>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${cat.productCount > 0 ? 'bg-primary' : 'bg-secondary text-muted'}`}>
                          <i className="bi bi-box-seam me-1"></i>
                          {cat.productCount || 0} Products
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => toggleStatus(cat)}
                          className={`btn btn-sm ${isActive ? 'btn-outline-success' : 'btn-outline-secondary'} py-0 px-2 rounded-pill`}
                          title="Click to toggle status"
                        >
                          <i className={`bi ${isActive ? 'bi-check-circle-fill text-success' : 'bi-dash-circle'} me-1`}></i>
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="small text-muted">
                        {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="btn btn-info btn-sm text-white"
                            title="Edit Category"
                          >
                            <i className="bi bi-pencil-fill"></i> Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(cat)}
                            className="btn btn-danger btn-sm"
                            title="Delete Category"
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

      {/* Add / Edit Category Modal */}
      {(showAddModal || editCategory) && (
        <div className="modal show d-block bg-dark bg-opacity-50 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">
                  <i className={`bi ${editCategory ? 'bi-pencil-square text-primary' : 'bi-plus-circle text-primary'} me-2`}></i>
                  {editCategory ? 'Edit Category' : 'Create New Category'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditCategory(null);
                  }}
                ></button>
              </div>
              <form onSubmit={handleSaveCategory}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">Category ID</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      placeholder="e.g. CAT-1001"
                      required
                    />
                    <small className="text-muted">Unique alphanumeric identification code</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">Category Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Clothing, Footwear, Accessories"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">Description</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter a brief summary of apparel or items in this category..."
                    ></textarea>
                  </div>

                  <CategoryImagePicker
                    image={formData.image}
                    onChange={(image) => setFormData((previous) => ({ ...previous, image }))}
                  />

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE (Visible in Store and POS)</option>
                      <option value="INACTIVE">INACTIVE (Hidden from Store)</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill px-4"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditCategory(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-pill px-4 fw-bold"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-1"></i>
                        {editCategory ? 'Update Category' : 'Create Category'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal show d-block bg-dark bg-opacity-50 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>Confirm Category Deletion
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteConfirm(null)}
                ></button>
              </div>
              <div className="modal-body p-4 text-center">
                <p className="text-dark mb-2">
                  Are you sure you want to permanently delete category <strong>{deleteConfirm.name}</strong>?
                </p>
                {deleteConfirm.productCount > 0 ? (
                  <div className="alert alert-danger text-start small mb-0">
                    <i className="bi bi-shield-lock-fill me-1"></i>
                    <strong>Cannot Delete:</strong> This category currently has <strong>{deleteConfirm.productCount}</strong> linked product(s). You must reassign or remove the products before deleting this category.
                  </div>
                ) : (
                  <p className="small text-muted mb-0">
                    This action cannot be undone. Category ID: <code>{deleteConfirm.categoryId || deleteConfirm._id}</code>.
                  </p>
                )}
              </div>
              <div className="modal-footer border-top bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-pill px-4"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger rounded-pill px-4 fw-bold"
                  disabled={submitting || deleteConfirm.productCount > 0}
                  onClick={handleDeleteCategory}
                >
                  {submitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
