import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const CustomerWishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { addToast } = useToast();

  const fetchWishlist = async () => {
    try {
      const res = await api.get('/customer/wishlist');
      if (res.data.success) {
        setWishlist(res.data.wishlist || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId) => {
    try {
      const res = await api.delete(`/customer/wishlist/${productId}`);
      if (res.data.success) {
        addToast('Removed from wishlist', 'info');
        setWishlist(res.data.wishlist || []);
      }
    } catch (e) {
      addToast('Could not remove item', 'error');
    }
  };

  const handleMoveToCart = async (product) => {
    const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Standard';
    const defaultColour = product.colours && product.colours.length > 0 ? product.colours[0] : 'Default';
    await addToCart(product._id, defaultSize, defaultColour, 1);
    await handleRemove(product._id);
    addToast('Moved to cart!', 'success');
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold brand-font mb-0">My Wishlist ({wishlist.length})</h3>
          <small className="text-muted">Your curated favorites ready to be added to cart</small>
        </div>
        <Link to="/products" className="btn btn-outline-primary btn-sm rounded-pill px-3">
          Continue Shopping
        </Link>
      </div>

      {wishlist.length === 0 ? (
        <div className="smp-card p-5 text-center bg-white">
          <i className="bi bi-heart text-muted display-4 mb-3"></i>
          <h4>Your Wishlist is Empty</h4>
          <p className="text-muted small">Save items you love by tapping the heart icon on any product.</p>
          <Link to="/products" className="btn btn-primary rounded-pill px-4">
            Discover Collections
          </Link>
        </div>
      ) : (
        <div className="row g-3">
          {wishlist.map((product) => (
            <div className="col-md-4 col-sm-6" key={product._id}>
              <div className="smp-card p-3 bg-white h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="position-relative overflow-hidden rounded-3 mb-2 bg-light" style={{ height: '200px' }}>
                    <img
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80'}
                      alt={product.name}
                      className="w-100 h-100 object-fit-cover"
                    />
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="btn btn-light btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow-sm"
                      title="Remove"
                    >
                      <i className="bi bi-x-lg text-danger"></i>
                    </button>
                  </div>

                  <small className="text-muted text-uppercase fw-semibold">{product.brand}</small>
                  <Link to={`/product/${product._id}`} className="text-decoration-none text-dark">
                    <h6 className="fw-bold text-truncate mb-1">{product.name}</h6>
                  </Link>

                  <div className="d-flex align-items-baseline gap-2 mb-3">
                    <span className="fw-bold fs-6">₹{product.finalPrice || product.sellingPrice}</span>
                    {product.originalPrice > product.sellingPrice && (
                      <span className="small text-muted text-decoration-line-through">
                        ₹{product.originalPrice}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleMoveToCart(product)}
                  className="btn btn-primary btn-sm w-100 rounded-pill fw-semibold"
                >
                  <i className="bi bi-cart-plus me-1"></i> Move to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerWishlist;
