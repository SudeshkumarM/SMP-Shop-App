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
        { to: '/admin/delivery-settings', icon: 'bi-truck', label: 'Delivery Settings' },
        { to: '/admin/gst-settings', icon: 'bi-file-earmark-ruled', label: 'GST Settings' },
        { to: '/admin/offers', icon: 'bi-whatsapp', label: 'Offers & WhatsApp' },
        { to: '/admin/categories', icon: 'bi-grid-fill', label: 'Categories' },
        { to: '/admin/inventory', icon: 'bi-boxes', label: 'Inventory & Stock' },
        { to: '/admin/orders', icon: 'bi-cart-check-fill', label: 'Order Management' },
        { to: '/admin/reports', icon: 'bi-graph-up-arrow', label: 'Reports & Analytics' },
        { to: '/admin/help', icon: 'bi-book-half', label: 'Admin Help Guide' },
        { to: '/admin/settings', icon: 'bi-gear-fill', label: 'Store Settings' }
      ];
    }

    if (module === 'owner') {
      return [
        { to: '/owner/dashboard', icon: 'bi-pie-chart-fill', label: 'Owner Overview' },
        { to: '/owner/shops', icon: 'bi-shop-window', label: 'Store Management' },
        { to: '/owner/branches', icon: 'bi-building', label: 'Branches' },
        { to: '/owner/admins', icon: 'bi-shield-shaded', label: 'Admin Accounts' },
        { to: '/owner/staff', icon: 'bi-person-workspace', label: 'Staff Management' },
        { to: '/owner/customers', icon: 'bi-people-fill', label: 'Customer Management' },
        { to: '/owner/products', icon: 'bi-tags-fill', label: 'Product Management' },
        { to: '/owner/inventory', icon: 'bi-boxes', label: 'Inventory & Stock' },
        { to: '/owner/categories', icon: 'bi-grid-fill', label: 'Categories' },
        { to: '/owner/billing', icon: 'bi-receipt', label: 'Billing Oversight' },
        { to: '/owner/orders', icon: 'bi-cart-check-fill', label: 'Order Management' },
        { to: '/owner/delivery-settings', icon: 'bi-truck', label: 'Delivery Settings' },
        { to: '/owner/gst-settings', icon: 'bi-file-earmark-ruled', label: 'GST Settings' },
        { to: '/owner/offers', icon: 'bi-whatsapp', label: 'Offers & WhatsApp' },
        { to: '/owner/investments', icon: 'bi-bank', label: 'Investments' },
        { to: '/owner/expenses', icon: 'bi-cash-coin', label: 'Operating Expenses' },
        { to: '/owner/profits', icon: 'bi-currency-rupee', label: 'Profit & Loss (P&L)', badge: 'P&L' },
        { to: '/owner/reports', icon: 'bi-file-earmark-bar-graph-fill', label: 'Master Reports' },
        { to: '/owner/settings', icon: 'bi-sliders', label: 'Master Settings' },
        { to: '/owner/help', icon: 'bi-question-diamond-fill', label: 'Owner Help Manual' }
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
    if (module === 'owner') return 'var(--smp-accent-red)';
    if (module === 'admin') return 'var(--smp-accent-blue)';
    if (module === 'staff') return '#059669';
    return 'var(--smp-accent-blue)';
  };

  return (
    <aside
      className="d-flex flex-column flex-shrink-0 p-3 shadow-sm"
      style={{
        width: '260px',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: 'var(--smp-bg-primary)',
        borderRight: '1px solid var(--smp-border)'
      }}
    >
      {/* User greeting */}
      <div
        className="d-flex align-items-center gap-2 p-2 mb-3 rounded-3"
        style={{
          backgroundColor: 'var(--smp-bg-secondary)',
          border: '1px solid var(--smp-border)'
        }}
      >
        <div
          className="text-white rounded-circle p-2 d-flex align-items-center justify-content-center"
          style={{ width: '36px', height: '36px', backgroundColor: getModuleBadgeColor() }}
        >
          <i className="bi bi-person-fill"></i>
        </div>
        <div className="overflow-hidden">
          <div className="fw-bold text-white text-truncate" style={{ fontSize: '0.9rem' }}>
            {user?.name || 'Authorized User'}
          </div>
          <span
            className="badge text-uppercase px-2 py-1 text-white"
            style={{ fontSize: '0.65rem', backgroundColor: getModuleBadgeColor() }}
          >
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
                  isActive ? 'active shadow-sm' : ''
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--smp-accent-blue)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--smp-text-secondary)',
                fontSize: '0.875rem'
              })}
            >
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${link.icon} fs-6`}></i>
                <span>{link.label}</span>
              </div>
              {link.badge && (
                <span
                  className="badge rounded-pill"
                  style={{
                    fontSize: '0.65rem',
                    backgroundColor: 'var(--smp-accent-red)',
                    color: '#FFFFFF'
                  }}
                >
                  {link.badge}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <hr className="my-3" style={{ borderColor: 'var(--smp-border)' }} />

      {/* Logout button */}
      <div>
        <button
          onClick={handleLogout}
          className="btn btn-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-2"
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
