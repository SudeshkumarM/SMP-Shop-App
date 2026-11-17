import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-dark text-white pt-5 pb-4 mt-auto">
      <div className="container">
        <div className="row g-4">
          {/* Brand & Platform Info */}
          <div className="col-lg-4 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="bg-primary text-white rounded p-2 fw-bold fs-5">SMP</div>
              <h5 className="mb-0 text-white brand-font">Shop Management Platform</h5>
            </div>
            <p className="text-secondary small mb-3">
              Next-generation scalable retail operating system and e-commerce platform. Initially powering <strong>SMP Elite Fashions</strong>, engineered for complete shopping mall and multi-shop expansion.
            </p>
            <div className="d-flex gap-2">
              <span className="badge bg-secondary">GST Compliant</span>
              <span className="badge bg-secondary">POS Enabled</span>
              <span className="badge bg-secondary">Multi-Shop</span>
            </div>
          </div>

          {/* Quick Shopping Links */}
          <div className="col-lg-2 col-md-6 col-6">
            <h6 className="text-uppercase text-white-50 fw-bold mb-3 small">Shop Categories</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-secondary">
              <li><Link to="/products?category=womens-ethnic" className="text-secondary text-decoration-none">Women's Ethnic Sarees</Link></li>
              <li><Link to="/products?category=mens-wear" className="text-secondary text-decoration-none">Men's Formal Shirts</Link></li>
              <li><Link to="/products?category=womens-western" className="text-secondary text-decoration-none">Casual Maxi Dresses</Link></li>
              <li><Link to="/products?category=kids-festive" className="text-secondary text-decoration-none">Kids Festive Wear</Link></li>
              <li><Link to="/products?category=accessories" className="text-secondary text-decoration-none">Dupattas & Stoles</Link></li>
            </ul>
          </div>

          {/* Business Modules */}
          <div className="col-lg-3 col-md-6 col-6">
            <h6 className="text-uppercase text-white-50 fw-bold mb-3 small">SMP Enterprise Portals</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-secondary">
              <li><Link to="/staff/login" className="text-secondary text-decoration-none"><i className="bi bi-receipt me-1"></i>Staff POS & Billing Counter</Link></li>
              <li><Link to="/admin/login" className="text-secondary text-decoration-none"><i className="bi bi-shield-lock me-1"></i>Admin Shop Management</Link></li>
              <li><Link to="/owner/login" className="text-secondary text-decoration-none"><i className="bi bi-briefcase me-1"></i>Owner Multi-Store & Profit Hub</Link></li>
              <li><Link to="/customer/login" className="text-secondary text-decoration-none"><i className="bi bi-person me-1"></i>Customer Portal</Link></li>
              <li><Link to="/about" className="text-secondary text-decoration-none"><i className="bi bi-info-circle me-1"></i>Architecture & Scalability</Link></li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="col-lg-3 col-md-6">
            <h6 className="text-uppercase text-white-50 fw-bold mb-3 small">Store Headquarters</h6>
            <p className="small text-secondary mb-2">
              <i className="bi bi-geo-alt me-2 text-primary"></i> 100 Feet Road, Anna Nagar, Chennai, Tamil Nadu - 600040
            </p>
            <p className="small text-secondary mb-2">
              <i className="bi bi-telephone me-2 text-primary"></i> +91 98400 12345
            </p>
            <p className="small text-secondary mb-3">
              <i className="bi bi-envelope me-2 text-primary"></i> support@smpshop.com
            </p>
            <div className="d-flex gap-3 fs-5 text-white-50">
              <a href="#facebook" className="text-white-50"><i className="bi bi-facebook"></i></a>
              <a href="#instagram" className="text-white-50"><i className="bi bi-instagram"></i></a>
              <a href="#twitter" className="text-white-50"><i className="bi bi-twitter-x"></i></a>
              <a href="#linkedin" className="text-white-50"><i className="bi bi-linkedin"></i></a>
            </div>
          </div>
        </div>

        <hr className="my-4 border-secondary opacity-25" />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center small text-secondary gap-2">
          <div>
            &copy; {new Date().getFullYear()} SMP (Shop Management Platform). All rights reserved.
          </div>
          <div className="d-flex gap-3">
            <Link to="/about" className="text-secondary text-decoration-none">Terms</Link>
            <Link to="/about" className="text-secondary text-decoration-none">Privacy Policy</Link>
            <Link to="/contact" className="text-secondary text-decoration-none">Contact Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
