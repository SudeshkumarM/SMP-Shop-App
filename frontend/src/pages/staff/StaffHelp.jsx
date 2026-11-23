import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const StaffHelp = () => {
  const [activeSection, setActiveSection] = useState('billing');

  const topics = [
    { id: 'billing', title: 'POS Billing Instructions', icon: 'bi-calculator' },
    { id: 'login', title: 'Staff Login Help', icon: 'bi-box-arrow-in-right' },
    { id: 'printing', title: 'Invoice Printing & PDF', icon: 'bi-printer' },
    { id: 'availability', title: 'Product Availability Check', icon: 'bi-box-seam' },
    { id: 'password', title: 'Password Problems', icon: 'bi-key' },
    { id: 'admin', title: 'Contact Shop Admin', icon: 'bi-shield-person' }
  ];

  return (
    <div className="fade-in">
      <div className="smp-card p-4 p-md-5 mb-4 bg-white">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="bg-success text-white p-3 rounded-4 shadow-sm">
            <i className="bi bi-question-diamond-fill fs-3"></i>
          </div>
          <div>
            <h2 className="fw-bold brand-font mb-1">Staff Terminal Help & Operating Manual</h2>
            <p className="text-muted mb-0">POS Counter Guidelines, Billing Steps, Thermal Printing & Admin Support</p>
          </div>
        </div>

        <div className="row g-4">
          {/* Navigation */}
          <div className="col-lg-3 col-md-4">
            <div className="list-group shadow-sm border-0 rounded-3">
              {topics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveSection(t.id)}
                  className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-3 ${
                    activeSection === t.id ? 'active bg-success border-success fw-semibold' : 'text-dark'
                  }`}
                >
                  <i className={`bi ${t.icon}`}></i>
                  <span>{t.title}</span>
                </button>
              ))}
            </div>

            <div className="card mt-4 border-0 bg-light p-3 text-center rounded-3">
              <i className="bi bi-headset text-success fs-2 mb-2"></i>
              <div className="fw-bold small">Counter Supervisor Line</div>
              <div className="text-muted small">Intercom Ext. 104</div>
              <div className="fw-bold text-success mt-1">+91 98400 23456</div>
            </div>
          </div>

          {/* Content */}
          <div className="col-lg-9 col-md-8">
            <div className="smp-card p-4 bg-white border">
              {activeSection === 'billing' && (
                <div>
                  <h4 className="fw-bold text-success mb-3"><i className="bi bi-calculator me-2"></i>Point of Sale (POS) Billing Instructions</h4>
                  <p className="text-muted">Follow these high-speed counter billing procedures for every customer walk-in:</p>
                  <ol className="list-group list-group-numbered mb-4">
                    <li className="list-group-item border-0 ps-0">
                      <strong>Open POS Billing:</strong> Navigate to <Link to="/staff/billing" className="text-success fw-semibold">New Billing</Link> in the sidebar.
                    </li>
                    <li className="list-group-item border-0 ps-0">
                      <strong>Add Product / Scan Barcode:</strong> Focus the Barcode / SKU field and scan a saved product label, enter its saved code, or find it in the catalog.
                    </li>
                    <li className="list-group-item border-0 ps-0">
                      <strong>Adjust Quantity:</strong> Enter the quantity purchased. The system automatically verifies that available stock is sufficient.
                    </li>
                    <li className="list-group-item border-0 ps-0">
                      <strong>Select / Quick-Add Customer:</strong> Enter customer phone number or name for loyalty point credit.
                    </li>
                    <li className="list-group-item border-0 ps-0">
                      <strong>Apply Counter Discount (Optional):</strong> Select Flat (₹) or Percentage (%) discount if an authorized offer applies.
                    </li>
                    <li className="list-group-item border-0 ps-0">
                      <strong>Collect Payment & Complete:</strong> Select Cash, Card, Manual UPI, or the Owner-configured UPI QR. Confirm actual receipt; for UPI, enter the transaction reference. A displayed or scanned QR alone is not payment confirmation.
                    </li>
                  </ol>
                  <div className="alert alert-success-subtle text-dark border py-2 small">
                    <i className="bi bi-shield-check text-success me-1"></i> Stock is atomically deducted from MongoDB the moment payment is verified.
                  </div>
                </div>
              )}

              {activeSection === 'login' && (
                <div>
                  <h4 className="fw-bold text-success mb-3"><i className="bi bi-box-arrow-in-right me-2"></i>Staff Login Guidelines</h4>
                  <p className="text-muted">Staff accounts are created exclusively by the Shop Admin. There is no public registration.</p>
                  <div className="alert alert-light border small text-muted mb-3">
                    <div className="fw-bold text-dark mb-1">Your Login Credentials:</div>
                    <ul className="mb-0 ps-3">
                      <li><strong>Username:</strong> Individual staff username assigned by Admin (e.g. <code>kumar01</code>, <code>staff02</code>).</li>
                      <li><strong>Alternative Login:</strong> You can also log in with your official staff email or Staff ID (e.g. <code>STF-1001</code>).</li>
                      <li><strong>Password:</strong> Your initial temporary password provided by Admin (must be changed upon first login).</li>
                    </ul>
                  </div>
                  <p className="small text-muted">If you enter an incorrect username or password, you will see <em>"Invalid Username/Email or Password."</em></p>
                </div>
              )}

              {activeSection === 'printing' && (
                <div>
                  <h4 className="fw-bold text-success mb-3"><i className="bi bi-printer me-2"></i>Invoice Printing & PDF Downloads</h4>
                  <p className="text-muted">SMP generates professional, GST-compliant tax invoices for every retail counter sale:</p>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <div className="p-3 border rounded bg-light">
                        <div className="fw-bold text-dark mb-1"><i className="bi bi-receipt text-success me-2"></i>Thermal Receipt Printer</div>
                        <div className="small text-muted">Click <strong>"Print Invoice"</strong> on any bill to open the browser print dialog formatted for 80mm or standard receipt paper.</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 border rounded bg-light">
                        <div className="fw-bold text-dark mb-1"><i className="bi bi-file-earmark-pdf text-danger me-2"></i>Download PDF</div>
                        <div className="small text-muted">Click <strong>"Download PDF"</strong> to generate a formatted PDF tax invoice with barcode, shop GSTIN, and breakdown.</div>
                      </div>
                    </div>
                  </div>
                  <p className="small text-muted">To reprint an invoice, visit <Link to="/staff/billing-history" className="text-success fw-bold">Billing History</Link> and click the print icon on the corresponding row.</p>
                </div>
              )}

              {activeSection === 'availability' && (
                <div>
                  <h4 className="fw-bold text-success mb-3"><i className="bi bi-box-seam me-2"></i>Real-time Product Availability</h4>
                  <p className="text-muted">Always check product availability when assisting floor customers:</p>
                  <div className="p-3 border rounded mb-3 bg-light">
                    <div className="fw-bold text-dark mb-1">Product View Terminal:</div>
                    <div className="small text-muted mb-2">Visit <Link to="/staff/products" className="text-success fw-bold">Product View</Link> to inspect:</div>
                    <ul className="small text-muted mb-0 ps-3">
                      <li>Real-time stock count for the Shirt.</li>
                      <li>Current Selling Price (₹500) and GST rate (5%).</li>
                      <li>Sizes currently in stock (S, M, L, XL, XXL).</li>
                      <li>Low stock warnings when available count drops below threshold.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeSection === 'password' && (
                <div>
                  <h4 className="fw-bold text-success mb-3"><i className="bi bi-key me-2"></i>Password Problems & Account Access</h4>
                  <p className="text-muted">Keep your staff account credentials confidential:</p>
                  <ul className="text-muted small lh-lg">
                    <li><strong>Forgot Password:</strong> Use the <Link to="/customer/forgot-password" className="text-success fw-bold">Forgot Password</Link> portal to reset via registered mobile OTP.</li>
                    <li><strong>Change Password:</strong> Navigate to <Link to="/staff/profile" className="text-success fw-bold">My Profile</Link> to change your current password.</li>
                    <li><strong>Admin Reset:</strong> If locked out or deactivated, request your Shop Admin to reset your temporary password in the Admin Staff Console.</li>
                  </ul>
                </div>
              )}

              {activeSection === 'admin' && (
                <div>
                  <h4 className="fw-bold text-success mb-3"><i className="bi bi-shield-person me-2"></i>Escalation & Contact Admin</h4>
                  <p className="text-muted">Contact your Shop Administrator for inventory restock, permission adjustments, or bill corrections:</p>
                  <div className="p-3 border rounded bg-light mb-3">
                    <div className="row g-2 small">
                      <div className="col-sm-4 fw-bold">Shop Administrator:</div>
                      <div className="col-sm-8 text-muted">Priya Sharma (ADM-101)</div>
                      <div className="col-sm-4 fw-bold">Admin Email:</div>
                      <div className="col-sm-8 text-muted">admin@smp.com</div>
                      <div className="col-sm-4 fw-bold">Admin Phone:</div>
                      <div className="col-sm-8 text-muted">+91 98400 23456</div>
                    </div>
                  </div>
                  <div className="alert alert-warning py-2 small">
                    <i className="bi bi-exclamation-triangle me-1"></i> Bill Corrections: Staff can only edit generated bills if the Admin has toggled <strong>"Can Edit Bills"</strong> permission on your staff profile.
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

export default StaffHelp;
