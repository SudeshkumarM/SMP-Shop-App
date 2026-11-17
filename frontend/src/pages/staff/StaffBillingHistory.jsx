import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const StaffBillingHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/billing/history', { params });
      if (res.data.success) {
        setInvoices(res.data.invoices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">POS Billing History</h3>
          <small className="text-muted">Search, view, and re-print customer tax invoices</small>
        </div>

        {/* Date Filter */}
        <div className="d-flex align-items-center gap-2">
          <input
            type="date"
            className="form-control form-control-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-muted">to</span>
          <input
            type="date"
            className="form-control form-control-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="smp-card p-3 bg-white mb-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="row g-2">
          <div className="col-md-9 col-sm-8">
            <input
              type="text"
              className="form-control"
              placeholder="Search by Invoice Number (SMP-INV-...) or Customer Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-md-3 col-sm-4 d-flex gap-2">
            <button type="submit" className="btn btn-primary w-100 fw-semibold">
              <i className="bi bi-search me-1"></i> Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); fetchInvoices(); }}
                className="btn btn-outline-secondary"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Invoices Table */}
      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-receipt-cutoff display-4 text-secondary mb-2 d-block"></i>
            <h5>No Billing Records Found</h5>
            <p className="small">Try adjusting search parameters or date filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Invoice Number</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Grand Total</th>
                  <th>Payment</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={inv._id}>
                    <td>{idx + 1}</td>
                    <td className="fw-bold text-primary">{inv.invoiceNumber}</td>
                    <td>{new Date(inv.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="fw-semibold text-dark">{inv.customerInfo?.name || 'Walk-in'}</div>
                      <small className="text-muted">{inv.customerInfo?.phone || 'N/A'}</small>
                    </td>
                    <td>{inv.items?.length || 1} item(s)</td>
                    <td className="fw-bold fs-6">₹{inv.grandTotal?.toFixed(2)}</td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn btn-outline-primary btn-sm rounded-pill px-3"
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

export default StaffBillingHistory;
