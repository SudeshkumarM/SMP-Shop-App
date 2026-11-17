import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useToast } from '../../context/ToastContext';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const StaffBilling = () => {
  const { addToast } = useToast();
  const searchInputRef = useRef(null);

  // Search & Catalog State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);

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
  const [merchantUpiId, setMerchantUpiId] = useState('smpstores@upi');

  // Completion State
  const [submitting, setSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [lastDeliveryStatus, setLastDeliveryStatus] = useState(null);

  // Fetch available products & shop settings on mount
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

    if (searchInputRef.current) {
      searchInputRef.current.focus();
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

  // Barcode enter key trigger
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!searchQuery.trim()) return;

      try {
        const res = await api.get('/billing/search-product', {
          params: { query: searchQuery.trim() }
        });
        if (res.data.success && res.data.products?.length > 0) {
          addProductToBill(res.data.products[0]);
          setSearchQuery('');
          setSearchResults([]);
        } else {
          addToast('No product found with this barcode or name', 'warning');
        }
      } catch (err) {
        addToast('Search error', 'error');
      }
    }
  };

  const addProductToBill = (product) => {
    if (product.availableQuantity <= 0) {
      addToast(`${product.name} is currently out of stock!`, 'error');
      return;
    }

    const existingIdx = billItems.findIndex((item) => item.productId === product._id);
    if (existingIdx > -1) {
      const existing = billItems[existingIdx];
      if (existing.quantity >= product.availableQuantity) {
        addToast(`Cannot add more. In-store stock is ${product.availableQuantity}`, 'warning');
        return;
      }
      const updated = [...billItems];
      updated[existingIdx].quantity += 1;
      setBillItems(updated);
    } else {
      const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'L';
      const defaultColor = product.colours && product.colours.length > 0 ? product.colours[0] : 'Classic';
      const unitPrice = product.sellingPrice || product.originalPrice || 0;
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
          maxStock: product.availableQuantity
        }
      ]);
    }

    addToast(`Added ${product.name} to bill`, 'success');
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

  // Complete Billing
  const handleCompleteBilling = async () => {
    if (billItems.length === 0) {
      addToast('Bill is empty. Please select products first.', 'warning');
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
        addToast(`Invoice generated successfully! Notification: ${delStatus}`, 'success');

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
    <div className="fade-in">
      <div className="row g-3">
        {/* Left Column: Product Selection & Current Bill */}
        <div className="col-lg-8">
          {/* In-Stock Quick-Pick Bar */}
          {availableProducts.length > 0 ? (
            <div
              className="p-3 mb-3 rounded-3 shadow-sm d-flex flex-wrap align-items-center justify-content-between gap-3"
              style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
            >
              <div>
                <div className="small text-uppercase fw-bold text-white mb-1">
                  <i className="bi bi-boxes me-1" style={{ color: '#2563EB' }}></i> Quick Add From In-Stock Products ({availableProducts.length})
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {availableProducts.slice(0, 5).map((prod) => (
                    <button
                      key={prod._id}
                      type="button"
                      onClick={() => addProductToBill(prod)}
                      className="btn btn-sm text-start py-1 px-3 rounded-pill fw-medium"
                      style={{
                        backgroundColor: '#10243D',
                        border: '1px solid #3b82f6',
                        color: '#DCEBFF'
                      }}
                    >
                      <i className="bi bi-plus me-1 text-primary"></i>
                      {prod.name} (₹{prod.sellingPrice})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="p-3 mb-3 rounded-3 shadow-sm d-flex align-items-center justify-content-between gap-3"
              style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-info-circle-fill text-primary fs-5"></i>
                <div>
                  <div className="fw-bold text-white small">No Products Currently in Catalog</div>
                  <small style={{ color: '#B8C5D6' }}>Admin and Owner can add products anytime via Product Management.</small>
                </div>
              </div>
            </div>
          )}

          {/* Barcode & Search Bar */}
          <div
            className="p-3 mb-3 rounded-3 shadow-sm position-relative"
            style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
          >
            <div className="input-group">
              <span className="input-group-text px-3" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: '1px solid #60a5fa' }}>
                <i className="bi bi-upc-scan fs-5"></i>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control pos-search-input"
                placeholder="Scan Barcode or type Product Name / SKU (Press Enter)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>

            {/* Live Search Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div
                className="position-absolute start-0 end-0 mx-3 mt-1 rounded-3 shadow-lg z-3 overflow-hidden"
                style={{ backgroundColor: '#152A45', border: '1.5px solid #3b82f6', maxHeight: '280px', overflowY: 'auto' }}
              >
                {searchResults.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => {
                      addProductToBill(p);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="p-3 border-bottom d-flex align-items-center justify-content-between cursor-pointer"
                    style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#10243D'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div>
                      <div className="fw-bold text-white">{p.name}</div>
                      <small style={{ color: '#B8C5D6' }}>
                        SKU: {p.sku} | Barcode: {p.barcode} | In Stock: <strong className="text-success">{p.availableQuantity} units</strong>
                      </small>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-primary">₹{p.sellingPrice}</div>
                      <span className="badge rounded-pill" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>Add to Bill +</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Bill Table */}
          <div
            className="p-3 rounded-3 shadow-sm mb-3"
            style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold brand-font text-white mb-0">
                <i className="bi bi-receipt-cutoff me-2 text-primary"></i> Current POS Bill Items ({billItems.length})
              </h5>
              {billItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBillItems([])}
                  className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1"
                >
                  <i className="bi bi-trash3 me-1"></i> Clear Bill
                </button>
              )}
            </div>

            {billItems.length === 0 ? (
              <div className="text-center py-5" style={{ color: '#B8C5D6' }}>
                <i className="bi bi-cart-x display-4 mb-2 d-block" style={{ color: '#3b82f6' }}></i>
                <h6 className="fw-bold text-white">Bill is currently empty</h6>
                <p className="small mb-0">Scan a product barcode or use the search bar above to begin billing.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle pos-table">
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
                      const itemTotal = (item.unitPrice * item.quantity) + ((item.unitPrice * item.quantity * item.gstPercent) / 100);
                      return (
                        <tr key={idx}>
                          <td>
                            <div className="fw-bold text-white">{item.productName}</div>
                            <small style={{ color: '#B8C5D6' }}>SKU: {item.sku}</small>
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: '#10243D', color: '#DCEBFF', border: '1px solid #293D58' }}>
                              {item.size} | {item.colour}
                            </span>
                          </td>
                          <td className="text-end fw-semibold">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="text-center">
                            <div className="input-group input-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => updateQuantity(idx, item.quantity - 1)}
                              >
                                -
                              </button>
                              <span className="form-control text-center fw-bold px-1">{item.quantity}</span>
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => updateQuantity(idx, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="text-end text-warning small">{item.gstPercent}%</td>
                          <td className="text-end fw-bold text-white">₹{itemTotal.toFixed(2)}</td>
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
          <div
            className="p-3 mb-3 rounded-3 shadow-sm"
            style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="fw-bold brand-font text-white mb-0">
                <i className="bi bi-person-lines-fill me-1 text-primary"></i> Customer Information
              </h6>
              {lookupCustomer && previousInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="btn btn-outline-primary btn-sm py-0 px-2 rounded-pill fw-semibold"
                  style={{ fontSize: '0.75rem', borderColor: '#3b82f6', color: '#DCEBFF' }}
                >
                  <i className="bi bi-clock-history me-1"></i> Past Purchases ({previousInvoices.length})
                </button>
              )}
            </div>

            <div className="mb-2">
              <label className="form-label small fw-bold text-uppercase" style={{ color: '#B8C5D6', fontSize: '0.72rem' }}>
                Customer Mobile Number <span className="text-danger">*</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">+91</span>
                <input
                  type="tel"
                  maxLength="10"
                  required
                  placeholder="10-digit mobile number"
                  className="form-control"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label small fw-bold text-uppercase" style={{ color: '#B8C5D6', fontSize: '0.72rem' }}>
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
              <label className="form-label small fw-bold text-uppercase" style={{ color: '#B8C5D6', fontSize: '0.72rem' }}>
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

            {/* Notification & WhatsApp / SMS Policy */}
            <div className="p-2 rounded-3 mt-3" style={{ backgroundColor: '#10243D', border: '1px solid #293D58' }}>
              <div className="d-flex align-items-center justify-content-between mb-1">
                <small className="fw-semibold text-white d-flex align-items-center gap-1">
                  <i className="bi bi-bell-fill text-primary"></i> Bill Receipt Delivery
                </small>
                <span className="badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)', color: '#DCEBFF', border: '1px solid #3b82f6', fontSize: '0.68rem' }}>
                  WhatsApp + SMS Fallback
                </span>
              </div>
              <small className="d-block" style={{ color: '#B8C5D6', fontSize: '0.72rem' }}>
                Automatic delivery sends official WhatsApp notification. If unavailable, falls back to SMS instantly.
              </small>
            </div>
          </div>

          {/* Bill Calculation & Payment Options */}
          <div
            className="p-4 rounded-3 shadow-sm"
            style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
          >
            <h5 className="fw-bold brand-font text-white mb-3 border-bottom pb-2" style={{ borderColor: '#293D58' }}>
              Bill Breakdown & Payment
            </h5>

            <div className="d-flex justify-content-between py-1 small">
              <span style={{ color: '#B8C5D6' }}>Subtotal (Excl. Tax):</span>
              <span className="fw-semibold text-white">₹{totals.subtotal.toFixed(2)}</span>
            </div>

            {/* Discount Inputs */}
            <div className="py-2 border-top border-bottom my-2" style={{ borderColor: '#293D58' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-white">Counter Discount</span>
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
                className="form-control form-control-sm text-end fw-bold"
                placeholder={discountType === 'flat' ? '₹ Discount' : '% Discount'}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
            </div>

            {totals.overallDiscount > 0 && (
              <div className="d-flex justify-content-between py-1 small text-danger">
                <span>Discount Applied:</span>
                <span className="fw-bold">-₹{totals.overallDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="d-flex justify-content-between py-1 small">
              <span style={{ color: '#B8C5D6' }}>CGST (2.5%):</span>
              <span className="text-white">₹{totals.cgst.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between py-1 small">
              <span style={{ color: '#B8C5D6' }}>SGST (2.5%):</span>
              <span className="text-white">₹{totals.sgst.toFixed(2)}</span>
            </div>

            {hasDelivery && (
              <div className="d-flex justify-content-between py-1 small text-primary">
                <span>Delivery Charge:</span>
                <span className="fw-bold">+₹{totals.deliveryFee.toFixed(2)}</span>
              </div>
            )}

            <hr className="my-2" style={{ borderColor: '#293D58' }} />

            <div className="d-flex justify-content-between py-2 align-items-center">
              <span className="fw-bold fs-6 text-white">Final Payable:</span>
              <span className="fs-3 fw-bold" style={{ color: '#60a5fa' }}>₹{totals.grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-3">
              <label className="small fw-bold text-uppercase mb-2 d-block" style={{ color: '#B8C5D6' }}>
                Select Payment Mode
              </label>

              {/* 4 Mode Grid with Scan / Pay by QR */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('POS_CASH')}
                    className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-1 ${
                      paymentMethod === 'POS_CASH' ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                  >
                    <i className="bi bi-cash-stack"></i> Cash
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('POS_UPI_QR')}
                    className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-1 ${
                      paymentMethod === 'POS_UPI_QR' ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                    style={paymentMethod === 'POS_UPI_QR' ? { border: '2px solid #60a5fa' } : {}}
                  >
                    <i className="bi bi-qr-code-scan"></i> Scan / Pay QR
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('POS_CARD')}
                    className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-1 ${
                      paymentMethod === 'POS_CARD' ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                  >
                    <i className="bi bi-credit-card"></i> Card
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('POS_UPI')}
                    className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-1 ${
                      paymentMethod === 'POS_UPI' ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                  >
                    <i className="bi bi-phone"></i> Manual UPI
                  </button>
                </div>
              </div>

              {/* Interactive Dynamic QR Payment Box */}
              {paymentMethod === 'POS_UPI_QR' && (
                <div
                  className="p-3 rounded-3 text-center mb-3 fade-in"
                  style={{ backgroundColor: '#10243D', border: '1.5px solid #3b82f6' }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="badge" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>
                      <i className="bi bi-qr-code me-1"></i> Dynamic UPI QR
                    </span>
                    <span className="fw-bold fs-6 text-white">₹{totals.grandTotal.toFixed(2)}</span>
                  </div>

                  <div className="upi-qr-card my-2">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      className="img-fluid"
                      style={{ width: '180px', height: '180px' }}
                    />
                  </div>

                  <div className="small mb-2 text-white">
                    Merchant UPI ID: <strong className="font-monospace text-primary">{merchantUpiId}</strong>
                  </div>

                  <div className="d-flex justify-content-center gap-1 mb-3 flex-wrap">
                    <span className="badge" style={{ backgroundColor: '#152A45', color: '#DCEBFF', border: '1px solid #293D58', fontSize: '0.65rem' }}>GPay</span>
                    <span className="badge" style={{ backgroundColor: '#152A45', color: '#DCEBFF', border: '1px solid #293D58', fontSize: '0.65rem' }}>PhonePe</span>
                    <span className="badge" style={{ backgroundColor: '#152A45', color: '#DCEBFF', border: '1px solid #293D58', fontSize: '0.65rem' }}>Paytm</span>
                    <span className="badge" style={{ backgroundColor: '#152A45', color: '#DCEBFF', border: '1px solid #293D58', fontSize: '0.65rem' }}>BHIM</span>
                  </div>

                  {/* Payment Verification Field */}
                  <div className="text-start">
                    <label className="form-label small fw-bold text-uppercase" style={{ color: '#DCEBFF', fontSize: '0.72rem' }}>
                      Customer UPI UTR / Reference Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength="16"
                      placeholder="Enter 12-digit UTR from customer app"
                      className="form-control form-control-sm font-monospace"
                      value={qrUtr}
                      onChange={(e) => setQrUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    />
                    <small style={{ color: '#B8C5D6', fontSize: '0.7rem' }}>
                      <i className="bi bi-shield-check text-primary me-1"></i> Verify UTR on customer screen before confirming payment.
                    </small>
                  </div>
                </div>
              )}
            </div>

            {/* Complete Billing Button */}
            <button
              type="button"
              disabled={submitting || billItems.length === 0 || (paymentMethod === 'POS_UPI_QR' && qrUtr.trim().length < 6)}
              onClick={handleCompleteBilling}
              className="btn btn-primary btn-lg w-100 rounded-pill fw-bold shadow mt-3 py-3 text-uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)',
                border: '1px solid #60a5fa',
                color: '#FFFFFF'
              }}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Processing Invoice...
                </>
              ) : paymentMethod === 'POS_UPI_QR' ? (
                `Verify QR Payment & Generate Bill (₹${totals.grandTotal.toFixed(2)})`
              ) : (
                `Generate Paid Bill (₹${totals.grandTotal.toFixed(2)})`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Past Purchase History Modal */}
      {showHistoryModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg" style={{ backgroundColor: '#152A45', border: '1.5px solid #293D58' }}>
              <div className="modal-header border-bottom py-3 px-4" style={{ backgroundColor: '#10243D', borderColor: '#293D58' }}>
                <h5 className="modal-title fw-bold brand-font text-white">
                  <i className="bi bi-clock-history text-primary me-2"></i>
                  Previous Purchases: {lookupCustomer?.fullName} ({customerPhone})
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowHistoryModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Payment Mode</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousInvoices.map((inv) => (
                        <tr key={inv._id}>
                          <td className="font-monospace fw-bold text-primary">{inv.invoiceNumber}</td>
                          <td>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                          <td>
                            {inv.items?.map((it, idx) => (
                              <span key={idx} className="badge me-1" style={{ backgroundColor: '#10243D', color: '#DCEBFF', border: '1px solid #293D58' }}>
                                {it.productName} ({it.quantity})
                              </span>
                            ))}
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: '#10243D', color: '#DCEBFF', border: '1px solid #293D58' }}>
                              {inv.paymentMethod}
                            </span>
                          </td>
                          <td className="text-end fw-bold text-white">₹{inv.grandTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer border-top py-3 px-4" style={{ backgroundColor: '#10243D', borderColor: '#293D58' }}>
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowHistoryModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instant Tax Invoice & Print Modal */}
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
