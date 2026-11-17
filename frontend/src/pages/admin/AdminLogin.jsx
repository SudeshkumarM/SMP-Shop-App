import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [adminIdOrEmail, setAdminIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminIdOrEmail || !password) {
      addToast('Please enter Admin ID or Email and Password', 'warning');
      return;
    }

    setLoading(true);
    const result = await login('admin', adminIdOrEmail, password);
    setLoading(false);

    if (result.success) {
      navigate('/admin/dashboard');
    }
  };

  const fillDemoAdmin = () => {
    setAdminIdOrEmail('admin01');
    setPassword('Password123');
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7 col-sm-9">
          <div className="smp-card p-4 p-md-5 bg-white">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-warning text-dark rounded-3 shadow-sm mb-2"
                style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
              >
                <i className="bi bi-shield-check"></i>
              </div>
              <h3 className="fw-bold brand-font mb-1">Admin Management Portal</h3>
              <p className="text-muted small">Daily shop management, inventory, staff, orders & reports</p>
            </div>

            {/* Quick Demo Credentials */}
            <div className="alert alert-warning-subtle text-dark border py-2 px-3 small d-flex justify-content-between align-items-center mb-4 rounded-3">
              <div>
                <span className="fw-bold">Demo Admin:</span>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>admin01 (or admin@smp.com / ADM-101) | Password123</div>
              </div>
              <button
                type="button"
                onClick={fillDemoAdmin}
                className="btn btn-outline-dark btn-sm py-1 px-2"
                style={{ fontSize: '0.75rem' }}
              >
                Auto-Fill
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Username OR Email (or Admin ID)</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="bi bi-person-badge text-secondary"></i></span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin01, admin@smp.com, or ADM-101"
                    className="form-control"
                    value={adminIdOrEmail}
                    onChange={(e) => setAdminIdOrEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold">Admin Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="bi bi-lock text-secondary"></i></span>
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-warning text-dark w-100 py-2 rounded-pill fw-bold mb-3 shadow-sm"
              >
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Login to Admin Console'}
              </button>
            </form>

            <div className="alert alert-light border small text-muted text-center mb-3">
              <i className="bi bi-shield-lock me-1 text-warning"></i>
              Protected enterprise administrative portal. All actions are logged and audited.
            </div>

            <div className="text-center small">
              <Link to="/owner/login" className="text-secondary text-decoration-none">
                Looking for Master Owner Portal? <strong className="text-primary">Click here</strong>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
