import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OwnerInvestments = () => {
  const [investments, setInvestments] = useState([]);
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Initial Capital',
    shopId: '',
    sourceOfFunds: 'Owner Equity',
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
    try {
      const res = await api.post('/owner/investments', formData);
      if (res.data.success) {
        addToast('Investment entry recorded successfully', 'success');
        setShowAddModal(false);
        fetchData();
      }
    } catch (e) {
      addToast(e.response?.data?.message || 'Failed to record investment', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Capital Investment Portfolio</h3>
          <small className="text-muted">Track capital allocation, store renovations, machinery & working capital</small>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
          <i className="bi bi-bank me-1"></i> Record Capital Investment
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

      {/* Table */}
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
                  <th>Investment ID</th>
                  <th>Title & Purpose</th>
                  <th>Shop</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Source of Funds</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((inv) => (
                  <tr key={inv._id}>
                    <td><span className="badge bg-light text-dark font-monospace border">{inv.investmentId}</span></td>
                    <td className="fw-bold text-dark">{inv.title}</td>
                    <td>{inv.shopId?.name || 'SMP Elite Fashions'}</td>
                    <td><span className="badge bg-secondary">{inv.category}</span></td>
                    <td className="fw-bold fs-6 text-primary">₹{inv.amount?.toFixed(2)}</td>
                    <td>{inv.sourceOfFunds}</td>
                    <td>{new Date(inv.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Investment Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Record Capital Investment</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateInvestment}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Investment Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Interior Renovation, Air Conditioning, POS Hardware"
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
                        placeholder="e.g. 500000"
                        className="form-control"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Capital Category *</label>
                    <select
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Initial Capital">Initial Capital</option>
                      <option value="Store Renovation & Interior">Store Renovation & Interior</option>
                      <option value="Machinery & Equipment">Machinery & Equipment</option>
                      <option value="IT & POS Hardware">IT & POS Hardware</option>
                      <option value="Inventory Capital">Inventory Capital</option>
                      <option value="Marketing & Launch Fund">Marketing & Launch Fund</option>
                      <option value="Additional Working Capital">Additional Working Capital</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Source of Funds</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.sourceOfFunds}
                      onChange={(e) => setFormData({ ...formData, sourceOfFunds: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Record Investment
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
