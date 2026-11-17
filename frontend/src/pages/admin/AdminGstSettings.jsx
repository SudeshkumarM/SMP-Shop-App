import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminGstSettings = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    enabled: true,
    defaultGstPercent: 5,
    gstNumber: '33AAAAA0000A1Z5',
    compositionScheme: false
  });

  const [stats, setStats] = useState({
    totalCgst: 0,
    totalSgst: 0,
    totalGstCollected: 0,
    totalTaxableValue: 0,
    totalInvoicesCount: 0
  });

  useEffect(() => {
    const fetchGstData = async () => {
      try {
        const res = await api.get('/admin/gst-settings');
        if (res.data.success) {
          if (res.data.settings) setSettings(res.data.settings);
          if (res.data.stats) setStats(res.data.stats);
        }
      } catch (err) {
        console.error('Failed to load GST data:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGstData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/admin/gst-settings', settings);
      if (res.data.success) {
        addToast('GST and tax configuration saved successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update GST settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold brand-font mb-0">GST & Tax Compliance Console</h3>
          <small className="text-muted">Configure GST rates, GSTIN credentials & inspect cumulative tax collection analytics</small>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : (
        <>
          {/* 1. Tax Collection KPI Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="smp-card p-3 shadow-sm border-start border-4 border-primary">
                <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Total GST Collected
                </small>
                <h4 className="fw-bold text-white mb-0 mt-1">
                  ₹{Number(stats.totalGstCollected || 0).toFixed(2)}
                </h4>
                <small className="text-muted">Across all valid invoices</small>
              </div>
            </div>

            <div className="col-md-3 col-6">
              <div className="smp-card p-3 shadow-sm border-start border-4 border-info">
                <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>
                  CGST (Central Tax)
                </small>
                <h4 className="fw-bold text-white mb-0 mt-1">
                  ₹{Number(stats.totalCgst || 0).toFixed(2)}
                </h4>
                <small className="text-muted">2.5% on sales</small>
              </div>
            </div>

            <div className="col-md-3 col-6">
              <div className="smp-card p-3 shadow-sm border-start border-4 border-warning">
                <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>
                  SGST (State Tax)
                </small>
                <h4 className="fw-bold text-white mb-0 mt-1">
                  ₹{Number(stats.totalSgst || 0).toFixed(2)}
                </h4>
                <small className="text-muted">2.5% on sales</small>
              </div>
            </div>

            <div className="col-md-3 col-6">
              <div className="smp-card p-3 shadow-sm border-start border-4 border-success">
                <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>
                  Taxable Revenue
                </small>
                <h4 className="fw-bold text-success mb-0 mt-1">
                  ₹{Number(stats.totalTaxableValue || 0).toFixed(2)}
                </h4>
                <small className="text-muted">{stats.totalInvoicesCount || 0} Invoices filed</small>
              </div>
            </div>
          </div>

          {/* 2. Configuration Form & Compliance Guide */}
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="smp-card p-4 shadow-sm">
                <h5 className="fw-bold brand-font mb-3 text-white">Tax Configuration</h5>
                <form onSubmit={handleSave}>
                  <div className="p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center border" style={{ backgroundColor: 'var(--smp-dark-blue)' }}>
                    <div>
                      <h6 className="fw-bold mb-0 text-white">Enable GST Invoicing</h6>
                      <small className="text-muted">Automatically calculate CGST and SGST on POS and Online bills</small>
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
                        Default GST Rate (%)
                      </label>
                      <div className="input-group">
                        <input
                          type="number"
                          min="0"
                          max="28"
                          required
                          className="form-control fw-bold"
                          value={settings.defaultGstPercent}
                          onChange={(e) => setSettings({ ...settings, defaultGstPercent: Number(e.target.value) })}
                        />
                        <span className="input-group-text">%</span>
                      </div>
                      <small className="text-muted">Standard rate: 5% for Apparel & Garments</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted text-uppercase">
                        Store GSTIN Number
                      </label>
                      <input
                        type="text"
                        required
                        className="form-control fw-bold font-monospace"
                        value={settings.gstNumber}
                        onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value.toUpperCase() })}
                      />
                      <small className="text-muted">Printed on customer thermal & PDF invoices</small>
                    </div>

                    <div className="col-12 mt-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="compositionCheck"
                          checked={settings.compositionScheme}
                          onChange={(e) => setSettings({ ...settings, compositionScheme: e.target.checked })}
                        />
                        <label className="form-check-label small fw-semibold" htmlFor="compositionCheck">
                          Operating under GST Composition Scheme (Simplified tax compliance)
                        </label>
                      </div>
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
                          Saving Configuration...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-shield-check me-1"></i> Update GST Configuration
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Statutory Guide Card */}
            <div className="col-lg-5">
              <div className="smp-card p-4 shadow-sm border-start border-4 border-warning">
                <h5 className="fw-bold brand-font mb-3 d-flex align-items-center gap-2 text-white">
                  <i className="bi bi-info-circle text-warning"></i> Statutory Apparel Tax Math
                </h5>
                <div className="p-3 rounded-3 mb-3 border" style={{ backgroundColor: 'var(--smp-dark-blue)' }}>
                  <div className="fw-bold text-white mb-1">Standard Calculation Breakdown:</div>
                  <ul className="small ps-3 mb-0" style={{ color: 'var(--smp-text-secondary)' }}>
                    <li>Sample Product Base Selling Price: <strong>₹1,000.00</strong></li>
                    <li>GST Rate: <strong>5.00%</strong></li>
                    <li>CGST (2.50%): <strong>₹25.00</strong></li>
                    <li>SGST (2.50%): <strong>₹25.00</strong></li>
                    <li className="fw-bold text-primary mt-1">Final Consumer Bill: <strong>₹1,050.00</strong></li>
                  </ul>
                </div>
                <p className="small text-muted mb-0">
                  Every bill generated via Staff POS or Customer Web Checkout computes exact fractional GST, logs the tax into the financial ledger, and produces compliant invoices with barcode audit numbers.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminGstSettings;
