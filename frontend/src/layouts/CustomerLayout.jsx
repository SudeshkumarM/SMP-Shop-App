import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Sidebar from '../components/common/Sidebar';
import { useCart } from '../context/CartContext';

const CustomerLayout = () => {
  const { itemCount } = useCart();

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: 'var(--smp-bg-primary)' }}>
      <Navbar />
      <div className="container py-4 flex-grow-1 customer-layout-content">
        <div className="row g-4">
          <div className="col-lg-3 d-none d-lg-block">
            <div className="sticky-top" style={{ top: '80px', zIndex: 10 }}>
              <Sidebar module="customer" />
            </div>
          </div>
          <div className="col-lg-9 col-12">
            <Outlet />
          </div>
        </div>
      </div>
      <Footer />
      <nav className="customer-mobile-nav d-lg-none" aria-label="Customer navigation">
        <NavLink to="/customer/dashboard" end className={({ isActive }) => `customer-mobile-nav-link${isActive ? ' active' : ''}`}>
          <i className="bi bi-house-door"></i><span>Home</span>
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => `customer-mobile-nav-link${isActive ? ' active' : ''}`}>
          <i className="bi bi-shop"></i><span>Shop</span>
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => `customer-mobile-nav-link${isActive ? ' active' : ''}`}>
          <span className="customer-mobile-nav-icon">
            <i className="bi bi-bag"></i>
            {itemCount > 0 && <span className="customer-mobile-nav-badge">{itemCount}</span>}
          </span>
          <span>Cart</span>
        </NavLink>
        <NavLink to="/customer/orders" className={({ isActive }) => `customer-mobile-nav-link${isActive ? ' active' : ''}`}>
          <i className="bi bi-box-seam"></i><span>Orders</span>
        </NavLink>
        <NavLink to="/customer/profile" className={({ isActive }) => `customer-mobile-nav-link${isActive ? ' active' : ''}`}>
          <i className="bi bi-person"></i><span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default CustomerLayout;
