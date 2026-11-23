import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useToast } from '../../context/ToastContext';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';
import QRCodeVisual from '../../components/common/QRCodeVisual';

const createBillingRequestId = () => (
  window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const createPaymentQrPayload = (qrData, shopName, amount) => {
  const savedPayload = String(qrData || '').trim();
  if (!savedPayload) return '';

  if (/^upi:\/\/pay(?:\?|$)/i.test(savedPayload)) {
    try {
      const uri = new URL(savedPayload);
      if (!uri.searchParams.get('pn')) uri.searchParams.set('pn', shopName || 'SMP Shop');
      uri.searchParams.set('am', Number(amount).toFixed(2));
      uri.searchParams.set('cu', uri.searchParams.get('cu') || 'INR');
      return uri.toString();
    } catch {
      return savedPayload;
    }
  }

  if (/^[A-Z0-9._-]{2,256}@[A-Z0-9.-]{2,64}$/i.test(savedPayload)) {
    const params = new URLSearchParams({
      pa: savedPayload,
      pn: shopName || 'SMP Shop',
      am: Number(amount).toFixed(2),
      cu: 'INR'
    });
    return `upi://pay?${params.toString()}`;
  }

  return savedPayload;
};

const resolvePaymentQrImageUrl = (imageUrl) => {
  const savedImageUrl = String(imageUrl || '').trim();
  const apiBaseUrl = api.defaults.baseURL || '';
  if (!savedImageUrl.startsWith('/uploads/') || !/^https?:\/\//i.test(apiBaseUrl)) {
    return savedImageUrl;
  }
  return new URL(savedImageUrl, new URL(apiBaseUrl).origin).toString();
};

const StaffBilling = () => {
  const { addToast } = useToast();
  const searchInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraScanTimeoutRef = useRef(null);
  const cameraScanActiveRef = useRef(false);
  const cameraScanPausedRef = useRef(false);
  const billingRequestIdRef = useRef(createBillingRequestId());
  const billingSubmissionInFlightRef = useRef(false);
  const barcodeLookupInFlightRef = useRef(false);
  const lastBarcodeScanRef = useRef({ code: '', at: 0 });

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
  const [cameraMessage, setCameraMessage] = useState('');
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [billingSettings, setBillingSettings] = useState(null);
  const [billingSettingsLoaded, setBillingSettingsLoaded] = useState(false);
  const [paymentQrSettings, setPaymentQrSettings] = useState(null);
  const [paymentQrLoading, setPaymentQrLoading] = useState(false);
  const [paymentQrLoadError, setPaymentQrLoadError] = useState('');
  const [paymentQrImageFailed, setPaymentQrImageFailed] = useState(false);
  const [selectedPaymentQrId, setSelectedPaymentQrId] = useState('');

  // Bill Items
  const [billItems, setBillItems] = useState([]);

  // Customer Info & Phone Lookup
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [lookupCustomer, setLookupCustomer] = useState(null);
  const [previousInvoices, setPreviousInvoices] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Delivery & Discount
  const [hasDelivery, setHasDelivery] = useState(false);
  const [discountType, setDiscountType] = useState('flat'); // 'flat' or 'percent'
  const [discountValue, setDiscountValue] = useState(0);

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState('POS_CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Completion State
  const [submitting, setSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [selectedPastInvoice, setSelectedPastInvoice] = useState(null);

  const loadPaymentQrSettings = async () => {
    setPaymentQrLoading(true);
    setPaymentQrLoadError('');
    try {
      const res = await api.get('/billing/payment-qrs');
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Payment QR settings could not be loaded.');
      }
      const paymentQrs = res.data.paymentQrs || [];
      setPaymentQrSettings({ shopName: res.data.shopName || '', paymentQrs });
      setPaymentQrImageFailed(false);
      setSelectedPaymentQrId((currentId) => (
        paymentQrs.some((qr) => qr._id === currentId) ? currentId : paymentQrs[0]?._id || ''
      ));
    } catch (err) {
      setPaymentQrSettings(null);
      setPaymentQrLoadError(err.response?.data?.message || err.message || 'Payment QR settings could not be loaded.');
      addToast(err.response?.data?.message || err.message || 'Payment QR settings could not be loaded.', 'error');
    } finally {
      setPaymentQrLoading(false);
    }
  };

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
    api.get('/settings/scanner')
      .then((res) => setScannerEnabled(res.data?.settings?.scannerActivated === true))
      .catch((err) => {
        setScannerEnabled(false);
        addToast(err.response?.data?.message || 'Scanner availability could not be loaded.', 'error');
      });
    api.get('/billing/settings')
      .then((res) => {
        if (!res.data?.success || !res.data.settings) {
          throw new Error(res.data?.message || 'Billing settings are unavailable.');
        }
        setBillingSettings(res.data);
        setBillingSettingsLoaded(true);
      })
      .catch((err) => {
        setBillingSettings(null);
        setBillingSettingsLoaded(false);
        addToast(err.response?.data?.message || err.message || 'Billing settings could not be loaded.', 'error');
      });

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
    if (barcodeLookupInFlightRef.current) return;
    const now = Date.now();
    if (lastBarcodeScanRef.current.code === rawCode && now - lastBarcodeScanRef.current.at < 750) {
      setBarcodeInput('');
      return;
    }
    if (!scannerEnabled) {
      addToast('Barcode scanning is disabled in Scanner Settings.', 'warning');
      return;
    }

    lastBarcodeScanRef.current = { code: rawCode, at: now };
    barcodeLookupInFlightRef.current = true;
    setScanningBarcode(true);
    try {
      const res = await api.get(`/billing/lookup-product/${encodeURIComponent(rawCode)}`);
      if (res.data?.success && res.data.product) {
        playScanBeep();
        addProductToBill(res.data.product);
        setBarcodeInput('');
        addToast(`Scanned: ${res.data.product.name} (₹${res.data.product.sellingPrice})`, 'success');
      } else {
        addToast('Product not found', 'warning');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        addToast('Product not found', 'warning');
      } else {
        addToast(err.response?.data?.message || 'Product lookup failed. Please try again.', 'error');
      }
    } finally {
      barcodeLookupInFlightRef.current = false;
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
    const stock = Number(product.availableQuantity ?? product.stock);
    if (!Number.isFinite(stock) || stock <= 0) {
      addToast(`${product.name} is currently out of stock!`, 'error');
      return;
    }
    const unitPrice = Number(product.sellingPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      addToast(`${product.name} has no valid saved selling price and cannot be billed.`, 'error');
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
      const defaultSize = product.sizes?.[0] || '';
      const defaultColor = product.colours?.[0] || '';
      const gstPercent = Number.isFinite(Number(product.gstPercent)) ? Number(product.gstPercent) : 0;

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
    const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
    const lines = billItems.map((item) => ({
      baseAmount: item.unitPrice * item.quantity,
      gstPercent: Number(item.gstPercent) || 0
    }));
    const subtotal = lines.reduce((sum, line) => sum + line.baseAmount, 0);
    const roundedSubtotal = roundCurrency(subtotal);
    let overallDiscount = 0;
    if (discountType === 'percent' && discountValue > 0) {
      overallDiscount = subtotal * Math.min(Number(discountValue), 100) / 100;
    } else if (discountType === 'flat' && discountValue > 0) {
      overallDiscount = Math.min(Number(discountValue), subtotal);
    }
    overallDiscount = roundCurrency(overallDiscount);

    const lineSubtotalCents = lines.map((line) => Math.round(line.baseAmount * 100));
    const subtotalCents = lineSubtotalCents.reduce((sum, cents) => sum + cents, 0);
    const discountCents = Math.round(overallDiscount * 100);
    const discountAllocations = lineSubtotalCents.map((lineCents, index) => {
      const exactCents = subtotalCents > 0 ? discountCents * lineCents / subtotalCents : 0;
      const allocatedCents = Math.min(Math.floor(exactCents), lineCents);
      return { index, cents: allocatedCents, remainder: exactCents - allocatedCents };
    });
    let remainingDiscountCents = discountCents -
      discountAllocations.reduce((sum, allocation) => sum + allocation.cents, 0);
    const allocationPriority = [...discountAllocations]
      .sort((left, right) => right.remainder - left.remainder);
    for (const allocation of allocationPriority) {
      if (remainingDiscountCents <= 0) break;
      if (discountAllocations[allocation.index].cents < lineSubtotalCents[allocation.index]) {
        discountAllocations[allocation.index].cents += 1;
        remainingDiscountCents -= 1;
      }
    }

    const gstEnabled = billingSettings?.settings?.gstEnabled !== false;
    const totalGst = gstEnabled ? roundCurrency(lines.reduce((sum, line, index) => {
      const taxableAmount = Math.max(0, line.baseAmount - discountAllocations[index].cents / 100);
      return sum + taxableAmount * line.gstPercent / 100;
    }, 0)) : 0;
    const delivery = billingSettings?.settings?.delivery;
    const deliveryThreshold = Number(delivery?.freeDeliveryThreshold) || 0;
    const deliveryRate = Number(delivery?.deliveryCharge) || 0;
    const deliveryEligible = hasDelivery && delivery?.enabled === true &&
      !(deliveryThreshold > 0 && roundedSubtotal >= deliveryThreshold);
    const delivFee = deliveryEligible
      ? (delivery.chargeType === 'PERCENT' ? roundedSubtotal * deliveryRate / 100 : deliveryRate)
      : 0;
    const roundedDeliveryFee = roundCurrency(delivFee);
    const roundedGst = totalGst;
    const grandTotal = roundCurrency(roundedSubtotal - overallDiscount + roundedGst + roundedDeliveryFee);

    return {
      subtotal: roundedSubtotal,
      totalGst: roundedGst,
      cgst: roundCurrency(roundedGst / 2),
      sgst: roundCurrency(roundedGst - roundCurrency(roundedGst / 2)),
      overallDiscount,
      deliveryFee: roundedDeliveryFee,
      grandTotal
    };
  };

  const totals = calculateTotals();
  const parsedCashReceived = Number(amountReceived);
  const hasValidCashEntry = amountReceived.trim() !== '' && Number.isFinite(parsedCashReceived);
  const cashReceivedForDisplay = hasValidCashEntry ? Math.max(0, parsedCashReceived) : 0;
  const cashShortfall = Math.max(0, totals.grandTotal - cashReceivedForDisplay);
  const cashChangeToReturn = Math.max(0, cashReceivedForDisplay - totals.grandTotal);
  const selectedPaymentQr = paymentQrSettings?.paymentQrs?.find(
    (qr) => qr._id === selectedPaymentQrId
  );
  const paymentQrPayload = selectedPaymentQr
    ? createPaymentQrPayload(
      selectedPaymentQr.qrData,
      paymentQrSettings?.shopName,
      totals.grandTotal
    )
    : '';
  const paymentQrImageUrl = resolvePaymentQrImageUrl(selectedPaymentQr?.imageUrl);

  // Camera barcode and QR scanner
  const startCamera = async () => {
    setShowCameraModal(true);
    setCameraMessage('');
    if (!scannerEnabled) {
      setCameraMessage('Scanning is disabled in Scanner Settings.');
      return;
    }

    const BarcodeDetectorApi = window.BarcodeDetector;
    if (!BarcodeDetectorApi) {
      setCameraMessage('This browser does not support camera barcode decoding. Use a USB/Bluetooth scanner or enter the code manually.');
      return;
    }

    let stream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraMessage('Camera access is not available in this browser or page context.');
        return;
      }

      const supported = await BarcodeDetectorApi.getSupportedFormats();
      const desiredFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];
      const formats = desiredFormats.filter((format) => supported.includes(format));
      if (formats.length === 0) {
        setCameraMessage('This camera does not support a compatible barcode format. Use a USB/Bluetooth scanner or manual entry.');
        return;
      }

      const detector = new BarcodeDetectorApi({ formats });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setCameraMessage('Camera preview could not be started.');
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
      cameraScanActiveRef.current = true;

      const scanFrame = async () => {
        if (!cameraScanActiveRef.current) return;
        const video = videoRef.current;
        if (video?.readyState >= 2 && !cameraScanPausedRef.current) {
          try {
            const detected = await detector.detect(video);
            const value = detected.find((item) => item.rawValue)?.rawValue;
            if (value) {
              cameraScanPausedRef.current = true;
              handleBarcodeScan(value);
              window.setTimeout(() => {
                cameraScanPausedRef.current = false;
              }, 1200);
            }
          } catch (error) {
            console.warn('Camera barcode decoding failed:', error);
          }
        }
        cameraScanTimeoutRef.current = window.setTimeout(scanFrame, 250);
      };
      scanFrame();
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        setCameraMessage('Camera permission was denied or blocked. Allow camera access on HTTPS or localhost, then try again.');
      } else if (err.name === 'NotFoundError') {
        setCameraMessage('No camera was found. Use a USB/Bluetooth scanner or enter the code manually.');
      } else {
        setCameraMessage('Camera access failed. Check browser permissions or use a handheld scanner/manual entry.');
      }
      console.warn('Camera stream warning:', err);
    }
  };

  const stopCamera = () => {
    cameraScanActiveRef.current = false;
    cameraScanPausedRef.current = false;
    if (cameraScanTimeoutRef.current) {
      window.clearTimeout(cameraScanTimeoutRef.current);
      cameraScanTimeoutRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setShowCameraModal(false);
  };

  useEffect(() => () => {
    cameraScanActiveRef.current = false;
    if (cameraScanTimeoutRef.current) window.clearTimeout(cameraScanTimeoutRef.current);
    videoRef.current?.srcObject?.getTracks().forEach((track) => track.stop());
  }, []);

  // Complete Billing
  const handleCompleteBilling = async () => {
    if (billingSubmissionInFlightRef.current) return;
    if (billItems.length === 0) {
      addToast('Bill is empty. Please select or scan products first.', 'warning');
      return;
    }
    if (!billingSettingsLoaded) {
      addToast('Billing settings are not available. Reload the page before completing a bill.', 'error');
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

    if (paymentMethod === 'POS_CASH') {
      const receivedAmount = Number(amountReceived);
      if (!amountReceived.trim() || !Number.isFinite(receivedAmount) || receivedAmount < totals.grandTotal) {
        addToast('Enter a valid amount received that covers the total payable.', 'warning');
        return;
      }
    } else {
      if (!paymentConfirmed) {
        addToast('Confirm that the payment was received before completing the bill.', 'warning');
        return;
      }
      if (['POS_UPI', 'POS_UPI_QR'].includes(paymentMethod) && !paymentReference.trim()) {
        addToast('Enter the UPI transaction reference before completing the bill.', 'warning');
        return;
      }
      if (paymentMethod === 'POS_UPI_QR' && !paymentQrSettings?.paymentQrs?.some(
        (qr) => qr._id === selectedPaymentQrId
      )) {
        addToast('UPI QR is not configured. Please contact the Owner.', 'warning');
        return;
      }
    }

    billingSubmissionInFlightRef.current = true;
    setSubmitting(true);
    try {
      const res = await api.post('/billing/create-bill', {
        requestId: billingRequestIdRef.current,
        items: billItems,
        discountType,
        discountValue,
        hasDelivery,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        paymentMethod,
        expectedGrandTotal: totals.grandTotal,
        amountReceived: paymentMethod === 'POS_CASH' ? Number(amountReceived) : undefined,
        paymentConfirmed: paymentMethod !== 'POS_CASH' && paymentConfirmed,
        paymentReference: paymentReference.trim() || undefined,
        paymentQrId: paymentMethod === 'POS_UPI_QR' ? selectedPaymentQrId : undefined
      });

      if (res.data?.success && res.data?.invoice?._id) {
        billingRequestIdRef.current = createBillingRequestId();
        const delStatus = res.data.deliveryStatus || 'Sent';
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
        setAmountReceived('');
        setPaymentReference('');
        setPaymentMethod('POS_CASH');
        setPaymentConfirmed(false);
      } else {
        addToast('Bill was not completed: the server did not confirm a saved invoice.', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Billing submission failed. No success was recorded.', 'error');
    } finally {
      billingSubmissionInFlightRef.current = false;
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
              <span className={`badge ${scannerEnabled ? 'bg-success' : 'bg-secondary'} ms-2 font-monospace`}>
                {scannerEnabled ? 'ON' : 'OFF'}
              </span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-primary text-white border-primary">
                <i className="bi bi-upc"></i>
              </span>
              <input
                ref={barcodeInputRef}
                type="text"
                className="form-control pos-search-input font-monospace"
                placeholder="Scan or enter a saved product barcode / SKU, then press Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                disabled={!scannerEnabled}
              />
              <button
                type="button"
                className="btn btn-teal fw-bold"
                onClick={() => handleBarcodeScan()}
                disabled={scanningBarcode || !scannerEnabled}
              >
                {scanningBarcode ? 'Scanning...' : 'Scan / Add'}
              </button>
            </div>
            <small className="text-muted d-block mt-1">
              {scannerEnabled
                ? 'Scan a product label or enter its saved barcode/SKU manually.'
                : 'Scanner access is OFF. An Admin or Owner can re-enable it in Scanner Settings.'}
            </small>
          </div>

          <div className="col-lg-6 col-md-5 d-flex flex-wrap align-items-center justify-content-md-end gap-2 mt-2 mt-md-0">
            <button
              type="button"
              className="btn btn-teal fw-bold"
              onClick={startCamera}
              disabled={!scannerEnabled}
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
                max={discountType === 'percent' ? 100 : totals.subtotal}
                className="form-control form-control-sm text-end fw-bold font-monospace"
                placeholder={discountType === 'flat' ? '₹ Discount' : '% Discount'}
                value={discountValue}
                onChange={(e) => {
                  const value = Math.max(0, Number(e.target.value) || 0);
                  setDiscountValue(Math.min(value, discountType === 'percent' ? 100 : totals.subtotal));
                }}
              />
            </div>

            {totals.overallDiscount > 0 && (
              <div className="d-flex justify-content-between py-1 small text-danger font-monospace">
                <span>Discount Applied:</span>
                <span className="fw-bold">-₹{totals.overallDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="d-flex justify-content-between py-1 small">
              <span className="text-muted">CGST:</span>
              <span className="text-dark font-monospace">₹{totals.cgst.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between py-1 small">
              <span className="text-muted">SGST:</span>
              <span className="text-dark font-monospace">₹{totals.sgst.toFixed(2)}</span>
            </div>

            {/* Delivery Toggle */}
            {billingSettings?.settings?.delivery?.enabled && (
              <>
                <div className="form-check form-switch my-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={hasDelivery}
                    onChange={(e) => setHasDelivery(e.target.checked)}
                    id="deliveryToggle"
                  />
                  <label className="form-check-label small text-dark" htmlFor="deliveryToggle">
                    Add Home Delivery
                  </label>
                  {billingSettings.settings.delivery.description && (
                    <div className="text-muted small">{billingSettings.settings.delivery.description}</div>
                  )}
                </div>
                {hasDelivery && (
                  <div className="d-flex justify-content-between small mb-2">
                    <span className="text-muted">
                      Delivery
                      {billingSettings.settings.delivery.freeDeliveryThreshold > 0 &&
                        totals.subtotal >= billingSettings.settings.delivery.freeDeliveryThreshold
                        ? ' (free)'
                        : ''}
                    </span>
                    <span className="font-monospace">₹{totals.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
              </>
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
                    onClick={() => {
                      setPaymentMethod('POS_CASH');
                      setPaymentConfirmed(false);
                      setPaymentReference('');
                    }}
                    className={`btn w-100 py-2 ${paymentMethod === 'POS_CASH' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    <i className="bi bi-cash-stack me-1"></i> Cash
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('POS_UPI_QR');
                      setPaymentConfirmed(false);
                      setPaymentReference('');
                      loadPaymentQrSettings();
                    }}
                    className={`btn w-100 py-2 ${paymentMethod === 'POS_UPI_QR' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    <i className="bi bi-qr-code-scan me-1"></i> UPI QR
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('POS_CARD');
                      setPaymentConfirmed(false);
                      setPaymentReference('');
                    }}
                    className={`btn w-100 py-2 ${paymentMethod === 'POS_CARD' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    <i className="bi bi-credit-card me-1"></i> Card
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('POS_UPI');
                      setPaymentConfirmed(false);
                      setPaymentReference('');
                    }}
                    className={`btn w-100 py-2 ${paymentMethod === 'POS_UPI' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    <i className="bi bi-phone me-1"></i> Manual UPI
                  </button>
                </div>
              </div>

              {paymentMethod === 'POS_UPI_QR' && (
                <>
                  <div className="d-flex justify-content-end mb-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={loadPaymentQrSettings}
                      disabled={paymentQrLoading}
                    >
                      <i className={`bi ${paymentQrLoading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'} me-1`}></i>
                      Refresh Owner QR
                    </button>
                  </div>
                  <div className="border rounded-3 bg-light p-3 mb-3 text-center">
                    {paymentQrLoading ? (
                      <div className="text-muted small">
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Loading Owner payment QR...
                      </div>
                    ) : paymentQrLoadError ? (
                      <div className="alert alert-danger small mb-0">{paymentQrLoadError}</div>
                    ) : !selectedPaymentQr ? (
                      <div className="alert alert-warning small mb-0">
                        UPI QR is not configured. Please contact the Owner.
                      </div>
                    ) : (
                      <>
                        {paymentQrSettings.paymentQrs.length > 1 && (
                          <select
                            className="form-select form-select-sm mb-3"
                            aria-label="Select Owner-configured payment QR"
                            value={selectedPaymentQrId}
                            onChange={(event) => {
                              setSelectedPaymentQrId(event.target.value);
                              setPaymentQrImageFailed(false);
                            }}
                          >
                            {paymentQrSettings.paymentQrs.map((qr) => (
                              <option key={qr._id} value={qr._id}>
                                {qr.title || qr.targetName || 'Owner payment QR'}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="fw-bold text-dark mb-1">
                          {paymentQrSettings.shopName || 'SMP Shop'}
                        </div>
                        <div className="small text-muted mb-2">
                          Amount to pay: <strong>₹{totals.grandTotal.toFixed(2)}</strong>
                        </div>
                        {paymentQrImageUrl && paymentQrImageFailed ? (
                          <div className="alert alert-warning small mb-0">
                            The Owner-configured QR image could not be loaded. Please contact the Owner.
                          </div>
                        ) : paymentQrImageUrl ? (
                          <img
                            src={paymentQrImageUrl}
                            alt={`${selectedPaymentQr.title || 'Owner-configured'} UPI payment QR`}
                            className="bg-white border rounded p-2"
                            style={{ width: 220, height: 220, objectFit: 'contain' }}
                            onError={() => setPaymentQrImageFailed(true)}
                          />
                        ) : paymentQrPayload ? (
                          <QRCodeVisual value={paymentQrPayload} size={220} />
                        ) : (
                          <div className="alert alert-warning small mb-0">
                            UPI QR is not configured. Please contact the Owner.
                          </div>
                        )}
                        {selectedPaymentQr.title && (
                          <div className="small text-muted mt-2">{selectedPaymentQr.title}</div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {paymentMethod === 'POS_CASH' && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center rounded border bg-light p-3 mb-3">
                    <span className="fw-bold text-dark">Bill Amount</span>
                    <strong className="fs-4 text-primary font-monospace">₹{totals.grandTotal.toFixed(2)}</strong>
                  </div>
                  <label htmlFor="cash-received" className="form-label small fw-bold text-uppercase text-muted">
                    Cash Received
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      id="cash-received"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      autoComplete="off"
                      className="form-control text-end font-monospace"
                      value={amountReceived}
                      onChange={(event) => setAmountReceived(event.target.value)}
                      aria-describedby="cash-payment-balance"
                    />
                  </div>
                  <div
                    id="cash-payment-balance"
                    className={`d-flex justify-content-between align-items-center rounded border p-3 mt-2 ${
                      cashShortfall > 0 ? 'bg-warning-subtle border-warning' : 'bg-success-subtle border-success'
                    }`}
                    aria-live="polite"
                  >
                    <span className="fw-bold text-dark">
                      {cashShortfall > 0 ? 'Remaining to Collect' : 'Change to Return'}
                    </span>
                    <strong className={`fs-4 font-monospace ${cashShortfall > 0 ? 'text-danger' : 'text-success'}`}>
                      ₹{cashShortfall > 0 ? cashShortfall.toFixed(2) : cashChangeToReturn.toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}
              {paymentMethod !== 'POS_CASH' && (
                <>
                  <div className="small text-muted mb-2">
                    Amount to collect: <strong>₹{totals.grandTotal.toFixed(2)}</strong>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-uppercase text-muted" htmlFor="payment-reference">
                      {paymentMethod === 'POS_CARD' ? 'Transaction / Authorization Reference (optional)' : 'UPI Transaction Reference'}
                    </label>
                    <input
                      id="payment-reference"
                      type="text"
                      className="form-control font-monospace"
                      maxLength={128}
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder={paymentMethod === 'POS_CARD' ? 'Enter terminal reference if available' : 'Enter the UPI transaction reference'}
                    />
                  </div>
                  <div className="form-check mb-3">
                  <input
                    id="payment-confirmation"
                    type="checkbox"
                    className="form-check-input"
                    checked={paymentConfirmed}
                    onChange={(event) => setPaymentConfirmed(event.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="payment-confirmation">
                    I verified that the full payment was received. Displaying or scanning a QR code alone is not payment confirmation.
                  </label>
                </div>
                </>
              )}
            </div>

            {/* Complete Billing Button */}
            <button
              type="button"
              disabled={
                submitting ||
                !billingSettingsLoaded ||
                billItems.length === 0 ||
                (paymentMethod === 'POS_CASH' && (
                  !amountReceived.trim() ||
                  !Number.isFinite(Number(amountReceived)) ||
                  Number(amountReceived) < totals.grandTotal
                )) ||
                (paymentMethod !== 'POS_CASH' && !paymentConfirmed) ||
                (['POS_UPI', 'POS_UPI_QR'].includes(paymentMethod) && !paymentReference.trim()) ||
                (paymentMethod === 'POS_UPI_QR' && (
                  paymentQrLoading ||
                  !selectedPaymentQr ||
                  !paymentQrSettings?.paymentQrs?.some((qr) => qr._id === selectedPaymentQrId)
                ))
              }
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
                  {paymentMethod === 'POS_CASH' ? 'Complete Payment & Print' : 'Complete Bill & Print'}
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

                <div className={`alert ${cameraMessage ? 'alert-warning' : 'alert-info'} small mb-3`}>
                  {cameraMessage || 'Hold a saved product barcode or QR code inside the reticle. Scanning starts automatically when the camera detects a code.'}
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
