import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const StaffDashboard = () => {
  const [stats, setStats] = useState({
    todaySales: 0,
    totalBills: 0,
    totalCustomersServed: 0,
    pendingOrders: 0,
    availableProducts: 0,
    staffLifetimeBills: 0,
    staffLifetimeRevenue: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/staff/dashboard-stats');
        if (res.data.success) {
          setStats(res.data.stats);
          setRecentTransactions(res.data.recentTransactions || []);
        }
      } catch (err) {
        console.error('Staff dashboard error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="fade-in">
      {/* Top Banner with POS Quick Launch */}
      <div className="smp-card p-4 bg-white mb-4 border-0 shadow-sm">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <span className="badge bg-success-subtle text-success px-3 py-1 rounded-pill fw-bold mb-2">
              POINT OF SALE ACTIVE
            </span>
            <h3 className="fw-bold brand-font mb-1">Billing Terminal & Counter Operations</h3>
            <p className="text-muted small mb-0">Fast barcode lookup, GST invoicing, customer lookup, and cash/UPI receipt printing.</p>
          </div>
          <div>
            <Link
              to="/staff/billing"
              className="btn btn-primary btn-lg rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
            >
              <i className="bi bi-receipt-cutoff fs-5"></i> Open POS Billing Terminal
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-sm-6">
          <div className="smp-card smp-card-green p-3 h-100 d-flex align-items-center gap-3">
            <div className="p-3 bg-success-subtle text-success rounded-3">
              <i className="bi bi-currency-rupee fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold text-dark">₹{stats.todaySales?.toFixed(2)}</div>
              <small className="text-muted">Today's Sales</small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="smp-card smp-card-blue p-3 h-100 d-flex align-items-center gap-3">
            <div className="p-3 bg-primary-subtle text-primary rounded-3">
              <i className="bi bi-receipt fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold text-dark">{stats.totalBills}</div>
              <small className="text-muted">Total Bills Generated Today</small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="smp-card smp-card-teal p-3 h-100 d-flex align-items-center gap-3">
            <div className="p-3 rounded-3" style={{ backgroundColor: '#F0FDFA', color: '#0D9488' }}>
              <i className="bi bi-people-fill fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold text-dark">{stats.totalCustomersServed}</div>
              <small className="text-muted">Customers Served Today</small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="smp-card smp-card-orange p-3 h-100 d-flex align-items-center gap-3">
            <div className="p-3 rounded-3" style={{ backgroundColor: '#FFF7ED', color: '#F97316' }}>
              <i className="bi bi-box-seam fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold text-dark">{stats.availableProducts}</div>
              <small className="text-muted">Available In-Store Products</small>
            </div>
          </div>
        </div>
      </div>

      {/* Recent POS Transactions Table */}
      <div className="smp-card p-4 bg-white mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold brand-font mb-0">Recent Counter Transactions</h5>
          <Link to="/staff/billing-history" className="small text-primary text-decoration-none fw-semibold">
            View All Billing History <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : recentTransactions.length === 0 ? (
          <p className="text-muted small text-center py-4 mb-0">No billing transactions recorded yet today.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Time</th>
                  <th>Items</th>
                  <th>Grand Total</th>
                  <th>Payment Mode</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((inv) => (
                  <tr key={inv._id}>
                    <td className="fw-bold text-primary">{inv.invoiceNumber}</td>
                    <td>
                      <div>{inv.customerInfo?.name || 'Walk-in'}</div>
                      <small className="text-muted">{inv.customerInfo?.phone || 'N/A'}</small>
                    </td>
                    <td>{new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{inv.items?.length || 1} item(s)</td>
                    <td className="fw-bold">₹{inv.grandTotal?.toFixed(2)}</td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn btn-outline-secondary btn-sm py-0 px-2 rounded-pill"
                      >
                        <i className="bi bi-printer me-1"></i> Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Print Modal */}
      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default StaffDashboard;
