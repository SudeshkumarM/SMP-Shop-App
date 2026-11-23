import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const getRegistrationFailure = (error) => {
  const status = error.response?.status;
  if (status === 429) {
    return { formError: 'Too many attempts. Please wait a few minutes before trying again.' };
  }
  if (status === 409) {
    const message = String(error.response?.data?.message || '').toLowerCase();
    if (message.includes('username')) {
      return { field: 'username', message: 'This username is already in use.' };
    }
    if (message.includes('email')) {
      return { field: 'email', message: 'An account with this email already exists.' };
    }
    if (message.includes('mobile') || message.includes('phone')) {
      return { field: 'phone', message: 'An account with this mobile number already exists.' };
    }
    return { formError: 'An account with these details already exists. Review your username, email, and mobile number.' };
  }
  if (status >= 500) {
    return { formError: 'Registration is temporarily unavailable. Please try again later.' };
  }

  const validationMessage = String(error.response?.data?.message || '').toLowerCase();
  if (validationMessage.includes('full name')) {
    return { field: 'fullName', message: 'Enter a name between 2 and 100 characters.' };
  }
  if (validationMessage.includes('username')) {
    return { field: 'username', message: 'Use 3–30 letters, numbers, or underscores.' };
  }
  if (validationMessage.includes('email')) {
    return { field: 'email', message: 'Enter a valid email address.' };
  }
  if (validationMessage.includes('mobile') || validationMessage.includes('phone')) {
    return { field: 'phone', message: 'Enter a valid 10-digit Indian mobile number.' };
  }
  if (validationMessage.includes('password')) {
    return { field: 'password', message: 'Use 8–128 characters with uppercase, lowercase, and a number.' };
  }
  if (status === 400) {
    return { formError: 'Please review your details and try again.' };
  }
  return { formError: 'Could not complete registration. Check your connection and try again.' };
};

const CustomerRegister = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const setFieldError = (field, message) => {
    setFieldErrors((previous) => ({ ...previous, [field]: message }));
  };

  const clearFieldError = (field) => {
    setFormError('');
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const renderFieldError = (field) => fieldErrors[field] ? (
    <div id={`${field}-error`} className="registration-field-error" role="alert">
      {fieldErrors[field]}
    </div>
  ) : null;

  const validateForm = () => {
    const errors = {};
    const cleanName = fullName.trim();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 2 || cleanName.length > 100) {
      errors.fullName = 'Enter a name between 2 and 100 characters.';
    }
    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      errors.username = 'Use 3–30 letters, numbers, or underscores.';
    }
    if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Enter a valid email address.';
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (
      password.length < 8 ||
      password.length > 128 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      errors.password = 'Use 8–128 characters with uppercase, lowercase, and a number.';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/customer/register', {
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
        navigate('/customer/verify-otp', {
          replace: true,
          state: {
            email: email.trim().toLowerCase(),
            verificationMode: 'registration',
            registrationSuccess: res.data.message || 'Registration successful. Verify your email to continue.'
          }
        });
      }
    } catch (err) {
      const failure = getRegistrationFailure(err);
      if (failure.field) setFieldError(failure.field, failure.message);
      if (failure.formError) setFormError(failure.formError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-9">
          <div className="smp-card p-4 p-md-5 bg-white">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-3 shadow-sm mb-2"
                style={{ width: '48px', height: '48px', fontSize: '1.5rem', fontWeight: 800 }}
              >
                S
              </div>
              <h3 className="fw-bold brand-font mb-1">Create Customer Account</h3>
              <p className="text-muted small mb-0">
                Join SMP for seamless shopping, orders &amp; exclusive dress collections
              </p>
            </div>

            {formError && (
              <div className="registration-form-error" role="alert" aria-live="polite">
                {formError}
              </div>
            )}

            <form onSubmit={handleRegister} autoComplete="off" noValidate className="registration-form">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="registration-full-name">Full Name *</label>
                  <input
                    id="registration-full-name"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Enter your full name"
                    className={`form-control${fieldErrors.fullName ? ' is-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      clearFieldError('fullName');
                    }}
                  />
                  {renderFieldError('fullName')}
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="registration-username">Username *</label>
                  <input
                    id="registration-username"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Enter your username"
                    className={`form-control${fieldErrors.username ? ' is-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.username)}
                    aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      clearFieldError('username');
                    }}
                  />
                  {renderFieldError('username')}
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="registration-email">Email Address *</label>
                  <input
                    id="registration-email"
                    type="email"
                    required
                    autoComplete="off"
                    placeholder="Enter your email address"
                    className={`form-control${fieldErrors.email ? ' is-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                  />
                  {renderFieldError('email')}
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="registration-phone">Mobile Number (10 Digits) *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">+91</span>
                    <input
                      id="registration-phone"
                      type="tel"
                      required
                      autoComplete="off"
                      pattern="[6-9][0-9]{9}"
                      placeholder="Enter your mobile number"
                      className={`form-control${fieldErrors.phone ? ' is-invalid' : ''}`}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      aria-describedby={fieldErrors.phone ? 'phone-error' : 'phone-help'}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                        clearFieldError('phone');
                      }}
                    />
                  </div>
                  {renderFieldError('phone')}
                  <div id="phone-help" className="form-text">Contact information only; this number is not verified.</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="registration-password">Password *</label>
                  <input
                    id="registration-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Create your password"
                    minLength={8}
                    maxLength={128}
                    className={`form-control${fieldErrors.password ? ' is-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError('password');
                    }}
                  />
                  {renderFieldError('password')}
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="registration-confirm-password">Confirm Password *</label>
                  <input
                    id="registration-confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    minLength={8}
                    maxLength={128}
                    className={`form-control${fieldErrors.confirmPassword ? ' is-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError('confirmPassword');
                    }}
                  />
                  {renderFieldError('confirmPassword')}
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Delivery Address</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Enter your delivery address"
                    className="form-control"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="col-md-4 col-6">
                  <label className="form-label small fw-semibold">City</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Enter your city"
                    className="form-control"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="col-md-4 col-6">
                  <label className="form-label small fw-semibold">State</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Enter your state"
                    className="form-control"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>

                <div className="col-md-4 col-12">
                  <label className="form-label small fw-semibold">Pincode</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Enter your pincode"
                    className="form-control"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </div>
            </form>

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
