import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import ProductCard from '../../components/customer/ProductCard';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters State
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [size, setSize] = useState(searchParams.get('size') || '');
  const [colour, setColour] = useState(searchParams.get('colour') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStock, setInStock] = useState(searchParams.get('inStock') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  // Load categories on mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/products/categories/list');
        if (res.data.success) setCategories(res.data.categories);
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    };
    fetchCats();
  }, []);

  // Fetch filtered products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (category) params.category = category;
      if (brand) params.brand = brand;
      if (size) params.size = size;
      if (colour) params.colour = colour;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (inStock) params.inStock = 'true';
      if (sort) params.sort = sort;

      const res = await api.get('/products', { params });
      if (res.data.success) {
        setProducts(res.data.products);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error('Error fetching products:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category, brand, size, colour, sort, inStock]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleClearFilters = () => {
    setKeyword('');
    setCategory('');
    setBrand('');
    setSize('');
    setColour('');
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setSort('newest');
    setSearchParams({});
  };

  return (
    <div className="container py-4 fade-in">
      {/* Breadcrumb & Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold brand-font mb-0">Fashion & Apparel Catalog</h2>
          <small className="text-muted">Showing {products.length} of {total} products</small>
        </div>

        {/* Sort selector */}
        <div className="d-flex align-items-center gap-2">
          <label className="text-nowrap small fw-semibold text-secondary">Sort by:</label>
          <select
            className="form-select form-select-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ width: '190px' }}
          >
            <option value="newest">Newest Arrivals</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Customer Rating</option>
            <option value="popular">Popularity</option>
          </select>
        </div>
      </div>

      <div className="row g-4">
        {/* Filters Sidebar */}
        <div className="col-lg-3 col-md-4">
          <div className="smp-card p-3 sticky-top" style={{ top: '80px', zIndex: 10 }}>
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <h5 className="fw-bold mb-0">Filters</h5>
              <button onClick={handleClearFilters} className="btn btn-link btn-sm text-danger p-0 text-decoration-none">
                Clear All
              </button>
            </div>

            <form onSubmit={handleApplyFilter}>
              {/* Keyword Search */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase text-secondary">Search Item</label>
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Saree, Kurta..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  <button className="btn btn-primary" type="submit">
                    <i className="bi bi-search"></i>
                  </button>
                </div>
              </div>

              {/* Category */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase text-secondary">Category</label>
                <select
                  className="form-select form-select-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sizes */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase text-secondary">Size</label>
                <div className="d-flex flex-wrap gap-1">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSize(size === s ? '' : s)}
                      className={`btn btn-sm ${size === s ? 'btn-primary' : 'btn-outline-secondary'} py-0 px-2`}
                      style={{ fontSize: '0.78rem' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase text-secondary">Price Range (₹)</label>
                <div className="d-flex gap-2">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <span className="text-muted align-self-center">-</span>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* In Stock Only */}
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="inStockCheck"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="inStockCheck">
                  In Stock Items Only
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-sm w-100 rounded-pill fw-semibold">
                Apply Filters
              </button>
            </form>
          </div>
        </div>

        {/* Products Grid */}
        <div className="col-lg-9 col-md-8">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading apparel collection...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="smp-card p-5 text-center">
              <i className="bi bi-search text-muted display-4 mb-3"></i>
              <h4>No products matched your criteria</h4>
              <p className="text-muted small">Try adjusting your filters, searching with different terms, or resetting filters.</p>
              <button onClick={handleClearFilters} className="btn btn-primary rounded-pill px-4">
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="row g-3">
              {products.map((product) => (
                <div className="col-lg-4 col-sm-6" key={product._id}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
