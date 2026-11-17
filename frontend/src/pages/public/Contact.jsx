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
            <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill fw-bold mb-2">
              GET IN TOUCH
            </span>
            <h1 className="display-6 fw-bold brand-font">Contact SMP Elite Fashions</h1>
            <p className="text-muted">We are here to assist you with custom orders, styling, corporate inquiries & mall partnerships.</p>
          </div>

          <div className="row g-4">
            <div className="col-md-5">
              <div className="smp-card p-4 h-100 bg-white">
                <h4 className="fw-bold brand-font text-primary mb-3">Store Locations</h4>

                <div className="mb-4">
                  <h6 className="fw-bold mb-1"><i className="bi bi-geo-alt-fill text-danger me-2"></i>Flagship Boutique</h6>
                  <p className="small text-muted mb-1">100 Feet Road, Anna Nagar, Chennai, Tamil Nadu - 600040</p>
                  <p className="small text-muted mb-0"><strong>Hours:</strong> Mon - Sun: 10:00 AM - 9:30 PM</p>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold mb-1"><i className="bi bi-telephone-fill text-success me-2"></i>Customer Support</h6>
                  <p className="small text-muted mb-0">+91 98400 12345 / 044-24567890</p>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold mb-1"><i className="bi bi-envelope-fill text-primary me-2"></i>Email Inquiries</h6>
                  <p className="small text-muted mb-0">support@smpshop.com</p>
                </div>

                <div className="p-3 bg-light rounded-3">
                  <small className="fw-bold text-dark d-block mb-1">Corporate Office</small>
                  <small className="text-muted">
                    SMP Retail Technologies Pvt Ltd, Anna Nagar West Extension, Chennai - 600101
                  </small>
                </div>
              </div>
            </div>

            <div className="col-md-7">
              <div className="smp-card p-4 bg-white">
                <h4 className="fw-bold brand-font mb-3">Send Us a Message</h4>
                {sent ? (
                  <div className="alert alert-success p-4 text-center rounded-3">
                    <i className="bi bi-check-circle-fill fs-1 text-success mb-2 d-block"></i>
                    <h5>Thank You!</h5>
                    <p className="small text-muted mb-0">Your message has been received. Our team will get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Your Name *</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Email Address *</label>
                        <input
                          type="email"
                          required
                          className="form-control"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Phone Number</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Subject</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Message *</label>
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
                          Send Message
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
