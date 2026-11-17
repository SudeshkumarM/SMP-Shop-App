import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import api from '../../services/api';

const OwnerDashboard = () => {
  const [data, setData] = useState({
    kpis: {
      totalShops: 0,
      totalBranches: 0,
      totalAdmins: 0,
      totalStaff: 0,
      totalCustomers: 0,
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalPurchaseCost: 0,
      totalExpenses: 0,
      totalInvestment: 0,
      grossProfit: 0,
      netProfit: 0,
      grossMarginPercent: 0,
      netMarginPercent: 0
    },
    shopPerformance: [],
    monthlyTrends: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwnerStats = async () => {
      try {
        const res = await api.get('/owner/dashboard-stats');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Owner dashboard error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOwnerStats();
  }, []);

  const k = data.kpis;

  return (
    <div className="fade-in">
      {/* Top Banner */}
      <div className="smp-card p-4 bg-dark text-white mb-4 border-0 shadow">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <span className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-bold mb-2">
              MASTER ENTERPRISE CONSOLE
            </span>
            <h2 className="fw-bold brand-font text-white mb-1">
              Multi-Shop Executive Governance
            </h2>
            <p className="text-light opacity-75 small mb-0">
              Corporate oversight across {k.totalShops} Shops, {k.totalBranches} Branches, and {k.totalStaff} Employees.
            </p>
          </div>

          <div className="d-flex gap-2">
            <Link to="/owner/shops" className="btn btn-warning text-dark btn-sm rounded-pill px-3 fw-bold">
              <i className="bi bi-plus-circle me-1"></i> Add New Shop
            </Link>
            <Link to="/owner/profits" className="btn btn-outline-light btn-sm rounded-pill px-3 fw-semibold">
              <i className="bi bi-currency-rupee me-1"></i> Audit P&L Ledgers
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Financial Ledger KPIs */}
      <div className="row g-3 mb-4">
        {/* Total Revenue */}
        <div className="col-xl-3 col-sm-6">
          <div className="smp-card p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-muted text-uppercase fw-bold">Total Sales Revenue</small>
              <i className="bi bi-cash-stack text-primary fs-4"></i>
            </div>
            <div className="fs-4 fw-bold text-dark">₹{k.totalRevenue?.toFixed(2)}</div>
            <small className="text-muted">{k.totalOrders} total orders executed</small>
          </div>
        </div>

        {/* Capital Investments */}
        <div className="col-xl-3 col-sm-6">
          <div className="smp-card p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-muted text-uppercase fw-bold">Total Capital Invested</small>
              <i className="bi bi-bank text-info fs-4"></i>
            </div>
            <div className="fs-4 fw-bold text-dark">₹{k.totalInvestment?.toFixed(2)}</div>
            <small className="text-muted">Equity, interior & hardware</small>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="col-xl-3 col-sm-6">
          <div className="smp-card p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-muted text-uppercase fw-bold">Operating Expenses</small>
              <i className="bi bi-receipt text-danger fs-4"></i>
            </div>
            <div className="fs-4 fw-bold text-danger">₹{k.totalExpenses?.toFixed(2)}</div>
            <small className="text-muted">Rent, salaries & utilities</small>
          </div>
        </div>

        {/* Mathematical True Net Profit */}
        <div className="col-xl-3 col-sm-6">
          <div className="smp-card p-3 bg-white h-100 border-start border-success border-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-muted text-uppercase fw-bold">Net Profit (True Math)</small>
              <span className={`badge ${k.netProfit >= 0 ? 'bg-success' : 'bg-danger'}`}>
                {k.netMarginPercent}% Margin
              </span>
            </div>
            <div className={`fs-4 fw-bold ${k.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
              ₹{k.netProfit?.toFixed(2)}
            </div>
            <small className="text-muted">Gross Profit: ₹{k.grossProfit?.toFixed(2)}</small>
          </div>
        </div>
      </div>

      {/* Secondary Operational Counts */}
      <div className="row g-3 mb-4">
        <div className="col-md-2 col-4">
          <div className="smp-card p-3 bg-white text-center">
            <div className="fs-4 fw-bold text-primary">{k.totalShops}</div>
            <small className="text-muted">Active Shops</small>
          </div>
        </div>
        <div className="col-md-2 col-4">
          <div className="smp-card p-3 bg-white text-center">
            <div className="fs-4 fw-bold">{k.totalBranches}</div>
            <small className="text-muted">Store Branches</small>
          </div>
        </div>
        <div className="col-md-2 col-4">
          <div className="smp-card p-3 bg-white text-center">
            <div className="fs-4 fw-bold">{k.totalAdmins}</div>
            <small className="text-muted">Admins</small>
          </div>
        </div>
        <div className="col-md-2 col-4">
          <div className="smp-card p-3 bg-white text-center">
            <div className="fs-4 fw-bold">{k.totalStaff}</div>
            <small className="text-muted">Staff</small>
          </div>
        </div>
        <div className="col-md-2 col-4">
          <div className="smp-card p-3 bg-white text-center">
            <div className="fs-4 fw-bold text-success">{k.totalCustomers}</div>
            <small className="text-muted">Customers</small>
          </div>
        </div>
        <div className="col-md-2 col-4">
          <div className="smp-card p-3 bg-white text-center">
            <div className="fs-4 fw-bold">{k.totalProducts}</div>
            <small className="text-muted">Products</small>
          </div>
        </div>
      </div>

      {/* Financial Trends Chart */}
      <div className="smp-card p-4 bg-white shadow-sm mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="fw-bold brand-font mb-0">Enterprise 6-Month Financial Trajectory</h5>
            <small className="text-muted">Monthly Revenue vs Operating Expenses vs Real Net Profit</small>
          </div>
          <Link to="/owner/profits" className="btn btn-outline-primary btn-sm rounded-pill px-3">
            Detailed P&L Table <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        <div style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="#888888" fontSize={12} />
              <YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(val) => `₹${val}`} />
              <Legend />
              <Bar dataKey="revenue" name="Total Revenue" fill="#2874f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Operating Expenses" fill="#d32f2f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="netProfit" name="Net Profit" fill="#2e7d32" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Multi-Shop Performance Table */}
      <div className="smp-card p-4 bg-white shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold brand-font mb-0">Multi-Shop Performance Matrix</h5>
          <Link to="/owner/shops" className="small text-primary text-decoration-none fw-semibold">
            Manage All Shops
          </Link>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle small mb-0">
            <thead className="table-light">
              <tr>
                <th>Shop Name</th>
                <th>Category</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Net Profit</th>
                <th>Orders</th>
                <th>Staff Count</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.shopPerformance.map((shop) => (
                <tr key={shop.shopId}>
                  <td className="fw-bold text-dark">{shop.name}</td>
                  <td>
                    <span className="badge bg-secondary">{shop.category}</span>
                  </td>
                  <td className="fw-bold text-primary">₹{shop.revenue?.toFixed(2)}</td>
                  <td className="text-danger">₹{shop.expenses?.toFixed(2)}</td>
                  <td className={`fw-bold ${shop.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    ₹{shop.netProfit?.toFixed(2)}
                  </td>
                  <td>{shop.ordersCount}</td>
                  <td>{shop.staffCount}</td>
                  <td>
                    {shop.isActive ? (
                      <span className="badge bg-success">Operational</span>
                    ) : (
                      <span className="badge bg-danger">Deactivated</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
