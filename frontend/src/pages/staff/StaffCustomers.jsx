import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const StaffCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({ fullName: '', phone: '', email: '', city: 'Chennai', street: '', pincode: '600001' });
  const { addToast } = useToast();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff/customers', { params: { search } });
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

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.fullName || !newCust.phone) {
      addToast('Customer Name and Phone are required', 'warning');
      return;
    }

    try {
      const res = await api.post('/staff/customers/quick-add', newCust);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setShowAddModal(false);
        setNewCust({ fullName: '', phone: '', email: '', city: 'Chennai', street: '', pincode: '600001' });
        fetchCustomers();
      }
    } catch (e) {
      addToast(e.response?.data?.message || 'Could not register customer', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold brand-font mb-0">Customer Directory</h3>
          <small className="text-muted">Lookup customers, check purchase history and register walk-in shoppers</small>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary rounded-pill px-3 fw-semibold btn-sm"
        >
          <i className="bi bi-person-plus-fill me-1"></i> Register New Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="smp-card p-3 bg-white mb-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Search by Customer Name, Mobile Number, or Customer ID..."
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
                  <th>Phone Number</th>
                  <th>Email</th>
                  <th>Total Purchases</th>
                  <th>Total Spent</th>
                  <th>Loyalty Points</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id}>
                    <td className="fw-bold text-primary">{c.customerId}</td>
                    <td className="fw-semibold text-dark">{c.fullName}</td>
                    <td>{c.phone}</td>
                    <td>{c.email}</td>
                    <td>{c.totalPurchases || 0}</td>
                    <td className="fw-bold">₹{c.totalSpent?.toFixed(2) || '0.00'}</td>
                    <td>
                      <span className="badge bg-warning text-dark">
                        ★ {c.loyaltyPoints || 0} pts
                      </span>
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
                <h5 className="modal-title fw-bold">Register Walk-in Customer</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddCustomer}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Chandra"
                      className="form-control"
                      value={newCust.fullName}
                      onChange={(e) => setNewCust({ ...newCust, fullName: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      className="form-control"
                      value={newCust.phone}
                      onChange={(e) => setNewCust({ ...newCust, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="customer@example.com"
                      className="form-control"
                      value={newCust.email}
                      onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-8">
                      <label className="form-label small">City</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={newCust.city}
                        onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small">Pincode</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={newCust.pincode}
                        onChange={(e) => setNewCust({ ...newCust, pincode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Save Customer
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

export default StaffCustomers;
