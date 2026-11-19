import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      addToast('Please enter and confirm your new password', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/auth/reset-password/${token}`, { newPassword });
      if (res.data.success) {
        setSuccess(true);
        addToast(res.data.message || 'Password reset successful! You can now log in.', 'success');
        setTimeout(() => {
          navigate('/customer/login');
        }, 2000);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Password reset failed. The link may have expired.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7">
          <div className="smp-card p-4 p-md-5 bg-white shadow-sm">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-3 shadow-sm"
                style={{ width: '56px', height: '56px' }}
              >
                <i className="bi bi-shield-lock-fill fs-3"></i>
              </div>
              <h3 className="fw-bold brand-font mb-1 text-dark">Create New Password</h3>
              <p className="text-muted small">Enter your new secure password below to regain access.</p>
            </div>

            {success ? (
              <div className="alert alert-success text-center py-4 rounded-3">
                <i className="bi bi-check-circle-fill display-5 text-success mb-2 d-block"></i>
                <h5 className="fw-bold text-dark mb-1">Password Reset Complete!</h5>
                <p className="small text-muted mb-3">
                  Your credentials have been updated securely. Redirecting you to login...
                </p>
                <Link to="/customer/login" className="btn btn-primary btn-sm rounded-pill px-4 fw-semibold">
                  Go to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} autoComplete="off">
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark">New Password <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><i className="bi bi-lock text-secondary"></i></span>
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
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-semibold text-dark">Confirm New Password <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><i className="bi bi-check-circle text-secondary"></i></span>
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      className="form-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3 shadow-sm"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Updating Password...
                    </>
                  ) : (
                    'Reset & Save Password'
                  )}
                </button>
              </form>
            )}

            <div className="text-center small mt-2">
              <Link to="/customer/login" className="text-muted text-decoration-none">
                <i className="bi bi-arrow-left me-1"></i> Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;