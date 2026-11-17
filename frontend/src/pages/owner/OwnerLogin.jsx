import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const OwnerLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter Owner Email and Password', 'warning');
      return;
    }

    setLoading(true);
    const result = await login('owner', email, password);
    setLoading(false);

    if (result.success) {
      navigate('/owner/dashboard');
    }
  };

  const fillDemoOwner = () => {
    setEmail('kumar');
    setPassword('Password123');
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7 col-sm-9">
          <div className="smp-card p-4 p-md-5 bg-white border-0 shadow">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-dark text-warning rounded-3 shadow-sm mb-2"
                style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
              >
                <i className="bi bi-briefcase-fill"></i>
              </div>
              <h3 className="fw-bold brand-font mb-1">Master Owner Portal</h3>
              <p className="text-muted small">Multi-Shop Governance, Investments & Profit Audits</p>
            </div>

            {/* Quick Demo Credentials */}
            <div className="alert alert-dark text-warning border py-2 px-3 small d-flex justify-content-between align-items-center mb-4 rounded-3">
              <div>
                <span className="fw-bold text-white">Master Owner (Kumar):</span>
                <div className="text-light opacity-75" style={{ fontSize: '0.75rem' }}>kumar (or owner@smp.com) | Password123</div>
              </div>
              <button
                type="button"
                onClick={fillDemoOwner}
                className="btn btn-warning btn-sm py-1 px-2 text-dark fw-bold"
                style={{ fontSize: '0.75rem' }}
              >
                Auto-Fill
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Username OR Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="bi bi-person-fill text-secondary"></i></span>
                  <input
                    type="text"
                    required
                    placeholder="Enter owner username (kumar) or email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold">Master Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="bi bi-lock text-secondary"></i></span>
                  <input
                    type="password"
                    required
                    placeholder="Enter owner password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-100 py-2 rounded-pill fw-bold mb-3 shadow"
              >
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Authenticate as Master Owner'}
              </button>
            </form>

            <div className="alert alert-light border small text-muted text-center mb-3">
              <i className="bi bi-shield-lock-fill me-1 text-danger"></i>
              Highest-level corporate security authority. Only authorized owners may access financial ledgers.
            </div>

            <div className="text-center small">
              <Link to="/customer/login" className="text-secondary text-decoration-none">
                <i className="bi bi-arrow-left me-1"></i> Return to Shopping Front
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
