import React, { useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const createOrderRequestId = () => (
  window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const CustomerPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, fetchCart } = useCart();
  const { addToast } = useToast();

  const shippingAddress = location.state?.shippingAddress;

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const orderRequestIdRef = useRef(createOrderRequestId());
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
        requestId: orderRequestIdRef.current,
        shippingAddress,
        paymentMethod: 'COD',
        expectedGrandTotal: cart.grandTotal
      });

      if (res.data.success) {
        setConfirmedOrder({ ...res.data.order, shopInfo: res.data.shopInfo });
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
      if (err.response?.status === 409) await fetchCart();
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
            Thank you for shopping with us. Payment is due when your order is delivered.
          </p>

          <div className="bg-light p-3 rounded-3 text-start small mb-4">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Order Number:</span>
              <strong className="text-primary">{confirmedOrder.orderNumber}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Order Total:</span>
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
              shopInfo: confirmedOrder.shopInfo || {},
              customerInfo: confirmedOrder.customerDetails,
              items: confirmedOrder.items,
              subtotal: confirmedOrder.subtotal,
              totalDiscount: confirmedOrder.totalDiscount,
              cgstAmount: Math.round((confirmedOrder.totalGst / 2) * 100) / 100,
              sgstAmount: Math.round((confirmedOrder.totalGst - confirmedOrder.totalGst / 2) * 100) / 100,
              deliveryCharge: confirmedOrder.deliveryCharge,
              grandTotal: confirmedOrder.grandTotal,
              paymentMethod: confirmedOrder.paymentMethod,
              paymentStatus: confirmedOrder.paymentStatus,
              paymentDetails: confirmedOrder.paymentDetails
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

            {/* Online payments remain unavailable until the provider is configured. */}
            <div className="alert alert-warning small">
              Card and online UPI payments are temporarily unavailable because a verified payment provider is not configured.
            </div>

            {/* UPI Option */}
            <div className="p-3 rounded-3 border mb-3 bg-light">
              <div className="form-check d-flex align-items-center gap-3">
                <input
                  type="radio"
                  name="paymentMode"
                  id="payUpi"
                  className="form-check-input"
                  disabled
                />
                <label className="form-check-label fw-bold d-flex align-items-center gap-2 cursor-pointer w-100" htmlFor="payUpi">
                  <i className="bi bi-qr-code text-primary fs-5"></i>
                  <div>
                    <div>Online UPI</div>
                    <small className="text-muted fw-normal">Unavailable until payment processing is configured.</small>
                  </div>
                </label>
              </div>
            </div>

            {/* Card Option */}
            <div className="p-3 rounded-3 border mb-3 bg-light">
              <div className="form-check d-flex align-items-center gap-3">
                <input
                  type="radio"
                  name="paymentMode"
                  id="payCard"
                  className="form-check-input"
                  disabled
                />
                <label className="form-check-label fw-bold d-flex align-items-center gap-2 cursor-pointer w-100" htmlFor="payCard">
                  <i className="bi bi-credit-card-2-front text-primary fs-5"></i>
                  <div>
                    <div>Credit / Debit Card (Visa, MasterCard, RuPay)</div>
                    <small className="text-muted fw-normal">Unavailable until payment processing is configured.</small>
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
              Cash on Delivery orders are created with payment status pending until the payment is collected.
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading || cart.items.length === 0 || cart.items.some((item) => item.isAvailable === false)}
              className="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow-sm py-3 text-uppercase"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Processing Order...
                </>
              ) : (
                `Place COD Order · ₹${(cart.grandTotal || 0).toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPayment;
