import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const StaffBilling = () => {
  const { addToast } = useToast();
  const searchInputRef = useRef(null);

  // Search & Catalog State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [flagshipShirt, setFlagshipShirt] = useState(null);

  // Bill Items
  const [billItems, setBillItems] = useState([]);

  // Customer Info & Phone Lookup
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [lookupCustomer, setLookupCustomer] = useState(null);
  const [previousInvoices, setPreviousInvoices] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [consentWhatsApp, setConsentWhatsApp] = useState(false);
  const [sendWhatsAppInvoice, setSendWhatsAppInvoice] = useState(true);

  // Delivery & Discount
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [discountType, setDiscountType] = useState('flat'); // 'flat' or 'percent'
  const [discountValue, setDiscountValue] = useState(0);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState('POS_CASH'); // POS_CASH, POS_CARD, POS_UPI

  // Completion State
  const [submitting, setSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);

  // Fetch flagship product & delivery default on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const prodRes = await api.get('/products');
        if (prodRes.data.success && prodRes.data.products?.length > 0) {
          setFlagshipShirt(prodRes.data.products[0]);
        }
      } catch (err) {
        console.error('Error fetching initial POS products:', err.message);
      }
    };
    fetchInitialData();

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
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
            setConsentWhatsApp(res.data.customer.consentPromotionalWhatsApp || false);
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
          addToast('No product found with this barcode/query', 'warning');
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
      const defaultColor = product.colours && product.colours.length > 0 ? product.colours[0] : 'Classic White';
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
        sendWhatsAppInvoice,
        paymentMethod,
        paymentStatus: 'PAID'
      });

      if (res.data.success) {
        addToast(res.data.message || 'Invoice generated successfully!', 'success');
        setCreatedInvoice(res.data.invoice);

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
          {/* Quick Add Bar for Flagship Shirt */}
          {flagshipShirt && (
            <div className="smp-card p-3 bg-white mb-3 shadow-sm border-primary border-opacity-50 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <img
                  src={flagshipShirt.images && flagshipShirt.images[0] ? flagshipShirt.images[0] : 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=150&q=80'}
                  alt={flagshipShirt.name}
                  className="rounded-3"
                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                />
                <div>
                  <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                    {flagshipShirt.name}
                    <span className="badge bg-primary-subtle text-primary">₹{flagshipShirt.sellingPrice} + 5% GST</span>
                  </div>
                  <small className="text-muted">
                    SKU: {flagshipShirt.sku} | Barcode: {flagshipShirt.barcode} | In Stock: <strong>{flagshipShirt.availableQuantity} units</strong>
                  </small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => addProductToBill(flagshipShirt)}
                className="btn btn-primary fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2"
              >
                <i className="bi bi-plus-circle-fill"></i> Add Shirt to Bill
              </button>
            </div>
          )}

          {/* Barcode & Search Bar */}
          <div className="smp-card p-3 bg-white mb-3 shadow-sm position-relative">
            <div className="input-group">
              <span className="input-group-text bg-primary text-white px-3">
                <i className="bi bi-upc-scan fs-5"></i>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control pos-search-input"
                placeholder="Scan Barcode (890123450001) or type SKU / Shirt (Press Enter)..."
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

            {/* Instant Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div
                className="position-absolute start-0 end-0 bg-white border rounded-3 shadow-lg p-2 mx-3"
                style={{ top: '100%', zIndex: 100, maxHeight: '320px', overflowY: 'auto' }}
              >
                {searchResults.map((prod) => (
                  <div
                    key={prod._id}
                    onClick={() => {
                      addProductToBill(prod);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="p-2 d-flex align-items-center justify-content-between rounded-2 hover-bg-light cursor-pointer border-bottom"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-secondary">{prod.sku}</span>
                      <span className="fw-semibold text-dark">{prod.name}</span>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <span className="badge bg-success-subtle text-success">
                        Stock: {prod.availableQuantity}
                      </span>
                      <span className="fw-bold text-primary">₹{prod.sellingPrice}</span>
                      <button type="button" className="btn btn-sm btn-primary py-0 px-2 rounded-pill">
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Bill Items Table */}
          <div className="smp-card p-3 bg-white mb-3 shadow-sm" style={{ minHeight: '380px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h5 className="fw-bold brand-font mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-receipt text-primary"></i> Current Bill Line Items
                <span className="badge bg-primary text-white rounded-pill fs-6 px-2 py-0">
                  {billItems.length}
                </span>
              </h5>
              {billItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBillItems([])}
                  className="btn btn-outline-danger btn-sm rounded-pill px-3"
                >
                  <i className="bi bi-trash3 me-1"></i> Clear Bill
                </button>
              )}
            </div>

            {billItems.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-cart3 display-4 text-secondary mb-2 d-block"></i>
                <h6>POS Bill is Empty</h6>
                <p className="small text-muted">Click "+ Add Shirt to Bill" above or scan barcode to add item.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover pos-table align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: '4%' }}>#</th>
                      <th style={{ width: '36%' }}>Product Details</th>
                      <th className="text-end" style={{ width: '15%' }}>Unit Price</th>
                      <th className="text-center" style={{ width: '18%' }}>Quantity</th>
                      <th className="text-end" style={{ width: '10%' }}>GST</th>
                      <th className="text-end" style={{ width: '15%' }}>Total</th>
                      <th style={{ width: '2%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map((item, idx) => {
                      const itemTotal = item.unitPrice * item.quantity;
                      const itemGst = (itemTotal * (item.gstPercent || 5)) / 100;
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <div className="fw-bold text-dark">{item.productName}</div>
                            <small className="text-muted">
                              SKU: {item.sku} | Barcode: {item.barcode} | Size: {item.size}
                            </small>
                          </td>
                          <td className="text-end fw-semibold">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="text-center">
                            <div className="input-group input-group-sm mx-auto" style={{ width: '110px' }}>
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => updateQuantity(idx, item.quantity - 1)}
                              >
                                -
                              </button>
                              <span className="form-control text-center fw-bold">{item.quantity}</span>
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => updateQuantity(idx, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="text-end small text-muted">{item.gstPercent || 5}%</td>
                          <td className="text-end fw-bold text-primary">₹{(itemTotal + itemGst).toFixed(2)}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              onClick={() => removeBillItem(idx)}
                              className="btn btn-link text-danger p-0"
                            >
                              <i className="bi bi-x-circle-fill"></i>
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

        {/* Right Column: Customer Details, Delivery, Discounts & Complete Bill */}
        <div className="col-lg-4">
          {/* Customer Details & History Lookup Card */}
          <div className="smp-card p-3 bg-white mb-3 shadow-sm border-start border-4 border-primary">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="fw-bold brand-font mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-person-fill text-primary"></i> Customer Details
              </h6>
              {lookupCustomer ? (
                <span className="badge bg-success-subtle text-success fw-bold">
                  <i className="bi bi-check2-circle me-1"></i> Existing Customer
                </span>
              ) : customerPhone.length === 10 ? (
                <span className="badge bg-info-subtle text-info fw-bold">
                  New Customer
                </span>
              ) : null}
            </div>

            <div className="row g-2">
              {/* Customer Mobile (Required) */}
              <div className="col-12">
                <label className="form-label small fw-bold text-muted text-uppercase mb-1">
                  Customer Mobile Number <span className="text-danger">*</span>
                </label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light">+91</span>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit Mobile"
                    className="form-control form-control-sm fw-bold"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
              </div>

              {/* Customer Full Name (Required) */}
              <div className="col-12">
                <label className="form-label small fw-bold text-muted text-uppercase mb-1">
                  Customer Full Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Customer Name"
                  className="form-control form-control-sm fw-semibold"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              {/* Previous History Banner (If Returning Customer) */}
              {lookupCustomer && (
                <div className="col-12 mt-2">
                  <div className="p-2 bg-light rounded-3 border">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Total Purchases:</span>
                      <strong className="text-dark">{lookupCustomer.totalPurchases} bills</strong>
                    </div>
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Lifetime Spend:</span>
                      <strong className="text-success">₹{lookupCustomer.totalSpend.toFixed(2)}</strong>
                    </div>
                    {previousInvoices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowHistoryModal(true)}
                        className="btn btn-outline-primary btn-sm w-100 py-1 mt-1 small"
                      >
                        <i className="bi bi-clock-history me-1"></i> View {previousInvoices.length} Past Invoices
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Promotional WhatsApp Consent */}
              <div className="col-12 mt-2">
                <div className="form-check form-switch small">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="consentCheck"
                    checked={consentWhatsApp}
                    onChange={(e) => setConsentWhatsApp(e.target.checked)}
                  />
                  <label className="form-check-label text-muted" htmlFor="consentCheck">
                    Receive WhatsApp Offers & Discounts (Consent)
                  </label>
                </div>
              </div>

              {/* Send WhatsApp Invoice Checkbox */}
              <div className="col-12">
                <div className="form-check form-switch small">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="sendBillWhatsApp"
                    checked={sendWhatsAppInvoice}
                    onChange={(e) => setSendWhatsAppInvoice(e.target.checked)}
                  />
                  <label className="form-check-label text-success fw-semibold" htmlFor="sendBillWhatsApp">
                    <i className="bi bi-whatsapp me-1"></i> Send WhatsApp Bill to Customer
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery & Billing Summary */}
          <div className="smp-card p-3 bg-white mb-3 shadow-sm">
            <h6 className="fw-bold brand-font mb-3">Billing Summary</h6>

            {/* Delivery Charge Toggle */}
            <div className="p-2 bg-light rounded-3 border mb-3">
              <div className="form-check form-switch small mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="deliveryToggle"
                  checked={hasDelivery}
                  onChange={(e) => {
                    setHasDelivery(e.target.checked);
                    if (e.target.checked && deliveryCharge === 0) setDeliveryCharge(50);
                  }}
                />
                <label className="form-check-label fw-semibold text-dark" htmlFor="deliveryToggle">
                  <i className="bi bi-truck me-1"></i> Express Home Delivery
                </label>
              </div>
              {hasDelivery && (
                <div className="input-group input-group-sm">
                  <span className="input-group-text">₹ Charge</span>
                  <input
                    type="number"
                    min="0"
                    className="form-control text-end fw-bold"
                    placeholder="50"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Line Item Breakdown */}
            <div className="d-flex justify-content-between py-1 small">
              <span className="text-muted">Subtotal:</span>
              <span className="fw-semibold">₹{totals.subtotal.toFixed(2)}</span>
            </div>

            {/* Discount Section */}
            <div className="my-2 p-2 bg-light rounded-2 border">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span className="small fw-semibold text-secondary">Apply Discount:</span>
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
                placeholder={discountType === 'flat' ? '₹ Discount Amount' : '% Discount'}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
            </div>

            {totals.overallDiscount > 0 && (
              <div className="d-flex justify-content-between py-1 small text-success">
                <span>Discount Applied:</span>
                <span className="fw-bold">-₹{totals.overallDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="d-flex justify-content-between py-1 small">
              <span className="text-muted">CGST (2.5%):</span>
              <span>₹{totals.cgst.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between py-1 small">
              <span className="text-muted">SGST (2.5%):</span>
              <span>₹{totals.sgst.toFixed(2)}</span>
            </div>

            {hasDelivery && (
              <div className="d-flex justify-content-between py-1 small text-primary">
                <span>Delivery Charge:</span>
                <span className="fw-bold">+₹{totals.deliveryFee.toFixed(2)}</span>
              </div>
            )}

            <hr className="my-2" />

            <div className="d-flex justify-content-between py-2 fs-5 fw-bold text-dark">
              <span>Final Amount:</span>
              <span className="text-primary fs-4">₹{totals.grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-3">
              <label className="small fw-bold text-uppercase text-secondary mb-2 d-block">
                Select Payment Mode
              </label>
              <div className="d-grid gap-2">
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="posPay"
                    id="payCash"
                    autoComplete="off"
                    checked={paymentMethod === 'POS_CASH'}
                    onChange={() => setPaymentMethod('POS_CASH')}
                  />
                  <label className="btn btn-outline-success fw-bold" htmlFor="payCash">
                    <i className="bi bi-cash me-1"></i> Cash
                  </label>

                  <input
                    type="radio"
                    className="btn-check"
                    name="posPay"
                    id="payUpi"
                    autoComplete="off"
                    checked={paymentMethod === 'POS_UPI'}
                    onChange={() => setPaymentMethod('POS_UPI')}
                  />
                  <label className="btn btn-outline-primary fw-bold" htmlFor="payUpi">
                    <i className="bi bi-qr-code me-1"></i> UPI
                  </label>

                  <input
                    type="radio"
                    className="btn-check"
                    name="posPay"
                    id="payCard"
                    autoComplete="off"
                    checked={paymentMethod === 'POS_CARD'}
                    onChange={() => setPaymentMethod('POS_CARD')}
                  />
                  <label className="btn btn-outline-dark fw-bold" htmlFor="payCard">
                    <i className="bi bi-credit-card me-1"></i> Card
                  </label>
                </div>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              type="button"
              disabled={submitting || billItems.length === 0}
              onClick={handleCompleteBilling}
              className="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow mt-4 py-3 text-uppercase tracking-wider"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Generating Bill...
                </>
              ) : (
                `Generate Bill (₹${totals.grandTotal.toFixed(2)})`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Past Purchase History Modal */}
      {showHistoryModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold brand-font">
                  <i className="bi bi-clock-history text-primary me-2"></i>
                  Previous Purchases: {lookupCustomer?.fullName} ({customerPhone})
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowHistoryModal(false)}></button>
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
                              <span key={idx} className="badge bg-light text-dark border me-1">
                                {it.productName} ({it.quantity})
                              </span>
                            ))}
                          </td>
                          <td><span className="badge bg-secondary">{inv.paymentMethod}</span></td>
                          <td className="text-end fw-bold">₹{inv.grandTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
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
