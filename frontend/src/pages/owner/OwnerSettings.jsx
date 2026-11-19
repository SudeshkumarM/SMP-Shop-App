import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const OwnerSettings = () => {
  const { user, loadUser } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Email verification state
  const [pendingEmail, setPendingEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      if (user.pendingEmail) {
        setPendingEmail(user.pendingEmail);
      }
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      addToast('Please enter a valid email address', 'error');
      return;
    }
    if (!username.trim()) {
      addToast('Please enter an Owner username', 'warning');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim()
      });

      if (res.data.success) {
        addToast(res.data.message || 'Profile updated successfully', 'success');
        if (res.data.requiresEmailVerification) {
          setPendingEmail(res.data.user?.pendingEmail || email.trim());
        }
        if (loadUser) loadUser();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile & email', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      addToast('Please enter the 6-digit verification code', 'warning');
      return;
    }

    setVerifyingEmail(true);
    try {
      const res = await api.post('/auth/verify-email-change', { code: verifyCode.trim() });
      if (res.data.success) {
        addToast('New Owner email activated successfully!', 'success');
        setPendingEmail('');
        setVerifyCode('');
        if (loadUser) loadUser();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Verification failed. Please check the code.', 'error');
    } finally {
      setVerifyingEmail(false);
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

    setChangingPassword(true);
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
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold brand-font text-white mb-1">Master Enterprise Governance & Security</h3>
          <p className="text-slate-400 small mb-0" style={{ color: '#94A3B8' }}>
            Configure Owner credentials, recovery email verification, password, and infrastructure security
          </p>
        </div>
        <span className="badge px-3 py-2" style={{ backgroundColor: '#1E3A70', color: '#38BDF8', border: '1px solid #2563EB' }}>
          <i className="bi bi-shield-lock-fill me-1"></i> Single Owner Guard Active
        </span>
      </div>

      {/* Pending Email Verification Notice */}
      {pendingEmail && (
        <div className="smp-card p-4 mb-4" style={{ backgroundColor: '#1E293B', border: '2px solid #F97316' }}>
          <div className="d-flex align-items-start gap-3 flex-wrap flex-md-nowrap">
            <div
              className="d-flex align-items-center justify-content-center text-white rounded-3 p-3"
              style={{ backgroundColor: '#F97316', width: '48px', height: '48px', flexShrink: 0 }}
            >
              <i className="bi bi-envelope-exclamation-fill fs-4 text-white"></i>
            </div>
            <div className="flex-grow-1">
              <h5 className="fw-bold text-white mb-1">Email Activation Pending Verification</h5>
              <p className="small mb-3" style={{ color: '#CBD5E1' }}>
                A 6-digit activation code was sent to <strong className="text-warning">{pendingEmail}</strong>.
                Enter the code below to verify ownership and complete activating this email.
              </p>
              <form onSubmit={handleVerifyEmail} className="d-flex gap-2 align-items-center flex-wrap" style={{ maxWidth: '450px' }}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  required
                  className="form-control"
                  style={{ width: '200px', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={verifyingEmail}
                  className="btn btn-warning fw-bold px-3 text-dark"
                >
                  {verifyingEmail ? 'Verifying...' : 'Verify & Activate'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Owner Profile & Registered Email */}
        <div className="col-lg-6">
          <div className="smp-card p-4 shadow-sm mb-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <h5 className="fw-bold brand-font text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-person-gear text-primary"></i> Master Owner Account Details
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
                <label className="form-label small fw-semibold text-white">
                  Owner Username <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-at text-secondary"></i></span>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Enter owner username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-text small" style={{ color: '#94A3B8' }}>
                  Used to sign in securely to the Owner Portal.
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">
                  Registered Recovery Email <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-envelope text-secondary"></i></span>
                  <input
                    type="email"
                    required
                    className="form-control"
                    placeholder="owner@smp.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-text small" style={{ color: '#94A3B8' }}>
                  Updating to a new email requires entering a verification code sent to that address before activation.
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-white">Contact Phone Number</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-telephone text-secondary"></i></span>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="9840012345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="btn btn-primary fw-bold rounded-pill px-4 shadow-sm"
              >
                {savingProfile ? 'Saving Changes...' : 'Save Account Settings'}
              </button>
            </form>
          </div>

          {/* Credentials & Password Change */}
          <div className="smp-card p-4 shadow-sm mb-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <h5 className="fw-bold brand-font text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-shield-lock text-warning"></i> Master Owner Password
            </h5>
            <form onSubmit={handleChangePassword} autoComplete="off">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">Current Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter current password"
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
                  placeholder="Minimum 6 characters"
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
                  placeholder="Re-enter new password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="btn btn-warning text-dark fw-bold rounded-pill px-4 shadow-sm"
              >
                {changingPassword ? 'Updating...' : 'Update Master Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Platform System Specifications */}
        <div className="col-lg-6">
          <div className="smp-card p-4 shadow-sm mb-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <h5 className="fw-bold brand-font text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-cpu text-primary"></i> Platform Security & Governance
            </h5>

            <table className="table table-sm table-borderless small mb-4" style={{ color: '#E2E8F0' }}>
              <tbody>
                <tr>
                  <td className="fw-bold" style={{ color: '#94A3B8' }}>Platform Identity:</td>
                  <td className="text-white">SMP (Single Master Owner Architecture)</td>
                </tr>
                <tr>
                  <td className="fw-bold" style={{ color: '#94A3B8' }}>Active Owner Account:</td>
                  <td><span className="badge" style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}>1 Master Account (Enforced)</span></td>
                </tr>
                <tr>
                  <td className="fw-bold" style={{ color: '#94A3B8' }}>Public Registration:</td>
                  <td><span className="badge" style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}>Owner Signup Disabled</span></td>
                </tr>
                <tr>
                  <td className="fw-bold" style={{ color: '#94A3B8' }}>Password Encryption:</td>
                  <td><span className="badge" style={{ backgroundColor: '#8B5CF6', color: '#FFFFFF' }}>bcrypt (10 rounds)</span></td>
                </tr>
                <tr>
                  <td className="fw-bold" style={{ color: '#94A3B8' }}>Route Authorization:</td>
                  <td><span className="badge" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>Role-Based Access Control (RBAC)</span></td>
                </tr>
                <tr>
                  <td className="fw-bold" style={{ color: '#94A3B8' }}>Tenant Isolation:</td>
                  <td><span className="badge" style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}>Multi-Shop & Multi-Branch Scoping</span></td>
                </tr>
              </tbody>
            </table>

            <div className="p-3 rounded-3" style={{ backgroundColor: '#0F172A', border: '1px solid #334155' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-shield-check text-success fs-5"></i>
                <span className="fw-bold text-white small">Owner Portal Protection Rules</span>
              </div>
              <ul className="small mb-0 ps-3" style={{ color: '#94A3B8' }}>
                <li>Owner links are strictly hidden from public navigation, customer, and staff menus.</li>
                <li>All <code>/api/owner/*</code> endpoints enforce server-side JWT and role checks.</li>
                <li>Unauthenticated or non-owner URL visits redirect immediately to authorized destinations.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerSettings;
