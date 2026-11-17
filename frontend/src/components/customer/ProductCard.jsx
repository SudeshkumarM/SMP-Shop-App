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
    : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=500&q=80';

  return (
    <div className="card h-100 smp-card border-0 shadow-sm overflow-hidden position-relative group">
      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        className="btn btn-light btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow-sm p-1 d-flex align-items-center justify-content-center"
        style={{ width: '32px', height: '32px', zIndex: 2 }}
        title="Add to wishlist"
      >
        <i className="bi bi-heart text-danger"></i>
      </button>

      {/* Featured / Trending Badge */}
      {product.isFeatured && (
        <span className="badge bg-warning text-dark position-absolute top-0 start-0 m-2 rounded-pill shadow-sm" style={{ zIndex: 2, fontSize: '0.7rem' }}>
          ★ Featured
        </span>
      )}

      {/* Product Image */}
      <Link to={`/product/${product._id}`} className="text-decoration-none">
        <div className="bg-light position-relative overflow-hidden d-flex align-items-center justify-content-center" style={{ height: '240px' }}>
          <img
            src={mainImage}
            alt={product.name}
            className="w-100 h-100 object-fit-cover transition"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=500&q=80';
            }}
          />
        </div>
      </Link>

      {/* Product Information */}
      <div className="card-body p-3 d-flex flex-column justify-content-between">
        <div>
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>
              {product.brand}
            </span>
            <span className="smp-badge-rating">
              {product.rating ? product.rating.toFixed(1) : '4.5'} <i className="bi bi-star-fill" style={{ fontSize: '0.65rem' }}></i>
            </span>
          </div>

          <Link to={`/product/${product._id}`} className="text-decoration-none text-dark">
            <h6 className="card-title fw-semibold text-truncate mb-2" title={product.name} style={{ fontSize: '0.92rem' }}>
              {product.name}
            </h6>
          </Link>
        </div>

        <div>
          {/* Price breakdown */}
          <div className="d-flex align-items-baseline gap-2 mb-2">
            <span className="fs-5 fw-bold text-dark">₹{product.finalPrice || product.sellingPrice}</span>
            {product.originalPrice > product.sellingPrice && (
              <>
                <span className="text-muted text-decoration-line-through small">
                  ₹{product.originalPrice}
                </span>
                <span className="discount-badge">
                  {product.discountPercent}% off
                </span>
              </>
            )}
          </div>

          <div className="d-flex align-items-center justify-content-between">
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              Incl. {product.gstPercent || 5}% GST
            </small>

            {product.availableQuantity <= 5 ? (
              <span className="badge bg-danger-subtle text-danger" style={{ fontSize: '0.68rem' }}>
                Only {product.availableQuantity} left!
              </span>
            ) : (
              <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.68rem' }}>
                In Stock
              </span>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            onClick={handleQuickAdd}
            disabled={loading || product.availableQuantity <= 0}
            className="btn btn-outline-primary btn-sm w-100 rounded-pill mt-3 py-1 fw-semibold d-flex align-items-center justify-content-center gap-1"
          >
            <i className="bi bi-cart-plus"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
