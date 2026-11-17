import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const AdminSettings = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  // Shop Settings
  const [shopName, setShopName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [invoicePrefix, setInvoicePrefix] = useState('SMP');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        if (res.data.success && res.data.shop) {
          const s = res.data.shop;
          setShop(s);
          setShopName(s.name);
          setContactPhone(s.contactPhone);
          setContactEmail(s.contactEmail);
          setGstNumber(s.gstNumber);
          setLowStockThreshold(s.settings?.lowStockThreshold || 10);
          setInvoicePrefix(s.settings?.invoicePrefix || 'SMP');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateShop = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/admin/settings', {
        name: shopName,
        contactPhone,
        contactEmail,
        gstNumber,
        settings: {
          lowStockThreshold: Number(lowStockThreshold),
          invoicePrefix
        }
      });
      if (res.data.success) {
        addToast('Shop settings updated successfully', 'success');
      }
    } catch (e) {
      addToast('Failed to update settings', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }
    try {
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      if (res.data.success) {
        addToast('Admin password changed successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Password update failed', 'error');
    }
  };

  return (
    <div className="fade-in">
      <h3 className="fw-bold brand-font mb-4">Shop Configuration & Admin Security</h3>

      <div className="row g-4">
        {/* Shop Settings */}
        <div className="col-lg-7">
          <div className="smp-card p-4 bg-white shadow-sm mb-4">
            <h5 className="fw-bold brand-font mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-shop text-primary"></i> Store Profile & Tax Config
            </h5>
            <form onSubmit={handleUpdateShop}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Store Public Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Official Contact Phone</label>
                  <input
                    type="tel"
                    required
                    className="form-control"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Contact Email</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">GSTIN Registration #</label>
                  <input
                    type="text"
                    required
                    className="form-control font-monospace"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Invoice Number Prefix</label>
                  <input
                    type="text"
                    required
                    className="form-control text-uppercase"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold">Default Low Stock Threshold</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
                <small className="text-muted">Triggers low stock alert widget when units fall below this count.</small>
              </div>

              <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold">
                Save Store Settings
              </button>
            </form>
          </div>
        </div>

        {/* Admin Security */}
        <div className="col-lg-5">
          <div className="smp-card p-4 bg-white shadow-sm mb-4">
            <h5 className="fw-bold brand-font mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-shield-lock text-warning"></i> Admin Security
            </h5>
            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Current Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">New Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold">Confirm Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-outline-warning text-dark rounded-pill px-4 fw-semibold">
                Update Admin Password
              </button>
            </form>
          </div>

          <div className="smp-card p-3 bg-light border small text-muted">
            <h6 className="fw-bold text-dark mb-1">Notice on Confidentiality</h6>
            <p className="mb-0">
              Admin privileges allow management of shop inventory, orders, customers, and staff. Confidential capital investments and total enterprise net profit are restricted to Owner access only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
