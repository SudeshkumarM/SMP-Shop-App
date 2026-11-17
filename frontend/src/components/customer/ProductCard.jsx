import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ProductCard = ({ product, onWishlistToggle }) => {
  const { addToCart, loading } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Standard';
    const defaultColor = product.colours && product.colours.length > 0 ? product.colours[0] : 'Default';
    await addToCart(product._id, defaultSize, defaultColor, 1);
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      addToast('Please login to save items to your wishlist', 'info');
      return;
    }
    try {
      await api.post(`/customer/wishlist/${product._id}`);
      addToast('Saved to wishlist!', 'success');
      if (onWishlistToggle) onWishlistToggle(product._id);
    } catch (err) {
      addToast('Could not update wishlist', 'error');
    }
  };

  const mainImage = product.images && product.images.length > 0
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=500&q=80';

  return (
    <div
      className="card h-100 smp-card overflow-hidden position-relative"
      style={{
        backgroundColor: 'var(--smp-bg-card)',
        border: '1px solid var(--smp-border)'
      }}
    >
      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        className="btn btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow p-1 d-flex align-items-center justify-content-center"
        style={{
          width: '32px',
          height: '32px',
          zIndex: 2,
          backgroundColor: 'var(--smp-bg-secondary)',
          border: '1px solid var(--smp-border)',
          color: 'var(--smp-highlight-red)'
        }}
        title="Add to wishlist"
      >
        <i className="bi bi-heart"></i>
      </button>

      {/* Featured / Trending Badge */}
      {product.isFeatured && (
        <span
          className="badge position-absolute top-0 start-0 m-2 rounded-pill shadow-sm"
          style={{
            zIndex: 2,
            fontSize: '0.7rem',
            backgroundColor: 'var(--smp-accent-blue)',
            color: '#FFFFFF'
          }}
        >
          ★ Flagship
        </span>
      )}

      {/* Product Image */}
      <Link to={`/product/${product._id}`} className="text-decoration-none">
        <div
          className="position-relative overflow-hidden d-flex align-items-center justify-content-center"
          style={{ height: '240px', backgroundColor: 'var(--smp-bg-secondary)' }}
        >
          <img
            src={mainImage}
            alt={product.name}
            className="w-100 h-100 object-fit-cover transition"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=500&q=80';
            }}
          />
        </div>
      </Link>

      {/* Product Information */}
      <div className="card-body p-3 d-flex flex-column justify-content-between">
        <div>
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="text-uppercase fw-semibold" style={{ fontSize: '0.72rem', color: 'var(--smp-text-secondary)' }}>
              {product.brand || 'SMP'}
            </span>
            <span className="smp-badge-rating">
              {product.rating ? product.rating.toFixed(1) : '4.8'} <i className="bi bi-star-fill" style={{ fontSize: '0.65rem' }}></i>
            </span>
          </div>

          <Link to={`/product/${product._id}`} className="text-decoration-none">
            <h6 className="card-title fw-semibold text-truncate mb-2 text-white" title={product.name} style={{ fontSize: '0.95rem' }}>
              {product.name}
            </h6>
          </Link>
        </div>

        <div>
          {/* Price breakdown */}
          <div className="d-flex align-items-baseline gap-2 mb-2">
            <span className="fs-5 fw-bold text-white">₹{product.finalPrice || product.sellingPrice}</span>
            {product.originalPrice > product.sellingPrice && (
              <>
                <span className="text-decoration-line-through small" style={{ color: 'var(--smp-text-secondary)' }}>
                  ₹{product.originalPrice}
                </span>
                <span className="discount-badge">
                  {product.discountPercent}% off
                </span>
              </>
            )}
          </div>

          <div className="d-flex align-items-center justify-content-between">
            <small style={{ fontSize: '0.75rem', color: 'var(--smp-text-secondary)' }}>
              Incl. {product.gstPercent || 5}% GST
            </small>

            {product.availableQuantity <= 5 ? (
              <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--smp-highlight-red)', border: '1px solid var(--smp-accent-red)', fontSize: '0.68rem' }}>
                Only {product.availableQuantity} left!
              </span>
            ) : (
              <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981', border: '1px solid #059669', fontSize: '0.68rem' }}>
                In Stock ({product.availableQuantity})
              </span>
            )}
          </div>

          {/* Add to Cart Button (Red Accent) */}
          <button
            onClick={handleQuickAdd}
            disabled={loading || product.availableQuantity <= 0}
            className="btn btn-danger btn-sm w-100 rounded-pill mt-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1 shadow-sm"
          >
            <i className="bi bi-cart-plus"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
