import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const CustomerLogin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/customer/dashboard';
  const { login } = useAuth();
  const { addToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      addToast('Please enter your username, email, or mobile number and password', 'warning');
      return;
    }

    setLoading(true);
    const result = await login('customer', identifier.trim(), password, rememberMe);
    setLoading(false);

    if (result.success) {
      navigate(redirect);
    }
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7 col-sm-9">
          <div className="smp-card p-4 p-md-5 shadow-lg" style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}>
            {/* Header */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-3 shadow mb-2"
                style={{ width: '48px', height: '48px', fontSize: '1.5rem', fontWeight: 800 }}
              >
                S
              </div>
              <h3 className="fw-bold brand-font mb-1 text-white">Customer Sign In</h3>
              <p className="text-muted small">Access your SMP orders, cart, wishlist, and profile</p>
            </div>

            {location.state?.registrationSuccess && (
              <div className="alert alert-success" role="status">
                {location.state.registrationSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">Username, Email, or Mobile Number</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-person text-secondary"></i></span>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Enter username, email, or mobile number"
                    className="form-control"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-semibold text-white mb-0">Password</label>
                  <Link to="/forgot-password" className="small text-info text-decoration-none fw-medium">
                    Forgot Password?
                  </Link>
                </div>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock text-secondary"></i></span>
                  <input
                    type="password"
                    required
                    autoComplete="off"
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
                className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3 shadow"
              >
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Sign In'}
              </button>
            </form>

            <div className="text-center small text-muted">
              Don't have an account?{' '}
              <Link to="/customer/register" className="text-info fw-bold text-decoration-none">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;