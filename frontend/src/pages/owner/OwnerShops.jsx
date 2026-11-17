import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OwnerShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    shopCode: '',
    name: '',
    category: 'Dress & Apparel',
    contactEmail: '',
    contactPhone: '',
    gstNumber: '33AAAAA0000A1Z5',
    street: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600040',
    description: ''
  });

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await api.get('/owner/shops');
      if (res.data.success) {
        setShops(res.data.shops || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleCreateShop = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/owner/shops', formData);
      if (res.data.success) {
        addToast('Shop created successfully!', 'success');
        setShowAddModal(false);
        setFormData({
          shopCode: '',
          name: '',
          category: 'Dress & Apparel',
          contactEmail: '',
          contactPhone: '',
          gstNumber: '33AAAAA0000A1Z5',
          street: '',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600040',
          description: ''
        });
        fetchShops();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create shop', 'error');
    }
  };

  const handleUpdateShop = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/owner/shops/${editingShop._id}`, editingShop);
      if (res.data.success) {
        addToast('Shop details updated', 'success');
        setEditingShop(null);
        fetchShops();
      }
    } catch (err) {
      addToast('Update failed', 'error');
    }
  };

  const handleDeleteShop = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this shop?')) return;
    try {
      const res = await api.delete(`/owner/shops/${id}`);
      if (res.data.success) {
        addToast('Shop deactivated', 'info');
        fetchShops();
      }
    } catch (e) {
      addToast('Failed to deactivate shop', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Multi-Shop Platform Directory</h3>
          <small className="text-muted">Expand beyond dress boutiques into shopping mall retail chains</small>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
          <i className="bi bi-plus-lg me-1"></i> Add New Retail Shop
        </button>
      </div>

      <div className="row g-3 mb-4">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : shops.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">No shops registered yet.</div>
        ) : (
          shops.map((shop) => (
            <div className="col-lg-6" key={shop._id}>
              <div className="smp-card p-4 bg-white h-100 shadow-sm border-0 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="badge bg-primary text-uppercase me-2">{shop.shopCode}</span>
                      <span className="badge bg-secondary">{shop.category}</span>
                      <h4 className="fw-bold brand-font text-dark mt-2 mb-1">{shop.name}</h4>
                    </div>
                    {shop.isActive ? (
                      <span className="badge bg-success">Active</span>
                    ) : (
                      <span className="badge bg-danger">Deactivated</span>
                    )}
                  </div>

                  <p className="small text-secondary mb-3">{shop.description || 'Retail establishment under SMP Platform'}</p>

                  <div className="small text-muted mb-2">
                    <i className="bi bi-geo-alt me-1 text-danger"></i>
                    {shop.address?.street}, {shop.address?.city}, {shop.address?.state} - {shop.address?.pincode}
                  </div>
                  <div className="small text-muted mb-2">
                    <i className="bi bi-telephone me-1 text-primary"></i> {shop.contactPhone} | <i className="bi bi-envelope me-1 text-primary"></i> {shop.contactEmail}
                  </div>
                  <div className="small text-muted mb-3 font-monospace">
                    <strong>GSTIN:</strong> {shop.gstNumber}
                  </div>
                </div>

                <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                  <small className="text-muted">Currency: {shop.settings?.currencySymbol || '₹'} ({shop.settings?.currency || 'INR'})</small>
                  <div className="btn-group btn-group-sm">
                    <button onClick={() => setEditingShop(shop)} className="btn btn-outline-secondary">
                      <i className="bi bi-pencil me-1"></i> Edit
                    </button>
                    <button onClick={() => handleDeleteShop(shop._id)} className="btn btn-outline-danger">
                      <i className="bi bi-trash3 me-1"></i> Deactivate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Shop Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Register New Retail Shop</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateShop}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Unique Shop Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ELEC, GROC, SMP"
                        className="form-control text-uppercase"
                        value={formData.shopCode}
                        onChange={(e) => setFormData({ ...formData, shopCode: e.target.value })}
                      />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">Shop Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SMP Tech World / SMP Supermarket"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Retail Category *</label>
                      <select
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="Dress & Apparel">Dress & Apparel</option>
                        <option value="Clothing Shop">Clothing Shop</option>
                        <option value="Electronics">Electronics & Appliances</option>
                        <option value="Grocery & Supermarket">Grocery & Supermarket</option>
                        <option value="Footwear">Footwear & Shoes</option>
                        <option value="Accessories">Accessories & Jewelry</option>
                        <option value="Multi-Department Retail">Multi-Department Mall Retail</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">GSTIN *</label>
                      <input
                        type="text"
                        required
                        className="form-control font-monospace"
                        value={formData.gstNumber}
                        onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Contact Phone *</label>
                      <input
                        type="tel"
                        required
                        className="form-control"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Contact Email *</label>
                      <input
                        type="email"
                        required
                        className="form-control"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Shop Address</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Street, Mall Level, Shop #"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4 col-6">
                      <label className="form-label small fw-semibold">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4 col-6">
                      <label className="form-label small fw-semibold">State</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4 col-12">
                      <label className="form-label small fw-semibold">Pincode</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Shop Description</label>
                      <textarea
                        rows="2"
                        className="form-control"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold">
                    Create Retail Shop
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shop Modal */}
      {editingShop && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Edit Shop ({editingShop.shopCode})</h5>
                <button type="button" className="btn-close" onClick={() => setEditingShop(null)}></button>
              </div>
              <form onSubmit={handleUpdateShop}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Shop Name</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editingShop.name}
                      onChange={(e) => setEditingShop({ ...editingShop, name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Phone</label>
                    <input
                      type="tel"
                      required
                      className="form-control"
                      value={editingShop.contactPhone}
                      onChange={(e) => setEditingShop({ ...editingShop, contactPhone: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">GSTIN</label>
                    <input
                      type="text"
                      required
                      className="form-control font-monospace"
                      value={editingShop.gstNumber}
                      onChange={(e) => setEditingShop({ ...editingShop, gstNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditingShop(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
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

export default OwnerShops;
