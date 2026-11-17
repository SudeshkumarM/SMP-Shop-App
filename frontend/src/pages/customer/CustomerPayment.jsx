import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const CustomerPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, fetchCart } = useCart();
  const { addToast } = useToast();

  const shippingAddress = location.state?.shippingAddress;

  const [paymentMethod, setPaymentMethod] = useState('ONLINE'); // 'ONLINE' or 'COD'
  const [onlineType, setOnlineType] = useState('UPI'); // 'UPI', 'CARD', 'NETBANKING'
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!shippingAddress) {
      addToast('Missing delivery address. Please return to checkout.', 'error');
      navigate('/customer/checkout');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/orders', {
        shippingAddress,
        paymentMethod: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
        notes: `Online Payment via ${onlineType}`
      });

      if (res.data.success) {
        setConfirmedOrder(res.data.order);
        // Trigger celebratory confetti
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
        await fetchCart();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment processing failed';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="container py-5 text-center fade-in">
        <div className="smp-card p-5 mx-auto bg-white border-0 shadow" style={{ maxWidth: '640px' }}>
          <div
            className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3 p-3 shadow"
            style={{ width: '80px', height: '80px' }}
          >
            <i className="bi bi-check-lg display-4"></i>
          </div>

          <h2 className="fw-bold brand-font text-success mb-1">Order Confirmed!</h2>
          <p className="text-muted mb-4">
            Thank you for shopping with <strong>SMP Elite Fashions</strong>!
          </p>

          <div className="bg-light p-3 rounded-3 text-start small mb-4">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Order Number:</span>
              <strong className="text-primary">{confirmedOrder.orderNumber}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Total Paid:</span>
              <strong className="fs-6">₹{confirmedOrder.grandTotal?.toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Payment Mode:</span>
              <span>{confirmedOrder.paymentMethod} ({confirmedOrder.paymentStatus})</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">Delivery Address:</span>
              <span>{confirmedOrder.customerDetails?.shippingAddress?.street}, {confirmedOrder.customerDetails?.shippingAddress?.city}</span>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 justify-content-center">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="btn btn-outline-primary rounded-pill px-4 fw-semibold"
            >
              <i className="bi bi-file-earmark-pdf me-1"></i> View Tax Invoice
            </button>
            <Link to="/customer/orders" className="btn btn-primary rounded-pill px-4 fw-semibold">
              <i className="bi bi-box-seam me-1"></i> Track My Orders
            </Link>
          </div>
        </div>

        {showInvoiceModal && (
          <InvoicePrintModal
            invoice={{
              invoiceNumber: confirmedOrder.invoiceNumber || `INV-${confirmedOrder.orderNumber}`,
              createdAt: confirmedOrder.createdAt,
              shopInfo: {
                name: 'SMP Elite Fashions',
                address: '100 Feet Road, Anna Nagar, Chennai - 600040',
                phone: '+91 98400 12345',
                gstNumber: '33AAAAA0000A1Z5'
              },
              customerInfo: confirmedOrder.customerDetails,
              items: confirmedOrder.items,
              subtotal: confirmedOrder.subtotal,
              totalDiscount: confirmedOrder.totalDiscount,
              cgstAmount: Math.round((confirmedOrder.totalGst / 2) * 100) / 100,
              sgstAmount: Math.round((confirmedOrder.totalGst / 2) * 100) / 100,
              grandTotal: confirmedOrder.grandTotal,
              paymentMethod: confirmedOrder.paymentMethod,
              paymentStatus: confirmedOrder.paymentStatus
            }}
            onClose={() => setShowInvoiceModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container py-4 fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="fw-bold brand-font mb-0">Select Payment Method</h2>
        <div className="d-flex align-items-center gap-2">
          <Link to="/customer/checkout" className="btn btn-outline-secondary btn-sm rounded-pill px-3">
            <i className="bi bi-arrow-left me-1"></i> Back to Shipping
          </Link>
        </div>
      </div>

      <div className="row g-4">
        {/* Payment Methods Selection */}
        <div className="col-lg-8">
          <div className="smp-card p-4 bg-white mb-4">
            <h5 className="fw-bold brand-font mb-3">Choose Payment Mode</h5>

            {/* UPI Option */}
            <div className={`p-3 rounded-3 border mb-3 cursor-pointer ${paymentMethod === 'ONLINE' && onlineType === 'UPI' ? 'border-primary bg-primary-subtle' : 'bg-light'}`}>
              <div className="form-check d-flex align-items-center gap-3">
                <input
                  type="radio"
                  name="paymentMode"
                  id="payUpi"
                  className="form-check-input"
                  checked={paymentMethod === 'ONLINE' && onlineType === 'UPI'}
                  onChange={() => { setPaymentMethod('ONLINE'); setOnlineType('UPI'); }}
                />
                <label className="form-check-label fw-bold d-flex align-items-center gap-2 cursor-pointer w-100" htmlFor="payUpi">
                  <i className="bi bi-qr-code text-primary fs-5"></i>
                  <div>
                    <div>Instant UPI (Google Pay, PhonePe, Paytm, QR)</div>
                    <small className="text-muted fw-normal">Zero transaction fee, immediate confirmation</small>
                  </div>
                </label>
              </div>

              {paymentMethod === 'ONLINE' && onlineType === 'UPI' && (
                <div className="mt-3 pt-3 border-top">
                  <label className="form-label small fw-semibold">Enter UPI ID (e.g. mobile@upi)</label>
                  <div className="input-group" style={{ maxWidth: '360px' }}>
                    <input
                      type="text"
                      placeholder="username@okhdfcbank"
                      className="form-control"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                    <span className="input-group-text bg-success text-white small">Verified</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card Option */}
            <div className={`p-3 rounded-3 border mb-3 cursor-pointer ${paymentMethod === 'ONLINE' && onlineType === 'CARD' ? 'border-primary bg-primary-subtle' : 'bg-light'}`}>
              <div className="form-check d-flex align-items-center gap-3">
                <input
                  type="radio"
                  name="paymentMode"
                  id="payCard"
                  className="form-check-input"
                  checked={paymentMethod === 'ONLINE' && onlineType === 'CARD'}
                  onChange={() => { setPaymentMethod('ONLINE'); setOnlineType('CARD'); }}
                />
                <label className="form-check-label fw-bold d-flex align-items-center gap-2 cursor-pointer w-100" htmlFor="payCard">
                  <i className="bi bi-credit-card-2-front text-primary fs-5"></i>
                  <div>
                    <div>Credit / Debit Card (Visa, MasterCard, RuPay)</div>
                    <small className="text-muted fw-normal">PCI-DSS Encrypted sandbox checkout</small>
                  </div>
                </label>
              </div>
            </div>

            {/* Cash on Delivery */}
            <div className={`p-3 rounded-3 border cursor-pointer ${paymentMethod === 'COD' ? 'border-primary bg-primary-subtle' : 'bg-light'}`}>
              <div className="form-check d-flex align-items-center gap-3">
                <input
                  type="radio"
                  name="paymentMode"
                  id="payCod"
                  className="form-check-input"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                />
                <label className="form-check-label fw-bold d-flex align-items-center gap-2 cursor-pointer w-100" htmlFor="payCod">
                  <i className="bi bi-cash-stack text-success fs-5"></i>
                  <div>
                    <div>Cash on Delivery (COD)</div>
                    <small className="text-muted fw-normal">Pay cash or UPI to delivery agent at your doorstep</small>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Total & Place Order Button */}
        <div className="col-lg-4">
          <div className="smp-card p-4 bg-white sticky-top" style={{ top: '80px' }}>
            <h5 className="fw-bold brand-font text-uppercase text-secondary mb-3 border-bottom pb-2" style={{ fontSize: '0.9rem' }}>
              Final Amount
            </h5>

            <div className="d-flex justify-content-between py-2 border-bottom small">
              <span className="text-muted">Total Payable</span>
              <span className="fw-bold fs-5 text-primary">₹{(cart.grandTotal || 0).toFixed(2)}</span>
            </div>

            <div className="small text-muted my-3">
              <i className="bi bi-shield-check text-success me-1"></i>
              Safe & Encrypted 256-Bit SSL Checkout. No raw payment credentials stored.
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow-sm py-3 text-uppercase"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Processing Order...
                </>
              ) : (
                `Pay ₹${(cart.grandTotal || 0).toFixed(2)} & Place Order`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPayment;
