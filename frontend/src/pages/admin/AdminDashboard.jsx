import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../../services/api';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const AdminDashboard = () => {
  const [data, setData] = useState({
    kpis: {
      totalCustomers: 0,
      totalStaff: 0,
      totalProducts: 0,
      totalOrders: 0,
      todaySales: 0,
      monthlySales: 0,
      lowStockCount: 0
    },
    lowStockProducts: [],
    recentTransactions: [],
    salesChart: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await api.get('/admin/dashboard-stats');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Admin dashboard error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  return (
    <div className="fade-in">
      {/* Metric Cards Grid */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-sm-6">
          <div className="smp-card smp-card-blue p-3 h-100 d-flex align-items-center gap-3">
            <div className="p-3 bg-primary-subtle text-primary rounded-3">
              <i className="bi bi-currency-rupee fs-3"></i>
            </div>
            <div>
              <div className="fs-5 fw-bold text-dark">₹{data.kpis.todaySales?.toFixed(2)}</div>
              <small className="text-muted">Today's Sales Revenue</small>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6">
          <div className="smp-card smp-card-green p-3 h-100 d-flex align-items-center gap-3">
            <div className="p-3 bg-success-subtle text-success rounded-3">
              <i className="bi bi-calendar-check fs-3"></i>
            </div>
            <div>
              <div className="fs-5 fw-bold text-dark">₹{data.kpis.monthlySales?.toFixed(2)}</div>
              <small className="text-muted">This Month's Sales</small>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6">
          <div className="smp-card smp-card-purple p-3 h-100 d-flex align-items-center gap-3">
            <div className="p-3 rounded-3" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
              <i className="bi bi-box-seam fs-3"></i>
            </div>
            <div>
              <div className="fs-5 fw-bold text-dark">{data.kpis.totalOrders}</div>
              <small className="text-muted">Total Orders Processed</small>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6">
          <div className="smp-card smp-card-orange p-3 h-100 d-flex align-items-center gap-3">
            <div className="p-3 rounded-3" style={{ backgroundColor: '#FFF7ED', color: '#F97316' }}>
              <i className="bi bi-tags-fill fs-3"></i>
            </div>
            <div>
              <div className="fs-5 fw-bold text-dark">{data.kpis.totalProducts}</div>
              <small className="text-muted">Active Products</small>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Sales Chart */}
        <div className="col-lg-8">
          <div className="smp-card p-4 bg-white shadow-sm h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold brand-font mb-0">Daily Sales Performance</h5>
                <small className="text-muted">Last 7 Days Revenue (₹)</small>
              </div>
              <Link to="/admin/reports" className="btn btn-outline-primary btn-sm rounded-pill px-3">
                Full Analytics <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            <div style={{ height: '300px' }}>
              {data.salesChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.salesChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Sales Revenue']} />
                    <Bar dataKey="sales" fill="#2874f0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                  No sales recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="col-lg-4">
          <div className="smp-card p-4 bg-white shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold brand-font mb-0 text-danger d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i> Low Stock Alerts
                </h5>
                <span className="badge bg-danger rounded-pill">
                  {data.kpis.lowStockCount} items
                </span>
              </div>

              {data.lowStockProducts.length === 0 ? (
                <p className="text-muted small">All inventory items are adequately stocked.</p>
              ) : (
                <div className="d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: '240px' }}>
                  {data.lowStockProducts.map((p) => (
                    <div key={p._id} className="p-2 border rounded-2 d-flex justify-content-between align-items-center small">
                      <div>
                        <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '160px' }}>
                          {p.name}
                        </div>
                        <small className="text-muted">SKU: {p.sku}</small>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-danger">
                          {p.availableQuantity} Left
                        </span>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Min: {p.lowStockThreshold}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link to="/admin/inventory" className="btn btn-outline-danger btn-sm rounded-pill w-100 mt-3 fw-semibold">
              Manage Inventory & Purchase Stock
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Counter Transactions */}
      <div className="smp-card p-4 bg-white shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold brand-font mb-0">Recent Shop Invoices & Counter Orders</h5>
          <Link to="/admin/orders" className="small text-primary text-decoration-none fw-semibold">
            View All Orders
          </Link>
        </div>

        {data.recentTransactions.length === 0 ? (
          <p className="text-muted small text-center py-4 mb-0">No transactions recorded yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Invoice Number</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Cashier Staff</th>
                  <th>Grand Total</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((inv) => (
                  <tr key={inv._id}>
                    <td className="fw-bold text-primary">{inv.invoiceNumber}</td>
                    <td>{new Date(inv.createdAt).toLocaleString()}</td>
                    <td>{inv.customerInfo?.name || 'Walk-in'}</td>
                    <td>{inv.staffId?.fullName || 'Cashier 1'}</td>
                    <td className="fw-bold">₹{inv.grandTotal?.toFixed(2)}</td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn btn-outline-primary btn-sm py-0 px-2 rounded-pill"
                      >
                        <i className="bi bi-printer me-1"></i> Print / PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
