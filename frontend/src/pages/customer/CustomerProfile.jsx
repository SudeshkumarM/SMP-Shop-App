import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const CustomerProfile = () => {
  const { user, setUser } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Add Address Modal state
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ title: 'Home', street: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '', isDefault: false });

  const fetchAddresses = async () => {
    try {
      const res = await api.get('/customer/addresses');
      if (res.data.success) {
        setAddresses(res.data.addresses);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', { name, phone });
      if (res.data.success) {
        addToast('Profile updated successfully', 'success');
        setUser({ ...user, name, phone });
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      if (res.data.success) {
        addToast('Password changed successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change password', 'error');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/customer/addresses', newAddr);
      if (res.data.success) {
        addToast('Address added!', 'success');
        setAddresses(res.data.addresses);
        setShowAddAddr(false);
        setNewAddr({ title: 'Home', street: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '', isDefault: false });
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add address', 'error');
    }
  };

  const handleDeleteAddress = async (addrId) => {
    try {
      const res = await api.delete(`/customer/addresses/${addrId}`);
      if (res.data.success) {
        addToast('Address deleted', 'info');
        setAddresses(res.data.addresses);
      }
    } catch (e) {
      addToast('Could not delete address', 'error');
    }
  };

  return (
    <div className="fade-in">
      <h3 className="fw-bold brand-font text-white mb-4">My Account & Profile Settings</h3>

      <div className="row g-4">
        {/* Personal Details */}
        <div className="col-lg-6">
          <div className="smp-card p-4 mb-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-person-lines-fill text-primary"></i> Personal Details
            </h5>
            <form onSubmit={handleUpdateProfile} autoComplete="off">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">Email Address (Immutable)</label>
                <input
                  type="email"
                  disabled
                  className="form-control"
                  style={{ opacity: 0.75 }}
                  value={user?.email || ''}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary rounded-pill btn-sm px-4 fw-semibold shadow-sm"
              >
                Save Profile
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="smp-card p-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-shield-lock text-warning"></i> Change Password
            </h5>
            <form onSubmit={handleChangePassword} autoComplete="off">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">Current Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">New Password</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">Confirm New Password</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-warning text-dark fw-bold rounded-pill btn-sm px-4 shadow-sm">
                Update Password
              </button>
            </form>
          </div>
        </div>

        {/* Addresses Management */}
        <div className="col-lg-6">
          <div className="smp-card p-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-geo-alt-fill text-danger"></i> Delivery Addresses
              </h5>
              <button
                type="button"
                onClick={() => setShowAddAddr(!showAddAddr)}
                className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm"
              >
                <i className="bi bi-plus-lg me-1"></i> Add New
              </button>
            </div>

            {/* Add Address Form Toggle */}
            {showAddAddr && (
              <form onSubmit={handleAddAddress} className="p-3 rounded-3 mb-4" style={{ backgroundColor: '#0F172A', border: '1px solid #334155' }}>
                <h6 className="fw-bold text-white mb-3">Add New Address</h6>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small text-white">Address Title</label>
                    <input
                      type="text"
                      placeholder="Home / Office"
                      className="form-control form-control-sm"
                      value={newAddr.title}
                      onChange={(e) => setNewAddr({ ...newAddr, title: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-white">Pincode *</label>
                    <input
                      type="text"
                      required
                      placeholder="600001"
                      className="form-control form-control-sm"
                      value={newAddr.pincode}
                      onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small text-white">Street Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="Door No, Building, Street name"
                      className="form-control form-control-sm"
                      value={newAddr.street}
                      onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-white">City *</label>
                    <input
                      type="text"
                      required
                      className="form-control form-control-sm"
                      value={newAddr.city}
                      onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-white">State *</label>
                    <input
                      type="text"
                      required
                      className="form-control form-control-sm"
                      value={newAddr.state}
                      onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="d-flex gap-2 justify-content-end mt-3">
                  <button type="button" onClick={() => setShowAddAddr(false)} className="btn btn-sm btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary">
                    Save Address
                  </button>
                </div>
              </form>
            )}

            {/* Saved Addresses list */}
            {addresses.length === 0 ? (
              <p className="small mb-0" style={{ color: '#94A3B8' }}>No delivery addresses saved yet.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {addresses.map((addr) => (
                  <div key={addr._id} className="p-3 rounded-3 d-flex justify-content-between align-items-start" style={{ backgroundColor: '#0F172A', border: '1px solid #334155' }}>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge text-uppercase" style={{ backgroundColor: '#1E293B', color: '#38BDF8', border: '1px solid #334155' }}>{addr.title}</span>
                        {addr.isDefault && <span className="badge bg-primary">Default</span>}
                      </div>
                      <div className="fw-semibold small text-white">{addr.street}</div>
                      <div className="small" style={{ color: '#94A3B8' }}>{addr.city}, {addr.state} - {addr.pincode}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteAddress(addr._id)}
                      className="btn btn-link text-danger p-0 small text-decoration-none"
                    >
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
