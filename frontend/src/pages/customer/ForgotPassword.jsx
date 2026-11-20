import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [mode, setMode] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Mobile OTP state
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleEmailRecovery = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      addToast('Please enter a valid registered email address', 'warning');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await api.post('/auth/forgot-password', {
        identifier: cleanEmail,
        channel: 'email'
      });
      if (res.data.success) {
        setIdentifier(cleanEmail);
        setEmailSent(true);
        setResendCooldown(45);
        addToast(res.data.message || 'Check your email for a verification code.', 'success');
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
      const res = await api.post('/auth/forgot-password', { identifier, channel: 'sms' });
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setStep(2);
        setResendCooldown(45);
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
    if (
      newPassword.length < 8 ||
      newPassword.length > 128 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      addToast('Use 8-128 characters with uppercase, lowercase, and numeric characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        identifier: mode === 'email' ? email.trim().toLowerCase() : identifier,
        channel: mode === 'email' ? 'email' : 'sms',
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

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    const selectedIdentifier = mode === 'email' ? email.trim().toLowerCase() : identifier;
    const channel = mode === 'email' ? 'email' : 'sms';

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        identifier: selectedIdentifier,
        channel
      });
      if (res.data.success) {
        addToast('If the account exists, a new verification code was requested.', 'success');
        setOtp('');
        setResendCooldown(45);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Could not request another verification code.', 'error');
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
                  <i className="bi bi-envelope me-1"></i> Email Code
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

            {mode === 'email' && !emailSent ? (
              <form onSubmit={handleEmailRecovery} autoComplete="off">
                <div className="mb-4">
                  <label className="form-label small fw-semibold text-dark">Registered Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><i className="bi bi-envelope text-secondary"></i></span>
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      placeholder="Enter your registered email address"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3 shadow-sm">
                  {loading ? <span className="spinner-border spinner-border-sm me-2" role="status"></span> : 'Send Verification Code'}
                </button>
              </form>
            ) : mode === 'otp' && step === 1 ? (
              <form onSubmit={handleRequestOtp} autoComplete="off">
                <div className="mb-4">
                  <label className="form-label small fw-semibold text-dark">Registered Mobile Number</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><i className="bi bi-phone text-secondary"></i></span>
                    <input
                      type="tel"
                      required
                      autoComplete="off"
                      pattern="[6-9][0-9]{9}"
                      maxLength={10}
                      placeholder="Enter your registered mobile number"
                      className="form-control"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3 shadow-sm">
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetWithOtp} autoComplete="off">
                <div className="alert alert-success py-2 small text-center">
                  If an account matches, a verification code was requested for your selected recovery method. The code is valid for 5 minutes.
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark">6-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="off"
                    placeholder="Enter 6-digit code"
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
                    autoComplete="off"
                    placeholder="Create a new password"
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
                    autoComplete="off"
                    placeholder="Confirm your new password"
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
                  {loading ? 'Saving...' : 'Verify Code & Reset Password'}
                </button>
                <div className="d-flex justify-content-between align-items-center">
                  <button type="button" className="btn btn-link btn-sm p-0 text-secondary" onClick={handleResendCode} disabled={loading || resendCooldown > 0}>
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-secondary"
                    onClick={() => {
                      if (mode === 'email') setEmailSent(false);
                      else setStep(1);
                      setOtp('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Change {mode === 'email' ? 'email' : 'mobile number'}
                  </button>
                </div>
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

export default ForgotPassword;