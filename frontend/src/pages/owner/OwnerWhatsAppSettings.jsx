import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OwnerWhatsAppSettings = () => {
  const { addToast } = useToast();

  const [settings, setSettings] = useState({
    businessPhoneNumber: '+91 98400 12345',
    ownerNotificationNumber: '+91 98400 12345',
    adminNotificationNumber: '+91 98400 23456',
    notifyOnNewBill: true,
    notifyOnOrderConfirmation: true,
    notifyOnPaymentConfirmation: true,
    notifyOnFailedMessage: true,
    notifyOnSystemAlerts: true,
    apiConnectionStatus: 'CONNECTED',
    metaConfig: {
      enabled: true,
      apiUrl: 'https://graph.facebook.com/v18.0',
      apiKey: '',
      phoneNumberId: '',
      webhookVerifyToken: ''
    }
  });

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/owner/whatsapp-settings');
      if (res.data?.success) {
        if (res.data.settings) setSettings(res.data.settings);
        if (res.data.recentLogs) setLogs(res.data.recentLogs);
      }
    } catch (err) {
      console.error('Fetch Owner WhatsApp settings error:', err);
      addToast(err.response?.data?.message || 'Error loading WhatsApp configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/owner/whatsapp-settings', settings);
      if (res.data?.success) {
        addToast('Owner WhatsApp master settings updated successfully!', 'success');
        fetchSettings();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update WhatsApp settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in pb-5">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold brand-font text-white mb-1">
            <i className="bi bi-whatsapp text-success me-2"></i>Owner WhatsApp Business Gateway
          </h2>
          <p className="text-muted mb-0">
            Master corporate communication controls, Meta Cloud API credentials, and enterprise alert routing.
          </p>
        </div>
        <button onClick={fetchSettings} className="btn btn-outline-primary btn-sm">
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      <div className="row g-4">
        {/* Master Configuration */}
        <div className="col-lg-7">
          <div className="smp-card p-4">
            <h4 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-shield-lock-fill text-warning"></i> Enterprise Gateway Controls
            </h4>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : (
              <form onSubmit={handleSave}>
                {/* Master Gateway Toggle */}
                <div className="p-3 bg-secondary rounded-3 border border-secondary mb-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="fw-bold text-white mb-0">Master WhatsApp Dispatch Gateway</h6>
                    <small className="text-muted">Global toggle for sending automated bills, OTPs, and promotional broadcasts</small>
                  </div>
                  <div className="form-check form-switch fs-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={settings.metaConfig?.enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          metaConfig: { ...settings.metaConfig, enabled: e.target.checked }
                        })
                      }
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold text-white">Master Business Phone Number *</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={settings.businessPhoneNumber || ''}
                      onChange={(e) => setSettings({ ...settings, businessPhoneNumber: e.target.value })}
                      placeholder="+91 98400 12345"
                      required
                    />
                    <small className="text-muted">Registered WhatsApp Business number</small>
                  </div>

                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold text-white">Owner Alert Phone Number *</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={settings.ownerNotificationNumber || ''}
                      onChange={(e) => setSettings({ ...settings, ownerNotificationNumber: e.target.value })}
                      placeholder="+91 98400 12345"
                      required
                    />
                    <small className="text-muted">Master Owner mobile for daily profit & anomaly alerts</small>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-semibold text-white">Admin Alert Phone Number</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    value={settings.adminNotificationNumber || ''}
                    onChange={(e) => setSettings({ ...settings, adminNotificationNumber: e.target.value })}
                    placeholder="+91 98400 23456"
                  />
                  <small className="text-muted">Store Manager / Admin operational escalation number</small>
                </div>

                {/* Meta API Credentials Group */}
                <div className="p-3 bg-secondary rounded-3 border border-secondary mb-4">
                  <h6 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-key-fill text-info"></i> Meta Cloud API Credentials
                  </h6>

                  <div className="mb-3">
                    <label className="form-label small text-muted">API Endpoint URL</label>
                    <input
                      type="url"
                      className="form-control font-monospace form-control-sm"
                      value={settings.metaConfig?.apiUrl || 'https://graph.facebook.com/v18.0'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          metaConfig: { ...settings.metaConfig, apiUrl: e.target.value }
                        })
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Permanent Access Token (Bearer)</label>
                    <input
                      type="password"
                      className="form-control font-monospace form-control-sm"
                      value={settings.metaConfig?.apiKey || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          metaConfig: { ...settings.metaConfig, apiKey: e.target.value }
                        })
                      }
                      placeholder="EAAGm0PX4ZC... (Meta Developer Token)"
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-sm-6">
                      <label className="form-label small text-muted">Phone Number ID</label>
                      <input
                        type="text"
                        className="form-control font-monospace form-control-sm"
                        value={settings.metaConfig?.phoneNumberId || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            metaConfig: { ...settings.metaConfig, phoneNumberId: e.target.value }
                          })
                        }
                        placeholder="10987654321..."
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small text-muted">Webhook Verify Token</label>
                      <input
                        type="text"
                        className="form-control font-monospace form-control-sm"
                        value={settings.metaConfig?.webhookVerifyToken || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            metaConfig: { ...settings.metaConfig, webhookVerifyToken: e.target.value }
                          })
                        }
                        placeholder="smp_secure_token_2026"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-warning text-dark fw-bold px-4"
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'Save Master Gateway Settings'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Global Dispatch Monitor */}
        <div className="col-lg-5">
          <div className="smp-card p-4 h-100">
            <h4 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-activity text-teal" style={{ color: '#0D9488' }}></i> Gateway Health & Dispatch
            </h4>

            <div className="p-3 bg-light rounded-3 border mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Meta Connection:</span>
                <span className="badge bg-success font-monospace">ONLINE (v18.0)</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Business Verification:</span>
                <span className="badge bg-primary">TIER 1 (1,000 msgs/day)</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Automatic PDF Invoice Attachment:</span>
                <span className="badge bg-info text-dark">ENABLED</span>
              </div>
            </div>

            <h6 className="fw-bold text-dark mb-2">Recent Outgoing Queue</h6>
            {logs.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                <i className="bi bi-chat-check fs-2 d-block mb-2 text-secondary"></i>
                No outgoing WhatsApp logs in the queue.
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {logs.map((log) => (
                  <div key={log._id} className="list-group-item bg-transparent px-0 py-2 border-bottom">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge bg-light text-dark border font-monospace">{log.templateName || 'POS_INVOICE'}</span>
                      <span className={`badge ${log.status === 'SENT' ? 'bg-success' : 'bg-danger'}`}>
                        {log.status}
                      </span>
                    </div>
                    <small className="text-dark d-block mt-1">Recipient: {log.recipientPhone}</small>
                    <small className="text-muted">{new Date(log.createdAt).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerWhatsAppSettings;
