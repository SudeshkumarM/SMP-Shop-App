import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="text-center mb-5">
            <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill fw-bold mb-2">
              ABOUT SMP
            </span>
            <h1 className="display-5 fw-bold brand-font">SMP Retail System</h1>
            <p className="lead text-muted mx-auto" style={{ maxWidth: '700px' }}>
              A modern, robust, and scalable retail operating system designed for single boutiques today, and multi-shop enterprise shopping malls tomorrow.
            </p>
          </div>

          <div className="smp-card p-4 p-md-5 mb-4">
            <h3 className="fw-bold brand-font mb-3 text-primary">The Vision & Architecture</h3>
            <p className="text-secondary leading-relaxed">
              SMP was architected from the ground up to solve the fragmentation in modern retail. While initially launched as a flagship <strong>Dress & Apparel</strong> commerce and Point of Sale solution for <strong>SMP Elite Fashions</strong>, the platform is structured with native multi-tenancy.
            </p>
            <p className="text-secondary leading-relaxed">
              Every database entity — from catalog items, variants, stock logs, customer carts, POS billing terminals, operating expenses, and owner investments — is explicitly scoped by <code>shopId</code> and <code>branchId</code>. This ensures zero data leakage between different retail shops while giving the Master Owner total corporate governance across the entire mall.
            </p>

            <div className="row g-4 mt-2">
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 h-100">
                  <h5 className="fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-shop text-primary"></i> Multi-Shop Scalability
                  </h5>
                  <p className="small text-muted mb-0">
                    Seamlessly expand to Electronics, Groceries, Footwear, and Accessories shops. Each shop gets its own isolated admin, staff, POS terminals, and profit centers.
                  </p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 h-100">
                  <h5 className="fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-calculator text-success"></i> True Mathematical P&L
                  </h5>
                  <p className="small text-muted mb-0">
                    Gross profit is accurately derived from Revenue minus Cost of Goods Sold (COGS). Net profit accounts for store rent, employee payroll, electricity, and marketing expenses.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="smp-card p-4 p-md-5 text-center bg-primary text-white">
            <h3 className="fw-bold brand-font mb-2">Explore the Four Modules</h3>
            <p className="text-light mb-4">
              Switch seamlessly between Customer Store, Staff POS, Admin Console, and Owner Governance.
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Link to="/" className="btn btn-light fw-bold px-4 rounded-pill">Customer Store</Link>
              <Link to="/staff/login" className="btn btn-outline-light fw-bold px-4 rounded-pill">Staff POS</Link>
              <Link to="/admin/login" className="btn btn-outline-light fw-bold px-4 rounded-pill">Admin Management</Link>
              <Link to="/owner/login" className="btn btn-warning text-dark fw-bold px-4 rounded-pill">Owner Hub</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
