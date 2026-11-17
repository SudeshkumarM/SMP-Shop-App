import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminDeliverySettings = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    enabled: true,
    deliveryCharge: 50,
    freeDeliveryThreshold: 1000,
    chargeType: 'FLAT',
    description: 'Standard Express Shipping (2-3 business days)'
  });

  const [simSubtotal, setSimSubtotal] = useState(500);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/delivery-settings');
        if (res.data.success && res.data.settings) {
          setSettings(res.data.settings);
        }
      } catch (err) {
        console.error('Failed to load delivery settings:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/admin/delivery-settings', settings);
      if (res.data.success) {
        addToast('Delivery charge settings saved successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save delivery settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Simulated calculation
  const simDeliveryFee = settings.enabled
    ? simSubtotal >= Number(settings.freeDeliveryThreshold)
      ? 0
      : Number(settings.deliveryCharge)
    : 0;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold brand-font mb-0">Delivery Charge Configuration</h3>
          <small className="text-muted">Configure shipping rules, free delivery thresholds & checkout charges</small>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : (
        <div className="row g-4">
          {/* Main Form */}
          <div className="col-lg-7">
            <div className="smp-card p-4 shadow-sm">
              <form onSubmit={handleSave}>
                {/* Enable / Disable Switch */}
                <div className="p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center border" style={{ backgroundColor: 'var(--smp-dark-blue)' }}>
                  <div>
                    <h6 className="fw-bold mb-0 text-white">Enable Delivery Charges</h6>
                    <small className="text-muted">Apply standard delivery fee at customer checkout and POS delivery</small>
                  </div>
                  <div className="form-check form-switch fs-5">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    />
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted text-uppercase">
                      Standard Delivery Charge (₹)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">₹</span>
                      <input
                        type="number"
                        min="0"
                        required
                        disabled={!settings.enabled}
                        className="form-control fw-bold"
                        value={settings.deliveryCharge}
                        onChange={(e) => setSettings({ ...settings, deliveryCharge: Number(e.target.value) })}
                      />
                    </div>
                    <small className="text-muted">Applied when subtotal is below free threshold</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted text-uppercase">
                      Free Delivery Minimum (₹)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">₹</span>
                      <input
                        type="number"
                        min="0"
                        required
                        disabled={!settings.enabled}
                        className="form-control fw-bold text-success"
                        value={settings.freeDeliveryThreshold}
                        onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })}
                      />
                    </div>
                    <small className="text-muted">Orders at or above this amount get free delivery</small>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-bold text-muted text-uppercase">
                      Shipping Description (Shown to Customers)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.description}
                      onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary px-4 py-2 fw-semibold rounded-pill"
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving Settings...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i> Save Delivery Rules
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Real-time Simulator Card */}
          <div className="col-lg-5">
            <div className="smp-card p-4 shadow-sm border-start border-4 border-primary">
              <h5 className="fw-bold brand-font mb-3 d-flex align-items-center gap-2 text-white">
                <i className="bi bi-calculator text-primary"></i> Live Checkout Rule Preview
              </h5>
              <p className="small text-muted mb-3">
                Test how your delivery charges will calculate for various customer cart subtotals:
              </p>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">
                  Simulated Customer Cart Subtotal:
                </label>
                <div className="input-group mb-2">
                  <span className="input-group-text">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    className="form-control fw-bold"
                    value={simSubtotal}
                    onChange={(e) => setSimSubtotal(Number(e.target.value))}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" onClick={() => setSimSubtotal(500)} className="btn btn-sm btn-outline-secondary py-0">₹500</button>
                  <button type="button" onClick={() => setSimSubtotal(1000)} className="btn btn-sm btn-outline-secondary py-0">₹1,000</button>
                  <button type="button" onClick={() => setSimSubtotal(1500)} className="btn btn-sm btn-outline-secondary py-0">₹1,500</button>
                </div>
              </div>

              <div className="p-3 rounded-3 border" style={{ backgroundColor: 'var(--smp-dark-blue)' }}>
                <div className="d-flex justify-content-between small py-1">
                  <span>Cart Subtotal:</span>
                  <span className="fw-bold">₹{simSubtotal.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between small py-1">
                  <span>Free Threshold:</span>
                  <span>₹{settings.freeDeliveryThreshold.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between small py-1">
                  <span>Delivery Charge:</span>
                  {simDeliveryFee === 0 ? (
                    <span className="badge bg-success">FREE DELIVERY</span>
                  ) : (
                    <span className="fw-bold text-primary">+₹{simDeliveryFee.toFixed(2)}</span>
                  )}
                </div>
                <hr className="my-2" />
                <div className="d-flex justify-content-between py-1 fw-bold text-white">
                  <span>Simulated Total:</span>
                  <span className="text-primary fs-5">₹{(simSubtotal + simDeliveryFee).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliverySettings;
