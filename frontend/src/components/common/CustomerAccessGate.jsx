import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CustomerAccessGate = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    api.get('/settings/customer-system/availability')
      .then((res) => {
        if (active) setSettings(res.data.settings || res.data.customerSystem);
      })
      .catch(() => {
        if (active) setSettings(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="container py-5 text-center text-white">
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        Checking customer system availability...
      </div>
    );
  }

  const unavailable = settings &&
    !['owner', 'admin', 'staff'].includes(user?.role) &&
    (settings.customerSystemEnabled === false || settings.maintenanceMode === true);

  if (!unavailable) return children;

  const title = settings.maintenanceTitle || 'Temporarily Unavailable';
  const reason = settings.maintenanceReason ||
    'Our customer services are temporarily unavailable due to scheduled system maintenance.';

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-9">
          <div className="smp-card p-4 p-md-5 text-center shadow-lg" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-4" style={{ width: '72px', height: '72px', backgroundColor: '#7F1D1D', color: '#FEE2E2' }}>
              <i className="bi bi-tools fs-2"></i>
            </div>
            <h2 className="fw-bold text-white mb-3">{title}</h2>
            <p className="lead mb-2" style={{ color: '#CBD5E1' }}>Our customer services are temporarily unavailable.</p>
            <h6 className="text-white mt-4">Reason for temporary closure:</h6>
            <p className="mb-4" style={{ color: '#CBD5E1' }}>{reason}</p>
            <p className="text-white mb-1">We apologize for the inconvenience.</p>
            <p className="mb-4" style={{ color: '#CBD5E1' }}>Please try again later.<br />Thank you for your understanding.</p>
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <Link to="/" className="btn btn-outline-light rounded-pill px-4">
                <i className="bi bi-house me-2"></i>Back to Home
              </Link>
              <Link to="/contact" className="btn btn-primary rounded-pill px-4">
                <i className="bi bi-headset me-2"></i>Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAccessGate;
