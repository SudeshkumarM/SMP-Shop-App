import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustHistory, setSelectedCustHistory] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    password: 'Password123'
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/customers', { params: { search } });
      if (res.data.success) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/customers', formData);
      if (res.data.success) {
        addToast('Customer added successfully', 'success');
        setShowAddModal(false);
        setFormData({ fullName: '', email: '', phone: '', street: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', password: 'Password123' });
        fetchCustomers();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create customer', 'error');
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/customers/${editingCustomer._id}`, editingCustomer);
      if (res.data.success) {
        addToast('Customer details updated', 'success');
        setEditingCustomer(null);
        fetchCustomers();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Update failed', 'error');
    }
  };

  const handleToggleBlock = async (cust) => {
    try {
      const newStatus = !cust.isBlocked;
      const res = await api.put(`/admin/customers/${cust._id}`, { isBlocked: newStatus });
      if (res.data.success) {
        addToast(`Customer ${newStatus ? 'Blocked' : 'Activated'}`, 'info');
        fetchCustomers();
      }
    } catch (e) {
      addToast('Status change failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer?')) return;
    try {
      const res = await api.delete(`/admin/customers/${id}`);
      if (res.data.success) {
        addToast('Customer removed', 'info');
        fetchCustomers();
      }
    } catch (e) {
      addToast('Failed to delete customer', 'error');
    }
  };

  const handleExportExcel = () => {
    window.open('/api/admin/customers/export-excel', '_blank');
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Customer Relationship Management (CRM)</h3>
          <small className="text-muted">Manage shopper profiles, purchase history, activation status & exports</small>
        </div>

        <div className="d-flex gap-2">
          <button onClick={handleExportExcel} className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold">
            <i className="bi bi-file-earmark-excel me-1"></i> Export to Excel
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
            <i className="bi bi-person-plus-fill me-1"></i> Add New Customer
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div className="smp-card p-3 bg-white mb-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Search by Customer Name, Phone, Email, or Customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary px-4 fw-semibold">
            Search
          </button>
        </form>
      </div>

      {/* Customers Table */}
      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-people display-4 text-secondary mb-2 d-block"></i>
            <h5>No Customers Found</h5>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Customer ID</th>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th>Total Orders</th>
                  <th>Total Spent</th>
                  <th>Loyalty Pts</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id}>
                    <td className="fw-bold text-primary">{c.customerId}</td>
                    <td>
                      <div className="fw-semibold text-dark">{c.fullName}</div>
                      <small className="text-muted">
                        Joined: {new Date(c.createdAt).toLocaleDateString()}
                      </small>
                    </td>
                    <td>
                      <div><i className="bi bi-telephone text-muted me-1"></i>{c.phone}</div>
                      <div className="text-muted"><i className="bi bi-envelope text-muted me-1"></i>{c.email}</div>
                    </td>
                    <td className="fw-bold">{c.totalPurchases || 0}</td>
                    <td className="fw-bold text-success">₹{c.totalSpent?.toFixed(2) || '0.00'}</td>
                    <td>
                      <span className="badge bg-warning text-dark">
                        ★ {c.loyaltyPoints || 0}
                      </span>
                    </td>
                    <td>
                      {c.isBlocked ? (
                        <span className="badge bg-danger">Blocked</span>
                      ) : (
                        <span className="badge bg-success">Active</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          onClick={() => setEditingCustomer(c)}
                          className="btn btn-outline-secondary"
                          title="Edit Customer"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          onClick={() => handleToggleBlock(c)}
                          className={`btn ${c.isBlocked ? 'btn-outline-success' : 'btn-outline-warning'}`}
                          title={c.isBlocked ? 'Unblock' : 'Block'}
                        >
                          <i className={`bi bi-${c.isBlocked ? 'unlock' : 'lock'}`}></i>
                        </button>
                        <button
                          onClick={() => handleDelete(c._id)}
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Add New Customer Account</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateCustomer}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Customer Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      className="form-control"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="ramesh@example.com"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Phone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit number"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Street Address</label>
                    <input
                      type="text"
                      placeholder="Door No, Street"
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
                        className="form-control form-control-sm"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Pincode</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
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
                    Create Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Edit Customer ({editingCustomer.customerId})</h5>
                <button type="button" className="btn-close" onClick={() => setEditingCustomer(null)}></button>
              </div>
              <form onSubmit={handleUpdateCustomer}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editingCustomer.fullName}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, fullName: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email</label>
                    <input
                      type="email"
                      required
                      className="form-control"
                      value={editingCustomer.email}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Phone</label>
                    <input
                      type="tel"
                      required
                      className="form-control"
                      value={editingCustomer.phone}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="blockCheck"
                      checked={editingCustomer.isBlocked}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, isBlocked: e.target.checked })}
                    />
                    <label className="form-check-label small text-danger fw-semibold" htmlFor="blockCheck">
                      Block Account from checkout & login
                    </label>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditingCustomer(null)}>
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

export default AdminCustomers;
