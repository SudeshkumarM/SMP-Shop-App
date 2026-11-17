import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const CustomerRegister = () => {
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP Verification
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Chennai');
  const [state, setState] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('');

  // OTP State
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutes countdown
  const [resendCooldown, setResendCooldown] = useState(45);

  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Step 1: Submit Details & Request OTP
  const handleInitiate = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast('Passwords do not match!', 'error');
      return;
    }
    if (password.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/customer/register-initiate', {
        fullName,
        username,
        email,
        phone,
        password,
        address,
        city,
        state,
        pincode
      });

      if (res.data.success) {
        addToast(res.data.message, 'success');
        if (res.data.devOtp) {
          setDevOtp(res.data.devOtp);
        }
        setStep(2);
        setTimer(300);
        setResendCooldown(45);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check inputs.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Complete Registration
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      addToast('Please enter the 6-digit OTP', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/customer/register-verify', {
        fullName,
        username,
        email,
        phone,
        password,
        address,
        city,
        state,
        pincode,
        otp
      });

      if (res.data.success) {
        addToast(res.data.message, 'success');
        if (res.data.token) {
          localStorage.setItem('smp_token', res.data.token);
          localStorage.setItem('smp_role', 'customer');
          await loadUser();
          navigate('/customer/dashboard');
        } else {
          navigate('/customer/login');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/customer/register-initiate', {
        fullName,
        email,
        phone,
        password
      });
      if (res.data.success) {
        addToast('New OTP sent to your phone!', 'success');
        if (res.data.devOtp) setDevOtp(res.data.devOtp);
        setTimer(300);
        setResendCooldown(45);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Could not resend OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-9">
          <div className="smp-card p-4 p-md-5 bg-white">
            {/* Header */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-3 shadow-sm mb-2"
                style={{ width: '48px', height: '48px', fontSize: '1.5rem', fontWeight: 800 }}
              >
                S
              </div>
              <h3 className="fw-bold brand-font mb-1">Create Customer Account</h3>
              <p className="text-muted small">
                {step === 1
                  ? 'Join SMP for seamless shopping, orders & exclusive dress collections'
                  : `Verify mobile number ${phone} to complete registration`}
              </p>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="d-flex align-items-center justify-content-center gap-3 mb-4">
              <div className={`badge rounded-pill px-3 py-2 ${step === 1 ? 'bg-primary text-white' : 'bg-success text-white'}`}>
                1. Personal Details
              </div>
              <i className="bi bi-chevron-right text-muted small"></i>
              <div className={`badge rounded-pill px-3 py-2 ${step === 2 ? 'bg-primary text-white' : 'bg-light text-muted border'}`}>
                2. Mobile OTP Verification
              </div>
            </div>

            {step === 1 ? (
              /* STEP 1: Registration Form */
              <form onSubmit={handleInitiate}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kumar Selvan"
                      className="form-control"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. kumar01"
                      className="form-control"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="kumar@example.com"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Mobile Number (10 Digits) *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">+91</span>
                      <input
                        type="tel"
                        required
                        pattern="[0-9]{10}"
                        placeholder="9876543210"
                        className="form-control"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Re-enter password"
                      className="form-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold">Delivery Address</label>
                    <input
                      type="text"
                      placeholder="House No, Street name, Area"
                      className="form-control"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="col-md-4 col-6">
                    <label className="form-label small fw-semibold">City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="col-md-4 col-6">
                    <label className="form-label small fw-semibold">State</label>
                    <input
                      type="text"
                      className="form-control"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>

                  <div className="col-md-4 col-12">
                    <label className="form-label small fw-semibold">Pincode</label>
                    <input
                      type="text"
                      placeholder="600001"
                      className="form-control"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>

                  <div className="col-12 mt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary w-100 py-2 rounded-pill fw-bold"
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Sending OTP via SMS...
                        </>
                      ) : (
                        'Generate OTP & Continue'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* STEP 2: OTP Verification */
              <form onSubmit={handleVerify} className="text-center">
                <div className="mb-4">
                  <div
                    className="d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle mb-3 p-3"
                    style={{ width: '64px', height: '64px' }}
                  >
                    <i className="bi bi-shield-check fs-2"></i>
                  </div>
                  <h5>Enter Verification Code</h5>
                  <p className="small text-muted mb-0">
                    We sent a 6-digit OTP via SMS to <strong>+91 {phone}</strong>.
                  </p>
                </div>

                {/* Developer convenience badge */}
                {devOtp && (
                  <div className="alert alert-info py-2 px-3 small rounded-3 mb-3 d-inline-block">
                    <i className="bi bi-info-circle-fill me-1"></i>
                    Dev Mode OTP: <strong>{devOtp}</strong>{' '}
                    <button
                      type="button"
                      onClick={() => setOtp(devOtp)}
                      className="btn btn-sm btn-outline-primary py-0 px-2 ms-2"
                    >
                      Auto Fill
                    </button>
                  </div>
                )}

                <div className="mb-3 d-flex justify-content-center">
                  <input
                    type="text"
                    maxLength="6"
                    required
                    autoFocus
                    placeholder="• • • • • •"
                    className="form-control text-center fs-3 fw-bold letter-spacing-2"
                    style={{ width: '220px', letterSpacing: '8px' }}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>

                <div className="mb-4 small text-muted">
                  {timer > 0 ? (
                    <span>
                      Code expires in: <strong className="text-danger">{formatTime(timer)}</strong>
                    </span>
                  ) : (
                    <span className="text-danger">OTP Expired. Please request a new code.</span>
                  )}
                </div>

                <div className="d-flex flex-column gap-2">
                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="btn btn-primary w-100 py-2 rounded-pill fw-bold"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Verifying...
                      </>
                    ) : (
                      'Verify & Complete Registration'
                    )}
                  </button>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn btn-link btn-sm text-secondary text-decoration-none p-0"
                    >
                      <i className="bi bi-arrow-left me-1"></i> Change Details
                    </button>

                    <button
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleResendOtp}
                      className="btn btn-link btn-sm text-primary text-decoration-none p-0 fw-semibold"
                    >
                      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <hr className="my-4" />

            <div className="text-center small text-muted">
              Already have an account?{' '}
              <Link to="/customer/login" className="text-primary fw-bold text-decoration-none">
                Login here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerRegister;
