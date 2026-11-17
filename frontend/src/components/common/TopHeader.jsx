import React from 'react';
import { useAuth } from '../../context/AuthContext';

const TopHeader = ({ title, subtitle, module }) => {
  const { user } = useAuth();

  const getRoleBadge = () => {
    if (module === 'owner') return 'text-white border border-danger';
    if (module === 'admin') return 'text-white border border-primary';
    if (module === 'staff') return 'text-white border border-success';
    return 'text-white';
  };

  const getRoleBadgeBg = () => {
    if (module === 'owner') return 'var(--smp-accent-red)';
    if (module === 'admin') return 'var(--smp-accent-blue)';
    if (module === 'staff') return '#059669';
    return 'var(--smp-accent-blue)';
  };

  return (
    <header
      className="px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3 shadow-sm"
      style={{
        backgroundColor: 'var(--smp-bg-primary)',
        borderBottom: '1px solid var(--smp-border)'
      }}
    >
      <div>
        <h4 className="mb-0 fw-bold brand-font text-white">{title}</h4>
        {subtitle && <small style={{ color: 'var(--smp-text-secondary)' }}>{subtitle}</small>}
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* Active Shop Badge */}
        <div
          className="d-none d-md-flex align-items-center gap-2 px-3 py-1 rounded-pill"
          style={{
            backgroundColor: 'var(--smp-bg-secondary)',
            border: '1px solid var(--smp-border)'
          }}
        >
          <i className="bi bi-shop" style={{ color: 'var(--smp-accent-blue)' }}></i>
          <span className="small fw-semibold text-white">
            {user?.shopName || 'SMP Flagship'}
          </span>
          {user?.branchName && (
            <span className="badge rounded-pill" style={{ backgroundColor: 'var(--smp-bg-card)', color: 'var(--smp-text-secondary)', fontSize: '0.65rem' }}>
              {user.branchName}
            </span>
          )}
        </div>

        {/* Personalized Welcome Banner */}
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold" style={{ color: 'var(--smp-accent-blue)' }}>
            Welcome, {user?.name?.split(' ')[0] || 'User'}!
          </span>
          <span
            className={`badge text-uppercase px-2 py-1 ${getRoleBadge()}`}
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
