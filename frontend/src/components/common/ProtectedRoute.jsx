import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="fw-semibold text-secondary">Verifying Secure Access...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to module-appropriate login page
    if (allowedRoles.includes('owner')) {
      return <Navigate to="/owner/login" state={{ from: location }} replace />;
    }
    if (allowedRoles.includes('admin')) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    if (allowedRoles.includes('staff')) {
      return <Navigate to="/staff/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/customer/login" state={{ from: location }} replace />;
  }

  // Master Owner has super access to all internal resources
  if (user.role === 'owner') {
    return children;
  }

  // Role authorization check
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="container py-5 text-center">
        <div className="smp-card p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-shield-x text-danger display-1 mb-3"></i>
          <h3 className="fw-bold">Access Denied</h3>
          <p className="text-muted">
            Your current account role (<strong>{user.role}</strong>) does not have authorization to view this module.
          </p>
          <div className="mt-4">
            <Navigate to="/" replace />
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
