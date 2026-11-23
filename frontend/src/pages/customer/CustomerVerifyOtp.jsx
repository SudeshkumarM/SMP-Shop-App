import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const CustomerVerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState(location.state?.registrationSuccess || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email) navigate('/customer/register', { replace: true });
  }, [email, navigate]);

  const verify = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/customer/verify-email', { email, code });
      if (res.data.success) {
        navigate('/customer/login', {
          replace: true,
          state: { registrationSuccess: 'Email verified successfully. You can now sign in.' }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Email verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError('');
    try {
      const res = await api.post('/auth/customer/resend-verification', { email });
      setMessage(res.data.message || 'A new verification code was sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend the verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7">
          <div className="smp-card p-4 p-md-5" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <h3 className="fw-bold text-white text-center mb-3">Verify Your Email</h3>
            {message && <div className="alert alert-success" role="status">{message}</div>}
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <p className="small text-center mb-4" style={{ color: '#CBD5E1' }}>
              Enter the 6-digit code sent to <strong>{email}</strong>.
            </p>
            <form onSubmit={verify}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                className="form-control form-control-lg text-center mb-3"
                style={{ letterSpacing: '8px', fontWeight: 'bold' }}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
            <button type="button" className="btn btn-link w-100 mt-3 text-info" onClick={resend} disabled={resending}>
              {resending ? 'Sending...' : 'Resend verification code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerVerifyOtp;
