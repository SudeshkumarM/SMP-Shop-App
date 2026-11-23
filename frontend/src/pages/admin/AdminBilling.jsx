import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const AdminBilling = () => {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Edit Bill Modal State
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editReason, setEditReason] = useState('Counter correction');
  const [editItems, setEditItems] = useState([]);

  // Delete Bill State
  const [deletingId, setDeletingId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('Authorized permanent deletion');
  const [deletingBill, setDeletingBill] = useState(false);
  const deletionInFlightRef = useRef(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing/history', {
        params: { search, startDate, endDate, limit: 50, includeDeleted: 'true' }
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
  }, [search, startDate, endDate]);

  const handleOpenEdit = (inv) => {
    setEditingInvoice(inv);
    setEditItems(inv.items.map(it => ({ ...it })));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;

    try {
      const res = await api.put(`/billing/invoice/${editingInvoice._id}`, {
        items: editItems,
        reason: editReason
      });
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setEditingInvoice(null);
        fetchInvoices();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update bill', 'error');
    }
  };

  const handleDeleteBill = async () => {
    if (!deletingId || deletionInFlightRef.current) return;
    if (!deleteReason.trim()) {
      addToast('Enter a reason before deleting this bill.', 'warning');
      return;
    }

    deletionInFlightRef.current = true;
    setDeletingBill(true);
    try {
      const res = await api.delete(`/billing/invoice/${deletingId}`, {
        data: { reason: deleteReason.trim() }
      });
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setDeletingId(null);
        fetchInvoices();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete bill', 'error');
    } finally {
      deletionInFlightRef.current = false;
      setDeletingBill(false);
    }
  };

  const handleOpenPrint = (inv) => {
    setSelectedInvoice(inv);
    setShowPrintModal(true);
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold brand-font mb-1">Billing & Invoices Management</h2>
          <p className="text-muted mb-0">Search, inspect, edit, print, or permanently delete counter bills</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="smp-card p-3 mb-4 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search Invoice #, Customer Name, Phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="col-md-1">
            <button
              onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); }}
              className="btn btn-outline-secondary w-100"
              title="Reset Filters"
            >
              <i className="bi bi-arrow-counterclockwise"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="smp-card p-0 overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="small text-muted text-uppercase">
                <th className="ps-4">Invoice #</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Staff Cashier</th>
                <th>Grand Total</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Loading bills...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <i className="bi bi-receipt display-4 d-block mb-2 text-secondary opacity-50"></i>
                    No billing records found matching your filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className={inv.isDeleted ? 'table-danger opacity-75' : ''}>
                    <td className="ps-4 fw-bold font-monospace">
                      {inv.invoiceNumber}
                      {inv.isDeleted && <span className="badge bg-danger ms-2">SOFT DELETED</span>}
                    </td>
                    <td className="small text-muted">
                      {new Date(inv.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <div className="fw-semibold">{inv.customerInfo?.name || 'Walk-in'}</div>
                      <div className="small text-muted">{inv.customerInfo?.phone || 'N/A'}</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        <i className="bi bi-person me-1"></i>
                        {inv.staffId?.fullName || 'Cashier'}
                      </span>
                    </td>
                    <td className="fw-bold text-dark">
                      ₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${
                        inv.paymentMethod.includes('CASH') ? 'bg-success' : 'bg-primary'
                      }`}>
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        inv.isDeleted ? 'bg-danger' : inv.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'
                      }`}>
                        {inv.isDeleted ? 'CANCELLED' : inv.paymentStatus}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <div className="btn-group btn-group-sm">
                        <button
                          onClick={() => handleOpenPrint(inv)}
                          className="btn btn-outline-primary"
                          title="Print / View Invoice"
                        >
                          <i className="bi bi-printer"></i>
                        </button>
                        {!inv.isDeleted && (
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            className="btn btn-outline-warning"
                            title="Edit Bill"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingId(inv._id)}
                          className="btn btn-outline-danger"
                          title="Permanently delete bill (Admin or Owner)"
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

      {/* Edit Bill Modal */}
      {editingInvoice && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square text-warning me-2"></i>
                  Edit Bill: {editingInvoice.invoiceNumber}
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingInvoice(null)}></button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="modal-body">
                  <div className="alert alert-info py-2 small mb-3">
                    <i className="bi bi-info-circle me-1"></i> Modifying items will automatically adjust product stock and log your changes into the audit trail.
                  </div>

                  <h6 className="fw-bold mb-2">Line Items:</h6>
                  <div className="table-responsive mb-3">
                    <table className="table table-sm border align-middle">
                      <thead className="table-light small">
                        <tr>
                          <th>Item</th>
                          <th>Unit Price</th>
                          <th style={{ width: '120px' }}>Quantity</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="fw-semibold">{item.productName}</td>
                            <td>₹{item.unitPrice}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  const updated = [...editItems];
                                  updated[idx].quantity = val;
                                  setEditItems(updated);
                                }}
                              />
                            </td>
                            <td>₹{item.unitPrice * item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Reason for Correction *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Customer changed quantity, wrong billing item"
                      className="form-control"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingInvoice(null)}>Cancel</button>
                  <button type="submit" className="btn btn-warning fw-bold">Save Changes & Audit</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admin/Owner permanent-delete confirmation */}
      {deletingId && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Permanently Delete Bill
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeletingId(null)}
                  disabled={deletingBill}
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-danger">
                  This permanently removes the bill from MongoDB and cannot be undone. Active bills restore stock and cancel/refund linked orders in the same transaction. Previously cancelled bills are removed without repeating those actions.
                </p>
                <label className="form-label small fw-semibold">Reason for Permanent Deletion *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="Reason for removing this bill"
                  maxLength={500}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeletingId(null)}
                  disabled={deletingBill}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBill}
                  className="btn btn-danger fw-bold"
                  disabled={deletingBill || !deleteReason.trim()}
                >
                  {deletingBill ? 'Deleting...' : 'Confirm Permanent Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Print/PDF Modal */}
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

export default AdminBilling;
