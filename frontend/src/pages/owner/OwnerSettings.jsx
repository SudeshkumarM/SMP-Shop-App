import React, { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const OwnerSettings = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
        addToast('Master Owner password updated successfully', 'success');
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
      <h3 className="fw-bold brand-font mb-4">Master Enterprise Governance & Security</h3>

      <div className="row g-4">
        {/* Credentials & Security */}
        <div className="col-lg-6">
          <div className="smp-card p-4 bg-white shadow-sm mb-4">
            <h5 className="fw-bold brand-font mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-shield-lock text-warning"></i> Master Owner Password
            </h5>
            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Current Master Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">New Master Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold">Confirm New Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-warning text-dark fw-bold rounded-pill px-4">
                Update Master Credentials
              </button>
            </form>
          </div>
        </div>

        {/* Platform System Specifications */}
        <div className="col-lg-6">
          <div className="smp-card p-4 bg-white shadow-sm mb-4">
            <h5 className="fw-bold brand-font mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-cpu text-primary"></i> Platform Infrastructure & Integrations
            </h5>

            <table className="table table-sm table-borderless small mb-0">
              <tbody>
                <tr>
                  <td className="text-muted fw-bold">Platform Edition:</td>
                  <td>SMP Enterprise 2.0 (Multi-Shop & POS Architecture)</td>
                </tr>
                <tr>
                  <td className="text-muted fw-bold">Tenant Isolation:</td>
                  <td><span className="badge bg-success">Active Scoping (shopId & branchId)</span></td>
                </tr>
                <tr>
                  <td className="text-muted fw-bold">SMS Gateway:</td>
                  <td><span className="badge bg-info text-dark">Fast2SMS / Twilio Adapter Ready</span></td>
                </tr>
                <tr>
                  <td className="text-muted fw-bold">Payment Gateway:</td>
                  <td><span className="badge bg-primary">Razorpay / Simulated Sandbox Flow</span></td>
                </tr>
                <tr>
                  <td className="text-muted fw-bold">Tax Compliance:</td>
                  <td>GST Dual-Tax (CGST & SGST Intra-State Auto Split)</td>
                </tr>
                <tr>
                  <td className="text-muted fw-bold">Mobile App Readiness:</td>
                  <td><span className="badge bg-secondary">RESTful API First Architecture</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerSettings;
