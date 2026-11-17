import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const CustomerCheckout = () => {
  const navigate = useNavigate();
  const { cart, itemCount } = useCart();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // New address form toggle
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ title: 'Home', street: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '' });

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await api.get('/customer/addresses');
        if (res.data.success && res.data.addresses.length > 0) {
          setAddresses(res.data.addresses);
        } else {
          setShowNewAddress(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAddresses();
  }, []);

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    if (!newAddr.street || !newAddr.pincode) {
      addToast('Please provide street address and pincode', 'warning');
      return;
    }

    try {
      const res = await api.post('/customer/addresses', { ...newAddr, isDefault: true });
      if (res.data.success) {
        addToast('Address added!', 'success');
        setAddresses(res.data.addresses);
        setSelectedAddressIndex(res.data.addresses.length - 1);
        setShowNewAddress(false);
      }
    } catch (err) {
      addToast('Failed to save address', 'error');
    }
  };

  const handleProceedToPayment = () => {
    let chosenAddress = null;
    if (addresses.length > 0) {
      chosenAddress = addresses[selectedAddressIndex];
    } else if (newAddr.street) {
      chosenAddress = newAddr;
    }

    if (!chosenAddress || !chosenAddress.street) {
      addToast('Please select or add a shipping address', 'warning');
      return;
    }

    // Pass chosen address to payment route
    navigate('/customer/payment', { state: { shippingAddress: chosenAddress } });
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h4>No items in cart to checkout</h4>
        <Link to="/products" className="btn btn-primary rounded-pill mt-3">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="container py-4 fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="fw-bold brand-font mb-0">Checkout & Delivery Details</h2>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary px-3 py-2 rounded-pill">Step 1 of 2: Shipping</span>
          <span className="badge bg-light text-muted border px-3 py-2 rounded-pill">Step 2: Payment</span>
        </div>
      </div>

      <div className="row g-4">
        {/* Shipping Address Selection */}
        <div className="col-lg-8">
          <div className="smp-card p-4 bg-white mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold brand-font mb-0">1. Select Delivery Address</h5>
              <button
                type="button"
                onClick={() => setShowNewAddress(!showNewAddress)}
                className="btn btn-outline-primary btn-sm rounded-pill px-3"
              >
                <i className="bi bi-plus-lg me-1"></i> Add New Address
              </button>
            </div>

            {/* Existing Addresses */}
            {addresses.length > 0 && !showNewAddress && (
              <div className="d-flex flex-column gap-3 mb-3">
                {addresses.map((addr, idx) => (
                  <label
                    key={addr._id || idx}
                    className={`p-3 rounded-3 border cursor-pointer d-flex align-items-start gap-3 ${
                      selectedAddressIndex === idx ? 'border-primary bg-primary-subtle' : 'bg-light'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      type="radio"
                      name="shippingAddress"
                      className="form-check-input mt-1"
                      checked={selectedAddressIndex === idx}
                      onChange={() => setSelectedAddressIndex(idx)}
                    />
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fw-bold text-dark">{user?.name}</span>
                        <span className="badge bg-secondary text-uppercase">{addr.title}</span>
                        {addr.isDefault && <span className="badge bg-primary">Default</span>}
                      </div>
                      <div className="small text-dark mb-1">{addr.street}</div>
                      <div className="small text-muted">{addr.city}, {addr.state} - {addr.pincode}</div>
                      <div className="small text-muted">Mobile: <strong>{user?.phone || '9876543210'}</strong></div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* New Address Form */}
            {showNewAddress && (
              <form onSubmit={handleAddNewAddress} className="p-3 bg-light rounded-3 border mb-3">
                <h6 className="fw-bold mb-3">Add New Delivery Address</h6>
                <div className="row g-2">
                  <div className="col-sm-6">
                    <label className="form-label small">Address Label</label>
                    <input
                      type="text"
                      placeholder="Home, Office, Apartment..."
                      className="form-control form-control-sm"
                      value={newAddr.title}
                      onChange={(e) => setNewAddr({ ...newAddr, title: e.target.value })}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small">Pincode *</label>
                    <input
                      type="text"
                      required
                      placeholder="600001"
                      className="form-control form-control-sm"
                      value={newAddr.pincode}
                      onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Street Address / Landmark *</label>
                    <input
                      type="text"
                      required
                      placeholder="Flat / House No, Street name"
                      className="form-control form-control-sm"
                      value={newAddr.street}
                      onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small">City *</label>
                    <input
                      type="text"
                      required
                      className="form-control form-control-sm"
                      value={newAddr.city}
                      onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small">State *</label>
                    <input
                      type="text"
                      required
                      className="form-control form-control-sm"
                      value={newAddr.state}
                      onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3">
                  {addresses.length > 0 && (
                    <button type="button" onClick={() => setShowNewAddress(false)} className="btn btn-sm btn-outline-secondary">
                      Use Existing Address
                    </button>
                  )}
                  <button type="submit" className="btn btn-sm btn-primary">
                    Save and Use This Address
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Order Items Review */}
          <div className="smp-card p-4 bg-white">
            <h5 className="fw-bold brand-font mb-3">2. Order Items ({itemCount})</h5>
            <div className="d-flex flex-column gap-3">
              {cart.items.map((item) => (
                <div key={item._id} className="d-flex align-items-center justify-content-between gap-3 border-bottom pb-2">
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={item.productId?.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=200&q=80'}
                      alt="Product"
                      className="rounded-2 object-fit-cover"
                      style={{ width: '50px', height: '50px' }}
                    />
                    <div>
                      <div className="fw-semibold small">{item.productId?.name}</div>
                      <small className="text-muted">
                        Size: {item.variant?.size || 'Std'} | Qty: {item.quantity}
                      </small>
                    </div>
                  </div>
                  <div className="fw-bold small">₹{item.finalPrice}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Price Details */}
        <div className="col-lg-4">
          <div className="smp-card p-4 bg-white sticky-top" style={{ top: '80px' }}>
            <h5 className="fw-bold brand-font text-uppercase text-secondary mb-3 border-bottom pb-2" style={{ fontSize: '0.9rem' }}>
              Price Breakdown
            </h5>

            <div className="d-flex justify-content-between py-2 border-bottom small">
              <span className="text-muted">Subtotal ({itemCount} items)</span>
              <span className="fw-semibold">₹{(cart.subtotal || 0).toFixed(2)}</span>
            </div>

            <div className="d-flex justify-content-between py-2 border-bottom small">
              <span className="text-muted">Estimated GST</span>
              <span className="fw-semibold">₹{(cart.gstAmount || 0).toFixed(2)}</span>
            </div>

            <div className="d-flex justify-content-between py-2 border-bottom small">
              <span className="text-muted">Delivery</span>
              <span className="text-success fw-bold">FREE</span>
            </div>

            <div className="d-flex justify-content-between py-3 border-bottom fs-5 fw-bold text-dark">
              <span>Total Payable</span>
              <span className="text-primary">₹{(cart.grandTotal || 0).toFixed(2)}</span>
            </div>

            <button
              onClick={handleProceedToPayment}
              className="btn btn-warning btn-lg w-100 rounded-pill fw-bold shadow-sm py-3 mt-4 text-uppercase tracking-wider"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerCheckout;
