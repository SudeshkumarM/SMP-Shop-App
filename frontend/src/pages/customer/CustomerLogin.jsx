import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/customer/dashboard';
  const { login } = useAuth();
  const { addToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      addToast('Please enter your email or mobile number and password', 'warning');
      return;
    }

    setLoading(true);
    const result = await login('customer', identifier, password);
    setLoading(false);

    if (result.success) {
      navigate(redirect);
    }
  };

  const fillDemoCustomer = () => {
    setIdentifier('customer@smp.com');
    setPassword('Password123');
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7 col-sm-9">
          <div className="smp-card p-4 p-md-5 bg-white">
            {/* Header */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-3 shadow-sm mb-2"
                style={{ width: '48px', height: '48px', fontSize: '1.5rem', fontWeight: 800 }}
              >
                S
              </div>
              <h3 className="fw-bold brand-font mb-1">Customer Sign In</h3>
              <p className="text-muted small">Access your SMP orders, cart, wishlist, and profile</p>
            </div>

            {/* Quick Demo Credentials Pill */}
            <div className="alert alert-light border py-2 px-3 small d-flex justify-content-between align-items-center mb-4 rounded-3">
              <div>
                <span className="fw-bold text-dark">Demo Customer:</span>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>customer@smp.com | Password123</div>
              </div>
              <button
                type="button"
                onClick={fillDemoCustomer}
                className="btn btn-outline-primary btn-sm py-1 px-2"
                style={{ fontSize: '0.75rem' }}
              >
                Auto-Fill
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Username OR Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="bi bi-person text-secondary"></i></span>
                  <input
                    type="text"
                    required
                    placeholder="Enter username, email, or mobile"
                    className="form-control"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <label className="form-label small fw-semibold">Password</label>
                  <Link to="/customer/forgot-password" className="small text-primary text-decoration-none">
                    Forgot Password?
                  </Link>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="bi bi-lock text-secondary"></i></span>
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="rememberCheck"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="form-check-label small text-muted" htmlFor="rememberCheck">
                  Remember Me
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3 shadow-sm"
              >
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Sign In'}
              </button>
            </form>

            <div className="text-center small text-muted mb-4">
              Don't have an account?{' '}
              <Link to="/customer/register" className="text-primary fw-bold text-decoration-none">
                Register with OTP
              </Link>
            </div>

            <hr className="my-3" />

            {/* Portal Switcher */}
            <div className="text-center">
              <span className="text-muted small d-block mb-2">Are you a staff, admin, or store owner?</span>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <Link to="/staff/login" className="badge bg-success-subtle text-success p-2 text-decoration-none">
                  <i className="bi bi-receipt me-1"></i> Staff POS
                </Link>
                <Link to="/admin/login" className="badge bg-warning-subtle text-dark p-2 text-decoration-none">
                  <i className="bi bi-shield-lock me-1"></i> Admin Portal
                </Link>
                <Link to="/owner/login" className="badge bg-purple-subtle text-purple p-2 text-decoration-none" style={{ backgroundColor: '#f3e5f5', color: '#6a1b9a' }}>
                  <i className="bi bi-briefcase me-1"></i> Owner Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
