import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OwnerBranches = () => {
  const [branches, setBranches] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    shopId: '',
    branchCode: '',
    name: '',
    phone: '+91 98400 12345',
    email: '',
    street: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600040'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        api.get('/owner/branches'),
        api.get('/owner/shops')
      ]);
      if (bRes.data.success) setBranches(bRes.data.branches || []);
      if (sRes.data.success) {
        setShops(sRes.data.shops || []);
        if (sRes.data.shops?.length > 0) {
          setFormData(prev => ({ ...prev, shopId: sRes.data.shops[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/owner/branches', formData);
      if (res.data.success) {
        addToast('Branch added successfully', 'success');
        setShowAddModal(false);
        fetchData();
      }
    } catch (e) {
      addToast(e.response?.data?.message || 'Failed to add branch', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold brand-font mb-0">Store Branches & Mall Locations</h3>
          <small className="text-muted">Manage physical storefront locations per retail shop</small>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
          <i className="bi bi-plus-lg me-1"></i> Add Branch
        </button>
      </div>

      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Branch Code</th>
                  <th>Branch Name</th>
                  <th>Assigned Shop</th>
                  <th>Contact Info</th>
                  <th>Location</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <span className="badge bg-primary-subtle text-primary fw-bold font-monospace">
                        {b.branchCode}
                      </span>
                    </td>
                    <td className="fw-bold text-dark">{b.name}</td>
                    <td>{b.shopId?.name || 'SMP Elite Fashions'}</td>
                    <td>{b.phone}</td>
                    <td>{b.address?.street}, {b.address?.city}</td>
                    <td>
                      {b.isMainBranch ? (
                        <span className="badge bg-success">Main Flagship</span>
                      ) : (
                        <span className="badge bg-secondary">Branch Store</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Add Store Branch</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateBranch}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Parent Shop *</label>
                    <select
                      className="form-select"
                      required
                      value={formData.shopId}
                      onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                    >
                      {shops.map((s) => (
                        <option key={s._id} value={s._id}>{s.name} ({s.shopCode})</option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Branch Code</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SMP-B02"
                        className="form-control text-uppercase"
                        value={formData.branchCode}
                        onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                      />
                    </div>
                    <div className="col-8">
                      <label className="form-label small fw-semibold">Branch Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Phoenix Mall Branch"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Phone *</label>
                    <input
                      type="tel"
                      required
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Street Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Pincode</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Create Branch
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

export default OwnerBranches;
