import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(keyword.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const handleLogout = () => {
    const redirectUrl = logout();
    navigate(redirectUrl);
  };

  return (
    <nav className="navbar navbar-expand-lg sticky-top bg-white border-bottom shadow-sm py-2">
      <div className="container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
          <div
            className="d-flex align-items-center justify-content-center bg-primary text-white rounded-3 shadow-sm"
            style={{ width: '40px', height: '40px', fontSize: '1.25rem', fontWeight: 800 }}
          >
            S
          </div>
          <div>
            <div className="brand-font fs-4 text-primary lh-1 tracking-tight" style={{ letterSpacing: '-0.5px' }}>
              SMP
            </div>
            <small className="text-muted fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.8px' }}>
              PREMIUM STORE
            </small>
          </div>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="d-flex flex-grow-1 mx-lg-4 my-2 my-lg-0" style={{ maxWidth: '520px' }}>
          <div className="input-group">
            <input
              type="text"
              className="form-control bg-light border-end-0"
              placeholder="Search for dresses, sarees, kurtis, shirts, brands..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ fontSize: '0.92rem', padding: '10px 14px' }}
            />
            <button className="btn btn-primary px-3" type="submit" aria-label="Search">
              <i className="bi bi-search"></i>
            </button>
          </div>
        </form>

        {/* Mobile Toggle */}
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navigation Items */}
        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-1 gap-lg-3">
            <li className="nav-item">
              <Link to="/products" className="nav-link fw-medium text-dark">
                <i className="bi bi-grid me-1 text-primary"></i> Catalog
              </Link>
            </li>

            <li className="nav-item">
              <Link to="/about" className="nav-link fw-medium text-dark">
                About
              </Link>
            </li>

            <li className="nav-item">
              <Link to="/contact" className="nav-link fw-medium text-dark">
                Contact
              </Link>
            </li>

            {/* Switch Module Dropdown (Customer, Staff, Admin, Owner) */}
            <li className="nav-item dropdown">
              <button
                className="btn btn-outline-secondary btn-sm dropdown-toggle rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-layers text-primary"></i> Switch Module
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2 p-2" style={{ minWidth: '220px' }}>
                <li className="dropdown-header text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>
                  Platform Modules
                </li>
                <li>
                  <Link to="/" className="dropdown-item rounded-2 py-2 d-flex align-items-center gap-2">
                    <span className="badge module-badge-customer p-1"><i className="bi bi-bag"></i></span>
                    <div>
                      <div className="fw-semibold text-dark">Customer Store</div>
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>Shopping & Checkout</small>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link to="/staff/dashboard" className="dropdown-item rounded-2 py-2 d-flex align-items-center gap-2">
                    <span className="badge module-badge-staff p-1"><i className="bi bi-receipt"></i></span>
                    <div>
                      <div className="fw-semibold text-dark">Staff Module</div>
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>POS Billing & Counter</small>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link to="/admin/dashboard" className="dropdown-item rounded-2 py-2 d-flex align-items-center gap-2">
                    <span className="badge module-badge-admin p-1"><i className="bi bi-shield-check"></i></span>
                    <div>
                      <div className="fw-semibold text-dark">Admin Module</div>
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>Shop Inventory & Staff</small>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link to="/owner/dashboard" className="dropdown-item rounded-2 py-2 d-flex align-items-center gap-2">
                    <span className="badge module-badge-owner p-1"><i className="bi bi-briefcase"></i></span>
                    <div>
                      <div className="fw-semibold text-dark">Owner Module</div>
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>Multi-Shop, P&L & Profit</small>
                    </div>
                  </Link>
                </li>
              </ul>
            </li>

            {/* Wishlist Link */}
            {isAuthenticated && user?.role === 'customer' && (
              <li className="nav-item">
                <Link to="/customer/wishlist" className="nav-link text-dark position-relative p-2" title="Wishlist">
                  <i className="bi bi-heart fs-5 text-danger"></i>
                </Link>
              </li>
            )}

            {/* Shopping Cart */}
            <li className="nav-item">
              <Link to="/cart" className="nav-link text-dark position-relative d-flex align-items-center gap-1 p-2">
                <div className="position-relative">
                  <i className="bi bi-cart3 fs-5 text-primary"></i>
                  {itemCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.7rem' }}>
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="fw-semibold d-none d-lg-inline">Cart</span>
              </Link>
            </li>

            {/* User Account / Login */}
            {isAuthenticated ? (
              <li className="nav-item dropdown">
                <button
                  className="btn btn-primary dropdown-toggle rounded-pill px-3 py-1 d-flex align-items-center gap-2"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-person-circle"></i>
                  <span className="fw-medium text-truncate" style={{ maxWidth: '120px' }}>
                    {user.name.split(' ')[0]}
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2 p-2" style={{ minWidth: '220px' }}>
                  <li className="px-3 py-2 border-bottom mb-1">
                    <p className="mb-0 fw-bold text-dark">Welcome {user.name}!</p>
                    <small className="text-muted text-capitalize">{user.role} Account</small>
                  </li>

                  {user.role === 'customer' && (
                    <>
                      <li><Link to="/customer/dashboard" className="dropdown-item py-2"><i className="bi bi-speedometer2 me-2"></i>Dashboard</Link></li>
                      <li><Link to="/customer/orders" className="dropdown-item py-2"><i className="bi bi-box-seam me-2"></i>My Orders</Link></li>
                      <li><Link to="/customer/wishlist" className="dropdown-item py-2"><i className="bi bi-heart me-2"></i>Wishlist</Link></li>
                      <li><Link to="/customer/profile" className="dropdown-item py-2"><i className="bi bi-person me-2"></i>My Profile</Link></li>
                    </>
                  )}
                  {user.role === 'staff' && (
                    <>
                      <li><Link to="/staff/dashboard" className="dropdown-item py-2"><i className="bi bi-speedometer2 me-2"></i>Staff Dashboard</Link></li>
                      <li><Link to="/staff/billing" className="dropdown-item py-2 text-primary fw-bold"><i className="bi bi-receipt me-2"></i>POS Billing</Link></li>
                    </>
                  )}
                  {user.role === 'admin' && (
                    <>
                      <li><Link to="/admin/dashboard" className="dropdown-item py-2"><i className="bi bi-speedometer2 me-2"></i>Admin Dashboard</Link></li>
                      <li><Link to="/admin/products" className="dropdown-item py-2"><i className="bi bi-tags me-2"></i>Products</Link></li>
                      <li><Link to="/admin/reports" className="dropdown-item py-2"><i className="bi bi-graph-up me-2"></i>Reports</Link></li>
                    </>
                  )}
                  {user.role === 'owner' && (
                    <>
                      <li><Link to="/owner/dashboard" className="dropdown-item py-2"><i className="bi bi-speedometer2 me-2"></i>Owner Dashboard</Link></li>
                      <li><Link to="/owner/profits" className="dropdown-item py-2 text-success fw-bold"><i className="bi bi-cash-stack me-2"></i>Profit & Loss</Link></li>
                      <li><Link to="/owner/shops" className="dropdown-item py-2"><i className="bi bi-shop me-2"></i>Multi-Shop</Link></li>
                    </>
                  )}

                  <li><hr className="dropdown-divider my-1" /></li>
                  <li>
                    <button onClick={handleLogout} className="dropdown-item text-danger py-2">
                      <i className="bi bi-box-arrow-right me-2"></i>Logout
                    </button>
                  </li>
                </ul>
              </li>
            ) : (
              <li className="nav-item d-flex gap-2">
                <Link to="/customer/login" className="btn btn-outline-primary btn-sm px-3 rounded-pill fw-medium">
                  Login
                </Link>
                <Link to="/customer/register" className="btn btn-primary btn-sm px-3 rounded-pill fw-medium">
                  Register
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
