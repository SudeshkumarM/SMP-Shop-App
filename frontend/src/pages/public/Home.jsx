import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import socket from '../../services/socket';
import ProductCard from '../../components/customer/ProductCard';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCoupons, setActiveCoupons] = useState([]);

  // Fetch product catalog
  const fetchProductCatalog = async () => {
    try {
      const res = await api.get('/products');
      if (res.data.success && res.data.products) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error('Error loading product catalog:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active promotional coupons
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

    // Real-Time Socket.IO Synchronization
    const handleProductChange = () => {
      fetchProductCatalog();
    };

    const handleCouponChange = () => {
      fetchActiveOffers();
    };

    socket.on('product:updated', handleProductChange);
    socket.on('inventory:updated', handleProductChange);
    socket.on('coupon:updated', handleCouponChange);

    return () => {
      socket.off('product:updated', handleProductChange);
      socket.off('inventory:updated', handleProductChange);
      socket.off('coupon:updated', handleCouponChange);
    };
  }, []);

  return (
    <div className="fade-in">
      {/* 1. SMP Premium Brand Hero Section */}
      <section
        className="py-5"
        style={{
          background: 'linear-gradient(135deg, #071426 0%, #10243D 55%, #152A45 100%)',
          borderBottom: '1px solid #293D58'
        }}
      >
        <div className="container py-4">
          <div className="row align-items-center g-4">
            <div className="col-lg-7 text-center text-lg-start">
              <span
                className="badge px-3 py-2 rounded-pill fw-bold mb-3 d-inline-flex align-items-center gap-2"
                style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.2)',
                  color: '#DCEBFF',
                  border: '1px solid #3b82f6'
                }}
              >
                <i className="bi bi-patch-check-fill" style={{ color: '#60a5fa' }}></i> SMP OFFICIAL STORE
              </span>
              <h1 className="display-4 fw-bold brand-font text-white mb-3" style={{ letterSpacing: '-1px' }}>
                Curated Fashion & Exceptional Apparel
              </h1>
              <p className="lead mb-4" style={{ color: '#B8C5D6', maxWidth: '580px', fontSize: '1.15rem' }}>
                Discover premium quality textiles, modern tailored elegance, and seamless in-store & online shopping powered by SMP.
              </p>

              <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-3">
                <Link
                  to="/products"
                  className="btn btn-primary btn-lg px-4 py-3 fw-bold rounded-pill shadow d-flex align-items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)',
                    border: '1px solid #60a5fa',
                    color: '#FFFFFF'
                  }}
                >
                  <i className="bi bi-grid-fill"></i> Explore Catalog
                </Link>
                <Link
                  to="/about"
                  className="btn btn-outline-secondary btn-lg px-4 py-3 fw-semibold rounded-pill d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: '#10243D',
                    borderColor: '#293D58',
                    color: '#DCEBFF'
                  }}
                >
                  <i className="bi bi-info-circle"></i> About SMP
                </Link>
              </div>
            </div>

            <div className="col-lg-5 text-center">
              <div
                className="p-4 rounded-4 shadow-lg text-start position-relative overflow-hidden"
                style={{
                  backgroundColor: '#152A45',
                  border: '1px solid #293D58'
                }}
              >
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold"
                    style={{
                      width: '42px',
                      height: '42px',
                      background: 'linear-gradient(135deg, #2563EB 0%, #B91C1C 100%)',
                      fontSize: '1.2rem'
                    }}
                  >
                    S
                  </div>
                  <div>
                    <h5 className="mb-0 text-white brand-font">SMP Experience</h5>
                    <small style={{ color: '#B8C5D6', fontSize: '0.75rem' }}>RETAIL & E-COMMERCE PLATFORM</small>
                  </div>
                </div>

                <p className="small mb-3" style={{ color: '#DCEBFF' }}>
                  A modern retail platform combining high-speed counter POS, instant barcode scanning, verified QR payments, and real-time inventory synchronization.
                </p>

                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex align-items-center gap-2" style={{ color: '#B8C5D6' }}>
                    <i className="bi bi-check-circle-fill" style={{ color: '#10B981' }}></i>
                    <span>Real-Time Inventory Stock Control</span>
                  </div>
                  <div className="d-flex align-items-center gap-2" style={{ color: '#B8C5D6' }}>
                    <i className="bi bi-check-circle-fill" style={{ color: '#10B981' }}></i>
                    <span>Official WhatsApp & SMS Bill Delivery</span>
                  </div>
                  <div className="d-flex align-items-center gap-2" style={{ color: '#B8C5D6' }}>
                    <i className="bi bi-check-circle-fill" style={{ color: '#10B981' }}></i>
                    <span>UPI QR Code & Verified Multi-Mode Payments</span>
                  </div>
                  <div className="d-flex align-items-center gap-2" style={{ color: '#B8C5D6' }}>
                    <i className="bi bi-check-circle-fill" style={{ color: '#10B981' }}></i>
                    <span>GST-Compliant Automated Invoicing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Brand Value Highlights */}
      <div className="container py-4">
        <div className="row g-3 text-center">
          <div className="col-md-3 col-6">
            <div
              className="p-3 smp-card d-flex align-items-center gap-3"
              style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
            >
              <div
                className="p-3 rounded-3 fs-3 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: '#10243D', color: '#2563EB' }}
              >
                <i className="bi bi-shield-check"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small text-white">Guaranteed Quality</div>
                <small style={{ color: '#B8C5D6' }}>Premium fabrics & finishing</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div
              className="p-3 smp-card d-flex align-items-center gap-3"
              style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
            >
              <div
                className="p-3 rounded-3 fs-3 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: '#10243D', color: '#10B981' }}
              >
                <i className="bi bi-truck"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small text-white">Express Delivery</div>
                <small style={{ color: '#B8C5D6' }}>Fast dispatch & order tracking</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div
              className="p-3 smp-card d-flex align-items-center gap-3"
              style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
            >
              <div
                className="p-3 rounded-3 fs-3 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: '#10243D', color: '#F59E0B' }}
              >
                <i className="bi bi-receipt"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small text-white">GST Invoicing</div>
                <small style={{ color: '#B8C5D6' }}>Compliant tax calculations</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div
              className="p-3 smp-card d-flex align-items-center gap-3"
              style={{ backgroundColor: '#152A45', border: '1px solid #293D58' }}
            >
              <div
                className="p-3 rounded-3 fs-3 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: '#10243D', color: '#EF4444' }}
              >
                <i className="bi bi-arrow-repeat"></i>
              </div>
              <div className="text-start">
                <div className="fw-bold small text-white">Easy Returns</div>
                <small style={{ color: '#B8C5D6' }}>Hassle-free exchange policy</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Products Showcase */}
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h3 className="fw-bold brand-font text-white mb-1">Featured Collections</h3>
            <p className="small mb-0" style={{ color: '#B8C5D6' }}>Explore the latest arrivals and apparel</p>
          </div>
          {products.length > 0 && (
            <Link
              to="/products"
              className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-semibold"
              style={{ color: '#DCEBFF', borderColor: '#3b82f6', backgroundColor: '#10243D' }}
            >
              View All ({products.length}) <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 small" style={{ color: '#B8C5D6' }}>Loading SMP collections...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="row g-4">
            {products.map((prod) => (
              <div className="col-lg-3 col-md-4 col-sm-6" key={prod._id}>
                <ProductCard product={prod} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="p-5 text-center rounded-4 shadow-sm"
            style={{
              backgroundColor: '#152A45',
              border: '1px solid #293D58'
            }}
          >
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle p-3 mb-3"
              style={{ backgroundColor: '#10243D', color: '#60a5fa', width: '70px', height: '70px' }}
            >
              <i className="bi bi-bag-check fs-2"></i>
            </div>
            <h4 className="fw-bold text-white mb-2">New Collections Arriving Soon</h4>
            <p className="small mb-4 mx-auto" style={{ color: '#B8C5D6', maxWidth: '480px' }}>
              Our apparel catalog is currently being curated by store managers. New collections, styles, and sizes will appear here shortly.
            </p>
            <Link
              to="/products"
              className="btn btn-primary rounded-pill px-4 py-2 fw-semibold"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)',
                border: '1px solid #60a5fa'
              }}
            >
              Browse Catalog
            </Link>
          </div>
        )}
      </div>

      {/* 4. Active Offers Section (Displayed dynamically when coupons exist) */}
      {activeCoupons.length > 0 && (
        <div className="container py-3 mb-4">
          <div
            className="p-4 p-md-5 rounded-4 shadow text-white position-relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #10243D 0%, #152A45 100%)',
              border: '1px solid #293D58'
            }}
          >
            <div className="row align-items-center">
              <div className="col-lg-8">
                <span
                  className="badge px-3 py-1 rounded-pill fw-bold mb-2"
                  style={{ backgroundColor: '#B91C1C', color: '#FFFFFF', border: '1px solid #ef4444' }}
                >
                  ACTIVE PROMOTION
                </span>
                <h2 className="display-6 fw-bold brand-font mb-2 text-white">
                  {activeCoupons[0].title || `Special ${activeCoupons[0].discountPercent}% Discount`}
                </h2>
                <p className="lead mb-0 fs-6" style={{ color: '#DCEBFF' }}>
                  Use coupon code{' '}
                  <strong
                    className="px-2 py-1 rounded font-monospace fw-bold"
                    style={{ backgroundColor: '#071426', color: '#60a5fa', border: '1px solid #293D58' }}
                  >
                    {activeCoupons[0].code}
                  </strong>{' '}
                  at checkout to enjoy {activeCoupons[0].discountPercent}% OFF (Min spend: ₹{activeCoupons[0].minPurchaseAmount || 0}).
                </p>
              </div>
              <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
                <Link
                  to="/products"
                  className="btn btn-primary btn-lg fw-bold rounded-pill px-4 shadow"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)',
                    border: '1px solid #60a5fa',
                    color: '#FFFFFF'
                  }}
                >
                  Shop with Offer
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
