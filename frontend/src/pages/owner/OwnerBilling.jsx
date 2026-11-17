import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const OwnerBilling = () => {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing/history', {
        params: { search, limit: 100, includeDeleted: 'true' }
      });
      if (res.data.success) {
        setInvoices(res.data.invoices);
      }
    } catch (err) {
      addToast('Failed to load bills', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search]);

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold brand-font mb-1">Corporate Billing & Invoicing Oversight</h2>
          <p className="text-muted mb-0">Platform-wide audit of all retail counter invoices, GST compliance, and cancellations</p>
        </div>
      </div>

      <div className="smp-card p-3 mb-4 bg-white">
        <div className="input-group">
          <span className="input-group-text bg-light"><i className="bi bi-search"></i></span>
          <input
            type="text"
            className="form-control"
            placeholder="Search all mall bills by Invoice #, Customer, Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="smp-card p-0 overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-dark">
              <tr className="small text-uppercase">
                <th className="ps-4">Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Cashier</th>
                <th>Subtotal</th>
                <th>GST (5%)</th>
                <th>Grand Total</th>
                <th>Status</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-warning me-2"></div>
                    Loading corporate bills...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className={inv.isDeleted ? 'table-danger' : ''}>
                    <td className="ps-4 fw-bold font-monospace">
                      {inv.invoiceNumber}
                      {inv.isDeleted && <span className="badge bg-danger ms-2">CANCELLED</span>}
                    </td>
                    <td className="small text-muted">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>{inv.customerInfo?.name}</td>
                    <td><span className="badge bg-light text-dark border">{inv.staffId?.fullName || 'Cashier'}</span></td>
                    <td>₹{inv.subtotal}</td>
                    <td>₹{inv.cgstAmount + inv.sgstAmount}</td>
                    <td className="fw-bold">₹{inv.grandTotal}</td>
                    <td>
                      <span className={`badge ${inv.isDeleted ? 'bg-danger' : 'bg-success'}`}>
                        {inv.isDeleted ? 'DELETED' : inv.paymentStatus}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setShowPrintModal(true);
                        }}
                        className="btn btn-sm btn-outline-dark"
                        title="Print / View Invoice"
                      >
                        <i className="bi bi-printer"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPrintModal && selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
};

export default OwnerBilling;
