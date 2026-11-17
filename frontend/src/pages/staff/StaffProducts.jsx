import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const StaffProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff/product-availability', { params: { search } });
      if (res.data.success) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold brand-font mb-0">In-Store Product Availability & Stock Check</h3>
          <small className="text-muted">Quickly verify product inventory, rack stock, barcodes, and pricing</small>
        </div>
      </div>

      <div className="smp-card p-3 bg-white mb-4 shadow-sm">
        <form onSubmit={handleSearch} className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Scan Barcode or type Product Name, Brand, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary px-4 fw-semibold">
            Search
          </button>
        </form>
      </div>

      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : products.length === 0 ? (
          <p className="text-center py-4 text-muted">No products found matching your search.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>SKU / Barcode</th>
                  <th>Category</th>
                  <th>Sizes</th>
                  <th>Price (Incl. GST)</th>
                  <th>Stock Available</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=100&q=80'}
                          alt={p.name}
                          className="rounded-2 object-fit-cover"
                          style={{ width: '40px', height: '40px' }}
                        />
                        <div>
                          <div className="fw-bold text-dark">{p.name}</div>
                          <small className="text-muted">{p.brand}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold">{p.sku}</div>
                      <small className="text-muted">{p.barcode}</small>
                    </td>
                    <td>{p.category?.name || 'Apparel'}</td>
                    <td>{p.sizes?.join(', ') || 'Standard'}</td>
                    <td className="fw-bold fs-6">₹{p.finalPrice || p.sellingPrice}</td>
                    <td>
                      <span className={`fw-bold ${p.availableQuantity <= 5 ? 'text-danger' : 'text-success'}`}>
                        {p.availableQuantity} units
                      </span>
                    </td>
                    <td>
                      {p.availableQuantity <= 0 ? (
                        <span className="badge bg-danger">Out of Stock</span>
                      ) : p.availableQuantity <= (p.lowStockThreshold || 5) ? (
                        <span className="badge bg-warning text-dark">Low Stock Alert</span>
                      ) : (
                        <span className="badge bg-success">In Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffProducts;
