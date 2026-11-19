import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [mode, setMode] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [resetToken, setResetToken] = useState('');

  // Mobile OTP state
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailRecovery = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      addToast('Please enter a valid registered email address', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password-email', { email });
      if (res.data.success) {
        setEmailSent(true);
        if (res.data.resetToken) {
          setResetToken(res.data.resetToken);
        }
        addToast(res.data.message || 'Password reset link sent to your email.', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error processing request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier) {
      addToast('Please enter your mobile number', 'warning');
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

  const handleResetWithOtp = async (e) => {
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
          <div className="smp-card p-4 p-md-5 bg-white shadow-sm">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-3 shadow-sm"
                style={{ width: '56px', height: '56px' }}
              >
                <i className="bi bi-key-fill fs-3"></i>
              </div>
              <h3 className="fw-bold brand-font mb-1 text-dark">Password Recovery</h3>
              <p className="text-muted small">
                Reset your password securely via registered email or SMS verification.
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="d-flex justify-content-center mb-4">
              <div className="btn-group btn-group-sm rounded-pill p-1 bg-light border">
                <button
                  type="button"
                  className={`btn rounded-pill px-3 fw-semibold ${mode === 'email' ? 'btn-primary text-white' : 'btn-light text-muted'}`}
                  onClick={() => setMode('email')}
                >
                  <i className="bi bi-envelope me-1"></i> Email Link
                </button>
                <button
                  type="button"
                  className={`btn rounded-pill px-3 fw-semibold ${mode === 'otp' ? 'btn-primary text-white' : 'btn-light text-muted'}`}
                  onClick={() => setMode('otp')}
                >
                  <i className="bi bi-phone me-1"></i> Mobile OTP
                </button>
              </div>
            </div>

            {mode === 'email' ? (
              emailSent ? (
                <div className="alert alert-success text-center py-4 rounded-3">
                  <i className="bi bi-envelope-check-fill display-5 text-success mb-2 d-block"></i>
                  <h5 className="fw-bold text-dark mb-1">Check Your Email</h5>
                  <p className="small text-muted mb-3">
                    If an account with <strong>{email}</strong> exists, a password reset link has been dispatched with a 1-hour expiration.
                  </p>
                  {resetToken && (
                    <div className="p-3 bg-light rounded-3 border mb-3">
                      <span className="small text-muted d-block mb-2">Development / Direct Link:</span>
                      <Link to={`/reset-password/${resetToken}`} className="btn btn-outline-primary btn-sm rounded-pill fw-bold">
                        <i className="bi bi-box-arrow-up-right me-1"></i> Open Password Reset Page
                      </Link>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setEmailSent(false); setResetToken(''); }}
                    className="btn btn-link btn-sm text-secondary"
                  >
                    Try another email address
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEmailRecovery} autoComplete="off">
                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-dark">Registered Email Address</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><i className="bi bi-envelope text-secondary"></i></span>
                      <input
                        type="email"
                        required
                        autoComplete="off"
                        placeholder="e.g. yourname@domain.com"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-text small text-muted">
                      We'll generate an encrypted, single-use password reset link.
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
                        Sending Reset Link...
                      </>
                    ) : (
                      'Send Recovery Link'
                    )}
                  </button>
                </form>
              )
            ) : (
              step === 1 ? (
                <form onSubmit={handleRequestOtp} autoComplete="off">
                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-dark">Registered Mobile Number</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><i className="bi bi-phone text-secondary"></i></span>
                      <input
                        type="tel"
                        required
                        autoComplete="off"
                        placeholder="Enter 10-digit mobile number"
                        className="form-control"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3 shadow-sm"
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : (
                      'Send Verification OTP'
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetWithOtp} autoComplete="off">
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
                    <label className="form-label small fw-semibold text-dark">6-Digit Verification Code</label>
                    <input
                      type="text"
                      required
                      maxLength="6"
                      autoComplete="off"
                      placeholder="Enter 6-digit OTP"
                      className="form-control text-center fs-4 fw-bold"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">New Password</label>
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
                    <label className="form-label small fw-semibold text-dark">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      className="form-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3 shadow-sm"
                  >
                    {loading ? 'Saving...' : 'Reset Password'}
                  </button>
                </form>
              )
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

export default ForgotPassword;