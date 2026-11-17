import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OwnerExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Store Rent',
    shopId: '',
    paymentMethod: 'Bank Transfer',
    vendorName: '',
    invoiceNumber: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, shopRes] = await Promise.all([
        api.get('/owner/expenses'),
        api.get('/owner/shops')
      ]);
      if (expRes.data.success) {
        setExpenses(expRes.data.expenses || []);
        setTotalExpenses(expRes.data.totalExpenses || 0);
      }
      if (shopRes.data.success) {
        setShops(shopRes.data.shops || []);
        if (shopRes.data.shops?.length > 0) {
          setFormData(prev => ({ ...prev, shopId: shopRes.data.shops[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/owner/expenses', formData);
      if (res.data.success) {
        addToast('Expense recorded successfully', 'success');
        setShowAddModal(false);
        fetchData();
      }
    } catch (e) {
      addToast(e.response?.data?.message || 'Failed to record expense', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Operating Expense Ledger</h3>
          <small className="text-muted">Track rent, payroll, utilities, marketing & operational outlays for P&L math</small>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-danger btn-sm rounded-pill px-3 fw-semibold">
          <i className="bi bi-dash-circle me-1"></i> Record Operating Expense
        </button>
      </div>

      {/* KPI Card */}
      <div className="smp-card p-4 bg-white mb-4 shadow-sm border-start border-danger border-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <small className="text-muted text-uppercase fw-bold">Total Operating Outlays</small>
            <div className="display-6 fw-bold text-danger">₹{totalExpenses?.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-danger-subtle text-danger rounded-circle">
            <i className="bi bi-cash-coin fs-2"></i>
          </div>
        </div>
      </div>

      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Expense ID</th>
                  <th>Title</th>
                  <th>Shop</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Payment Mode</th>
                  <th>Vendor</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e._id}>
                    <td><span className="badge bg-light text-dark font-monospace border">{e.expenseId}</span></td>
                    <td className="fw-bold text-dark">{e.title}</td>
                    <td>{e.shopId?.name || 'SMP Elite Fashions'}</td>
                    <td><span className="badge bg-secondary">{e.category}</span></td>
                    <td className="fw-bold fs-6 text-danger">₹{e.amount?.toFixed(2)}</td>
                    <td>{e.paymentMethod}</td>
                    <td>{e.vendorName || 'Direct'}</td>
                    <td>{new Date(e.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Record Operating Expense</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateExpense}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Expense Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anna Nagar Store Monthly Rent / AC Electricity Bill"
                      className="form-control"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Target Retail Shop *</label>
                      <select
                        className="form-select"
                        required
                        value={formData.shopId}
                        onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                      >
                        {shops.map((s) => (
                          <option key={s._id} value={s._id}>{s.name} ({s.shopCode})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="e.g. 85000"
                        className="form-control"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Expense Category *</label>
                      <select
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="Store Rent">Store Rent</option>
                        <option value="Employee Salaries">Employee Salaries</option>
                        <option value="Electricity & Utilities">Electricity & Utilities</option>
                        <option value="Marketing & Advertising">Marketing & Advertising</option>
                        <option value="Store Maintenance & Repairs">Store Maintenance & Repairs</option>
                        <option value="Packaging & Shopping Bags">Packaging & Shopping Bags</option>
                        <option value="Courier & Logistics">Courier & Logistics</option>
                        <option value="Software & IT Subscriptions">Software & IT Subscriptions</option>
                        <option value="Miscellaneous Expenses">Miscellaneous Expenses</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Payment Mode</label>
                      <select
                        className="form-select"
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Corporate Card">Corporate Card</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Vendor / Payee</label>
                      <input
                        type="text"
                        placeholder="e.g. Landlord / TANGEDCO"
                        className="form-control"
                        value={formData.vendorName}
                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Invoice / Bill #</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        className="form-control"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger btn-sm px-4 fw-semibold">
                    Record Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerExpenses;
