import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const CustomerVerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loadUser } = useAuth();
  const { addToast } = useToast();

  const phone = location.state?.phone || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      addToast('Please enter the 6-digit OTP', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/customer/register-verify', {
        ...location.state,
        otp
      });

      if (res.data.success) {
        addToast(res.data.message || 'OTP verified successfully!', 'success');
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
      addToast(err.response?.data?.message || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-md-5 col-sm-8">
          <div className="smp-card p-4 p-md-5 text-center bg-white">
            <div className="bg-primary-subtle text-primary rounded-circle d-inline-flex p-3 mb-3">
              <i className="bi bi-shield-check fs-1"></i>
            </div>
            <h3 className="fw-bold brand-font mb-1">Verify Mobile OTP</h3>
            <p className="small text-muted mb-4">
              Enter the 6-digit verification code sent to your registered phone number {phone && <strong>(+91 {phone})</strong>}.
            </p>

            <form onSubmit={handleVerify}>
              <div className="mb-4 d-flex justify-content-center">
                <input
                  type="text"
                  maxLength="6"
                  required
                  placeholder="• • • • • •"
                  className="form-control text-center fs-3 fw-bold"
                  style={{ width: '220px', letterSpacing: '8px' }}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="btn btn-primary w-100 py-2 rounded-pill fw-bold mb-3"
              >
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Verify & Continue'}
              </button>
            </form>

            <div className="small text-muted mt-3">
              <Link to="/customer/register" className="text-secondary text-decoration-none">
                <i className="bi bi-arrow-left me-1"></i> Back to Registration
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerVerifyOtp;
