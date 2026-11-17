import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [step, setStep] = useState(1); // 1 = identifier, 2 = OTP + new password
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier) {
      addToast('Please enter your email or phone', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { identifier });
      if (res.data.success) {
        addToast(res.data.message, 'success');
        if (res.data.devOtp) setDevOtp(res.data.devOtp);
        setStep(2);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Account not found', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        identifier,
        otp,
        newPassword
      });

      if (res.data.success) {
        addToast(res.data.message, 'success');
        navigate('/customer/login');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Password reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7">
          <div className="smp-card p-4 p-md-5 bg-white">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle mb-3 p-3"
                style={{ width: '60px', height: '60px' }}
              >
                <i className="bi bi-key-fill fs-2"></i>
              </div>
              <h3 className="fw-bold brand-font mb-1">Reset Password</h3>
              <p className="text-muted small">
                {step === 1
                  ? 'Enter your registered email or mobile to receive a reset OTP'
                  : 'Enter the verification code and your new password'}
              </p>
            </div>

            {step === 1 ? (
              <form onSubmit={handleRequestOtp}>
                <div className="mb-4">
                  <label className="form-label small fw-semibold">Email or Mobile Number</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter registered email or mobile"
                    className="form-control"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3"
                >
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                {devOtp && (
                  <div className="alert alert-info py-2 px-3 small rounded-3 mb-3 text-center">
                    Dev Code: <strong>{devOtp}</strong>{' '}
                    <button
                      type="button"
                      onClick={() => setOtp(devOtp)}
                      className="btn btn-sm btn-outline-primary py-0 px-2 ms-2"
                    >
                      Fill
                    </button>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-semibold">6-Digit OTP</label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    placeholder="Enter 6-digit OTP"
                    className="form-control text-center fs-4 fw-bold"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
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
                    placeholder="Re-enter new password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3"
                >
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Reset Password'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-link btn-sm text-secondary text-decoration-none"
                  >
                    Change Email/Phone
                  </button>
                </div>
              </form>
            )}

            <div className="text-center mt-3 small">
              <Link to="/customer/login" className="text-primary text-decoration-none fw-semibold">
                <i className="bi bi-arrow-left me-1"></i> Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
