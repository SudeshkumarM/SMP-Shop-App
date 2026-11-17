import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const StaffLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [staffIdOrEmail, setStaffIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffIdOrEmail || !password) {
      addToast('Please enter Staff ID or Email and Password', 'warning');
      return;
    }

    setLoading(true);
    const result = await login('staff', staffIdOrEmail, password);
    setLoading(false);

    if (result.success) {
      navigate('/staff/dashboard');
    }
  };

  const fillDemoStaff = () => {
    setStaffIdOrEmail('kumar01');
    setPassword('Password123');
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7 col-sm-9">
          <div className="smp-card p-4 p-md-5 bg-white">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-3 shadow-sm mb-2"
                style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
              >
                <i className="bi bi-receipt"></i>
              </div>
              <h3 className="fw-bold brand-font mb-1">Staff & POS Terminal Login</h3>
              <p className="text-muted small">Access Point of Sale billing counter & inventory check</p>
            </div>

            {/* Note & Demo Credentials */}
            <div className="alert alert-success-subtle text-dark border py-2 px-3 small d-flex justify-content-between align-items-center mb-4 rounded-3">
              <div>
                <span className="fw-bold">Demo Staff:</span>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>kumar01 (or staff@smp.com) | Password123</div>
              </div>
              <button
                type="button"
                onClick={fillDemoStaff}
                className="btn btn-outline-success btn-sm py-1 px-2"
                style={{ fontSize: '0.75rem' }}
              >
                Auto-Fill
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Username OR Email (or Staff ID)</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="bi bi-person-badge text-secondary"></i></span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kumar01, staff@smp.com, or STF-1001"
                    className="form-control"
                    value={staffIdOrEmail}
                    onChange={(e) => setStaffIdOrEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold">Staff Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="bi bi-lock text-secondary"></i></span>
                  <input
                    type="password"
                    required
                    placeholder="Enter assigned password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3 shadow-sm"
              >
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Login to Staff Terminal'}
              </button>
            </form>

            <div className="alert alert-light border small text-muted text-center mb-3">
              <i className="bi bi-info-circle me-1 text-primary"></i>
              No public staff registration. Staff accounts are provisioned exclusively by Shop Admin.
            </div>

            <div className="text-center small">
              <Link to="/customer/login" className="text-secondary text-decoration-none">
                <i className="bi bi-arrow-left me-1"></i> Return to Customer Store
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
