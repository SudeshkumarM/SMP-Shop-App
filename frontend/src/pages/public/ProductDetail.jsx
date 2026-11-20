import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import socket from '../../services/socket';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ProductCard from '../../components/customer/ProductCard';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColour, setSelectedColour] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/products/${id}`);
        if (res.data.success) {
          const prod = res.data.product;
          setProduct(prod);
          setRelated(res.data.relatedProducts || []);
          setSelectedImage(prod.images && prod.images.length > 0 ? prod.images[0] : '');
          setSelectedSize(prod.sizes && prod.sizes.length > 0 ? prod.sizes[0] : 'Standard');
          setSelectedColour(prod.colours && prod.colours.length > 0 ? prod.colours[0] : 'Default');
        }
      } catch (err) {
        console.error('Failed to load product:', err.message);
        addToast('Product not found', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();

    const handleProductRealtime = (data) => {
      if (data && data.product && data.product._id === id) {
        setProduct((prev) => ({ ...prev, ...data.product }));
      }
    };

    const handleInventoryRealtime = (data) => {
      if (data && data.productId === id) {
        setProduct((prev) => (prev ? { ...prev, availableQuantity: data.currentStock } : prev));
      }
    };

    socket.on('product:updated', handleProductRealtime);
    socket.on('inventory:updated', handleInventoryRealtime);

    return () => {
      socket.off('product:updated', handleProductRealtime);
      socket.off('inventory:updated', handleInventoryRealtime);
    };
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    await addToCart(product._id, selectedSize, selectedColour, quantity);
  };

  const handleBuyNow = async () => {
    if (!product) return;
    await addToCart(product._id, selectedSize, selectedColour, quantity);
    navigate('/cart');
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      addToast('Please login to save items to your wishlist', 'info');
      navigate('/customer/login');
      return;
    }
    try {
      await api.post(`/customer/wishlist/${product._id}`);
      addToast('Added to wishlist!', 'success');
    } catch (e) {
      addToast('Could not add to wishlist', 'error');
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-5 text-center">
        <h4 className="text-white">Product Not Found</h4>
        <Link to="/products" className="btn btn-primary rounded-pill mt-3">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4 fade-in">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3 small">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-info">Home</Link></li>
          <li className="breadcrumb-item"><Link to="/products" className="text-decoration-none text-info">Catalog</Link></li>
          <li className="breadcrumb-item active text-white" aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="row g-4 mb-5">
        {/* Gallery Column */}
        <div className="col-lg-5 col-md-6">
          <div className="smp-card p-3 sticky-top" style={{ top: '80px', backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <div className="product-gallery-image position-relative overflow-hidden rounded-3 d-flex align-items-center justify-content-center mb-3" style={{ height: '420px', backgroundColor: '#0F172A' }}>
              <img
                src={selectedImage || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80'}
                alt={product.name}
                className="w-100 h-100 object-fit-contain"
              />
              <button
                onClick={handleWishlist}
                className="btn position-absolute top-0 end-0 m-3 rounded-circle shadow-sm p-2"
                style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
                title="Save to wishlist"
              >
                <i className="bi bi-heart text-danger fs-5"></i>
              </button>
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="d-flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`btn p-1 rounded-2 border ${selectedImage === img ? 'border-primary border-2' : ''}`}
                    style={{ width: '64px', height: '64px', backgroundColor: '#0F172A' }}
                  >
                    <img src={img} alt="thumbnail" className="w-100 h-100 object-fit-cover rounded" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Details & Actions Column */}
        <div className="col-lg-7 col-md-6">
          <div className="smp-card p-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <span className="badge text-uppercase mb-2" style={{ backgroundColor: '#334155', color: '#38BDF8' }}>
              {product.brand}
            </span>
            <h2 className="fw-bold brand-font text-white mb-2">{product.name}</h2>

            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="smp-badge-rating fs-6 px-2 py-1">
                {product.rating ? product.rating.toFixed(1) : '4.5'} <i className="bi bi-star-fill small"></i>
              </span>
              <span className="small" style={{ color: '#94A3B8' }}>
                {product.numReviews || 36} Ratings & Reviews
              </span>
              <span className="text-secondary small">|</span>
              <span className="small" style={{ color: '#94A3B8' }}>
                SKU: <strong className="text-white">{product.sku}</strong>
              </span>
            </div>

            <hr className="my-3 text-secondary opacity-25" />

            {/* Price section */}
            <div className="mb-3">
              <div className="d-flex align-items-baseline gap-3">
                <span className="display-6 fw-bold text-white">₹{product.finalPrice}</span>
                {product.originalPrice > product.sellingPrice && (
                  <>
                    <span className="fs-5 text-decoration-line-through" style={{ color: '#94A3B8' }}>
                      ₹{product.originalPrice}
                    </span>
                    <span className="text-success fw-bold fs-5">
                      {product.discountPercent}% Off
                    </span>
                  </>
                )}
              </div>
              <small className="text-success fw-semibold">
                Special Price inclusive of {product.gstPercent || 5}% GST
              </small>
            </div>

            {/* Stock Alert */}
            <div className="mb-4">
              {product.availableQuantity <= 5 && product.availableQuantity > 0 ? (
                <div className="alert alert-danger py-2 px-3 small d-inline-flex align-items-center gap-2 mb-0">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  Hurry! Only {product.availableQuantity} items left in stock.
                </div>
              ) : product.availableQuantity > 0 ? (
                <span className="badge fs-6 px-3 py-1" style={{ backgroundColor: '#064E3B', color: '#34D399', border: '1px solid #059669' }}>
                  ✓ Available in Stock
                </span>
              ) : (
                <span className="badge bg-danger fs-6 px-3 py-1">
                  Currently Out of Stock
                </span>
              )}
            </div>

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-3">
                <label className="fw-bold small text-uppercase text-white d-block mb-2">
                  Select Size
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`btn btn-sm rounded-3 px-3 py-2 fw-semibold ${
                        selectedSize === s ? 'btn-primary' : 'btn-outline-secondary text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colour Selector */}
            {product.colours && product.colours.length > 0 && (
              <div className="mb-4">
                <label className="fw-bold small text-uppercase text-white d-block mb-2">
                  Select Colour: <span className="text-info fw-bold">{selectedColour}</span>
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {product.colours.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColour(c)}
                      className={`btn btn-sm rounded-pill px-3 py-1 ${
                        selectedColour === c ? 'btn-primary' : 'btn-outline-secondary text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-4 d-flex align-items-center gap-3">
              <label className="fw-bold small text-uppercase text-white mb-0">Quantity:</label>
              <div className="input-group" style={{ width: '130px' }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary text-white"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <span className="form-control text-center fw-bold bg-dark text-white border-0">{quantity}</span>
                <button
                  type="button"
                  className="btn btn-outline-secondary text-white"
                  onClick={() => setQuantity(Math.min(product.availableQuantity, quantity + 1))}
                  disabled={quantity >= product.availableQuantity}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-3 mb-4">
              <button
                onClick={handleAddToCart}
                disabled={product.availableQuantity <= 0}
                className="btn btn-danger btn-lg rounded-pill px-4 fw-bold flex-grow-1 shadow-sm d-flex align-items-center justify-content-center gap-2"
              >
                <i className="bi bi-cart3"></i> Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={product.availableQuantity <= 0}
                className="btn btn-primary btn-lg rounded-pill px-4 fw-bold flex-grow-1 shadow-sm d-flex align-items-center justify-content-center gap-2"
              >
                <i className="bi bi-lightning-charge-fill"></i> Buy Now
              </button>
            </div>

            {/* Description */}
            <div className="mt-4 pt-3 border-top" style={{ borderColor: '#334155' }}>
              <h5 className="fw-bold brand-font text-white mb-2">Product Description</h5>
              <p className="small leading-relaxed mb-0" style={{ color: '#CBD5E1' }}>
                {product.description}
              </p>
            </div>

            {/* Specifications Table */}
            <div className="mt-4 pt-3 border-top" style={{ borderColor: '#334155' }}>
              <h5 className="fw-bold brand-font text-white mb-3">Product Specifications</h5>
              <table className="table table-sm small mb-0" style={{ color: '#CBD5E1', borderColor: '#334155' }}>
                <tbody>
                  <tr>
                    <td className="fw-bold" style={{ width: '35%', backgroundColor: '#0F172A', color: '#94A3B8' }}>Brand</td>
                    <td className="text-white" style={{ backgroundColor: '#1E293B' }}>{product.brand}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold" style={{ backgroundColor: '#0F172A', color: '#94A3B8' }}>SKU Code</td>
                    <td className="text-white" style={{ backgroundColor: '#1E293B' }}>{product.sku}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold" style={{ backgroundColor: '#0F172A', color: '#94A3B8' }}>Barcode</td>
                    <td className="text-white" style={{ backgroundColor: '#1E293B' }}>{product.barcode}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold" style={{ backgroundColor: '#0F172A', color: '#94A3B8' }}>GST Rate</td>
                    <td className="text-white" style={{ backgroundColor: '#1E293B' }}>{product.gstPercent || 5}% Tax</td>
                  </tr>
                  <tr>
                    <td className="fw-bold" style={{ backgroundColor: '#0F172A', color: '#94A3B8' }}>Available Sizes</td>
                    <td className="text-white" style={{ backgroundColor: '#1E293B' }}>{product.sizes?.join(', ') || 'Standard'}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold" style={{ backgroundColor: '#0F172A', color: '#94A3B8' }}>Available Colours</td>
                    <td className="text-white" style={{ backgroundColor: '#1E293B' }}>{product.colours?.join(', ') || 'As shown'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-5">
          <h4 className="fw-bold brand-font text-white mb-3">Similar Products You Might Like</h4>
          <div className="row g-3">
            {related.map((item) => (
              <div className="col-lg-3 col-md-6 col-6" key={item._id}>
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
