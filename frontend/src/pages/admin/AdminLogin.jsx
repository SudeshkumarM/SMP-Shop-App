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
    if (!adminIdOrEmail.trim() || !password) {
      addToast('Please enter Admin ID or Email and Password', 'warning');
      return;
    }

    setLoading(true);
    const result = await login('admin', adminIdOrEmail.trim(), password);
    setLoading(false);

    if (result.success) {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7 col-sm-9">
          <div className="smp-card p-4 p-md-5 shadow-lg" style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}>
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center text-white rounded-3 shadow mb-2"
                style={{ width: '48px', height: '48px', fontSize: '1.4rem', backgroundColor: '#0F172A', border: '1px solid #334155' }}
              >
                <i className="bi bi-shield-check text-primary"></i>
              </div>
              <h3 className="fw-bold brand-font mb-1 text-white">Admin Management Portal</h3>
              <p className="text-muted small">Store operations, inventory, staff, orders & reports</p>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">Username, Email, or Admin ID</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-person-badge text-secondary"></i></span>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Enter admin username, email or ID"
                    className="form-control"
                    value={adminIdOrEmail}
                    onChange={(e) => setAdminIdOrEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-semibold text-white mb-0">Admin Password</label>
                  <Link to="/forgot-password" className="small text-info text-decoration-none fw-medium">
                    Forgot Password?
                  </Link>
                </div>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock text-secondary"></i></span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3 shadow"
              >
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Login to Admin Console'}
              </button>
            </form>

            <div className="alert p-3 rounded-3 small text-center mb-0" style={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#94A3B8' }}>
              <i className="bi bi-shield-lock me-1 text-primary"></i>
              Protected enterprise administrative console. All actions are logged.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;