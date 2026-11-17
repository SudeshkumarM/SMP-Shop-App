import React from 'react';
import { useAuth } from '../../context/AuthContext';

const TopHeader = ({ title, subtitle, module }) => {
  const { user } = useAuth();

  const getRoleBadge = () => {
    if (module === 'owner') return 'bg-dark text-warning border border-warning';
    if (module === 'admin') return 'bg-warning text-dark';
    if (module === 'staff') return 'bg-success text-white';
    return 'bg-primary text-white';
  };

  return (
    <header className="bg-white border-bottom shadow-sm px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
      <div>
        <h4 className="mb-0 fw-bold brand-font text-dark">{title}</h4>
        {subtitle && <small className="text-muted">{subtitle}</small>}
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* Active Shop Badge */}
        <div className="d-none d-md-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill border">
          <i className="bi bi-shop text-primary"></i>
          <span className="small fw-semibold text-secondary">
            {user?.shopName || 'SMP Elite Fashions'}
          </span>
          {user?.branchName && (
            <span className="badge bg-secondary text-white rounded-pill" style={{ fontSize: '0.65rem' }}>
              {user.branchName}
            </span>
          )}
        </div>

        {/* Personalized Welcome Banner */}
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold text-primary">
            Welcome {user?.name?.split(' ')[0] || 'User'}!
          </span>
          <span className={`badge ${getRoleBadge()} text-uppercase px-2 py-1`} style={{ fontSize: '0.7rem' }}>
            {user?.role || module}
          </span>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
