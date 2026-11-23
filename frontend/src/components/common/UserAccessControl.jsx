import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const Toggle = ({ checked, onChange, label }) => (
  <div className="d-flex align-items-center justify-content-between py-2">
    <span className="fw-semibold text-white">{label}</span>
    <button
      type="button"
      className={`btn btn-sm rounded-pill px-3 ${checked ? 'btn-success' : 'btn-outline-secondary'}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  </div>
);

const UserAccessControl = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerSystemEnabled, setCustomerSystemEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('Temporarily Unavailable');
  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [loadError, setLoadError] = useState(false);

  const loadSettings = async () => {
    setLoadError(false);
    try {
      const res = await api.get('/settings/customer-system');
      const settings = res.data.settings || res.data.customerSystem;
      setCustomerSystemEnabled(settings.customerSystemEnabled !== false);
      setMaintenanceMode(settings.maintenanceMode === true);
      setMaintenanceTitle(settings.maintenanceTitle || 'Temporarily Unavailable');
      setMaintenanceReason(settings.maintenanceReason || '');
    } catch (error) {
      setLoadError(true);
      addToast(error.response?.data?.message || 'Failed to load customer system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const setCustomerSystemStatus = (enabled) => {
    if (!enabled && !window.confirm('Turn off customer login, registration, and customer services?')) return;
    setCustomerSystemEnabled(enabled);
  };

  const setMaintenanceStatus = (enabled) => {
    if (enabled && !window.confirm('Enable maintenance mode and temporarily block customer access?')) return;
    setMaintenanceMode(enabled);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings/customer-system', {
        customerSystemEnabled,
        maintenanceMode,
        maintenanceTitle,
        maintenanceReason
      });
      if (res.data.success) {
        addToast(res.data.message, 'success');
        await loadSettings();
      } else {
        addToast(res.data.message || 'Customer system settings were not saved.', 'error');
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save customer system settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reopen = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/customer-system', {
        customerSystemEnabled: true,
        maintenanceMode: false,
        maintenanceTitle,
        maintenanceReason
      });
      if (res.data.success) {
        setCustomerSystemEnabled(true);
        setMaintenanceMode(false);
        addToast('Customer System reopened successfully', 'success');
        await loadSettings();
      } else {
        addToast(res.data.message || 'Could not reopen the Customer System.', 'error');
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Could not reopen the Customer System', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="smp-card p-4 text-white">Loading customer system settings...</div>;
  }

  if (loadError) {
    return (
      <div className="smp-card p-4 shadow-sm mb-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
        <h5 className="fw-bold text-white mb-2">Customer System Availability</h5>
        <p className="text-warning mb-3">The saved availability state could not be loaded. Controls are unavailable to avoid showing an unsaved default.</p>
        <button type="button" className="btn btn-outline-light" onClick={loadSettings}>Retry loading settings</button>
      </div>
    );
  }

  return (
    <div className="smp-card p-4 shadow-sm mb-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
      <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
        <i className="bi bi-power text-danger"></i> Customer System Availability
      </h5>
      <form onSubmit={save}>
        <div style={{ borderTop: '1px solid #334155' }}>
          <Toggle checked={customerSystemEnabled} onChange={setCustomerSystemStatus} label="Customer System Status" />
          <Toggle checked={maintenanceMode} onChange={setMaintenanceStatus} label="Enable Maintenance Mode" />
        </div>
        <div className="mt-3">
          <label className="form-label small fw-semibold text-white">Maintenance Page Title</label>
          <input
            className="form-control"
            value={maintenanceTitle}
            maxLength={120}
            onChange={(event) => setMaintenanceTitle(event.target.value)}
          />
        </div>
        <div className="mt-3">
          <label className="form-label small fw-semibold text-white">Reason for Temporary Closure</label>
          <textarea
            className="form-control"
            rows={4}
            maxLength={1000}
            value={maintenanceReason}
            onChange={(event) => setMaintenanceReason(event.target.value)}
            placeholder="Enter the exact reason customers should see..."
          />
        </div>
        <div className="d-flex flex-wrap gap-2 mt-4">
          <button type="submit" className="btn btn-danger fw-bold rounded-pill px-4" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" className="btn btn-success fw-bold rounded-pill px-4" disabled={saving} onClick={reopen}>
            Reopen Customer System
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserAccessControl;
