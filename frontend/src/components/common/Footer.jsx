import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer
      className="text-white pt-5 pb-4 mt-auto"
      style={{
        backgroundColor: 'var(--smp-bg-primary)',
        borderTop: '1px solid var(--smp-border)'
      }}
    >
      <div className="container">
        <div className="row g-4">
          {/* Brand & Platform Info */}
          <div className="col-lg-4 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div
                className="text-white rounded p-2 fw-bold fs-5 d-flex align-items-center justify-content-center"
                style={{
                  width: '38px',
                  height: '38px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #B91C1C 100%)'
                }}
              >
                S
              </div>
              <h5 className="mb-0 text-white brand-font">SMP</h5>
            </div>
            <p className="small mb-3" style={{ color: 'var(--smp-text-secondary)', maxWidth: '340px' }}>
              Premium apparel engineered with precision, exceptional cotton fabrics, and tailored comfort. Powered by <strong>SMP</strong>.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <span className="badge" style={{ backgroundColor: 'var(--smp-bg-secondary)', color: 'var(--smp-text-secondary)', border: '1px solid var(--smp-border)' }}>
                100% Cotton
              </span>
              <span className="badge" style={{ backgroundColor: 'var(--smp-bg-secondary)', color: 'var(--smp-text-secondary)', border: '1px solid var(--smp-border)' }}>
                GST Compliant
              </span>
              <span className="badge" style={{ backgroundColor: 'var(--smp-bg-secondary)', color: 'var(--smp-text-secondary)', border: '1px solid var(--smp-border)' }}>
                Fast Express Dispatch
              </span>
            </div>
          </div>

          {/* Customer Navigation */}
          <div className="col-lg-2 col-md-6 col-6">
            <h6 className="text-uppercase fw-bold mb-3 small text-white">Shopping</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2" style={{ color: 'var(--smp-text-secondary)' }}>
              <li><Link to="/products" className="text-decoration-none" style={{ color: 'inherit' }}>Product Catalog</Link></li>
              <li><Link to="/cart" className="text-decoration-none" style={{ color: 'inherit' }}>Shopping Cart</Link></li>
              <li><Link to="/customer/orders" className="text-decoration-none" style={{ color: 'inherit' }}>Order Tracking</Link></li>
              <li><Link to="/customer/wishlist" className="text-decoration-none" style={{ color: 'inherit' }}>Wishlist</Link></li>
            </ul>
          </div>

          {/* Customer Support & Policies */}
          <div className="col-lg-3 col-md-6 col-6">
            <h6 className="text-uppercase fw-bold mb-3 small text-white">Help & Customer Care</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2" style={{ color: 'var(--smp-text-secondary)' }}>
              <li><Link to="/about" className="text-decoration-none" style={{ color: 'inherit' }}>About SMP</Link></li>
              <li><Link to="/contact" className="text-decoration-none" style={{ color: 'inherit' }}>Contact Support</Link></li>
              <li><Link to="/about" className="text-decoration-none" style={{ color: 'inherit' }}>Shipping & Return Policy</Link></li>
              <li><Link to="/about" className="text-decoration-none" style={{ color: 'inherit' }}>Privacy & Terms</Link></li>
            </ul>
          </div>

          {/* Store Headquarters */}
          <div className="col-lg-3 col-md-6">
            <h6 className="text-uppercase fw-bold mb-3 small text-white">Store Headquarters</h6>
            <p className="small mb-2" style={{ color: 'var(--smp-text-secondary)' }}>
              <i className="bi bi-geo-alt me-2 text-primary"></i> 100 Feet Road, Anna Nagar, Chennai, Tamil Nadu - 600040
            </p>
            <p className="small mb-2" style={{ color: 'var(--smp-text-secondary)' }}>
              <i className="bi bi-telephone me-2 text-primary"></i> +91 98400 12345
            </p>
            <p className="small mb-3" style={{ color: 'var(--smp-text-secondary)' }}>
              <i className="bi bi-envelope me-2 text-primary"></i> support@smp.com
            </p>
            <div className="d-flex gap-3 fs-5" style={{ color: 'var(--smp-text-secondary)' }}>
              <a href="#facebook" className="text-decoration-none" style={{ color: 'var(--smp-text-secondary)' }}><i className="bi bi-facebook"></i></a>
              <a href="#instagram" className="text-decoration-none" style={{ color: 'var(--smp-text-secondary)' }}><i className="bi bi-instagram"></i></a>
              <a href="#twitter" className="text-decoration-none" style={{ color: 'var(--smp-text-secondary)' }}><i className="bi bi-twitter-x"></i></a>
              <a href="#whatsapp" className="text-decoration-none" style={{ color: 'var(--smp-text-secondary)' }}><i className="bi bi-whatsapp"></i></a>
            </div>
          </div>
        </div>

        <hr className="my-4" style={{ borderColor: 'var(--smp-border)' }} />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center small gap-2" style={{ color: 'var(--smp-text-secondary)' }}>
          <div>
            &copy; {new Date().getFullYear()} SMP. All rights reserved.
          </div>
          <div className="d-flex gap-3">
            <Link to="/about" className="text-decoration-none" style={{ color: 'inherit' }}>Terms</Link>
            <Link to="/about" className="text-decoration-none" style={{ color: 'inherit' }}>Privacy Policy</Link>
            <Link to="/contact" className="text-decoration-none" style={{ color: 'inherit' }}>Contact Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
