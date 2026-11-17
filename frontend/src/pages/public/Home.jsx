import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import CategoryBar from '../../components/customer/CategoryBar';
import ProductCard from '../../components/customer/ProductCard';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [featRes, trendRes] = await Promise.all([
          api.get('/products?isFeatured=true&limit=8'),
          api.get('/products?isTrending=true&limit=8')
        ]);
        if (featRes.data.success) setFeaturedProducts(featRes.data.products);
        if (trendRes.data.success) setTrendingProducts(trendRes.data.products);
      } catch (err) {
        console.error('Home data load error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  return (
    <div className="fade-in">
      {/* Category Sub-Navigation */}
      <CategoryBar />

      {/* Hero Banner Carousel */}
      <div className="container py-3">
        <div id="homeHeroCarousel" className="carousel slide rounded-4 overflow-hidden shadow-sm" data-bs-ride="carousel">
          <div className="carousel-indicators">
            <button type="button" data-bs-target="#homeHeroCarousel" data-bs-slide-to="0" className="active"></button>
            <button type="button" data-bs-target="#homeHeroCarousel" data-bs-slide-to="1"></button>
            <button type="button" data-bs-target="#homeHeroCarousel" data-bs-slide-to="2"></button>
          </div>
          <div className="carousel-inner">
            {/* Slide 1 */}
            <div className="carousel-item active" style={{ height: '360px' }}>
              <div
                className="w-100 h-100 d-flex align-items-center px-4 px-md-5"
                style={{
                  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                  color: '#fff'
                }}
              >
                <div style={{ maxWidth: '580px' }}>
                  <span className="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold mb-2">
                    FESTIVE SPECIAL SALE
                  </span>
                  <h1 className="display-6 fw-bold brand-font text-white mb-2">
                    Pure Kanchipuram Silk & Designer Sarees
                  </h1>
                  <p className="text-light mb-4 lead fs-6">
                    Handcrafted zardozi borders, silk mark certified quality. Starting at just ₹2,499 with flat 25% off!
                  </p>
                  <div className="d-flex gap-2">
                    <Link to="/products?category=womens-ethnic" className="btn btn-warning btn-lg rounded-pill px-4 fw-bold">
                      Explore Ethnic Wear
                    </Link>
                    <Link to="/products" className="btn btn-outline-light btn-lg rounded-pill px-4">
                      View All
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 2 */}
            <div className="carousel-item" style={{ height: '360px' }}>
              <div
                className="w-100 h-100 d-flex align-items-center px-4 px-md-5"
                style={{
                  background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
                  color: '#fff'
                }}
              >
                <div style={{ maxWidth: '580px' }}>
                  <span className="badge bg-info text-dark px-3 py-2 rounded-pill fw-bold mb-2">
                    EXECUTIVE MEN'S COLLECTION
                  </span>
                  <h1 className="display-6 fw-bold brand-font text-white mb-2">
                    100% Giza Cotton Formal Shirts & Linen Blazers
                  </h1>
                  <p className="text-light mb-4 lead fs-6">
                    Tailored fit, wrinkle-resistant luxury for the boardroom.
                  </p>
                  <Link to="/products?category=mens-wear" className="btn btn-info btn-lg rounded-pill px-4 fw-bold">
                    Shop Men's Wear
                  </Link>
                </div>
              </div>
            </div>

            {/* Slide 3 */}
            <div className="carousel-item" style={{ height: '360px' }}>
              <div
                className="w-100 h-100 d-flex align-items-center px-4 px-md-5"
                style={{
                  background: 'linear-gradient(135deg, #b20a2c 0%, #fffbd5 100%)',
                  color: '#fff'
                }}
              >
                <div style={{ maxWidth: '580px' }}>
                  <span className="badge bg-danger text-white px-3 py-2 rounded-pill fw-bold mb-2">
                    TRENDING NOW
                  </span>
                  <h1 className="display-6 fw-bold brand-font text-dark mb-2">
                    Breezy Chiffon & Floral Summer Maxi Dresses
                  </h1>
                  <p className="text-dark mb-4 lead fs-6">
                    Effortless elegance for every outing and party.
                  </p>
                  <Link to="/products?category=womens-western" className="btn btn-dark btn-lg rounded-pill px-4 fw-bold">
                    Discover Dresses
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <button className="carousel-control-prev" type="button" data-bs-target="#homeHeroCarousel" data-bs-slide="prev">
            <span className="carousel-control-prev-icon"></span>
          </button>
          <button className="carousel-control-next" type="button" data-bs-target="#homeHeroCarousel" data-bs-slide="next">
            <span className="carousel-control-next-icon"></span>
          </button>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="container py-3">
        <div className="row g-3 text-center">
          <div className="col-md-3 col-6">
            <div className="p-3 bg-white rounded-3 shadow-sm d-flex align-items-center gap-3">
              <i className="bi bi-shield-check text-primary fs-2"></i>
              <div className="text-start">
                <div className="fw-bold small">100% Genuine Apparel</div>
                <small className="text-muted">Handpicked fabrics</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-3 bg-white rounded-3 shadow-sm d-flex align-items-center gap-3">
              <i className="bi bi-arrow-repeat text-success fs-2"></i>
              <div className="text-start">
                <div className="fw-bold small">7-Day Free Exchange</div>
                <small className="text-muted">Store & online policy</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-3 bg-white rounded-3 shadow-sm d-flex align-items-center gap-3">
              <i className="bi bi-truck text-warning fs-2"></i>
              <div className="text-start">
                <div className="fw-bold small">Free Fast Shipping</div>
                <small className="text-muted">On orders above ₹999</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-3 bg-white rounded-3 shadow-sm d-flex align-items-center gap-3">
              <i className="bi bi-receipt text-danger fs-2"></i>
              <div className="text-start">
                <div className="fw-bold small">GST Invoice Included</div>
                <small className="text-muted">Tax compliant billing</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Collections Section */}
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h3 className="fw-bold brand-font mb-0">Featured Collections</h3>
            <small className="text-muted">Handpicked festive, bridal & formal apparel</small>
          </div>
          <Link to="/products" className="btn btn-primary btn-sm rounded-pill px-3">
            View All <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <div className="row g-3">
            {featuredProducts.map((product) => (
              <div className="col-lg-3 col-md-4 col-6" key={product._id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promotional Mid-Banner */}
      <div className="container py-3">
        <div
          className="p-4 p-md-5 rounded-4 shadow-sm text-white position-relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #ff416c 0%, #ff4b2b 100%)'
          }}
        >
          <div className="row align-items-center">
            <div className="col-lg-8">
              <span className="badge bg-light text-danger px-3 py-1 rounded-pill fw-bold mb-2">
                SPECIAL STORE EVENT
              </span>
              <h2 className="display-6 fw-bold brand-font mb-2">
                SMP In-Store & Online Festive Clearance
              </h2>
              <p className="lead mb-0 fs-6">
                Get up to 40% discount on Bandhani Lehengas, Designer Kurtis, and Silk Sets. Free in-store alteration available.
              </p>
            </div>
            <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
              <Link to="/products" className="btn btn-light btn-lg text-danger fw-bold rounded-pill px-4 shadow">
                Shop The Sale
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Products Section */}
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h3 className="fw-bold brand-font mb-0">Trending This Week</h3>
            <small className="text-muted">Top trending items loved by shoppers</small>
          </div>
          <Link to="/products?isTrending=true" className="btn btn-outline-primary btn-sm rounded-pill px-3">
            See More <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <div className="row g-3">
            {trendingProducts.map((product) => (
              <div className="col-lg-3 col-md-4 col-6" key={product._id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
