import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

const Contact = () => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    addToast('Your inquiry has been received! Our support team will contact you shortly.', 'success');
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="text-center mb-5">
            <span className="badge bg-primary text-white px-3 py-2 rounded-pill fw-bold mb-2">
              GET IN TOUCH
            </span>
            <h1 className="display-6 fw-bold brand-font text-white">Contact SMP</h1>
            <p className="text-muted">We are here to assist you with orders, sizing, delivery queries & support.</p>
          </div>

          <div className="row g-4">
            <div className="col-md-5">
              <div className="smp-card p-4 h-100 shadow-sm" style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}>
                <h4 className="fw-bold brand-font text-primary mb-3">Store Locations</h4>

                <div className="mb-4">
                  <h6 className="fw-bold mb-1 text-white">
                    <i className="bi bi-geo-alt-fill text-danger me-2"></i>Flagship Store
                  </h6>
                  <p className="small text-muted mb-1">100 Feet Road, Anna Nagar, Chennai, Tamil Nadu - 600040</p>
                  <p className="small text-muted mb-0"><strong>Hours:</strong> Mon - Sun: 10:00 AM - 9:30 PM</p>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold mb-1 text-white">
                    <i className="bi bi-telephone-fill text-success me-2"></i>Customer Support
                  </h6>
                  <p className="small text-muted mb-0">+91 98400 12345 / 044-24567890</p>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold mb-1 text-white">
                    <i className="bi bi-envelope-fill text-primary me-2"></i>Email Inquiries
                  </h6>
                  <p className="small text-muted mb-0">support@smp.com</p>
                </div>

                <div className="p-3 rounded-3 border" style={{ backgroundColor: '#0F172A', borderColor: '#334155' }}>
                  <small className="fw-bold text-white d-block mb-1">Corporate Desk</small>
                  <small className="text-muted">
                    SMP Retail, 100 Feet Road, Anna Nagar, Chennai - 600040
                  </small>
                </div>
              </div>
            </div>

            <div className="col-md-7">
              <div className="smp-card p-4 shadow-sm" style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}>
                <h4 className="fw-bold brand-font mb-3 text-white">Send Us a Message</h4>
                {sent ? (
                  <div className="alert alert-success p-4 text-center rounded-3">
                    <i className="bi bi-check-circle-fill fs-1 text-success mb-2 d-block"></i>
                    <h5 className="text-white fw-bold">Thank You!</h5>
                    <p className="small text-muted mb-0">Your message has been received. Our team will get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold text-white">Your Name *</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold text-white">Email Address *</label>
                        <input
                          type="email"
                          required
                          className="form-control"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold text-white">Phone Number</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold text-dark">Subject</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-dark">Message *</label>
                        <textarea
                          rows="4"
                          required
                          className="form-control"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        ></textarea>
                      </div>
                      <div className="col-12">
                        <button type="submit" className="btn btn-primary px-4 py-2 rounded-pill fw-semibold">
                          <i className="bi bi-send-fill me-2"></i> Send Message
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
