import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminWhatsAppSettings = () => {
  const { addToast } = useToast();

  const [settings, setSettings] = useState({
    adminNotificationNumber: '+91 98400 23456',
    notifyOnNewBill: true,
    notifyOnOrderConfirmation: true,
    notifyOnPaymentConfirmation: true,
    notifyOnFailedMessage: true,
    notifyOnSystemAlerts: true,
    apiConnectionStatus: 'CONNECTED'
  });

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/whatsapp-settings');
      if (res.data?.success) {
        if (res.data.settings) setSettings(res.data.settings);
        if (res.data.recentLogs) setLogs(res.data.recentLogs);
      }
    } catch (err) {
      console.error('Fetch Admin WhatsApp settings error:', err);
      addToast(err.response?.data?.message || 'Error loading WhatsApp settings', 'error');
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
      const res = await api.put('/admin/whatsapp-settings', settings);
      if (res.data?.success) {
        addToast('Admin WhatsApp notification preferences updated!', 'success');
        fetchSettings();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update preferences', 'error');
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
            <i className="bi bi-whatsapp text-success me-2"></i>Admin WhatsApp Notification Settings
          </h2>
          <p className="text-muted mb-0">
            Configure operational alert numbers and real-time event notifications for store administrators.
          </p>
        </div>
        <button onClick={fetchSettings} className="btn btn-outline-primary btn-sm">
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="smp-card p-4">
            <h4 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-bell-fill text-primary"></i> Alert Preferences
            </h4>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="mb-4">
                  <label className="form-label small fw-semibold text-white">
                    Admin Notification Mobile Number *
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent text-success border-end-0">
                      <i className="bi bi-telephone-fill"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control font-monospace border-start-0"
                      value={settings.adminNotificationNumber || ''}
                      onChange={(e) => setSettings({ ...settings, adminNotificationNumber: e.target.value })}
                      placeholder="+91 98400 23456"
                      required
                    />
                  </div>
                  <small className="text-muted">
                    This phone number receives high-priority dispatch summaries and operational triggers.
                  </small>
                </div>

                <div className="p-3 bg-light rounded-3 border mb-4">
                  <h6 className="fw-bold text-dark mb-3">Event Notification Triggers</h6>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <span className="text-dark fw-semibold d-block">New Bill Generated</span>
                      <small className="text-muted">Alert admin whenever a cashier finishes a POS checkout</small>
                    </div>
                    <div className="form-check form-switch fs-5">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={settings.notifyOnNewBill}
                        onChange={(e) => setSettings({ ...settings, notifyOnNewBill: e.target.checked })}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <span className="text-dark fw-semibold d-block">Order Confirmation</span>
                      <small className="text-muted">Notify on customer online orders</small>
                    </div>
                    <div className="form-check form-switch fs-5">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={settings.notifyOnOrderConfirmation}
                        onChange={(e) => setSettings({ ...settings, notifyOnOrderConfirmation: e.target.checked })}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <span className="text-dark fw-semibold d-block">Payment Confirmation</span>
                      <small className="text-muted">Instant alert when payments are marked PAID</small>
                    </div>
                    <div className="form-check form-switch fs-5">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={settings.notifyOnPaymentConfirmation}
                        onChange={(e) => setSettings({ ...settings, notifyOnPaymentConfirmation: e.target.checked })}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <span className="text-dark fw-semibold d-block">Delivery / Message Failures</span>
                      <small className="text-muted">Alert when customer WhatsApp notifications fail</small>
                    </div>
                    <div className="form-check form-switch fs-5">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={settings.notifyOnFailedMessage}
                        onChange={(e) => setSettings({ ...settings, notifyOnFailedMessage: e.target.checked })}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2">
                    <div>
                      <span className="text-dark fw-semibold d-block">System Alerts</span>
                      <small className="text-muted">Low stock, security anomalies, database notifications</small>
                    </div>
                    <div className="form-check form-switch fs-5">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={settings.notifyOnSystemAlerts}
                        onChange={(e) => setSettings({ ...settings, notifyOnSystemAlerts: e.target.checked })}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary fw-bold px-4"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Operational Status & Logs */}
        <div className="col-lg-5">
          <div className="smp-card p-4 h-100">
            <h4 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-clock-history text-info"></i> Recent Dispatch Logs
            </h4>

            <div className="p-3 bg-secondary rounded-3 border border-secondary mb-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small d-block">API Gateway Status</span>
                <span className="fw-bold text-success">
                  <i className="bi bi-check-circle-fill me-1"></i> Active & Ready
                </span>
              </div>
              <span className="badge bg-success font-monospace">METACLOUD-v18.0</span>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                <i className="bi bi-chat-left-text fs-2 d-block mb-2 text-secondary"></i>
                No outgoing notification logs recorded recently.
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {logs.map((log) => (
                  <div key={log._id} className="list-group-item bg-transparent px-0 py-2 border-bottom">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge bg-light text-dark border font-monospace">{log.templateName || 'NOTIFICATION'}</span>
                      <span className={`badge ${log.status === 'SENT' ? 'bg-success' : 'bg-danger'}`}>
                        {log.status}
                      </span>
                    </div>
                    <small className="text-dark d-block mt-1">To: {log.recipientPhone}</small>
                    <small className="text-muted">{new Date(log.createdAt).toLocaleTimeString()}</small>
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

export default AdminWhatsAppSettings;
