import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminScannerSettings = ({ role = 'admin' }) => {
  const { addToast } = useToast();

  const [settings, setSettings] = useState({
    scannerType: 'USB_BARCODE',
    barcodeFormat: 'CODE128',
    qrConfig: { prefix: 'smp:', payloadType: 'PRODUCT_OR_INVOICE', errorCorrection: 'M' },
    scannerActivated: true,
    selectedCameraId: '',
    cameraPermissionStatus: 'prompt',
    defaultScanner: 'USB_BARCODE'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);

  // Live Test Mode State
  const [testInput, setTestInput] = useState('');
  const [testScanType, setTestScanType] = useState('AUTO');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings/scanner');
      if (res.data?.success && res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.error('Fetch scanner settings error:', err);
      addToast(err.response?.data?.message || 'Error loading scanner settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Enumerate video devices
  const checkCameras = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setCameraDevices(videoInputs);

        // Check camera permission
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'camera' });
          setSettings(prev => ({ ...prev, cameraPermissionStatus: status.state }));
        }
      }
    } catch (err) {
      console.warn('Camera device enumeration error:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    checkCameras();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings/scanner', settings);
      if (res.data?.success) {
        addToast('Scanner settings updated successfully!', 'success');
        setSettings(res.data.settings);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update scanner settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async (e) => {
    if (e) e.preventDefault();
    if (!testInput.trim()) {
      addToast('Please enter or scan a barcode/QR code to test.', 'warning');
      return;
    }

    setTesting(true);
    try {
      const res = await api.post('/settings/scanner/test', {
        scanInput: testInput.trim(),
        scanType: testScanType
      });

      if (res.data?.success) {
        setTestResult(res.data);
        addToast('Scanner test completed successfully!', 'success');
      }
    } catch (err) {
      console.error('Test scan error:', err);
      addToast(err.response?.data?.message || 'Test scan failed.', 'error');
    } finally {
      setTesting(false);
    }
  };

  // Keyboard wedge listener for testing
  const handleTestKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRunTest();
    }
  };

  return (
    <div className="fade-in pb-5">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold brand-font text-white mb-1">
            <i className="bi bi-upc-scan text-primary me-2"></i>Scanner Settings & Test Terminal
          </h2>
          <p className="text-muted mb-0">
            Configure USB hardware barcode guns, mobile camera scanners, QR decoders, and verify live scanning.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="btn btn-outline-primary btn-sm"
        >
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      <div className="row g-4">
        {/* Settings Configuration Column */}
        <div className="col-lg-7">
          <div className="smp-card p-4">
            <h4 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-gear-fill text-primary"></i> Hardware & Camera Configuration
            </h4>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings}>
                {/* Master Activation Toggle */}
                <div className="p-3 bg-secondary rounded-3 border border-secondary mb-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="fw-bold text-white mb-0">POS Scanner Active</h6>
                    <small className="text-muted">Enable hardware keystroke and camera scanning across billing terminals</small>
                  </div>
                  <div className="form-check form-switch fs-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={settings.scannerActivated}
                      onChange={(e) => setSettings({ ...settings, scannerActivated: e.target.checked })}
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  {/* Default Scanner */}
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold text-white">Default Primary Scanner</label>
                    <select
                      className="form-select"
                      value={settings.defaultScanner}
                      onChange={(e) => setSettings({ ...settings, defaultScanner: e.target.value, scannerType: e.target.value })}
                    >
                      <option value="USB_BARCODE">USB Barcode Gun (Hardware Wedge)</option>
                      <option value="CAMERA_BARCODE">Camera Barcode Scanner</option>
                      <option value="CAMERA_QR">Camera QR Scanner</option>
                    </select>
                  </div>

                  {/* Barcode Standard */}
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold text-white">Barcode Standard Format</label>
                    <select
                      className="form-select font-monospace"
                      value={settings.barcodeFormat}
                      onChange={(e) => setSettings({ ...settings, barcodeFormat: e.target.value })}
                    >
                      <option value="CODE128">CODE128 (Universal)</option>
                      <option value="EAN13">EAN-13 (Standard Retail)</option>
                      <option value="UPCA">UPC-A (Standard Retail)</option>
                    </select>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  {/* Camera Selection */}
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold text-white">Selected Camera</label>
                    <select
                      className="form-select"
                      value={settings.selectedCameraId}
                      onChange={(e) => setSettings({ ...settings, selectedCameraId: e.target.value })}
                    >
                      <option value="">Default Integrated Camera</option>
                      {cameraDevices.map((c, i) => (
                        <option key={c.deviceId || i} value={c.deviceId}>
                          {c.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Camera Permission Pill */}
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold text-white">Camera Permission</label>
                    <div className="p-2 bg-secondary rounded border border-secondary d-flex align-items-center gap-2">
                      <span
                        className={`badge ${
                          settings.cameraPermissionStatus === 'granted'
                            ? 'bg-success'
                            : settings.cameraPermissionStatus === 'denied'
                            ? 'bg-danger'
                            : 'bg-warning text-dark'
                        }`}
                      >
                        {settings.cameraPermissionStatus.toUpperCase()}
                      </span>
                      <small className="text-muted">
                        {settings.cameraPermissionStatus === 'granted'
                          ? 'Camera access granted'
                          : 'Prompt on first scan'}
                      </small>
                    </div>
                  </div>
                </div>

                {/* QR Config Group */}
                <div className="p-3 bg-secondary rounded-3 border border-secondary mb-4">
                  <h6 className="fw-bold text-white mb-2">QR Code Parsing Rules</h6>
                  <div className="row g-2">
                    <div className="col-sm-6">
                      <label className="form-label small text-muted">Prefix Identifier</label>
                      <input
                        type="text"
                        className="form-control font-monospace form-control-sm"
                        value={settings.qrConfig?.prefix || 'smp:'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            qrConfig: { ...settings.qrConfig, prefix: e.target.value }
                          })
                        }
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small text-muted">Error Correction Level</label>
                      <select
                        className="form-select form-select-sm"
                        value={settings.qrConfig?.errorCorrection || 'M'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            qrConfig: { ...settings.qrConfig, errorCorrection: e.target.value }
                          })
                        }
                      >
                        <option value="L">L - Low (7%)</option>
                        <option value="M">M - Medium (15% - Recommended)</option>
                        <option value="Q">Q - Quartile (25%)</option>
                        <option value="H">H - High (30%)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary fw-bold px-4"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-1"></i> Save Scanner Settings
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Live Test Mode Column */}
        <div className="col-lg-5">
          <div className="smp-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-shield-check text-success"></i> Scanner Test Mode
              </h4>
              <span className="badge bg-outline-success border border-success text-success">
                Safe Test (No Bill Generated)
              </span>
            </div>

            <p className="text-muted small">
              Scan any barcode or QR code with your handheld scanner or type digits below to test database lookups instantly.
            </p>

            <form onSubmit={handleRunTest} className="mb-4">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">Scan Mode</label>
                <div className="btn-group w-100 btn-group-sm">
                  <button
                    type="button"
                    className={`btn ${testScanType === 'AUTO' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTestScanType('AUTO')}
                  >
                    Auto Detect
                  </button>
                  <button
                    type="button"
                    className={`btn ${testScanType === 'BARCODE' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTestScanType('BARCODE')}
                  >
                    Barcode
                  </button>
                  <button
                    type="button"
                    className={`btn ${testScanType === 'QR' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTestScanType('QR')}
                  >
                    QR Code
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-white">
                  Test Scan Input Box <span className="text-info">(Focus here & scan)</span>
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control font-monospace border-primary"
                    placeholder="Scan barcode (e.g. 8901234567890)"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={handleTestKeyDown}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn btn-teal fw-bold"
                    disabled={testing}
                  >
                    {testing ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <div className="d-flex justify-content-between mt-1">
                  <small className="text-muted">Press Enter to simulate USB scanner wedge</small>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-info p-0 text-decoration-none"
                    onClick={() => setTestInput('8901234567890')}
                  >
                    Load Shirt Barcode
                  </button>
                </div>
              </div>
            </form>

            {/* Test Results Card */}
            {testResult && (
              <div className="p-3 bg-light rounded-3 border border-primary-subtle fade-in">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="badge bg-success">
                    <i className="bi bi-check-circle-fill me-1"></i> Scan Decoded
                  </span>
                  <small className="text-muted">{new Date().toLocaleTimeString()}</small>
                </div>

                <div className="mb-2">
                  <small className="text-muted d-block">Raw Input Scanned:</small>
                  <span className="font-monospace fw-bold text-dark">{testResult.rawInput}</span>
                </div>

                <div className="mb-2">
                  <small className="text-muted d-block">Decoded Match Type:</small>
                  <span className="badge bg-info text-dark font-monospace">{testResult.matchType}</span>
                </div>

                {testResult.product && (
                  <div className="p-3 bg-white rounded border border-primary-subtle mt-2">
                    <h6 className="fw-bold text-primary mb-1">{testResult.product.name}</h6>
                    <div className="d-flex justify-content-between small text-muted">
                      <span>SKU: <strong className="text-dark">{testResult.product.sku}</strong></span>
                      <span>Price: <strong className="text-success">₹{testResult.product.sellingPrice}</strong></span>
                      <span>Stock: <strong className="text-dark">{testResult.product.availableQuantity ?? testResult.product.stock}</strong></span>
                    </div>
                  </div>
                )}

                {testResult.qrRecord && (
                  <div className="p-3 bg-white rounded border border-info mt-2">
                    <h6 className="fw-bold text-info mb-1">{testResult.qrRecord.title}</h6>
                    <small className="text-muted d-block">Target: {testResult.qrRecord.targetName || testResult.qrRecord.targetId}</small>
                  </div>
                )}

                <div className="mt-3 text-center">
                  <small className="text-success fw-bold">
                    <i className="bi bi-check2-all me-1"></i> Ready for Real-Time POS Billing
                  </small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminScannerSettings;
