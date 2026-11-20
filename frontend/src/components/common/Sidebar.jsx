import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ module, mobileOpen = false, onClose }) => {
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
        { to: '/admin/complete-bill-history', icon: 'bi-journal-text', label: 'Complete Bill History', badge: 'History' },
        { to: '/admin/barcodes', icon: 'bi-upc', label: 'Barcode Management' },
        { to: '/admin/qr-codes', icon: 'bi-qr-code-scan', label: 'QR Code Management' },
        { to: '/admin/scanner-settings', icon: 'bi-upc-scan', label: 'Scanner Settings' },
        { to: '/admin/categories', icon: 'bi-grid-fill', label: 'Category Taxonomy' },
        { to: '/admin/products', icon: 'bi-tags-fill', label: 'Product Catalog' },
        { to: '/admin/inventory', icon: 'bi-boxes', label: 'Inventory & Stock' },
        { to: '/admin/billing', icon: 'bi-receipt-cutoff', label: 'Billing Counter' },
        { to: '/admin/customers', icon: 'bi-people-fill', label: 'Customer Management' },
        { to: '/admin/staff', icon: 'bi-person-workspace', label: 'Staff Management' },
        { to: '/admin/orders', icon: 'bi-cart-check-fill', label: 'Order Management' },
        { to: '/admin/whatsapp-settings', icon: 'bi-whatsapp', label: 'WhatsApp Settings' },
        { to: '/admin/delivery-settings', icon: 'bi-truck', label: 'Delivery Settings' },
        { to: '/admin/gst-settings', icon: 'bi-file-earmark-ruled', label: 'GST Settings' },
        { to: '/admin/offers', icon: 'bi-megaphone-fill', label: 'Offers & Campaigns' },
        { to: '/admin/reports', icon: 'bi-graph-up-arrow', label: 'Reports & Analytics' },
        { to: '/admin/help', icon: 'bi-book-half', label: 'Admin Help Guide' },
        { to: '/admin/settings', icon: 'bi-gear-fill', label: 'Store Settings' }
      ];
    }

    if (module === 'owner') {
      return [
        { to: '/owner/dashboard', icon: 'bi-pie-chart-fill', label: 'Owner Overview' },
        { to: '/owner/complete-bill-history', icon: 'bi-journal-text', label: 'Complete Bill History', badge: 'Audit' },
        { to: '/owner/barcodes', icon: 'bi-upc', label: 'Barcode Management' },
        { to: '/owner/qr-codes', icon: 'bi-qr-code-scan', label: 'QR Code Management' },
        { to: '/owner/scanner-settings', icon: 'bi-upc-scan', label: 'Scanner Settings' },
        { to: '/owner/categories', icon: 'bi-grid-fill', label: 'Category Taxonomy' },
        { to: '/owner/shops', icon: 'bi-shop-window', label: 'Store Management' },
        { to: '/owner/branches', icon: 'bi-building', label: 'Branches' },
        { to: '/owner/admins', icon: 'bi-shield-shaded', label: 'Admin Accounts' },
        { to: '/owner/staff', icon: 'bi-person-workspace', label: 'Staff Oversight' },
        { to: '/owner/customers', icon: 'bi-people-fill', label: 'Customer Accounts' },
        { to: '/owner/products', icon: 'bi-tags-fill', label: 'Product Catalog' },
        { to: '/owner/inventory', icon: 'bi-boxes', label: 'Inventory & Stock' },
        { to: '/owner/billing', icon: 'bi-receipt', label: 'Billing Oversight' },
        { to: '/owner/orders', icon: 'bi-cart-check-fill', label: 'Order Management' },
        { to: '/owner/whatsapp-settings', icon: 'bi-whatsapp', label: 'WhatsApp Gateway' },
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
    if (module === 'owner') return '#B91C1C';
    if (module === 'admin') return '#2563EB';
    if (module === 'staff') return '#059669';
    return '#2563EB';
  };

  return (
    <aside
      className={`d-flex flex-column flex-shrink-0 p-3 shadow-sm ${module === 'customer' ? 'customer-sidebar' : 'portal-sidebar'} ${mobileOpen ? 'portal-sidebar-open' : ''}`}
      style={{
        width: '260px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--smp-deep-navy)',
        borderRight: '1px solid #1E3A70',
        zIndex: 1040
      }}
    >
      {/* Brand & Mobile Close */}
      <div className="d-flex align-items-center justify-content-between mb-3 px-1">
        <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
          <div
            className="d-flex align-items-center justify-content-center text-white rounded-3 shadow-xs"
            style={{ width: '32px', height: '32px', fontWeight: 800, background: '#2563EB' }}
          >
            S
          </div>
          <span className="brand-font fs-5 text-white fw-bold tracking-tight">SMP</span>
        </Link>
        {onClose && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-lg-none text-white border-0"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        )}
      </div>

      {/* User greeting */}
      <div
        className="d-flex align-items-center gap-2 p-2 mb-3 rounded-3"
        style={{
          backgroundColor: 'var(--smp-bg-surface)',
          border: '1px solid var(--smp-border)'
        }}
      >
        <div
          className="text-white rounded-circle p-2 d-flex align-items-center justify-content-center"
          style={{ width: '34px', height: '34px', backgroundColor: getModuleBadgeColor() }}
        >
          <i className="bi bi-person-fill"></i>
        </div>
        <div className="overflow-hidden">
          <div className="fw-bold text-white text-truncate" style={{ fontSize: '0.85rem' }}>
            {user?.name || 'Authorized User'}
          </div>
          <span
            className="badge text-uppercase px-2 py-0 text-white"
            style={{ fontSize: '0.62rem', backgroundColor: getModuleBadgeColor() }}
          >
            {module} Portal
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <ul className="nav nav-pills flex-column mb-auto gap-1" style={{ overflowY: 'auto', flex: 1 }}>
        {links.map((link) => (
          <li className="nav-item" key={link.to}>
            <NavLink
              to={link.to}
              onClick={() => { if (onClose) onClose(); }}
              className={({ isActive }) =>
                `nav-link sidebar-link d-flex align-items-center justify-content-between py-2 px-3 rounded-2 fw-medium ${
                  isActive ? 'active' : ''
                }`
              }
              style={{ fontSize: '0.84rem' }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${link.icon} fs-6`}></i>
                <span>{link.label}</span>
              </div>
              {link.badge && (
                <span
                  className="badge rounded-pill"
                  style={{
                    fontSize: '0.62rem',
                    backgroundColor: '#2563EB',
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

      <hr className="my-2" style={{ borderColor: '#1E3A70' }} />

      {/* Logout button */}
      <div>
        <button
          onClick={handleLogout}
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-2"
          style={{ fontSize: '0.82rem' }}
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Logout Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;