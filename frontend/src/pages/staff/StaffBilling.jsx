import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useToast } from '../../context/ToastContext';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const StaffBilling = () => {
  const { addToast } = useToast();
  const searchInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const videoRef = useRef(null);

  // Search & Catalog State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Barcode / Hardware Scanner State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Bill Items
  const [billItems, setBillItems] = useState([]);

  // Customer Info & Phone Lookup
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [lookupCustomer, setLookupCustomer] = useState(null);
  const [previousInvoices, setPreviousInvoices] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [consentWhatsApp, setConsentWhatsApp] = useState(true);

  // Delivery & Discount
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [discountType, setDiscountType] = useState('flat'); // 'flat' or 'percent'
  const [discountValue, setDiscountValue] = useState(0);

  // Payment Method & QR Code State
  const [paymentMethod, setPaymentMethod] = useState('POS_CASH'); // POS_CASH, POS_UPI_QR, POS_CARD, POS_UPI
  const [qrUtr, setQrUtr] = useState('');
  const [merchantUpiId, setMerchantUpiId] = useState('smpelite@upi');

  // Completion State
  const [submitting, setSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [selectedPastInvoice, setSelectedPastInvoice] = useState(null);
  const [lastDeliveryStatus, setLastDeliveryStatus] = useState(null);

  // Audio Beep for Scans
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 beep
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // AudioContext may be restricted by browser policy
    }
  };

  // Fetch available products on mount
  const fetchProducts = async () => {
    try {
      const prodRes = await api.get('/products');
      if (prodRes.data.success && prodRes.data.products) {
        setAvailableProducts(prodRes.data.products);
      }
    } catch (err) {
      console.error('Error fetching POS products:', err.message);
    }
  };

  useEffect(() => {
    fetchProducts();

    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }

    // Real-Time Socket.IO Synchronization
    const handleSync = () => {
      fetchProducts();
    };

    socket.on('product:updated', handleSync);
    socket.on('inventory:updated', handleSync);

    return () => {
      socket.off('product:updated', handleSync);
      socket.off('inventory:updated', handleSync);
    };
  }, []);

  // Debounced Customer Phone Lookup
  useEffect(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      const delay = setTimeout(async () => {
        try {
          const res = await api.get(`/billing/customer-lookup/${cleanPhone}`);
          if (res.data.success && res.data.exists && res.data.customer) {
            setLookupCustomer(res.data.customer);
            setCustomerName(res.data.customer.fullName || '');
            setCustomerEmail(res.data.customer.email || '');
            setConsentWhatsApp(res.data.customer.consentPromotionalWhatsApp !== false);
            setPreviousInvoices(res.data.previousInvoices || []);
            addToast(`Retrieved purchase history for ${res.data.customer.fullName}!`, 'info');
          } else {
            setLookupCustomer(null);
            setPreviousInvoices([]);
          }
        } catch (e) {
          console.error('Phone lookup failed:', e.message);
        }
      }, 350);
      return () => clearTimeout(delay);
    } else {
      setLookupCustomer(null);
      setPreviousInvoices([]);
    }
  }, [customerPhone]);

  // Search products when query changes
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        try {
          const res = await api.get('/billing/search-product', {
            params: { query: searchQuery.trim() }
          });
          if (res.data.success) {
            setSearchResults(res.data.products || []);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Dedicated Hardware USB Barcode Scanner Handler
  const handleBarcodeScan = async (codeToLookup) => {
    const rawCode = (codeToLookup || barcodeInput).trim();
    if (!rawCode) return;

    setScanningBarcode(true);
    try {
      // 1. Direct Barcode Lookup
      let res;
      try {
        res = await api.get(`/products/by-barcode/${encodeURIComponent(rawCode)}`);
      } catch (err) {
        // Fallback: If not found as direct barcode, check if it's a QR code payload
        res = await api.get('/products/by-qr', { params: { qrData: rawCode } });
      }

      if (res.data?.success && res.data.product) {
        playScanBeep();
        addProductToBill(res.data.product);
        setBarcodeInput('');
        addToast(`Scanned: ${res.data.product.name} (₹${res.data.product.sellingPrice})`, 'success');
      } else {
        // Fallback: search-product endpoint
        const searchRes = await api.get('/billing/search-product', { params: { query: rawCode } });
        if (searchRes.data?.success && searchRes.data.products?.length > 0) {
          playScanBeep();
          addProductToBill(searchRes.data.products[0]);
          setBarcodeInput('');
        } else {
          addToast(`No product found matching code: "${rawCode}"`, 'warning');
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      addToast(err.response?.data?.message || `Barcode ${rawCode} not recognized in inventory.`, 'error');
    } finally {
      setScanningBarcode(false);
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeScan();
    }
  };

  // Add Product to Bill Cart
  const addProductToBill = (product) => {
    const stock = product.availableQuantity ?? product.stock ?? 100;
    if (stock <= 0) {
      addToast(`${product.name} is currently out of stock!`, 'error');
      return;
    }

    const existingIdx = billItems.findIndex((item) => item.productId === product._id);
    if (existingIdx > -1) {
      const existing = billItems[existingIdx];
      if (existing.quantity >= stock) {
        addToast(`Cannot add more. In-store stock is ${stock}`, 'warning');
        return;
      }
      const updated = [...billItems];
      updated[existingIdx].quantity += 1;
      setBillItems(updated);
    } else {
      const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'L';
      const defaultColor = product.colours && product.colours.length > 0 ? product.colours[0] : 'Classic Blue';
      const unitPrice = product.sellingPrice || product.originalPrice || 500;
      const gstPercent = product.gstPercent || 5;

      setBillItems([
        ...billItems,
        {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          size: defaultSize,
          colour: defaultColor,
          unitPrice,
          gstPercent,
          quantity: 1,
          discountAmount: 0,
          maxStock: stock
        }
      ]);
    }
  };

  const updateQuantity = (idx, newQty) => {
    const updated = [...billItems];
    if (newQty <= 0) {
      updated.splice(idx, 1);
    } else {
      if (newQty > updated[idx].maxStock) {
        addToast(`Maximum available stock is ${updated[idx].maxStock}`, 'warning');
        return;
      }
      updated[idx].quantity = newQty;
    }
    setBillItems(updated);
  };

  const removeBillItem = (idx) => {
    const updated = [...billItems];
    updated.splice(idx, 1);
    setBillItems(updated);
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    billItems.forEach((item) => {
      const itemBase = item.unitPrice * item.quantity;
      subtotal += itemBase;
      const itemGst = (itemBase * (item.gstPercent || 5)) / 100;
      totalGst += itemGst;
    });

    let overallDiscount = 0;
    if (discountType === 'percent' && discountValue > 0) {
      overallDiscount = (subtotal * discountValue) / 100;
    } else if (discountType === 'flat' && discountValue > 0) {
      overallDiscount = Number(discountValue);
    }

    const netSubtotal = Math.max(0, subtotal - overallDiscount);
    const delivFee = hasDelivery ? Math.max(0, Number(deliveryCharge) || 0) : 0;
    const grandTotal = Math.round((netSubtotal + totalGst + delivFee) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      cgst: Math.round((totalGst / 2) * 100) / 100,
      sgst: Math.round((totalGst / 2) * 100) / 100,
      overallDiscount: Math.round(overallDiscount * 100) / 100,
      deliveryFee: delivFee,
      grandTotal
    };
  };

  const totals = calculateTotals();

  // Dynamic UPI Payment Intent String
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=SMP%20Store&am=${totals.grandTotal.toFixed(2)}&cu=INR&tn=SMP%20Bill`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiIntentUri)}&color=071426&bgcolor=ffffff`;

  // Camera Scanner Functions
  const startCamera = async () => {
    setShowCameraModal(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
      }
    } catch (err) {
      console.warn('Camera stream warning:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setCameraActive(false);
    setShowCameraModal(false);
  };

  // Complete Billing
  const handleCompleteBilling = async () => {
    if (billItems.length === 0) {
      addToast('Bill is empty. Please select or scan products first.', 'warning');
      return;
    }

    if (!customerPhone || customerPhone.length < 10) {
      addToast('Please enter a valid 10-digit Customer Mobile Number.', 'warning');
      return;
    }

    if (!customerName.trim()) {
      addToast('Please enter Customer Full Name.', 'warning');
      return;
    }

    if (paymentMethod === 'POS_UPI_QR') {
      if (!qrUtr || qrUtr.trim().length < 6) {
        addToast('Payment verification required: Enter the 12-digit UPI UTR number from customer payment.', 'warning');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post('/billing/create-bill', {
        items: billItems,
        discountType,
        discountValue,
        deliveryCharge: totals.deliveryFee,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        consentPromotionalWhatsApp: consentWhatsApp,
        paymentMethod,
        transactionRef: paymentMethod === 'POS_UPI_QR' ? qrUtr.trim() : undefined,
        paymentStatus: 'PAID'
      });

      if (res.data.success) {
        const delStatus = res.data.deliveryStatus || 'Sent';
        setLastDeliveryStatus(delStatus);
        addToast(`Invoice generated successfully! Bill: ${res.data.invoice?.invoiceNumber}`, 'success');

        const invoiceWithStatus = {
          ...res.data.invoice,
          deliveryStatus: delStatus
        };
        setCreatedInvoice(invoiceWithStatus);

        // Reset state for next customer
        setBillItems([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setLookupCustomer(null);
        setPreviousInvoices([]);
        setDiscountValue(0);
        setHasDelivery(false);
        setDeliveryCharge(0);
        setQrUtr('');
        setPaymentMethod('POS_CASH');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Billing submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in pb-5">
      {/* Top POS Hardware & Scanner Hub */}
      <div className="smp-card p-3 mb-3 border border-primary">
        <div className="row g-2 align-items-center">
          <div className="col-lg-6 col-md-7">
            <label className="form-label small fw-bold text-uppercase text-dark mb-1 d-flex align-items-center gap-1">
              <i className="bi bi-upc-scan text-primary fs-5"></i>
              Hardware USB Barcode & QR Scanner
              <span className="badge bg-success ms-2 font-monospace">READY</span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-primary text-white border-primary">
                <i className="bi bi-upc"></i>
              </span>
              <input
                ref={barcodeInputRef}
                type="text"
                className="form-control pos-search-input font-monospace"
                placeholder="Scan barcode with USB scanner (e.g. 8901234567890) & Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
              />
              <button
                type="button"
                className="btn btn-teal fw-bold"
                onClick={() => handleBarcodeScan()}
                disabled={scanningBarcode}
              >
                {scanningBarcode ? 'Scanning...' : 'Scan / Add'}
              </button>
            </div>
            <div className="d-flex justify-content-between mt-1">
              <small className="text-muted">Instant USB wedge auto-enters on scan</small>
              <button
                type="button"
                className="btn btn-link btn-sm text-primary p-0 text-decoration-none fw-bold"
                onClick={() => handleBarcodeScan('8901234567890')}
              >
                <i className="bi bi-lightning-fill text-warning me-1"></i>
                Scan Initial Shirt (8901234567890 - ₹500)
              </button>
            </div>
          </div>

          <div className="col-lg-6 col-md-5 d-flex flex-wrap align-items-center justify-content-md-end gap-2 mt-2 mt-md-0">
            <button
              type="button"
              className="btn btn-teal fw-bold"
              onClick={startCamera}
            >
              <i className="bi bi-camera-fill me-1"></i> Scan via Camera
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Left Column: Product Selection & Current Bill */}
        <div className="col-lg-8">
          {/* Quick-Add In-Stock Products Bar */}
          {availableProducts.length > 0 && (
            <div className="smp-card p-3 mb-3">
              <div className="small text-uppercase fw-bold text-dark mb-2 d-flex align-items-center gap-1">
                <i className="bi bi-boxes text-primary"></i> Catalog Quick Add:
              </div>
              <div className="d-flex flex-wrap gap-2">
                {availableProducts.map((prod) => (
                  <button
                    key={prod._id}
                    type="button"
                    onClick={() => addProductToBill(prod)}
                    className="btn btn-sm btn-outline-primary py-1 px-3 rounded-pill fw-medium"
                  >
                    <i className="bi bi-plus-lg me-1 text-primary"></i>
                    {prod.name} (₹{prod.sellingPrice})
                    <span className="badge bg-secondary ms-1">{prod.sku}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text Search Fallback */}
          <div className="smp-card p-3 mb-3 position-relative">
            <div className="input-group">
              <span className="input-group-text bg-secondary border-secondary text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                placeholder="Or search by product title, color or size..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearchQuery('')}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div
                className="position-absolute start-0 end-0 mt-1 smp-card shadow-lg z-3 p-2 mx-3"
                style={{ maxHeight: '250px', overflowY: 'auto' }}
              >
                {searchResults.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => {
                      addProductToBill(p);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="p-2 border-bottom d-flex justify-content-between align-items-center cursor-pointer rounded hover-bg"
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <span className="fw-bold text-dark">{p.name}</span>
                      <small className="text-muted d-block font-monospace">SKU: {p.sku} | Barcode: {p.barcode}</small>
                    </div>
                    <span className="fw-bold text-primary">₹{p.sellingPrice}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Bill Table */}
          <div className="smp-card p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold brand-font text-dark mb-0">
                <i className="bi bi-receipt-cutoff me-2 text-primary"></i> Current POS Bill Items ({billItems.length})
              </h5>
              {billItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBillItems([])}
                  className="btn btn-danger btn-sm rounded-pill px-3 py-1"
                >
                  <i className="bi bi-trash3 me-1"></i> Clear Bill
                </button>
              )}
            </div>

            {billItems.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-cart-x display-4 mb-2 d-block text-primary"></i>
                <h6 className="fw-bold text-dark">Bill is currently empty</h6>
                <p className="small mb-0">Scan a product barcode or click a product above to start billing.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle pos-table mb-0">
                  <thead>
                    <tr>
                      <th>Product Details</th>
                      <th style={{ width: '130px' }}>Size / Color</th>
                      <th className="text-end" style={{ width: '100px' }}>Price</th>
                      <th className="text-center" style={{ width: '120px' }}>Qty</th>
                      <th className="text-end" style={{ width: '90px' }}>GST</th>
                      <th className="text-end" style={{ width: '110px' }}>Total</th>
                      <th className="text-center" style={{ width: '60px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map((item, idx) => {
                      const itemTotal =
                        item.unitPrice * item.quantity +
                        (item.unitPrice * item.quantity * item.gstPercent) / 100;
                      return (
                        <tr key={idx}>
                          <td>
                            <div className="fw-bold text-dark">{item.productName}</div>
                            <small className="text-muted font-monospace">SKU: {item.sku}</small>
                          </td>
                          <td>
                            <span className="badge bg-light text-primary border">
                              {item.size} | {item.colour}
                            </span>
                          </td>
                          <td className="text-end font-monospace text-dark">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="text-center">
                            <div className="input-group input-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => updateQuantity(idx, item.quantity - 1)}
                              >
                                -
                              </button>
                              <span className="form-control text-center fw-bold px-1 bg-light text-dark">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => updateQuantity(idx, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="text-end font-monospace small fw-bold" style={{ color: '#D97706' }}>
                            {item.gstPercent}%
                          </td>
                          <td className="text-end fw-bold text-dark font-monospace">
                            ₹{itemTotal.toFixed(2)}
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => removeBillItem(idx)}
                              className="btn btn-link text-danger p-0"
                              title="Remove item"
                            >
                              <i className="bi bi-x-circle fs-5"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Info, Payment & QR Code */}
        <div className="col-lg-4">
          {/* Customer CRM Box */}
          <div className="smp-card p-3 mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="fw-bold brand-font text-dark mb-0">
                <i className="bi bi-person-lines-fill me-1 text-primary"></i> Customer Information
              </h6>
              {lookupCustomer && previousInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="btn btn-purple btn-sm py-0 px-2 rounded-pill fw-semibold"
                  style={{ fontSize: '0.75rem' }}
                >
                  <i className="bi bi-clock-history me-1"></i> Past Purchases ({previousInvoices.length})
                </button>
              )}
            </div>

            <div className="mb-2">
              <label className="form-label small fw-bold text-uppercase text-muted">
                Customer Mobile Number <span className="text-danger">*</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">+91</span>
                <input
                  type="tel"
                  maxLength="10"
                  required
                  placeholder="10-digit mobile number"
                  className="form-control font-monospace"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label small fw-bold text-uppercase text-muted">
                Customer Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Full name"
                className="form-control form-control-sm"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="mb-2">
              <label className="form-label small fw-bold text-uppercase text-muted">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="customer@email.com"
                className="form-control form-control-sm"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Bill Calculation & Payment Options */}
          <div className="smp-card p-4">
            <h5 className="fw-bold brand-font text-dark mb-3 border-bottom pb-2">
              Bill Breakdown & Payment
            </h5>

            <div className="d-flex justify-content-between py-1 small">
              <span className="text-muted">Subtotal (Excl. Tax):</span>
              <span className="fw-semibold text-dark font-monospace">₹{totals.subtotal.toFixed(2)}</span>
            </div>

            {/* Discount Inputs */}
            <div className="py-2 border-top border-bottom my-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-dark">Counter Discount</span>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    onClick={() => setDiscountType('flat')}
                    className={`btn btn-sm ${discountType === 'flat' ? 'btn-primary' : 'btn-outline-secondary'} py-0 px-2`}
                  >
                    ₹ Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`btn btn-sm ${discountType === 'percent' ? 'btn-primary' : 'btn-outline-secondary'} py-0 px-2`}
                  >
                    % Percent
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                className="form-control form-control-sm text-end fw-bold font-monospace"
                placeholder={discountType === 'flat' ? '₹ Discount' : '% Discount'}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
            </div>

            {totals.overallDiscount > 0 && (
              <div className="d-flex justify-content-between py-1 small text-danger font-monospace">
                <span>Discount Applied:</span>
                <span className="fw-bold">-₹{totals.overallDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="d-flex justify-content-between py-1 small">
              <span className="text-muted">CGST (2.5%):</span>
              <span className="text-dark font-monospace">₹{totals.cgst.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between py-1 small">
              <span className="text-muted">SGST (2.5%):</span>
              <span className="text-dark font-monospace">₹{totals.sgst.toFixed(2)}</span>
            </div>

            {/* Delivery Toggle */}
            <div className="form-check form-switch my-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={hasDelivery}
                onChange={(e) => setHasDelivery(e.target.checked)}
                id="deliveryToggle"
              />
              <label className="form-check-label small text-dark" htmlFor="deliveryToggle">
                Add Home Delivery Charge
              </label>
            </div>

            {hasDelivery && (
              <div className="input-group input-group-sm mb-2">
                <span className="input-group-text">₹ Delivery</span>
                <input
                  type="number"
                  min="0"
                  className="form-control text-end font-monospace"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                />
              </div>
            )}

            <hr className="my-2" />

            <div className="d-flex justify-content-between py-2 align-items-center">
              <span className="fw-bold fs-6 text-dark">Final Payable:</span>
              <span className="fs-3 fw-bold text-primary font-monospace">₹{totals.grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-3">
              <label className="small fw-bold text-uppercase mb-2 d-block text-muted">
                Select Payment Mode
              </label>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('POS_CASH')}
                    className={`btn w-100 py-2 ${paymentMethod === 'POS_CASH' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    <i className="bi bi-cash-stack me-1"></i> Cash
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('POS_UPI_QR')}
                    className={`btn w-100 py-2 ${paymentMethod === 'POS_UPI_QR' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    <i className="bi bi-qr-code-scan me-1"></i> UPI QR
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('POS_CARD')}
                    className={`btn w-100 py-2 ${paymentMethod === 'POS_CARD' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    <i className="bi bi-credit-card me-1"></i> Card
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('POS_UPI')}
                    className={`btn w-100 py-2 ${paymentMethod === 'POS_UPI' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    <i className="bi bi-phone me-1"></i> Manual UPI
                  </button>
                </div>
              </div>

              {/* Dynamic QR Code Box for UPI */}
              {paymentMethod === 'POS_UPI_QR' && (
                <div className="p-3 bg-light rounded-3 text-center mb-3 border border-primary fade-in">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="badge bg-primary">Dynamic UPI QR</span>
                    <span className="fw-bold fs-6 text-dark font-monospace">₹{totals.grandTotal.toFixed(2)}</span>
                  </div>

                  <div className="upi-qr-card my-2 p-2 bg-white rounded d-inline-block">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      style={{ width: '160px', height: '160px' }}
                    />
                  </div>

                  <div className="small mb-2 text-dark">
                    VPA: <strong className="font-monospace text-primary">{merchantUpiId}</strong>
                  </div>

                  <div className="text-start">
                    <label className="form-label small fw-bold text-uppercase text-dark">
                      UPI UTR / Reference No. <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength="16"
                      placeholder="12-digit UTR from customer screen"
                      className="form-control form-control-sm font-monospace"
                      value={qrUtr}
                      onChange={(e) => setQrUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Complete Billing Button */}
            <button
              type="button"
              disabled={submitting || billItems.length === 0 || (paymentMethod === 'POS_UPI_QR' && qrUtr.trim().length < 6)}
              onClick={handleCompleteBilling}
              className="btn btn-teal btn-lg w-100 rounded-pill fw-bold shadow mt-3 py-3 text-uppercase"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Generating Invoice...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle me-2 fs-5"></i>
                  Complete Bill & Print
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Barcode / QR Scanner Modal */}
      {showCameraModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-camera-fill text-primary me-2"></i>
                  Live Camera Barcode / QR Scanner
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={stopCamera}
                ></button>
              </div>

              <div className="modal-body p-4 text-center">
                <div
                  className="bg-dark rounded-3 position-relative overflow-hidden mb-3 border"
                  style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <video
                    ref={videoRef}
                    style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }}
                    playsInline
                    muted
                  ></video>
                  {!cameraActive && (
                    <div className="text-center p-3 text-muted">
                      <i className="bi bi-webcam fs-1 d-block mb-1 text-secondary"></i>
                      <small>Position garment barcode or QR code within view</small>
                    </div>
                  )}
                  {/* Scan target reticle overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '180px',
                      height: '110px',
                      border: '2px dashed #14B8A6',
                      borderRadius: '8px',
                      pointerEvents: 'none'
                    }}
                  ></div>
                </div>

                <div className="p-3 bg-light rounded-3 text-start mb-3 border">
                  <small className="text-muted d-block fw-bold mb-1">Instant Scan Simulator:</small>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        handleBarcodeScan('8901234567890');
                        stopCamera();
                      }}
                    >
                      <i className="bi bi-upc me-1"></i> Scan Shirt Barcode (8901234567890)
                    </button>
                    <button
                      type="button"
                      className="btn btn-purple btn-sm"
                      onClick={() => {
                        handleBarcodeScan('smp:product:SMP-SHIRT-001');
                        stopCamera();
                      }}
                    >
                      <i className="bi bi-qr-code me-1"></i> Scan Shirt QR Code
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={stopCamera}
                >
                  Close Scanner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Past Purchases History Modal */}
      {showHistoryModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-purple"></i>
                  Past Purchase History ({lookupCustomer?.fullName || customerName})
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowHistoryModal(false)}></button>
              </div>
              <div className="modal-body p-3">
                {previousInvoices.length === 0 ? (
                  <p className="text-muted text-center py-4 mb-0">No past purchases on record.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle small mb-0">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th>Items</th>
                          <th>Grand Total</th>
                          <th>Payment</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previousInvoices.map((inv) => (
                          <tr key={inv._id}>
                            <td className="fw-bold text-primary">{inv.invoiceNumber}</td>
                            <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                            <td>{inv.items?.length || 1} item(s)</td>
                            <td className="fw-bold text-dark">₹{inv.grandTotal?.toFixed(2)}</td>
                            <td><span className="badge bg-light text-dark border">{inv.paymentMethod}</span></td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm py-0 px-2 rounded-pill"
                                onClick={() => {
                                  setSelectedPastInvoice(inv);
                                  setShowHistoryModal(false);
                                }}
                              >
                                View / Print
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer border-top">
                <button type="button" className="btn btn-cancel" onClick={() => setShowHistoryModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Past Invoice Print Modal */}
      {selectedPastInvoice && (
        <InvoicePrintModal
          invoice={selectedPastInvoice}
          onClose={() => setSelectedPastInvoice(null)}
        />
      )}

      {/* Single Invoice Print Modal */}
      {createdInvoice && (
        <InvoicePrintModal
          invoice={createdInvoice}
          onClose={() => setCreatedInvoice(null)}
        />
      )}
    </div>
  );
};

export default StaffBilling;
