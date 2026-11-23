import React, { useState, useEffect, useRef } from 'react';
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
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingBill, setDeletingBill] = useState(false);
  const deletionInFlightRef = useRef(false);

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

  const handleDeleteBill = async () => {
    if (!deletingInvoice || deletionInFlightRef.current) return;
    const reason = deleteReason.trim();
    if (!reason) {
      addToast('Enter a reason before deleting this bill.', 'warning');
      return;
    }

    deletionInFlightRef.current = true;
    setDeletingBill(true);
    try {
      const res = await api.delete(`/billing/invoice/${deletingInvoice._id}`, {
        data: { reason }
      });
      if (!res.data?.success) {
        addToast(res.data?.message || 'Bill was not permanently deleted.', 'error');
        return;
      }

      addToast(res.data.message || 'Bill permanently deleted.', 'success');
      setDeletingInvoice(null);
      setDeleteReason('');
      await fetchInvoices();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to permanently delete bill.', 'error');
    } finally {
      deletionInFlightRef.current = false;
      setDeletingBill(false);
    }
  };

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
                      <div className="btn-group btn-group-sm">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowPrintModal(true);
                          }}
                          className="btn btn-outline-dark"
                          title="Print / View Invoice"
                        >
                          <i className="bi bi-printer"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingInvoice(inv);
                            setDeleteReason('');
                          }}
                          className="btn btn-outline-danger"
                          title="Permanently delete bill"
                          aria-label={`Permanently delete bill ${inv.invoiceNumber}`}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deletingInvoice && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">Permanently delete bill</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  disabled={deletingBill}
                  onClick={() => setDeletingInvoice(null)}
                />
              </div>
              <div className="modal-body">
                <p>
                  Permanently delete invoice <strong>{deletingInvoice.invoiceNumber}</strong>?
                </p>
                <p className="small text-danger">
                  This cannot be undone. Active-bill stock restoration and linked-order cancellation/refund are handled in the same database transaction.
                </p>
                <label htmlFor="owner-bill-delete-reason" className="form-label small fw-semibold">
                  Reason for permanent deletion
                </label>
                <textarea
                  id="owner-bill-delete-reason"
                  className="form-control"
                  rows="3"
                  maxLength="500"
                  required
                  value={deleteReason}
                  disabled={deletingBill}
                  onChange={(event) => setDeleteReason(event.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={deletingBill}
                  onClick={() => setDeletingInvoice(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deletingBill || !deleteReason.trim()}
                  onClick={handleDeleteBill}
                >
                  {deletingBill ? 'Deleting...' : 'Confirm Permanent Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
