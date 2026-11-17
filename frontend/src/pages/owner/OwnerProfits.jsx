import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import api from '../../services/api';

const OwnerProfits = () => {
  const [report, setReport] = useState({
    summary: {
      totalSalesRevenue: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      totalOperatingExpenses: 0,
      netProfit: 0,
      grossMarginPercent: 0,
      netMarginPercent: 0,
      ordersProcessed: 0
    },
    expenseBreakdown: {}
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchProfitLoss = async () => {
    setLoading(true);
    try {
      const res = await api.get('/owner/profit-loss', {
        params: { startDate, endDate }
      });
      if (res.data.success) {
        setReport(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitLoss();
  }, [startDate, endDate]);

  const s = report.summary;

  const chartData = [
    {
      name: 'Financial Math',
      Revenue: s.totalSalesRevenue,
      COGS: s.costOfGoodsSold,
      GrossProfit: s.grossProfit,
      Expenses: s.totalOperatingExpenses,
      NetProfit: s.netProfit
    }
  ];

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Audited Profit & Loss (P&L) Statement</h3>
          <small className="text-muted">Rigorous mathematical verification: Gross Profit = Revenue - COGS; Net Profit = Gross Profit - Operating Expenses</small>
        </div>

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

      {/* Primary Mathematical KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Revenue */}
        <div className="col-md-3 col-6">
          <div className="smp-card p-3 bg-white h-100 border-top border-primary border-4">
            <small className="text-muted text-uppercase fw-bold">1. Total Sales Revenue</small>
            <div className="fs-4 fw-bold text-primary">₹{s.totalSalesRevenue?.toFixed(2)}</div>
            <small className="text-muted">{s.ordersProcessed} transactions audited</small>
          </div>
        </div>

        {/* COGS */}
        <div className="col-md-3 col-6">
          <div className="smp-card p-3 bg-white h-100 border-top border-secondary border-4">
            <small className="text-muted text-uppercase fw-bold">2. Cost of Goods Sold (COGS)</small>
            <div className="fs-4 fw-bold text-dark">₹{s.costOfGoodsSold?.toFixed(2)}</div>
            <small className="text-muted">Manufacturer/supplier costs</small>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="col-md-3 col-6">
          <div className="smp-card p-3 bg-white h-100 border-top border-info border-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted text-uppercase fw-bold">3. Gross Profit</small>
              <span className="badge bg-info-subtle text-info-emphasis">{s.grossMarginPercent}%</span>
            </div>
            <div className="fs-4 fw-bold text-info">₹{s.grossProfit?.toFixed(2)}</div>
            <small className="text-muted">Revenue - COGS</small>
          </div>
        </div>

        {/* Net Profit */}
        <div className="col-md-3 col-6">
          <div className="smp-card p-3 bg-white h-100 border-top border-success border-4 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted text-uppercase fw-bold">4. Real Net Profit</small>
              <span className={`badge ${s.netProfit >= 0 ? 'bg-success' : 'bg-danger'}`}>{s.netMarginPercent}%</span>
            </div>
            <div className={`fs-4 fw-bold ${s.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
              ₹{s.netProfit?.toFixed(2)}
            </div>
            <small className="text-muted">Gross Profit - Expenses</small>
          </div>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="smp-card p-4 bg-white shadow-sm mb-4">
        <h5 className="fw-bold brand-font mb-3">Profit & Loss Flow Visualization</h5>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#888888" fontSize={12} />
              <YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v) => `₹${Number(v).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="Revenue" fill="#2874f0" />
              <Bar dataKey="COGS" fill="#6c757d" />
              <Bar dataKey="GrossProfit" fill="#0288d1" />
              <Bar dataKey="Expenses" fill="#d32f2f" />
              <Bar dataKey="NetProfit" fill="#2e7d32" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="row g-4">
        {/* Audited Statement Breakdown Table */}
        <div className="col-lg-7">
          <div className="smp-card p-4 bg-white shadow-sm">
            <h5 className="fw-bold brand-font mb-3">Detailed Income Statement</h5>
            <table className="table table-bordered small align-middle mb-0">
              <tbody>
                <tr className="table-light">
                  <th className="fw-bold">Total Sales Turnover (A)</th>
                  <th className="text-end fw-bold fs-6 text-primary">₹{s.totalSalesRevenue?.toFixed(2)}</th>
                </tr>
                <tr>
                  <td className="ps-4 text-muted">Less: Cost of Goods Sold (Supplier Purchase Price) (B)</td>
                  <td className="text-end text-muted">-₹{s.costOfGoodsSold?.toFixed(2)}</td>
                </tr>
                <tr className="table-info">
                  <th className="fw-bold">Gross Operating Profit (C = A - B)</th>
                  <th className="text-end fw-bold text-info fs-6">₹{s.grossProfit?.toFixed(2)}</th>
                </tr>
                <tr>
                  <td className="ps-4 text-danger">Less: Total Store Operating Expenses (D)</td>
                  <td className="text-end text-danger fw-semibold">-₹{s.totalOperatingExpenses?.toFixed(2)}</td>
                </tr>
                <tr className="table-success">
                  <th className="fw-bold fs-6">Net Business Profit (E = C - D)</th>
                  <th className="text-end fw-bold fs-5 text-success">₹{s.netProfit?.toFixed(2)}</th>
                </tr>
                <tr>
                  <td className="ps-4 fw-semibold">Net Operating Profit Margin</td>
                  <td className="text-end fw-bold">{s.netMarginPercent}% of Turnover</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Operating Expense Distribution */}
        <div className="col-lg-5">
          <div className="smp-card p-4 bg-white shadow-sm">
            <h5 className="fw-bold brand-font mb-3">Operating Expense Distribution</h5>
            <div className="d-flex flex-column gap-2">
              {Object.entries(report.expenseBreakdown || {}).length === 0 ? (
                <p className="text-muted small">No expenses logged for this period.</p>
              ) : (
                Object.entries(report.expenseBreakdown).map(([cat, amt]) => {
                  const percent = s.totalOperatingExpenses > 0 ? Math.round((amt / s.totalOperatingExpenses) * 100) : 0;
                  return (
                    <div key={cat} className="p-2 border rounded-2">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="fw-semibold text-dark">{cat}</span>
                        <span className="fw-bold text-danger">₹{amt?.toFixed(2)} ({percent}%)</span>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div
                          className="progress-bar bg-danger"
                          role="progressbar"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerProfits;
