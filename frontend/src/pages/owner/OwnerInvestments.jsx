import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OwnerInvestments = () => {
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [investments, setInvestments] = useState([]);
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestmentId, setEditingInvestmentId] = useState(null);
  const [savingInvestment, setSavingInvestment] = useState(false);
  const [deletingInvestmentId, setDeletingInvestmentId] = useState(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    shopId: '',
    expectedProfit: '',
    date: todayDate,
    duration: '',
    expectedReturnPercentage: '',
    purpose: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, shopRes] = await Promise.all([
        api.get('/owner/investments'),
        api.get('/owner/shops')
      ]);
      if (invRes.data.success) {
        setInvestments(invRes.data.investments || []);
        setTotalInvestment(invRes.data.totalInvestment || 0);
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

  const handleCreateInvestment = async (e) => {
    e.preventDefault();
    setSavingInvestment(true);
    try {
      const res = editingInvestmentId
        ? await api.put(`/owner/investments/${editingInvestmentId}`, formData)
        : await api.post('/owner/investments', formData);
      if (res.data.success) {
        addToast(
          editingInvestmentId ? 'Investment updated successfully' : 'Investment entry recorded successfully',
          'success'
        );
        setShowAddModal(false);
        setEditingInvestmentId(null);
        await fetchData();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save investment', 'error');
    } finally {
      setSavingInvestment(false);
    }
  };

  const openAddInvestment = () => {
    setEditingInvestmentId(null);
    setFormData({
      title: '',
      amount: '',
      shopId: shops[0]?._id || '',
      expectedProfit: '',
      date: todayDate,
      duration: '',
      expectedReturnPercentage: '',
      purpose: '',
      notes: ''
    });
    setShowAddModal(true);
  };

  const openEditInvestment = (investment) => {
    setEditingInvestmentId(investment._id);
    setFormData({
      title: investment.title || '',
      amount: investment.amount == null ? '' : String(investment.amount),
      shopId: investment.shopId?._id || investment.shopId || '',
      expectedProfit: investment.expectedProfit == null ? '' : String(investment.expectedProfit),
      date: investment.date ? new Date(investment.date).toISOString().slice(0, 10) : '',
      duration: investment.duration || '',
      expectedReturnPercentage: investment.expectedReturnPercentage == null
        ? ''
        : String(investment.expectedReturnPercentage),
      purpose: investment.purpose || '',
      notes: investment.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteInvestment = async (investment) => {
    const confirmed = window.confirm('Are you sure you want to delete this investment?');
    if (!confirmed) return;

    setDeletingInvestmentId(investment._id);
    try {
      const res = await api.delete(`/owner/investments/${investment._id}`);
      if (res.data.success) {
        addToast('Investment deleted successfully', 'success');
        await fetchData();
      } else {
        addToast(res.data.message || 'Failed to delete investment', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete investment', 'error');
    } finally {
      setDeletingInvestmentId(null);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Investment Portfolio</h3>
          <small className="text-muted">Track invested amounts, expected returns, duration, and purpose</small>
        </div>

        <button onClick={openAddInvestment} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
          <i className="bi bi-bank me-1"></i> Add Investment
        </button>
      </div>

      {/* KPI Card */}
      <div className="smp-card p-4 bg-white mb-4 shadow-sm border-start border-primary border-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <small className="text-muted text-uppercase fw-bold">Total Capital Committed Across Platform</small>
            <div className="display-6 fw-bold text-primary">₹{totalInvestment?.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-primary-subtle text-primary rounded-circle">
            <i className="bi bi-pie-chart-fill fs-2"></i>
          </div>
        </div>
      </div>

      {/* Investment Records */}
      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h5 className="fw-bold brand-font mb-0">Investment Records</h5>
              <span className="badge rounded-pill bg-primary-subtle text-primary">
                {investments.length} {investments.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <div
              className="rounded border"
              role="region"
              aria-label="Investment records. Scroll vertically for records and horizontally for all columns."
              tabIndex="0"
              style={{
                maxHeight: '65vh',
                overflowX: 'auto',
                overflowY: 'auto',
                overscrollBehavior: 'contain'
              }}
            >
              <table className="table table-hover table-striped align-middle small mb-0" style={{ minWidth: '1180px' }}>
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Investment ID</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Investment Name</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Shop</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Total Investment</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Expected Profit</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Expected Return</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Duration</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Purpose</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Investment Date</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Additional Notes</th>
                    <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv) => (
                    <tr key={inv._id}>
                      <td><span className="badge bg-light text-dark font-monospace border">{inv.investmentId}</span></td>
                      <td className="fw-semibold">{inv.title || '—'}</td>
                      <td>{inv.shopId?.name || 'SMP Elite Fashions'}</td>
                      <td className="fw-bold fs-6 text-primary">₹{inv.amount?.toFixed(2)}</td>
                      <td>{inv.expectedProfit == null ? '—' : `₹${inv.expectedProfit.toFixed(2)}`}</td>
                      <td>{inv.expectedReturnPercentage == null ? '—' : `${inv.expectedReturnPercentage}%`}</td>
                      <td>{inv.duration || '—'}</td>
                      <td>{inv.purpose || inv.title || inv.category || '—'}</td>
                      <td>{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="text-break">{inv.notes || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEditInvestment(inv)}
                            disabled={savingInvestment || deletingInvestmentId === inv._id}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteInvestment(inv)}
                            disabled={savingInvestment || deletingInvestmentId === inv._id}
                          >
                            {deletingInvestmentId === inv._id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {investments.length === 0 && (
                  <tbody>
                    <tr>
                      <td colSpan="11" className="text-center text-muted py-4">No investment records yet.</td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Investment Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <div>
                  <h5 className="modal-title fw-bold">{editingInvestmentId ? 'Edit Investment' : 'Add Investment'}</h5>
                  <p className="text-muted small mb-0">Capture the amount, expected outcome, and purpose.</p>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateInvestment}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold" htmlFor="investment-title">Investment Name / Title *</label>
                      <input
                        id="investment-title"
                        type="text"
                        required
                        maxLength="120"
                        placeholder="e.g. New store expansion"
                        className="form-control"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold" htmlFor="investment-shop">Shop *</label>
                      <select
                        id="investment-shop"
                        className="form-select"
                        required
                        value={formData.shopId}
                        onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                      >
                        <option value="" disabled>Select a shop</option>
                        {shops.map((shop) => (
                          <option key={shop._id} value={shop._id}>{shop.name} ({shop.shopCode})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" htmlFor="investment-amount">Total Investment Amount (₹) *</label>
                      <small className="form-text d-block mb-1">How much have you invested so far?</small>
                      <input
                        id="investment-amount"
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="e.g. 500000.00"
                        className="form-control"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" htmlFor="investment-profit">Expected Profit (₹) *</label>
                      <small className="form-text d-block mb-1">How much profit do you expect to earn?</small>
                      <input
                        id="investment-profit"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="e.g. 75000.00"
                        className="form-control"
                        value={formData.expectedProfit}
                        onChange={(e) => setFormData({ ...formData, expectedProfit: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" htmlFor="investment-date">Investment Date *</label>
                      <small className="form-text d-block mb-1">When did you make this investment?</small>
                      <input
                        id="investment-date"
                        type="date"
                        required
                        max={todayDate}
                        className="form-control"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" htmlFor="investment-duration">Investment Duration *</label>
                      <small className="form-text d-block mb-1">How long do you plan to keep it invested?</small>
                      <select
                        id="investment-duration"
                        className="form-select"
                        required
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      >
                        <option value="" disabled>Select duration</option>
                        <option value="3–6 Months">3–6 Months</option>
                        <option value="6–12 Months">6–12 Months</option>
                        <option value="1–3 Years">1–3 Years</option>
                        <option value="More than 3 Years">More than 3 Years</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" htmlFor="investment-return">Expected Return Percentage (%) *</label>
                      <small className="form-text d-block mb-1">What percentage of return do you expect?</small>
                      <input
                        id="investment-return"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="e.g. 15"
                        className="form-control"
                        value={formData.expectedReturnPercentage}
                        onChange={(e) => setFormData({ ...formData, expectedReturnPercentage: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" htmlFor="investment-purpose">Investment Purpose *</label>
                      <small className="form-text d-block mb-1">What is the main purpose of this investment?</small>
                      <select
                        id="investment-purpose"
                        className="form-select"
                        required
                        value={formData.purpose}
                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      >
                        <option value="" disabled>Select purpose</option>
                        <option value="Business Growth">Business Growth</option>
                        <option value="Personal Savings">Personal Savings</option>
                        <option value="Long-term Investment">Long-term Investment</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold" htmlFor="investment-notes">Additional Notes <span className="text-muted fw-normal">(optional)</span></label>
                      <small className="form-text d-block mb-1">Anything else you would like to mention?</small>
                      <textarea
                        id="investment-notes"
                        rows="3"
                        maxLength="2000"
                        placeholder="Add any useful context about this investment"
                        className="form-control"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingInvestmentId(null);
                    }}
                    disabled={savingInvestment}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold" disabled={savingInvestment}>
                    {savingInvestment ? 'Saving…' : editingInvestmentId ? 'Update Investment' : 'Save Investment'}
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

export default OwnerInvestments;
