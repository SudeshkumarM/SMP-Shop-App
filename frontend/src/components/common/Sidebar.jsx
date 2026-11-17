import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ module }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    const redirectUrl = logout();
    navigate(redirectUrl);
  };

  const getLinks = () => {
    if (module === 'staff') {
      return [
        { to: '/staff/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
        { to: '/staff/billing', icon: 'bi-receipt-cutoff', label: 'New Billing (POS)', badge: 'Active POS' },
        { to: '/staff/billing-history', icon: 'bi-clock-history', label: 'Billing History' },
        { to: '/staff/customers', icon: 'bi-people', label: 'Customer Directory' },
        { to: '/staff/products', icon: 'bi-upc-scan', label: 'Product Stock Check' },
        { to: '/staff/orders', icon: 'bi-box-seam', label: 'Order Processing' },
        { to: '/staff/profile', icon: 'bi-person-badge', label: 'My Profile' },
        { to: '/staff/help', icon: 'bi-question-diamond', label: 'Help & Manual' }
      ];
    }

    if (module === 'admin') {
      return [
        { to: '/admin/dashboard', icon: 'bi-speedometer2', label: 'Admin Dashboard' },
        { to: '/admin/customers', icon: 'bi-people-fill', label: 'Customer Management' },
        { to: '/admin/staff', icon: 'bi-person-workspace', label: 'Staff Management' },
        { to: '/admin/products', icon: 'bi-tags-fill', label: 'Product Management' },
        { to: '/admin/billing', icon: 'bi-receipt-cutoff', label: 'Billing Management' },
        { to: '/admin/categories', icon: 'bi-grid-fill', label: 'Categories' },
        { to: '/admin/inventory', icon: 'bi-boxes', label: 'Inventory & Stock' },
        { to: '/admin/orders', icon: 'bi-cart-check-fill', label: 'Order Management' },
        { to: '/admin/reports', icon: 'bi-graph-up-arrow', label: 'Reports & Analytics' },
        { to: '/admin/help', icon: 'bi-book-half', label: 'Admin Help Guide' },
        { to: '/admin/settings', icon: 'bi-gear-fill', label: 'Shop Settings' }
      ];
    }

    if (module === 'owner') {
      return [
        { to: '/owner/dashboard', icon: 'bi-pie-chart-fill', label: 'Owner Overview' },
        { to: '/owner/shops', icon: 'bi-shop-window', label: 'Shops Management' },
        { to: '/owner/branches', icon: 'bi-building', label: 'Branches' },
        { to: '/owner/admins', icon: 'bi-shield-shaded', label: 'Admin Accounts' },
        { to: '/owner/billing', icon: 'bi-receipt', label: 'Billing Oversight' },
        { to: '/owner/investments', icon: 'bi-bank', label: 'Investments' },
        { to: '/owner/expenses', icon: 'bi-cash-coin', label: 'Operating Expenses' },
        { to: '/owner/profits', icon: 'bi-currency-rupee', label: 'Profit & Loss (P&L)', badge: 'Financial' },
        { to: '/owner/reports', icon: 'bi-file-earmark-bar-graph-fill', label: 'Master Reports' },
        { to: '/owner/settings', icon: 'bi-sliders', label: 'Master Settings' }
      ];
    }

    // Customer
    return [
      { to: '/customer/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
      { to: '/products', icon: 'bi-shop', label: 'Browse Products' },
      { to: '/customer/orders', icon: 'bi-box-seam', label: 'My Orders' },
      { to: '/customer/wishlist', icon: 'bi-heart', label: 'Wishlist' },
      { to: '/customer/profile', icon: 'bi-person', label: 'Profile & Addresses' },
      { to: '/customer/help', icon: 'bi-question-circle', label: 'Help & Support' }
    ];
  };

  const links = getLinks();

  const getModuleBadgeColor = () => {
    if (module === 'owner') return 'bg-purple text-white';
    if (module === 'admin') return 'bg-warning text-dark';
    if (module === 'staff') return 'bg-success text-white';
    return 'bg-primary text-white';
  };

  return (
    <aside className="d-flex flex-column flex-shrink-0 p-3 bg-white border-end shadow-sm" style={{ width: '260px', minHeight: 'calc(100vh - 64px)' }}>
      {/* User greeting */}
      <div className="d-flex align-items-center gap-2 p-2 mb-3 bg-light rounded-3">
        <div className="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
          <i className="bi bi-person-fill"></i>
        </div>
        <div className="overflow-hidden">
          <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.9rem' }}>
            {user?.name || 'Authorized User'}
          </div>
          <span className={`badge ${getModuleBadgeColor()} text-uppercase px-2 py-1`} style={{ fontSize: '0.65rem' }}>
            {module} Portal
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <ul className="nav nav-pills flex-column mb-auto gap-1">
        {links.map((link) => (
          <li className="nav-item" key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center justify-content-between py-2 px-3 rounded-2 fw-medium ${
                  isActive ? 'active bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
                }`
              }
            >
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${link.icon} fs-6`}></i>
                <span style={{ fontSize: '0.875rem' }}>{link.label}</span>
              </div>
              {link.badge && (
                <span className="badge bg-danger rounded-pill" style={{ fontSize: '0.65rem' }}>
                  {link.badge}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <hr className="my-3 text-muted opacity-25" />

      {/* Logout button */}
      <div>
        <button
          onClick={handleLogout}
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-2"
          style={{ fontSize: '0.85rem' }}
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Logout Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
