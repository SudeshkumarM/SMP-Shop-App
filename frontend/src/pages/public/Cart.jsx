import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const Cart = () => {
  const { cart, itemCount, updateQuantity, removeItem } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/customer/login?redirect=/customer/checkout');
    } else {
      navigate('/customer/checkout');
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="container py-5 text-center fade-in">
        <div className="smp-card p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-cart-x text-muted display-1 mb-3"></i>
          <h3 className="fw-bold">Your Cart is Empty</h3>
          <p className="text-muted small">Explore our exclusive collections and add your favorite apparel to the cart.</p>
          <Link to="/products" className="btn btn-primary rounded-pill px-4 py-2 mt-2 fw-semibold">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 fade-in">
      <h2 className="fw-bold brand-font mb-4">
        Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </h2>

      <div className="row g-4">
        {/* Cart Items List */}
        <div className="col-lg-8">
          <div className="smp-card p-3 mb-3">
            {cart.items.map((item) => {
              const product = item.productId;
              const img = product?.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=300&q=80';

              return (
                <div key={item._id} className="row g-3 py-3 border-bottom align-items-center">
                  {/* Image */}
                  <div className="col-sm-2 col-3">
                    <img
                      src={img}
                      alt={product?.name || 'Product'}
                      className="w-100 rounded-3 object-fit-cover shadow-sm"
                      style={{ height: '90px' }}
                    />
                  </div>

                  {/* Details */}
                  <div className="col-sm-6 col-9">
                    <Link to={`/product/${product?._id}`} className="text-decoration-none text-dark">
                      <h6 className="fw-bold mb-1">{product?.name || 'Product'}</h6>
                    </Link>
                    <div className="small text-muted mb-1">
                      Size: <strong>{item.variant?.size || 'Standard'}</strong> | Colour: <strong>{item.variant?.colour || 'Default'}</strong>
                    </div>
                    <div className="small text-muted mb-2">
                      Seller: <span className="text-primary fw-medium">SMP Elite Fashions</span>
                    </div>

                    <div className="d-flex align-items-baseline gap-2">
                      <span className="fs-6 fw-bold">₹{item.finalPrice}</span>
                      {product?.originalPrice > product?.sellingPrice && (
                        <span className="small text-muted text-decoration-line-through">
                          ₹{product.originalPrice}
                        </span>
                      )}
                      <small className="text-success fw-bold">
                        ({item.gstPercent || 5}% GST incl.)
                      </small>
                    </div>
                  </div>

                  {/* Quantity & Actions */}
                  <div className="col-sm-4 col-12 text-sm-end">
                    <div className="d-flex align-items-center justify-content-sm-end gap-2 mb-2">
                      <div className="input-group input-group-sm" style={{ width: '100px' }}>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="form-control text-center fw-bold">{item.quantity}</span>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          disabled={item.quantity >= (product?.availableQuantity || 99)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item._id)}
                      className="btn btn-link btn-sm text-danger text-decoration-none p-0"
                    >
                      <i className="bi bi-trash3 me-1"></i> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="d-flex justify-content-between align-items-center p-3 bg-white rounded-3 shadow-sm">
            <Link to="/products" className="btn btn-outline-secondary btn-sm rounded-pill px-3">
              <i className="bi bi-arrow-left me-1"></i> Continue Shopping
            </Link>
            <div className="text-muted small">
              <i className="bi bi-shield-lock-fill text-success me-1"></i> Safe and Secure Payments
            </div>
          </div>
        </div>

        {/* Price Summary Column */}
        <div className="col-lg-4">
          <div className="smp-card p-4 sticky-top" style={{ top: '80px' }}>
            <h5 className="fw-bold brand-font text-uppercase text-secondary mb-3 border-bottom pb-2" style={{ fontSize: '0.9rem' }}>
              Price Details
            </h5>

            <div className="d-flex justify-content-between py-2 border-bottom small">
              <span className="text-muted">Price ({itemCount} items)</span>
              <span className="fw-semibold">₹{(cart.subtotal || 0).toFixed(2)}</span>
            </div>

            {cart.discountAmount > 0 && (
              <div className="d-flex justify-content-between py-2 border-bottom small text-success">
                <span>Discount</span>
                <span className="fw-semibold">-₹{cart.discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="d-flex justify-content-between py-2 border-bottom small">
              <span className="text-muted">Estimated GST</span>
              <span className="fw-semibold">₹{(cart.gstAmount || 0).toFixed(2)}</span>
            </div>

            <div className="d-flex justify-content-between py-2 border-bottom small">
              <span className="text-muted">Delivery Charges</span>
              <span className="text-success fw-bold">FREE</span>
            </div>

            <div className="d-flex justify-content-between py-3 border-bottom fs-5 fw-bold text-dark">
              <span>Total Amount</span>
              <span className="text-primary">₹{(cart.grandTotal || 0).toFixed(2)}</span>
            </div>

            <div className="alert alert-success py-2 px-3 small mt-3 mb-4 rounded-3">
              <i className="bi bi-tag-fill me-1"></i> You will save on this order with exclusive SMP discounts!
            </div>

            <button
              onClick={handleCheckout}
              className="btn btn-warning btn-lg w-100 rounded-pill fw-bold shadow-sm py-3 text-uppercase tracking-wider"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
