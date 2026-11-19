import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const StaffProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setProfile(res.data.profile);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);

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
        addToast('Staff password changed successfully', 'success');
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
      <h3 className="fw-bold brand-font text-white mb-4">Staff Member Profile & Security</h3>

      <div className="row g-4">
        {/* Staff Card */}
        <div className="col-lg-6">
          <div className="smp-card p-4 shadow-sm mb-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="bg-success text-white rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-person-badge fs-2"></i>
              </div>
              <div>
                <h4 className="fw-bold brand-font text-white mb-0">{user?.name}</h4>
                <span className="badge mt-1" style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}>
                  Staff ID: {profile?.staffId || 'STF-1001'}
                </span>
              </div>
            </div>

            <table className="table table-sm table-borderless small mb-0" style={{ color: '#E2E8F0' }}>
              <tbody>
                <tr>
                  <td style={{ width: '35%', color: '#94A3B8' }}>Department:</td>
                  <td className="fw-bold text-white">{profile?.department || 'Billing & POS'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#94A3B8' }}>Job Role:</td>
                  <td className="fw-bold text-white">{profile?.jobRole || 'Senior Cashier'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#94A3B8' }}>Assigned Shop:</td>
                  <td className="fw-bold text-white">{profile?.shopId?.name || 'SMP Elite Fashions'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#94A3B8' }}>Branch:</td>
                  <td className="fw-bold text-white">{profile?.branchId?.name || 'Main Flagship Branch'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#94A3B8' }}>Email ID:</td>
                  <td className="text-white">{user?.email}</td>
                </tr>
                <tr>
                  <td style={{ color: '#94A3B8' }}>Contact Phone:</td>
                  <td className="text-white">{user?.phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#94A3B8' }}>Bills Handled:</td>
                  <td className="fw-bold" style={{ color: '#38BDF8' }}>{profile?.totalBillsHandled || 0}</td>
                </tr>
                <tr>
                  <td style={{ color: '#94A3B8' }}>Total Sales Generated:</td>
                  <td className="fw-bold text-success">₹{profile?.totalRevenueGenerated?.toFixed(2) || '0.00'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Change Password */}
        <div className="col-lg-6">
          <div className="smp-card p-4 shadow-sm" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <h5 className="fw-bold brand-font text-white mb-3 d-flex align-items-center gap-2">
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
              <div className="mb-4">
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
              <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm">
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
