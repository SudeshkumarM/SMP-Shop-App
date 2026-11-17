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

  // Bill Items
  const [billItems, setBillItems] = useState([]);

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Discount
  const [discountType, setDiscountType] = useState('flat'); // 'flat' or 'percent'
  const [discountValue, setDiscountValue] = useState(0);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState('POS_CASH'); // POS_CASH, POS_CARD, POS_UPI

  // Completion State
  const [submitting, setSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

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
    }, 300);

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
          // If exact barcode/sku match or first match, add directly to bill
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
      const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Standard';
      const defaultColor = product.colours && product.colours.length > 0 ? product.colours[0] : 'Default';
      const unitPrice = product.sellingPrice || product.originalPrice;
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
    const grandTotal = Math.round((netSubtotal + totalGst) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      cgst: Math.round((totalGst / 2) * 100) / 100,
      sgst: Math.round((totalGst / 2) * 100) / 100,
      overallDiscount: Math.round(overallDiscount * 100) / 100,
      grandTotal
    };
  };

  const totals = calculateTotals();

  // Complete Billing
  const handleCompleteBilling = async () => {
    if (billItems.length === 0) {
      addToast('Bill is empty. Please add products first.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/billing/create-bill', {
        items: billItems,
        discountType,
        discountValue,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '9876543210',
        customerEmail,
        paymentMethod,
        paymentStatus: 'PAID'
      });

      if (res.data.success) {
        addToast(res.data.message, 'success');
        setCreatedInvoice(res.data.invoice);
        // Clear current bill
        setBillItems([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setDiscountValue(0);
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
        {/* Left Column: Product Search & Bill Items Table */}
        <div className="col-lg-8">
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
                placeholder="Scan Barcode or type Product Name / SKU / Brand (Press Enter to add)..."
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
                      <small className="text-muted">({prod.brand})</small>
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
          <div className="smp-card p-3 bg-white mb-3 shadow-sm" style={{ minHeight: '440px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h5 className="fw-bold brand-font mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-receipt text-primary"></i> Current Bill Line Items
                <span className="badge bg-primary-subtle text-primary rounded-pill fs-6 px-2 py-0">
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
                <p className="small text-muted">Scan item barcode or search products above to start billing.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover pos-table align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: '4%' }}>#</th>
                      <th style={{ width: '38%' }}>Product Details</th>
                      <th className="text-end" style={{ width: '14%' }}>Unit Price</th>
                      <th className="text-center" style={{ width: '18%' }}>Quantity</th>
                      <th className="text-end" style={{ width: '10%' }}>GST</th>
                      <th className="text-end" style={{ width: '16%' }}>Total</th>
                      <th style={{ width: '5%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map((item, idx) => {
                      const itemTotal = (item.unitPrice * item.quantity);
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

        {/* Right Column: Customer Details, Discounts, Payment & Complete Bill */}
        <div className="col-lg-4">
          {/* Customer Lookup Card */}
          <div className="smp-card p-3 bg-white mb-3 shadow-sm">
            <h6 className="fw-bold brand-font mb-2 d-flex align-items-center gap-2">
              <i className="bi bi-person-fill text-primary"></i> Customer Information
            </h6>
            <div className="row g-2">
              <div className="col-12">
                <input
                  type="tel"
                  placeholder="Customer Mobile (e.g. 9876543210)"
                  className="form-control form-control-sm"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
              <div className="col-12">
                <input
                  type="text"
                  placeholder="Customer Full Name (Optional)"
                  className="form-control form-control-sm"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bill Calculation & Discounts */}
          <div className="smp-card p-3 bg-white mb-3 shadow-sm">
            <h6 className="fw-bold brand-font mb-3">Billing Summary</h6>

            <div className="d-flex justify-content-between py-1 small">
              <span className="text-muted">Subtotal:</span>
              <span className="fw-semibold">₹{totals.subtotal.toFixed(2)}</span>
            </div>

            {/* Custom Bill Discount */}
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

            <hr className="my-2" />

            <div className="d-flex justify-content-between py-2 fs-5 fw-bold text-dark">
              <span>Grand Total:</span>
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
                  Processing Sale...
                </>
              ) : (
                `Complete Sale (₹${totals.grandTotal.toFixed(2)})`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Instant Thermal / Tax Invoice Modal */}
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
