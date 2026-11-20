import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const CustomerHelp = () => {
  const [activeTab, setActiveTab] = useState('registration');

  const topics = [
    { id: 'registration', title: 'Registration Help', icon: 'bi-person-plus' },
    { id: 'verification', title: 'Recovery Code Help', icon: 'bi-shield-check' },
    { id: 'login', title: 'Login Help', icon: 'bi-box-arrow-in-right' },
    { id: 'shopping', title: 'Shopping Help', icon: 'bi-bag-check' },
    { id: 'payment', title: 'Payment Help', icon: 'bi-credit-card' },
    { id: 'order', title: 'Order & Tracking Help', icon: 'bi-truck' },
    { id: 'contact', title: 'Contact Support', icon: 'bi-headset' }
  ];

  return (
    <div className="container py-4 fade-in">
      <div className="smp-card p-4 p-md-5 mb-4 bg-white">
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="bg-primary text-white p-3 rounded-4 shadow-sm">
            <i className="bi bi-question-circle-fill fs-3"></i>
          </div>
          <div>
            <h2 className="fw-bold brand-font mb-1">Customer Help & Support Center</h2>
            <p className="text-muted mb-0">Answers and step-by-step assistance for your SMP shopping experience</p>
          </div>
        </div>

        <div className="row g-4 mt-2">
          {/* Sidebar Navigation */}
          <div className="col-lg-3 col-md-4">
            <div className="list-group shadow-sm border-0 rounded-3">
              {topics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-3 ${
                    activeTab === t.id ? 'active bg-primary border-primary fw-semibold' : 'text-dark'
                  }`}
                >
                  <i className={`bi ${t.icon}`}></i>
                  <span>{t.title}</span>
                </button>
              ))}
            </div>

            <div className="card mt-4 border-0 bg-light p-3 text-center rounded-3">
              <i className="bi bi-telephone-inbound text-primary fs-2 mb-2"></i>
              <div className="fw-bold small">Need Immediate Assistance?</div>
              <div className="text-muted small mb-2">Customer Care Toll-Free</div>
              <div className="fw-bold text-primary">1800-SMP-SHOP</div>
              <div className="small text-muted mt-1">support@smp.com</div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-lg-9 col-md-8">
            <div className="smp-card p-4 bg-white border">
              {activeTab === 'registration' && (
                <div>
                  <h4 className="fw-bold text-primary mb-3"><i className="bi bi-person-plus me-2"></i>Customer Registration Guide</h4>
                  <p className="text-muted">Registering on SMP takes less than a minute. Follow these simple steps:</p>
                  <ol className="list-group list-group-numbered mb-4">
                    <li className="list-group-item border-0 ps-0">Navigate to the <Link to="/customer/register" className="fw-semibold text-primary">Registration Page</Link>.</li>
                    <li className="list-group-item border-0 ps-0">Enter your <strong>Full Name</strong>, unique <strong>Username</strong>, <strong>Email Address</strong>, and <strong>10-digit Indian Mobile Number</strong>.</li>
                    <li className="list-group-item border-0 ps-0">Set a secure password of at least 6 characters and confirm it.</li>
                    <li className="list-group-item border-0 ps-0">Submit your details, confirm your email using the link sent to you, then sign in from the Customer Login page.</li>
                  </ol>
                  <div className="alert alert-info py-2 small">
                    <i className="bi bi-info-circle me-1"></i> Registration does not use CAPTCHA or mobile OTP. Your phone is saved as contact information and remains unverified.
                  </div>
                </div>
              )}

              {activeTab === 'verification' && (
                <div>
                  <h4 className="fw-bold text-primary mb-3"><i className="bi bi-shield-check me-2"></i>Password Recovery Code Help</h4>
                  <div className="accordion" id="verificationAccordion">
                    <div className="accordion-item mb-2 border rounded">
                      <h2 className="accordion-header">
                        <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#recoveryCode1">
                          Not receiving a password recovery code?
                        </button>
                      </h2>
                      <div id="recoveryCode1" className="accordion-collapse collapse show">
                        <div className="accordion-body text-muted small">
                          Check the email address or mobile number selected for password recovery, and wait briefly before requesting another code. Registration itself does not send an OTP.
                        </div>
                      </div>
                    </div>
                    <div className="accordion-item mb-2 border rounded">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#recoveryCode2">
                          Are mobile numbers verified during registration?
                        </button>
                      </h2>
                      <div id="recoveryCode2" className="accordion-collapse collapse">
                        <div className="accordion-body text-muted small">
                          No. Your mobile number is stored as contact information and remains unverified. A password recovery code is separate from registration.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'login' && (
                <div>
                  <h4 className="fw-bold text-primary mb-3"><i className="bi bi-box-arrow-in-right me-2"></i>Signing In to Your Account</h4>
                  <p className="text-muted">You can log in using either of your registered credentials:</p>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="p-3 border rounded bg-light">
                        <div className="fw-bold text-dark mb-1"><i className="bi bi-person me-2 text-primary"></i>Method 1: Username</div>
                        <div className="small text-muted">Enter your registered username (e.g. <code>kumar_customer</code>) or your mobile number, then your password.</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 border rounded bg-light">
                        <div className="fw-bold text-dark mb-1"><i className="bi bi-envelope me-2 text-primary"></i>Method 2: Email Address</div>
                        <div className="small text-muted">Enter your registered email address (e.g. <code>customer@smp.com</code>) and your password.</div>
                      </div>
                    </div>
                  </div>
                  <p className="small text-muted">If you receive <em>"Invalid Username/Email or Password"</em>, double-check Caps Lock or use the <Link to="/customer/forgot-password" className="text-primary">Forgot Password</Link> link.</p>
                </div>
              )}

              {activeTab === 'shopping' && (
                <div>
                  <h4 className="fw-bold text-primary mb-3"><i className="bi bi-bag-check me-2"></i>Shopping & Product Guide</h4>
                  <p className="text-muted">SMP offers high-quality retail garments with transparent, server-verified pricing.</p>
                  <ul className="list-unstyled text-muted small lh-lg">
                    <li><i className="bi bi-check-circle-fill text-success me-2"></i><strong>Curated Collections:</strong> Discover high-grade apparel across modern categories curated directly by store admins.</li>
                    <li><i className="bi bi-check-circle-fill text-success me-2"></i><strong>Size Selection:</strong> Available in Standard Indian sizing: S, M, L, XL, XXL.</li>
                    <li><i className="bi bi-check-circle-fill text-success me-2"></i><strong>Transparent GST:</strong> Product prices clearly indicate the GST component (5%) and the exact Final Payable amount.</li>
                    <li><i className="bi bi-check-circle-fill text-success me-2"></i><strong>Real-time Stock:</strong> The available inventory updates live, preventing overselling.</li>
                  </ul>
                  <Link to="/products" className="btn btn-outline-primary btn-sm rounded-pill px-3 mt-2">
                    Browse Storefront <i className="bi bi-arrow-right ms-1"></i>
                  </Link>
                </div>
              )}

              {activeTab === 'payment' && (
                <div>
                  <h4 className="fw-bold text-primary mb-3"><i className="bi bi-credit-card me-2"></i>Payment Methods & Security</h4>
                  <p className="text-muted">SMP supports multiple secure checkout options:</p>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <div className="border p-3 rounded text-center">
                        <i className="bi bi-qr-code-scan fs-3 text-primary mb-1"></i>
                        <div className="fw-bold small">Instant UPI</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>GPay, PhonePe, Paytm, BHIM</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="border p-3 rounded text-center">
                        <i className="bi bi-credit-card-2-front fs-3 text-success mb-1"></i>
                        <div className="fw-bold small">Credit / Debit Card</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Visa, MasterCard, RuPay</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="border p-3 rounded text-center">
                        <i className="bi bi-cash-stack fs-3 text-warning mb-1"></i>
                        <div className="fw-bold small">Cash on Delivery</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Pay at your doorstep</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-muted small">All digital payments are processed through secure 256-bit encrypted simulated gateways. We never store raw CVV or card credentials.</div>
                </div>
              )}

              {activeTab === 'order' && (
                <div>
                  <h4 className="fw-bold text-primary mb-3"><i className="bi bi-truck me-2"></i>Orders & Live Tracking</h4>
                  <p className="text-muted">Track your deliveries and access GST invoices anytime:</p>
                  <div className="alert alert-light border small text-muted mb-3">
                    Visit your <Link to="/customer/orders" className="fw-bold text-primary">My Orders</Link> page to view order milestones:
                    <div className="d-flex align-items-center gap-2 mt-2">
                      <span className="badge bg-secondary">PLACED</span> <i className="bi bi-arrow-right"></i>
                      <span className="badge bg-info text-dark">CONFIRMED</span> <i className="bi bi-arrow-right"></i>
                      <span className="badge bg-primary">DISPATCHED</span> <i className="bi bi-arrow-right"></i>
                      <span className="badge bg-success">DELIVERED</span>
                    </div>
                  </div>
                  <p className="small text-muted">You can download an official GST Tax Invoice as a PDF for every completed order directly from the order details modal.</p>
                </div>
              )}

              {activeTab === 'contact' && (
                <div>
                  <h4 className="fw-bold text-primary mb-3"><i className="bi bi-headset me-2"></i>Contact SMP Support</h4>
                  <p className="text-muted">Our customer care team is available 7 days a week from 9:00 AM to 9:00 PM IST.</p>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="border p-3 rounded">
                        <div className="fw-bold text-dark mb-1"><i className="bi bi-envelope-at me-2 text-primary"></i>Email Support</div>
                        <div className="small text-muted">care@smp.com (Response within 2 hours)</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border p-3 rounded">
                        <div className="fw-bold text-dark mb-1"><i className="bi bi-geo-alt me-2 text-danger"></i>Headquarters</div>
                        <div className="small text-muted">100 Feet Road, Anna Nagar, Chennai - 600040</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link to="/contact" className="btn btn-primary rounded-pill px-4">
                      Open Contact Form <i className="bi bi-send ms-1"></i>
                    </Link>
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

export default CustomerHelp;
