import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const AdminHelp = () => {
  const [activeSection, setActiveSection] = useState('staff');

  const topics = [
    { id: 'staff', title: 'Staff Provisioning & Roles', icon: 'bi-people' },
    { id: 'customers', title: 'Customer CRM & Excel Export', icon: 'bi-person-badge' },
    { id: 'products', title: 'Product & Pricing Management', icon: 'bi-tags' },
    { id: 'gst', title: 'GST Settings & Rates', icon: 'bi-percent' },
    { id: 'billing', title: 'Bill Correction & Auditing', icon: 'bi-receipt-cutoff' }
  ];

  return (
    <div className="fade-in">
      <div className="smp-card p-4 p-md-5 mb-4 bg-white">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="bg-warning text-dark p-3 rounded-4 shadow-sm">
            <i className="bi bi-book-half fs-3"></i>
          </div>
          <div>
            <h2 className="fw-bold brand-font mb-1">Admin Operations Manual & System Guide</h2>
            <p className="text-muted mb-0">Complete reference for Staff Provisioning, Customer CRM, Shirt Pricing, GST & Billing Management</p>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-3 col-md-4">
            <div className="list-group shadow-sm border-0 rounded-3">
              {topics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveSection(t.id)}
                  className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-3 ${
                    activeSection === t.id ? 'active bg-warning text-dark border-warning fw-bold' : 'text-dark'
                  }`}
                >
                  <i className={`bi ${t.icon}`}></i>
                  <span>{t.title}</span>
                </button>
              ))}
            </div>

            <div className="card mt-4 border-0 bg-light p-3 text-center rounded-3">
              <i className="bi bi-shield-lock text-warning fs-2 mb-2"></i>
              <div className="fw-bold small">Corporate Governance Line</div>
              <div className="text-muted small">Executive Support (Owner)</div>
              <div className="fw-bold text-dark mt-1">owner@smp.com</div>
            </div>
          </div>

          <div className="col-lg-9 col-md-8">
            <div className="smp-card p-4 bg-white border">
              {activeSection === 'staff' && (
                <div>
                  <h4 className="fw-bold text-dark mb-3"><i className="bi bi-people text-warning me-2"></i>Staff Account Provisioning</h4>
                  <p className="text-muted">Staff accounts can only be provisioned by the Shop Administrator:</p>
                  <ol className="list-group list-group-numbered mb-3">
                    <li className="list-group-item border-0 ps-0">Go to <Link to="/admin/staff" className="fw-semibold text-warning-emphasis">Staff Management</Link> and click <strong>"Create New Staff"</strong>.</li>
                    <li className="list-group-item border-0 ps-0">Assign a unique <strong>Staff ID</strong> (e.g. <code>STF-1003</code>) and unique <strong>Username</strong> (e.g. <code>kumar01</code>).</li>
                    <li className="list-group-item border-0 ps-0">Enter full name, contact email, mobile number, department, and designation.</li>
                    <li className="list-group-item border-0 ps-0">Set an initial temporary password. Staff must change it after their first login.</li>
                    <li className="list-group-item border-0 ps-0">Configure the <strong>"Can Edit Bills"</strong> permission toggle if this cashier is authorized to correct bills.</li>
                  </ol>
                  <div className="alert alert-light border small text-muted">
                    <i className="bi bi-shield-check text-success me-1"></i> Passwords are encrypted with bcrypt prior to saving in MongoDB.
                  </div>
                </div>
              )}

              {activeSection === 'customers' && (
                <div>
                  <h4 className="fw-bold text-dark mb-3"><i className="bi bi-person-badge text-warning me-2"></i>Customer CRM & Excel Data Management</h4>
                  <p className="text-muted">Manage the customer directory, purchase histories, and data exports:</p>
                  <ul className="text-muted small lh-lg">
                    <li><strong>Customer Lookup:</strong> Search by mobile number, customer ID, or full name in <Link to="/admin/customers" className="fw-bold text-dark">Customer Management</Link>.</li>
                    <li><strong>Account Activation / Block:</strong> Deactivate compromised accounts to block checkout and login instantly.</li>
                    <li><strong>Password Reset:</strong> Admins can generate a reset link or temporary password for customers locked out.</li>
                    <li><strong>Excel Export:</strong> Export customer purchase records to an Excel (.xlsx) file with one click for offline loyalty analysis.</li>
                  </ul>
                </div>
              )}

              {activeSection === 'products' && (
                <div>
                  <h4 className="fw-bold text-dark mb-3"><i className="bi bi-tags text-warning me-2"></i>Product & Pricing Management (Shirt Collection)</h4>
                  <p className="text-muted">SMP operates with an initial single-product model centered on the Premium Cotton Shirt:</p>
                  <div className="p-3 border rounded bg-light mb-3">
                    <div className="fw-bold text-dark mb-1">Standard Product Parameters:</div>
                    <ul className="small text-muted mb-0 ps-3">
                      <li><strong>Product Name:</strong> Shirt (editable by Admin & Owner).</li>
                      <li><strong>Selling Price:</strong> Initially ₹500 (Admin can update this price at any time).</li>
                      <li><strong>GST Percentage:</strong> 5% (Configurable).</li>
                      <li><strong>Stock & Inwarding:</strong> Restock or adjust inventory through Purchase Stock Entry in <Link to="/admin/inventory" className="fw-bold text-dark">Inventory Management</Link>.</li>
                      <li><strong>Product Deletion:</strong> Deleting the product will soft-delete it (`isActive: false`), removing it from storefront and POS billing immediately.</li>
                    </ul>
                  </div>
                  <Link to="/admin/products" className="btn btn-warning btn-sm fw-bold px-3">
                    Open Product Management <i className="bi bi-arrow-right ms-1"></i>
                  </Link>
                </div>
              )}

              {activeSection === 'gst' && (
                <div>
                  <h4 className="fw-bold text-dark mb-3"><i className="bi bi-percent text-warning me-2"></i>GST Settings & Tax Compliance</h4>
                  <p className="text-muted">Ensure compliant tax calculation across both online e-commerce and offline POS counters:</p>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <div className="p-3 border rounded bg-light">
                        <div className="fw-bold text-dark mb-1">Intra-State GST (CGST + SGST)</div>
                        <div className="small text-muted">For sales within the state, the 5% tax is split equally into 2.5% CGST and 2.5% SGST on the invoice.</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 border rounded bg-light">
                        <div className="fw-bold text-dark mb-1">Tax-Inclusive Pricing Formula</div>
                        <div className="small text-muted font-monospace">Final Price = Selling Price + ((Selling Price * GST %) / 100)</div>
                      </div>
                    </div>
                  </div>
                  <div className="small text-muted">All calculations are strictly verified server-side on Node.js / Express before invoice persistence.</div>
                </div>
              )}

              {activeSection === 'billing' && (
                <div>
                  <h4 className="fw-bold text-dark mb-3"><i className="bi bi-receipt-cutoff text-warning me-2"></i>Bill Corrections, Deletions & Audit Logs</h4>
                  <p className="text-muted">Admins have complete authority to review, revise, or cancel billing transactions:</p>
                  <div className="p-3 border rounded mb-3 bg-light">
                    <div className="fw-bold text-dark mb-1">Audit Policy:</div>
                    <ul className="small text-muted mb-0 ps-3">
                      <li><strong>Bill Revision:</strong> When a bill is corrected, the previous quantities, subtotal, and tax are archived into the invoice's <code>editHistory</code> array.</li>
                      <li><strong>Bill Cancellation / Deletion:</strong> Deleting a bill restores product inventory stock automatically and tags the invoice as cancelled for auditing.</li>
                      <li><strong>Cashier Tracking:</strong> Every transaction and modification permanently logs the performing Staff or Admin ID.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHelp;
