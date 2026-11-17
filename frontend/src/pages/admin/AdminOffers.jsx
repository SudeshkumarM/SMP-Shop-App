import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminOffers = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('coupons'); // 'coupons' | 'broadcast' | 'logs' | 'settings'

  // Coupons State
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    title: '',
    description: '',
    discountPercent: 20,
    minPurchaseAmount: 500,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    isActive: true,
    sendWhatsApp: false
  });

  // Offer Broadcast Form
  const [offerBroadcast, setOfferBroadcast] = useState({
    offerName: 'SMP Special Promotion',
    offerDescription: 'Exclusive discount across our latest fashion collections.',
    discountPercent: 20,
    couponCode: 'SMP20',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    sendWhatsApp: true
  });
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  // WhatsApp Logs
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // WhatsApp Settings
  const [whatsappSettings, setWhatsappSettings] = useState({
    enabled: false,
    apiUrl: 'https://graph.facebook.com/v18.0',
    apiKey: '',
    phoneNumberId: '',
    notifyOnOffer: false,
    notifyOnCoupon: false,
    notifyOnInvoice: false
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await api.get('/admin/coupons');
      if (res.data.success) {
        setCoupons(res.data.coupons || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/admin/whatsapp-logs');
      if (res.data.success) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchWhatsAppSettings = async () => {
    try {
      const res = await api.get('/admin/whatsapp-settings');
      if (res.data.success && res.data.settings) {
        setWhatsappSettings(res.data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchWhatsAppSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  // Create Coupon
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/coupons', couponForm);
      if (res.data.success) {
        addToast(res.data.message || 'Coupon created!', 'success');
        setShowCouponModal(false);
        setCouponForm({
          code: '',
          title: '',
          description: '',
          discountPercent: 20,
          minPurchaseAmount: 500,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          isActive: true,
          sendWhatsApp: false
        });
        fetchCoupons();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create coupon', 'error');
    }
  };

  // Toggle Coupon Active Status
  const handleToggleCoupon = async (coupon) => {
    try {
      const res = await api.put(`/admin/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      if (res.data.success) {
        addToast(`Coupon ${coupon.code} ${!coupon.isActive ? 'Activated' : 'Disabled'}`, 'info');
        fetchCoupons();
      }
    } catch (err) {
      addToast('Status change failed', 'error');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      const res = await api.delete(`/admin/coupons/${id}`);
      if (res.data.success) {
        addToast('Coupon deleted', 'info');
        fetchCoupons();
      }
    } catch (err) {
      addToast('Failed to delete coupon', 'error');
    }
  };

  // Send Offer Broadcast
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await api.post('/admin/send-offer-whatsapp', offerBroadcast);
      if (res.data.success) {
        setBroadcastResult(res.data);
        addToast(res.data.message, 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Broadcast failed', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  // Save WhatsApp Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.put('/admin/whatsapp-settings', whatsappSettings);
      if (res.data.success) {
        addToast('WhatsApp Business integration settings saved!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update WhatsApp settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Offers, Coupons & WhatsApp Integration</h3>
          <small className="text-muted">Manage promotional discounts, customer consent & WhatsApp notification gateways</small>
        </div>

        <div className="d-flex gap-2">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === 'coupons' ? 'btn-primary' : 'btn-outline-secondary'}`}
          >
            <i className="bi bi-tag-fill me-1"></i> Coupons List
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === 'broadcast' ? 'btn-primary' : 'btn-outline-secondary'}`}
          >
            <i className="bi bi-megaphone-fill me-1"></i> Offer Broadcast
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === 'logs' ? 'btn-primary' : 'btn-outline-secondary'}`}
          >
            <i className="bi bi-journal-text me-1"></i> Dispatch Logs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline-secondary'}`}
          >
            <i className="bi bi-gear-fill me-1"></i> WhatsApp Settings
          </button>
        </div>
      </div>

      {/* TAB 1: COUPONS LIST */}
      {activeTab === 'coupons' && (
        <div className="smp-card p-4 shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold brand-font mb-0 text-white">Active Coupon Codes</h5>
            <button
              onClick={() => setShowCouponModal(true)}
              className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold"
            >
              <i className="bi bi-plus-circle me-1"></i> Create Coupon
            </button>
          </div>

          {loadingCoupons ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-tag display-4 text-secondary mb-2 d-block"></i>
              <h6>No coupons found. Create your first coupon code!</h6>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle small mb-0">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Title & Description</th>
                    <th>Discount</th>
                    <th>Min Purchase</th>
                    <th>Expiry Date</th>
                    <th>WhatsApp Notify</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c._id}>
                      <td className="fw-bold font-monospace text-primary fs-6">{c.code}</td>
                      <td>
                        <div className="fw-semibold text-white">{c.title}</div>
                        <small className="text-muted">{c.description || 'No description'}</small>
                      </td>
                      <td><span className="badge bg-success-subtle text-success fs-6 fw-bold">{c.discountPercent}% OFF</span></td>
                      <td className="fw-semibold">₹{c.minPurchaseAmount || 0}</td>
                      <td>{new Date(c.expiryDate).toLocaleDateString('en-IN')}</td>
                      <td>
                        {c.sendWhatsApp ? (
                          <span className="badge bg-success d-inline-flex align-items-center gap-1">
                            <i className="bi bi-whatsapp"></i> Enabled
                          </span>
                        ) : (
                          <span className="badge bg-secondary">Disabled</span>
                        )}
                      </td>
                      <td>
                        {c.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Disabled</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            onClick={() => handleToggleCoupon(c)}
                            className={`btn ${c.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            title={c.isActive ? 'Disable Coupon' : 'Enable Coupon'}
                          >
                            <i className={`bi bi-${c.isActive ? 'pause-fill' : 'play-fill'}`}></i>
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(c._id)}
                            className="btn btn-outline-danger"
                            title="Delete Coupon"
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OFFER BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="smp-card p-4 shadow-sm">
              <h5 className="fw-bold brand-font mb-3 text-white">Broadcast Promotional Offer via WhatsApp</h5>
              <p className="small text-muted mb-4">
                Dispatches approved promotional message template strictly to customers who have provided affirmative WhatsApp consent.
              </p>

              <form onSubmit={handleSendBroadcast}>
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label small fw-bold text-muted text-uppercase">Offer Name</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={offerBroadcast.offerName}
                      onChange={(e) => setOfferBroadcast({ ...offerBroadcast, offerName: e.target.value })}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted text-uppercase">Discount (%)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        className="form-control fw-bold"
                        value={offerBroadcast.discountPercent}
                        onChange={(e) => setOfferBroadcast({ ...offerBroadcast, discountPercent: Number(e.target.value) })}
                      />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-bold text-muted text-uppercase">Offer Description</label>
                    <textarea
                      rows="2"
                      className="form-control"
                      value={offerBroadcast.offerDescription}
                      onChange={(e) => setOfferBroadcast({ ...offerBroadcast, offerDescription: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted text-uppercase">Coupon Code</label>
                    <input
                      type="text"
                      required
                      className="form-control font-monospace fw-bold"
                      value={offerBroadcast.couponCode}
                      onChange={(e) => setOfferBroadcast({ ...offerBroadcast, couponCode: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted text-uppercase">Expiry Date</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={offerBroadcast.endDate}
                      onChange={(e) => setOfferBroadcast({ ...offerBroadcast, endDate: e.target.value })}
                    />
                  </div>

                  <div className="col-12 mt-3">
                    <div className="p-3 bg-light rounded-3 border d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="fw-bold mb-0">Enable WhatsApp Dispatch</h6>
                        <small className="text-muted">Broadcast to all opted-in customers in SMP</small>
                      </div>
                      <div className="form-check form-switch fs-5">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={offerBroadcast.sendWhatsApp}
                          onChange={(e) => setOfferBroadcast({ ...offerBroadcast, sendWhatsApp: e.target.checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top">
                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="btn btn-success px-4 py-2 fw-semibold rounded-pill d-inline-flex align-items-center gap-2"
                  >
                    {broadcasting ? (
                      <>
                        <span className="spinner-border spinner-border-sm"></span>
                        Dispatching to Consented Customers...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-whatsapp"></i> Broadcast Offer to Consented Customers
                      </>
                    )}
                  </button>
                </div>
              </form>

              {broadcastResult && (
                <div className="mt-4 p-3 bg-success-subtle text-dark border border-success rounded-3 small">
                  <div className="fw-bold fs-6 text-success mb-1">
                    <i className="bi bi-check-circle-fill me-1"></i> Broadcast Complete
                  </div>
                  <div>{broadcastResult.message}</div>
                  {broadcastResult.summary && (
                    <div className="mt-2 text-muted">
                      Eligible: {broadcastResult.summary.totalEligible} | Sent: {broadcastResult.summary.sentCount} | Opted Out: {broadcastResult.summary.optedOutCount}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Template Live Preview */}
          <div className="col-lg-5">
            <div className="smp-card p-4 bg-white shadow-sm border-start border-4 border-success">
              <h5 className="fw-bold brand-font mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-whatsapp text-success"></i> WhatsApp Message Preview
              </h5>
              <div
                className="p-3 rounded-3 position-relative"
                style={{
                  backgroundColor: '#e5ddd5',
                  backgroundImage: 'radial-gradient(#d4cbbe 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              >
                <div className="bg-white p-3 rounded-3 shadow-sm position-relative" style={{ maxWidth: '320px', fontSize: '0.88rem' }}>
                  <p className="mb-2">Hello <strong>Kumar</strong>!</p>
                  <p className="mb-2">Welcome to <strong>SMP</strong>!</p>
                  <p className="mb-2">We have a special offer for you: <em>{offerBroadcast.offerName}</em>.</p>
                  <p className="mb-2 text-success fw-bold">Enjoy {offerBroadcast.discountPercent}% OFF on your next purchase.</p>
                  <p className="mb-2">Your Coupon Code: <strong className="font-monospace bg-light p-1 rounded border">{offerBroadcast.couponCode}</strong></p>
                  <p className="mb-2">Visit SMP and enjoy shopping!</p>
                  <p className="mb-0 text-muted small">Thank you,<br />SMP Team.</p>
                  <div className="text-end text-muted mt-2" style={{ fontSize: '0.7rem' }}>
                    10:30 AM <i className="bi bi-check2-all text-primary"></i>
                  </div>
                </div>
              </div>

              <div className="mt-3 small text-muted">
                <i className="bi bi-info-circle me-1 text-primary"></i>
                Promotional notifications are restricted to customers with explicit consent. Opt-out customers are automatically filtered to protect brand deliverability.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISPATCH LOGS */}
      {activeTab === 'logs' && (
        <div className="smp-card p-4 shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold brand-font mb-0 text-white">Message Delivery & Audit Logs (WhatsApp / SMS)</h5>
            <button onClick={fetchLogs} className="btn btn-outline-secondary btn-sm rounded-pill px-3">
              <i className="bi bi-arrow-repeat me-1"></i> Refresh Logs
            </button>
          </div>

          {loadingLogs ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-clock-history display-4 text-secondary mb-2 d-block"></i>
              <h6>No messages logged yet.</h6>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle small mb-0">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Channel</th>
                    <th>Recipient</th>
                    <th>Type</th>
                    <th>Template</th>
                    <th>Status</th>
                    <th>Message Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="text-muted">{new Date(log.sentAt || log.createdAt).toLocaleString('en-IN')}</td>
                      <td>
                        {log.channel === 'SMS' ? (
                          <span className="badge bg-info text-dark d-inline-flex align-items-center gap-1">
                            <i className="bi bi-chat-dots-fill"></i> SMS
                          </span>
                        ) : (
                          <span className="badge bg-success d-inline-flex align-items-center gap-1">
                            <i className="bi bi-whatsapp"></i> WhatsApp
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold text-white">{log.recipientName}</div>
                        <small className="text-muted font-monospace">{log.recipientPhone}</small>
                      </td>
                      <td><span className="badge bg-secondary border">{log.messageType}</span></td>
                      <td><code>{log.templateName}</code></td>
                      <td>
                        {log.status === 'SENT' || log.status === 'WHATSAPP_SENT' ? (
                          <span className="badge bg-success">SENT</span>
                        ) : log.status === 'SMS_SENT' ? (
                          <span className="badge bg-info text-dark">SMS SENT</span>
                        ) : log.status === 'SIMULATED' ? (
                          <span className="badge bg-info text-dark">SIMULATED</span>
                        ) : log.status === 'OPTED_OUT' ? (
                          <span className="badge bg-warning text-dark">OPTED_OUT</span>
                        ) : (
                          <span className="badge bg-danger">FAILED</span>
                        )}
                      </td>
                      <td style={{ maxWidth: '300px' }} className="text-truncate" title={log.content || log.errorMessage}>
                        {log.errorMessage || log.content}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: WHATSAPP SETTINGS */}
      {activeTab === 'settings' && (
        <div className="smp-card p-4 shadow-sm" style={{ maxWidth: '750px' }}>
          <h5 className="fw-bold brand-font mb-3 text-white">WhatsApp & SMS Integration Configuration</h5>
          <p className="small text-muted mb-4">
            Connect your Meta WhatsApp Business API credentials. When live gateway is disabled or credentials are unset, SMP automatically dispatches via integrated SMS fallback with 100% audit trail.
          </p>

          <form onSubmit={handleSaveSettings}>
            <div className="p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center border" style={{ backgroundColor: 'var(--smp-dark-blue)' }}>
              <div>
                <h6 className="fw-bold mb-0 text-white">Enable Live WhatsApp Business API</h6>
                <small className="text-muted">When off or failed, system routes notifications automatically via SMS Gateway</small>
              </div>
              <div className="form-check form-switch fs-5">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={whatsappSettings.enabled}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, enabled: e.target.checked })}
                />
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label small fw-bold text-muted text-uppercase">API Endpoint URL</label>
                <input
                  type="text"
                  className="form-control font-monospace"
                  value={whatsappSettings.apiUrl}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, apiUrl: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted text-uppercase">Phone Number ID</label>
                <input
                  type="text"
                  placeholder="e.g. 104523912948291"
                  className="form-control font-monospace"
                  value={whatsappSettings.phoneNumberId}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, phoneNumberId: e.target.value })}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted text-uppercase">Permanent Access Token</label>
                <input
                  type="password"
                  placeholder="Bearer EAAG..."
                  className="form-control font-monospace"
                  value={whatsappSettings.apiKey}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, apiKey: e.target.value })}
                />
              </div>

              <div className="col-12 mt-3">
                <h6 className="fw-bold text-white mb-2">Automated Event Triggers:</h6>
                <div className="d-flex flex-column gap-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="notifyInvoiceCheck"
                      checked={whatsappSettings.notifyOnInvoice}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, notifyOnInvoice: e.target.checked })}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="notifyInvoiceCheck">
                      Send Order & Invoice confirmation bill automatically after checkout / POS billing (WhatsApp with SMS fallback)
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="notifyOfferCheck"
                      checked={whatsappSettings.notifyOnOffer}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, notifyOnOffer: e.target.checked })}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="notifyOfferCheck">
                      Allow promotional offer broadcasts to opted-in customers
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="notifyCouponCheck"
                      checked={whatsappSettings.notifyOnCoupon}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, notifyOnCoupon: e.target.checked })}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="notifyCouponCheck">
                      Allow coupon voucher messages to opted-in customers
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-top">
              <button
                type="submit"
                disabled={savingSettings}
                className="btn btn-primary px-4 py-2 fw-semibold rounded-pill"
              >
                {savingSettings ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {showCouponModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold brand-font text-white">Create New Coupon</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCouponModal(false)}></button>
              </div>
              <form onSubmit={handleCreateCoupon}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted text-uppercase">Coupon Code</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SMP25"
                        className="form-control font-monospace fw-bold"
                        value={couponForm.code}
                        onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted text-uppercase">Discount (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        className="form-control fw-bold"
                        value={couponForm.discountPercent}
                        onChange={(e) => setCouponForm({ ...couponForm, discountPercent: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold text-muted text-uppercase">Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Summer Weekend Sale"
                        className="form-control"
                        value={couponForm.title}
                        onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted text-uppercase">Min Purchase (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={couponForm.minPurchaseAmount}
                        onChange={(e) => setCouponForm({ ...couponForm, minPurchaseAmount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted text-uppercase">Expiry Date</label>
                      <input
                        type="date"
                        required
                        className="form-control"
                        value={couponForm.expiryDate}
                        onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="couponSendWhatsApp"
                          checked={couponForm.sendWhatsApp}
                          onChange={(e) => setCouponForm({ ...couponForm, sendWhatsApp: e.target.checked })}
                        />
                        <label className="form-check-label small fw-semibold text-success" htmlFor="couponSendWhatsApp">
                          <i className="bi bi-whatsapp me-1"></i> Send WhatsApp notification immediately to consented customers
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCouponModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Create Coupon
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOffers;
