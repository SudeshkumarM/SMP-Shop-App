import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import socket from '../../services/socket';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const Home = () => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [selectedSize, setSelectedSize] = useState('L');
  const [selectedColour, setSelectedColour] = useState('Classic White');
  const [quantity, setQuantity] = useState(1);

  const { addToCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // 1. Initial Data Fetch
  const fetchProductCatalog = async () => {
    try {
      const res = await api.get('/products');
      if (res.data.success && res.data.products && res.data.products.length > 0) {
        setProduct(res.data.products[0]);
      }
    } catch (err) {
      console.error('Error loading product catalog:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOffers = async () => {
    try {
      const res = await api.get('/products/offers/active');
      if (res.data.success) {
        setActiveCoupons(res.data.coupons || []);
      }
    } catch (err) {
      console.error('Error loading offers:', err.message);
    }
  };

  useEffect(() => {
    fetchProductCatalog();
    fetchActiveOffers();

    // 2. Real-Time Socket.IO Synchronization
    const handleProductUpdate = (data) => {
      if (data && data.product) {
        setProduct((prev) => {
          if (!prev || prev._id === data.product._id) {
            return { ...prev, ...data.product };
          }
          return prev;
        });
      } else {
        fetchProductCatalog();
      }
    };

    const handleInventoryUpdate = (data) => {
      if (data && data.productId) {
        setProduct((prev) => {
          if (prev && prev._id === data.productId) {
            return { ...prev, availableQuantity: data.currentStock };
          }
          return prev;
        });
      } else {
        fetchProductCatalog();
      }
    };

    const handleCouponUpdate = () => {
      fetchActiveOffers();
    };

    socket.on('product:updated', handleProductUpdate);
    socket.on('inventory:updated', handleInventoryUpdate);
    socket.on('coupon:updated', handleCouponUpdate);

    return () => {
      socket.off('product:updated', handleProductUpdate);
      socket.off('inventory:updated', handleInventoryUpdate);
      socket.off('coupon:updated', handleCouponUpdate);
    };
  }, []);

  const shirt = product || {
    name: 'Shirt',
    sellingPrice: 500,
    gstPercent: 5,
    finalPrice: 525,
    availableQuantity: 150,
    images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80'],
    description: 'Premium Cotton Tailored Shirt crafted with 100% breathable organic cotton.'
  };

  const handleAddToCart = async () => {
    if (!shirt._id) {
      addToast('Product is loading, please wait a moment.', 'info');
      return;
    }
    const res = await addToCart(shirt._id, selectedSize, selectedColour, quantity);
    if (res && res.success) {
      addToast(`Added ${quantity} ${shirt.name} (${selectedSize}) to cart!`, 'success');
    }
  };

  const handleBuyNow = async () => {
    if (!shirt._id) return;
    const res = await addToCart(shirt._id, selectedSize, selectedColour, quantity);
    if (res && res.success) {
      navigate('/cart');
    }
  };

  return (
    <div className="fade-in">
      {/* 1. SMP Premium Hero Section (Deep Navy Blue & Dark Blue Theme) */}
      <section
        className="py-5"
        style={{
          background: 'linear-gradient(135deg, #071426 0%, #10243D 60%, #152A45 100%)',
          borderBottom: '1px solid var(--smp-border)'
        }}
      >
        <div className="container">
          <div className="row align-items-center g-4 py-2">
            <div className="col-lg-7 text-center text-lg-start">
              <span
                className="badge px-3 py-2 rounded-pill fw-bold mb-3 d-inline-flex align-items-center gap-2"
                style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.15)',
                  color: 'var(--smp-accent-blue)',
                  border: '1px solid rgba(37, 99, 235, 0.4)'
                }}
              >
                <i className="bi bi-patch-check-fill"></i> SMP OFFICIAL COLLECTION
              </span>
              <h1 className="display-4 fw-bold brand-font text-white mb-3" style={{ letterSpacing: '-1px' }}>
                Pure Cotton Tailored Shirt
              </h1>
              <p className="lead mb-4" style={{ color: 'var(--smp-text-secondary)', maxWidth: '580px', fontSize: '1.15rem' }}>
                Engineered with 100% breathable organic cotton, wrinkle-resistant weave, and a modern tailored fit designed for all-day elegance.
              </p>

              {/* Price & Value Details */}
              <div
                className="d-inline-flex align-items-baseline gap-3 p-3 rounded-3 mb-4"
                style={{
                  backgroundColor: 'var(--smp-bg-card)',
                  border: '1px solid var(--smp-border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                }}
              >
                <div>
                  <div className="small text-uppercase fw-semibold" style={{ color: 'var(--smp-text-secondary)' }}>Selling Price</div>
                  <div className="fs-2 fw-bold text-white lh-1">₹{shirt.sellingPrice || 500}</div>
                </div>
                <div className="border-start ps-3" style={{ borderColor: 'var(--smp-border)' }}>
                  <div className="small text-uppercase fw-semibold" style={{ color: 'var(--smp-text-secondary)' }}>GST ({shirt.gstPercent || 5}%)</div>
                  <div className="fs-5 fw-bold lh-1" style={{ color: '#F59E0B' }}>
                    +₹{Math.round((shirt.sellingPrice * (shirt.gstPercent || 5)) / 100)}
                  </div>
                </div>
                <div className="border-start ps-3" style={{ borderColor: 'var(--smp-border)' }}>
                  <div className="small text-uppercase fw-semibold" style={{ color: 'var(--smp-text-secondary)' }}>Final Price</div>
                  <div className="fs-3 fw-bold lh-1" style={{ color: 'var(--smp-accent-blue)' }}>
                    ₹{shirt.finalPrice || 525}
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-3">
                <button
                  onClick={handleAddToCart}
                  className="btn btn-danger btn-lg px-4 py-3 fw-bold rounded-pill shadow d-flex align-items-center gap-2"
                >
                  <i className="bi bi-cart-plus"></i> Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  className="btn btn-primary btn-lg px-4 py-3 fw-bold rounded-pill shadow d-flex align-items-center gap-2"
                >
                  <i className="bi bi-lightning-fill"></i> Buy Now - ₹{shirt.finalPrice || 525}
                </button>
                <a
                  href="#product-details"
                  className="btn btn-outline-secondary btn-lg px-4 py-3 fw-semibold rounded-pill d-flex align-items-center gap-1"
                >
                  View Details <i className="bi bi-arrow-down"></i>
                </a>
              </div>
            </div>

            <div className="col-lg-5 text-center">
              <div className="position-relative d-inline-block">
                <img
                  src={shirt.images && shirt.images[0] ? shirt.images[0] : 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80'}
                  alt={shirt.name}
                  className="img-fluid rounded-4 shadow-lg"
                  style={{
                    maxHeight: '420px',
                    width: 'auto',
                    objectFit: 'cover',
                    border: '2px solid var(--smp-border)'
                  }}
                />
                <span
                  className="position-absolute top-0 end-0 m-3 badge shadow px-3 py-2 rounded-pill fw-bold"
                  style={{
                    backgroundColor: shirt.availableQuantity > 0 ? '#059669' : '#DC2626',
                    color: '#FFFFFF'
                  }}
                >
                  <i className="bi bi-check-circle me-1"></i> In Stock: {shirt.availableQuantity || 0} Units
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Brand Value Highlights */}
      <div className="container py-4">
        <div className="row g-3 text-center">
          <div className="col-md-3 col-6">
            <div className="p-3 smp-card d-flex align-items-center gap-3">
              <div
                className="p-3 rounded-3 fs-3 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: 'var(--smp-bg-secondary)', color: 'var(--smp-accent-blue)' }}
              >
                <i className="bi bi-shield-check"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small text-white">100% Pure Cotton</div>
                <small style={{ color: 'var(--smp-text-secondary)' }}>Breathable & skin-friendly</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-3 smp-card d-flex align-items-center gap-3">
              <div
                className="p-3 rounded-3 fs-3 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: 'var(--smp-bg-secondary)', color: '#10B981' }}
              >
                <i className="bi bi-truck"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small text-white">Fast Dispatch</div>
                <small style={{ color: 'var(--smp-text-secondary)' }}>Free shipping over ₹1,000</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-3 smp-card d-flex align-items-center gap-3">
              <div
                className="p-3 rounded-3 fs-3 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: 'var(--smp-bg-secondary)', color: '#F59E0B' }}
              >
                <i className="bi bi-receipt"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small text-white">GST Invoice Included</div>
                <small style={{ color: 'var(--smp-text-secondary)' }}>Compliant 5% tax billing</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-3 smp-card d-flex align-items-center gap-3">
              <div
                className="p-3 rounded-3 fs-3 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: 'var(--smp-bg-secondary)', color: 'var(--smp-accent-red)' }}
              >
                <i className="bi bi-arrow-repeat"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small text-white">Easy Exchange</div>
                <small style={{ color: 'var(--smp-text-secondary)' }}>Hassle-free 7-day returns</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Balanced Product Showcase Card */}
      <div id="product-details" className="container py-4">
        <div className="smp-card p-4 p-md-5">
          <div className="row g-4 align-items-center">
            <div className="col-lg-6 text-center">
              <img
                src={shirt.images && shirt.images[0] ? shirt.images[0] : 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80'}
                alt={shirt.name}
                className="img-fluid rounded-4 shadow"
                style={{
                  maxHeight: '440px',
                  width: '100%',
                  objectFit: 'cover',
                  border: '1px solid var(--smp-border)'
                }}
              />
            </div>
            <div className="col-lg-6">
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="badge fw-bold px-3 py-1 rounded-pill" style={{ backgroundColor: 'var(--smp-accent-blue)', color: '#FFFFFF' }}>
                  SMP Flagship
                </span>
                <span className="badge" style={{ backgroundColor: 'var(--smp-bg-secondary)', color: 'var(--smp-text-secondary)', border: '1px solid var(--smp-border)' }}>
                  SKU: {shirt.sku || 'SMP-SHIRT-001'}
                </span>
                <span className="badge" style={{ backgroundColor: 'var(--smp-bg-secondary)', color: 'var(--smp-text-secondary)', border: '1px solid var(--smp-border)' }}>
                  Barcode: {shirt.barcode || '890123450001'}
                </span>
              </div>
              <h2 className="fw-bold brand-font text-white mb-2">{shirt.name}</h2>
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="smp-badge-rating">
                  4.8 <i className="bi bi-star-fill"></i>
                </span>
                <span className="small" style={{ color: 'var(--smp-text-secondary)' }}>Verified Customer Reviews</span>
                <span className="small fw-bold ms-2" style={{ color: shirt.availableQuantity > 0 ? '#10B981' : '#EF4444' }}>
                  <i className="bi bi-dot"></i> {shirt.availableQuantity > 0 ? `In Stock (${shirt.availableQuantity} units)` : 'Out of Stock'}
                </span>
              </div>

              {/* Price Details */}
              <div className="p-3 rounded-3 mb-4" style={{ backgroundColor: 'var(--smp-bg-secondary)', border: '1px solid var(--smp-border)' }}>
                <div className="d-flex align-items-baseline gap-2">
                  <span className="fs-2 fw-bold text-white">₹{shirt.sellingPrice || 500}.00</span>
                  <span className="text-decoration-line-through small" style={{ color: 'var(--smp-text-secondary)' }}>₹600.00</span>
                  <span className="badge fw-bold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--smp-highlight-red)', border: '1px solid var(--smp-accent-red)' }}>
                    17% OFF
                  </span>
                </div>
                <small className="d-block mt-1" style={{ color: 'var(--smp-text-secondary)' }}>
                  + 5% GST (₹{Math.round((shirt.sellingPrice * (shirt.gstPercent || 5)) / 100)}.00) = <strong className="text-white">₹{shirt.finalPrice || 525}.00 Final Amount</strong>. Free delivery over ₹1,000.
                </small>
              </div>

              {/* Size Selector */}
              <div className="mb-3">
                <label className="fw-bold small text-uppercase mb-2 d-block" style={{ color: 'var(--smp-text-secondary)' }}>Select Size</label>
                <div className="d-flex gap-2">
                  {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`btn btn-sm px-3 py-2 fw-semibold rounded-3 ${selectedSize === sz ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colour Selector */}
              <div className="mb-4">
                <label className="fw-bold small text-uppercase mb-2 d-block" style={{ color: 'var(--smp-text-secondary)' }}>Select Colour</label>
                <div className="d-flex gap-2 flex-wrap">
                  {['Classic White', 'Sky Blue', 'Navy Blue', 'Charcoal Grey'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColour(col)}
                      className={`btn btn-sm px-3 py-2 fw-semibold rounded-3 ${selectedColour === col ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity & Actions */}
              <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
                <div className="input-group" style={{ width: '130px' }}>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </button>
                  <input
                    type="text"
                    className="form-control text-center fw-bold"
                    value={quantity}
                    readOnly
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setQuantity(Math.min(shirt.availableQuantity || 10, quantity + 1))}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="btn btn-danger btn-lg flex-grow-1 fw-bold rounded-3"
                >
                  <i className="bi bi-cart-plus me-1"></i> Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  className="btn btn-primary btn-lg flex-grow-1 fw-bold rounded-3"
                >
                  <i className="bi bi-lightning-fill me-1"></i> Buy Now
                </button>
              </div>

              {/* Product Specifications */}
              <div className="border-top pt-3 small" style={{ borderColor: 'var(--smp-border)', color: 'var(--smp-text-secondary)' }}>
                <div className="row g-2">
                  <div className="col-6"><i className="bi bi-check2-circle me-1" style={{ color: 'var(--smp-accent-blue)' }}></i> Fabric: 100% Breathable Cotton</div>
                  <div className="col-6"><i className="bi bi-check2-circle me-1" style={{ color: 'var(--smp-accent-blue)' }}></i> Pattern: Solid Formal / Casual</div>
                  <div className="col-6"><i className="bi bi-check2-circle me-1" style={{ color: 'var(--smp-accent-blue)' }}></i> Collar: Classic Regular Collar</div>
                  <div className="col-6"><i className="bi bi-check2-circle me-1" style={{ color: 'var(--smp-accent-blue)' }}></i> Wash Care: Machine wash cold</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Offers Section (Displayed dynamically when coupons exist) */}
      {activeCoupons.length > 0 && (
        <div className="container py-3 mb-4">
          <div
            className="p-4 p-md-5 rounded-4 shadow-sm text-white position-relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #10243D 0%, #152A45 100%)',
              border: '1px solid var(--smp-border)'
            }}
          >
            <div className="row align-items-center">
              <div className="col-lg-8">
                <span className="badge px-3 py-1 rounded-pill fw-bold mb-2" style={{ backgroundColor: 'var(--smp-accent-red)', color: '#FFFFFF' }}>
                  ACTIVE PROMOTION
                </span>
                <h2 className="display-6 fw-bold brand-font mb-2 text-white">
                  {activeCoupons[0].title || `Special ${activeCoupons[0].discountPercent}% Discount`}
                </h2>
                <p className="lead mb-0 fs-6" style={{ color: 'var(--smp-text-secondary)' }}>
                  Use coupon code{' '}
                  <strong
                    className="px-2 py-1 rounded font-monospace fw-bold"
                    style={{ backgroundColor: 'var(--smp-bg-primary)', color: 'var(--smp-accent-blue)', border: '1px solid var(--smp-border)' }}
                  >
                    {activeCoupons[0].code}
                  </strong>{' '}
                  at checkout to enjoy {activeCoupons[0].discountPercent}% OFF (Min spend: ₹{activeCoupons[0].minPurchaseAmount || 0}).
                </p>
              </div>
              <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
                <button
                  onClick={handleAddToCart}
                  className="btn btn-primary btn-lg fw-bold rounded-pill px-4 shadow"
                >
                  Shop with Offer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
