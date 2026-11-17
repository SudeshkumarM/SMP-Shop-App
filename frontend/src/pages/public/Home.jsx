import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('L');
  const [selectedColour, setSelectedColour] = useState('Classic White');
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await api.get('/products');
        if (res.data.success) {
          setProducts(res.data.products || []);
        }
      } catch (err) {
        console.error('Home products load error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const shirt = products[0] || {
    name: 'Shirt',
    sellingPrice: 500,
    gstPercent: 5,
    finalPrice: 525,
    availableQuantity: 150,
    images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80']
  };

  const handleAddToCart = async () => {
    if (!shirt._id) return;
    const res = await addToCart(shirt, selectedSize, selectedColour, quantity);
    if (res.success) {
      addToast(`Added ${quantity} ${shirt.name} (${selectedSize}) to cart!`, 'success');
    } else {
      addToast(res.message || 'Could not add to cart', 'danger');
    }
  };

  const handleBuyNow = async () => {
    if (!shirt._id) return;
    const res = await addToCart(shirt, selectedSize, selectedColour, quantity);
    if (res.success) {
      navigate('/cart');
    }
  };

  return (
    <div className="fade-in">
      {/* 1. SMP Premium Blue Hero Section */}
      <section className="py-4 py-md-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)', color: '#fff' }}>
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-7 text-center text-lg-start">
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-bold mb-3 d-inline-flex align-items-center gap-2">
                <i className="bi bi-patch-check-fill text-primary"></i> SMP ORIGINAL COLLECTION
              </span>
              <h1 className="display-4 fw-bold brand-font text-white mb-3" style={{ letterSpacing: '-1px' }}>
                Pure Cotton Tailored Shirt
              </h1>
              <p className="lead text-light opacity-90 mb-4" style={{ maxWidth: '580px', fontSize: '1.15rem' }}>
                Engineered with 100% breathable organic cotton, wrinkle-resistant weave, and a modern tailored fit designed for all-day elegance.
              </p>

              {/* Price & Value Badge */}
              <div className="d-inline-flex align-items-baseline gap-3 p-3 rounded-3 mb-4" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div>
                  <div className="small text-white-50 text-uppercase fw-semibold">Retail Price</div>
                  <div className="fs-2 fw-bold text-white lh-1">₹500</div>
                </div>
                <div className="border-start border-light border-opacity-25 ps-3">
                  <div className="small text-white-50 text-uppercase fw-semibold">GST (5%)</div>
                  <div className="fs-5 fw-bold text-warning lh-1">+₹25</div>
                </div>
                <div className="border-start border-light border-opacity-25 ps-3">
                  <div className="small text-white-50 text-uppercase fw-semibold">Final Price</div>
                  <div className="fs-3 fw-bold text-info lh-1">₹525</div>
                </div>
              </div>

              <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-3">
                <button onClick={handleBuyNow} className="btn btn-warning btn-lg px-4 py-3 fw-bold rounded-pill shadow d-flex align-items-center gap-2">
                  <i className="bi bi-lightning-fill"></i> Buy Now - ₹525
                </button>
                <button onClick={handleAddToCart} className="btn btn-outline-light btn-lg px-4 py-3 fw-semibold rounded-pill d-flex align-items-center gap-2">
                  <i className="bi bi-cart-plus"></i> Add to Cart
                </button>
                <a href="#product-showcase" className="btn btn-link text-white text-decoration-none d-flex align-items-center gap-1">
                  View Details <i className="bi bi-arrow-down"></i>
                </a>
              </div>
            </div>

            <div className="col-lg-5 text-center">
              <div className="position-relative d-inline-block">
                <img
                  src={shirt.images && shirt.images[0] ? shirt.images[0] : 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80'}
                  alt={shirt.name}
                  className="img-fluid rounded-4 shadow-lg border border-3 border-white"
                  style={{ maxHeight: '420px', width: 'auto', objectFit: 'cover' }}
                />
                <span className="position-absolute top-0 end-0 m-3 badge bg-success shadow px-3 py-2 rounded-pill fw-bold">
                  <i className="bi bi-check-circle me-1"></i> Stock: {shirt.availableQuantity || 150} Units
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Trust Badges */}
      <div className="container py-4">
        <div className="row g-3 text-center">
          <div className="col-md-3 col-6">
            <div className="p-3 smp-card d-flex align-items-center gap-3">
              <div className="p-3 bg-primary-subtle text-primary rounded-3 fs-3">
                <i className="bi bi-shield-check"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small">100% Pure Cotton</div>
                <small className="text-muted">Breathable & skin-friendly</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-3 smp-card d-flex align-items-center gap-3">
              <div className="p-3 bg-success-subtle text-success rounded-3 fs-3">
                <i className="bi bi-truck"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small">Fast Dispatch</div>
                <small className="text-muted">Free delivery over ₹1,000</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-3 smp-card d-flex align-items-center gap-3">
              <div className="p-3 bg-warning-subtle text-warning rounded-3 fs-3">
                <i className="bi bi-receipt"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small">GST Invoice Included</div>
                <small className="text-muted">Compliant 5% tax billing</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-3 smp-card d-flex align-items-center gap-3">
              <div className="p-3 bg-info-subtle text-info rounded-3 fs-3">
                <i className="bi bi-whatsapp"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small">WhatsApp Updates</div>
                <small className="text-muted">Opt-in invoice & vouchers</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Product Showcase Studio */}
      <div id="product-showcase" className="container py-4">
        <div className="smp-card p-4 p-md-5">
          <div className="row g-4 align-items-center">
            <div className="col-lg-6 text-center">
              <img
                src={shirt.images && shirt.images[0] ? shirt.images[0] : 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80'}
                alt={shirt.name}
                className="img-fluid rounded-4 shadow-sm"
                style={{ maxHeight: '460px', width: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className="col-lg-6">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-primary text-white fw-bold px-3 py-1 rounded-pill">SMP Flagship</span>
                <span className="badge bg-light text-secondary border">SKU: {shirt.sku || 'SMP-TSHIRT-001'}</span>
                <span className="badge bg-light text-secondary border">Barcode: {shirt.barcode || '890123450001'}</span>
              </div>
              <h2 className="fw-bold brand-font text-dark mb-2">{shirt.name}</h2>
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="smp-badge-rating">4.8 <i className="bi bi-star-fill"></i></span>
                <span className="text-muted small">142 customer reviews</span>
                <span className="text-success small fw-bold ms-2">
                  <i className="bi bi-dot"></i> In Stock ({shirt.availableQuantity || 150} units)
                </span>
              </div>

              {/* Price Details */}
              <div className="p-3 bg-light rounded-3 mb-4">
                <div className="d-flex align-items-baseline gap-2">
                  <span className="fs-2 fw-bold text-primary">₹500.00</span>
                  <span className="text-muted text-decoration-line-through small">₹899.00</span>
                  <span className="badge bg-success-subtle text-success fw-bold">44% OFF</span>
                </div>
                <small className="text-muted d-block mt-1">
                  + 5% GST (₹25.00) = <strong className="text-dark">₹525.00 Final Amount</strong>. Free express shipping on orders over ₹1,000.
                </small>
              </div>

              {/* Size Selector */}
              <div className="mb-3">
                <label className="fw-bold small text-muted text-uppercase mb-2 d-block">Select Size</label>
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
                <label className="fw-bold small text-muted text-uppercase mb-2 d-block">Select Colour</label>
                <div className="d-flex gap-2">
                  {['Classic White', 'Sky Blue', 'Navy Blue', 'Jet Black'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColour(col)}
                      className={`btn btn-sm px-3 py-2 fw-semibold rounded-3 ${selectedColour === col ? 'btn-dark' : 'btn-outline-secondary'}`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity & Actions */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="input-group" style={{ width: '130px' }}>
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                  <input type="text" className="form-control text-center fw-bold" value={quantity} readOnly />
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setQuantity(Math.min(shirt.availableQuantity || 10, quantity + 1))}>+</button>
                </div>
                <button onClick={handleAddToCart} className="btn btn-outline-primary btn-lg flex-grow-1 fw-bold rounded-3">
                  <i className="bi bi-cart-plus me-1"></i> Add to Cart
                </button>
                <button onClick={handleBuyNow} className="btn btn-primary btn-lg flex-grow-1 fw-bold rounded-3">
                  <i className="bi bi-lightning me-1"></i> Buy Now
                </button>
              </div>

              {/* Product Highlights */}
              <div className="border-top pt-3 text-secondary small">
                <div className="row g-2">
                  <div className="col-6"><i className="bi bi-check2-circle text-primary me-1"></i> Fabric: 100% Breathable Cotton</div>
                  <div className="col-6"><i className="bi bi-check2-circle text-primary me-1"></i> Pattern: Solid Formal / Casual</div>
                  <div className="col-6"><i className="bi bi-check2-circle text-primary me-1"></i> Collar: Spread Collar</div>
                  <div className="col-6"><i className="bi bi-check2-circle text-primary me-1"></i> Wash Care: Machine wash cold</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Promotional Coupon Banner */}
      <div className="container py-3">
        <div className="p-4 p-md-5 rounded-4 shadow-sm text-white position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #172554 100%)' }}>
          <div className="row align-items-center">
            <div className="col-lg-8">
              <span className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-bold mb-2">
                PROMOTIONAL OFFER
              </span>
              <h2 className="display-6 fw-bold brand-font mb-2">
                Special 20% Discount with Coupon Code
              </h2>
              <p className="lead mb-0 fs-6 text-light opacity-90">
                Use code <strong className="bg-white text-primary px-2 py-1 rounded font-monospace fw-bold">SMP20</strong> at checkout to get 20% OFF on all purchases above ₹500.
              </p>
            </div>
            <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
              <button onClick={handleAddToCart} className="btn btn-light btn-lg text-primary fw-bold rounded-pill px-4 shadow">
                Claim Offer Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. SMP Enterprise Portals Grid */}
      <div className="container py-4 mb-4">
        <div className="text-center mb-4">
          <h3 className="fw-bold brand-font">SMP Enterprise Portals</h3>
          <p className="text-muted small">Access role-specific modules with segregated permissions & credentials</p>
        </div>
        <div className="row g-3">
          <div className="col-md-3 col-6">
            <Link to="/customer/login" className="smp-card p-4 text-center text-decoration-none h-100 d-block">
              <div className="p-3 bg-primary-subtle text-primary rounded-circle d-inline-flex mb-3 fs-3">
                <i className="bi bi-person-fill"></i>
              </div>
              <h5 className="fw-bold text-dark mb-1">Customer</h5>
              <p className="text-muted small mb-0">Browse store, cart, wishlist, track orders</p>
            </Link>
          </div>
          <div className="col-md-3 col-6">
            <Link to="/staff/login" className="smp-card p-4 text-center text-decoration-none h-100 d-block">
              <div className="p-3 bg-success-subtle text-success rounded-circle d-inline-flex mb-3 fs-3">
                <i className="bi bi-receipt"></i>
              </div>
              <h5 className="fw-bold text-dark mb-1">Staff POS</h5>
              <p className="text-muted small mb-0">High-speed counter billing & barcode scanning</p>
            </Link>
          </div>
          <div className="col-md-3 col-6">
            <Link to="/admin/login" className="smp-card p-4 text-center text-decoration-none h-100 d-block">
              <div className="p-3 bg-warning-subtle text-warning rounded-circle d-inline-flex mb-3 fs-3">
                <i className="bi bi-shield-lock-fill"></i>
              </div>
              <h5 className="fw-bold text-dark mb-1">Admin Console</h5>
              <p className="text-muted small mb-0">Staff, inventory, GST & delivery settings</p>
            </Link>
          </div>
          <div className="col-md-3 col-6">
            <Link to="/owner/login" className="smp-card p-4 text-center text-decoration-none h-100 d-block">
              <div className="p-3 bg-purple-subtle text-purple rounded-circle d-inline-flex mb-3 fs-3" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
                <i className="bi bi-briefcase-fill"></i>
              </div>
              <h5 className="fw-bold text-dark mb-1">Owner Hub</h5>
              <p className="text-muted small mb-0">Multi-shop governance & 12 financial KPIs</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
