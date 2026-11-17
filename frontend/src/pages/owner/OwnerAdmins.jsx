import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OwnerAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    shopId: '',
    password: 'AdminPassword123'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        api.get('/owner/admins'),
        api.get('/owner/shops')
      ]);
      if (aRes.data.success) setAdmins(aRes.data.admins || []);
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

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/owner/admins', formData);
      if (res.data.success) {
        addToast('Admin created and assigned successfully', 'success');
        setShowAddModal(false);
        fetchData();
      }
    } catch (e) {
      addToast(e.response?.data?.message || 'Failed to create admin', 'error');
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin account?')) return;
    try {
      const res = await api.delete(`/owner/admins/${id}`);
      if (res.data.success) {
        addToast('Admin account removed', 'info');
        fetchData();
      }
    } catch (e) {
      addToast('Delete failed', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold brand-font mb-0">Shop Administrators Governance</h3>
          <small className="text-muted">Delegate shop-level operations and assign administrators to retail entities</small>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
          <i className="bi bi-person-plus-fill me-1"></i> Provision Shop Admin
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
                  <th>Admin ID</th>
                  <th>Full Name</th>
                  <th>Assigned Retail Shop</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <span className="badge bg-warning text-dark font-monospace fw-bold">
                        {a.adminId}
                      </span>
                    </td>
                    <td className="fw-bold text-dark">{a.fullName}</td>
                    <td>
                      <span className="badge bg-primary">{a.shopId?.name || 'SMP Elite Fashions'}</span>
                    </td>
                    <td>{a.email}</td>
                    <td>{a.phone}</td>
                    <td>
                      {a.isActive ? <span className="badge bg-success">Active</span> : <span className="badge bg-danger">Deactivated</span>}
                    </td>
                    <td className="text-end">
                      <button onClick={() => handleDeleteAdmin(a._id)} className="btn btn-outline-danger btn-sm py-0 px-2 rounded-pill">
                        <i className="bi bi-trash3"></i> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Provision Shop Administrator</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateAdmin}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Admin Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      className="form-control"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Assigned Retail Shop *</label>
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
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Admin Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@smp.com"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Contact Phone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit phone"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Temporary Password *</label>
                    <input
                      type="text"
                      required
                      className="form-control font-monospace"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Create & Assign Admin
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

export default OwnerAdmins;
