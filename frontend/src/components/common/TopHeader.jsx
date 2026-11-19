import React from 'react';
import { useAuth } from '../../context/AuthContext';

const TopHeader = ({ title, subtitle, module, onToggleSidebar }) => {
  const { user } = useAuth();

  const getRoleBadgeBg = () => {
    if (module === 'owner') return '#B91C1C';
    if (module === 'admin') return '#2563EB';
    if (module === 'staff') return '#059669';
    return '#2563EB';
  };

  return (
    <header
      className="px-3 px-md-4 py-3 d-flex align-items-center justify-content-between gap-3 shadow-sm"
      style={{
        backgroundColor: 'var(--smp-deep-navy)',
        borderBottom: '1px solid #1E3A70',
        minHeight: '64px'
      }}
    >
      <div className="d-flex align-items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-md-none text-white border-secondary"
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation"
          >
            <i className="bi bi-list fs-5"></i>
          </button>
        )}
        <div>
          <h4 className="mb-0 fw-bold brand-font text-white">{title}</h4>
          {subtitle && <small className="text-muted d-none d-sm-inline">{subtitle}</small>}
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 gap-md-3">
        {/* Active Shop Badge */}
        <div
          className="d-none d-md-flex align-items-center gap-2 px-3 py-1 rounded-pill"
          style={{ backgroundColor: 'var(--smp-bg-surface)', border: '1px solid var(--smp-border)' }}
        >
          <i className="bi bi-shop text-primary"></i>
          <span className="small fw-semibold text-white">
            {user?.shopName || 'SMP Flagship'}
          </span>
          {user?.branchName && (
            <span className="badge rounded-pill text-white" style={{ fontSize: '0.65rem', backgroundColor: '#1E3A70' }}>
              {user.branchName}
            </span>
          )}
        </div>

        {/* Personalized Welcome Banner */}
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold small text-info d-none d-sm-inline">
            Welcome, {user?.name?.split(' ')[0] || 'User'}!
          </span>
          <span
            className="badge text-uppercase px-2 py-1 text-white shadow-xs"
            style={{
              fontSize: '0.7rem',
              backgroundColor: getRoleBadgeBg()
            }}
          >
            {user?.role || module}
          </span>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
