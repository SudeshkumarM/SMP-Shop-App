import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="text-center mb-5">
            <span className="badge bg-primary text-white px-3 py-2 rounded-pill fw-bold mb-2">
              ABOUT SMP
            </span>
            <h1 className="display-5 fw-bold brand-font text-white">About SMP</h1>
            <p className="lead text-muted mx-auto" style={{ maxWidth: '700px' }}>
              A modern, robust, and scalable retail operating platform engineered for seamless shopping, high-speed POS billing, and real-time inventory management.
            </p>
          </div>

          <div className="smp-card p-4 p-md-5 mb-4 shadow-sm" style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}>
            <h3 className="fw-bold brand-font mb-3 text-primary">The Vision & Architecture</h3>
            <p className="leading-relaxed" style={{ color: '#CBD5E1' }}>
              SMP was architected from the ground up to solve fragmentation in modern retail. While initially launched as a flagship commerce and Point of Sale solution for apparel and fashion retail, the platform is structured with native multi-tenancy and high-volume scalability.
            </p>
            <p className="leading-relaxed" style={{ color: '#CBD5E1' }}>
              Every database entity — from catalog items, variants, stock logs, customer carts, POS billing terminals, operating expenses, and governance analytics — is explicitly scoped and synchronized in real-time. This ensures zero data leakage and instantaneous inventory reconciliation.
            </p>

            <div className="row g-4 mt-2">
              <div className="col-md-6">
                <div className="p-3 rounded-3 h-100 border" style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}>
                  <h5 className="fw-bold d-flex align-items-center gap-2 text-white">
                    <i className="bi bi-shop text-primary"></i> Multi-Category Scalability
                  </h5>
                  <p className="small text-muted mb-0">
                    Seamlessly manage Clothing, Electronics, Footwear, and Accessories. Every category features customized SKU, barcode, and QR code tracking.
                  </p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 rounded-3 h-100 border" style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}>
                  <h5 className="fw-bold d-flex align-items-center gap-2 text-white">
                    <i className="bi bi-upc-scan text-info"></i> Hardware-Accelerated POS
                  </h5>
                  <p className="small text-muted mb-0">
                    Instant USB keystroke wedge barcode scanning and mobile camera QR scanning support rapid checkouts with zero delay.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Public Engagement Card */}
          <div className="smp-card p-4 p-md-5 text-center shadow-sm" style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}>
            <h3 className="fw-bold brand-font mb-2 text-white">Discover SMP Collections</h3>
            <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '600px' }}>
              Explore our curated clothing collections with live real-time stock availability, fast doorstep delivery, and dedicated customer support.
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Link to="/products" className="btn btn-primary px-4 py-2 rounded-pill fw-bold">
                <i className="bi bi-grid-fill me-2"></i> Browse Products
              </Link>
              <Link to="/contact" className="btn btn-outline-primary px-4 py-2 rounded-pill fw-bold">
                <i className="bi bi-chat-dots-fill me-2"></i> Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
