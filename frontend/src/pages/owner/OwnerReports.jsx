import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OwnerReports = () => {
  const [data, setData] = useState({ shopPerformance: [], kpis: {} });
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get('/owner/dashboard-stats');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleExportPerformance = async () => {
    try {
      const exportRows = data.shopPerformance.map((s) => ({
        'Shop Name': s.name,
        'Category': s.category,
        'Sales Turnover (₹)': s.revenue,
        'Operating Expenses (₹)': s.expenses,
        'Net Profit (₹)': s.netProfit,
        'Orders Executed': s.ordersCount,
        'Staff Strength': s.staffCount,
        'Catalog Products': s.productCount,
        'Status': s.isActive ? 'Active' : 'Inactive'
      }));

      const res = await api.post('/reports/export-excel', {
        title: 'SMP_Consolidated_Multi_Shop_Audit',
        data: exportRows
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'SMP_Consolidated_Multi_Shop_Audit.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Executive audit report downloaded successfully', 'success');
    } catch (e) {
      addToast('Export failed', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Master Executive Business Reports</h3>
          <small className="text-muted">Consolidated multi-shop performance audit & ROI ledger</small>
        </div>

        <button onClick={handleExportPerformance} className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold">
          <i className="bi bi-file-earmark-excel me-1"></i> Export Master Audit (.xlsx)
        </button>
      </div>

      <div className="smp-card p-4 bg-white shadow-sm mb-4">
        <h5 className="fw-bold brand-font mb-3">Multi-Shop Financial Ledger & Performance Index</h5>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Shop Name</th>
                  <th>Industry Category</th>
                  <th>Revenue Turnover</th>
                  <th>Operating Outlays</th>
                  <th>Net Mathematical Profit</th>
                  <th>Orders Handled</th>
                  <th>Active Staff</th>
                  <th>Catalog Items</th>
                </tr>
              </thead>
              <tbody>
                {data.shopPerformance.map((s) => (
                  <tr key={s.shopId}>
                    <td className="fw-bold text-dark">{s.name}</td>
                    <td><span className="badge bg-secondary">{s.category}</span></td>
                    <td className="fw-bold text-primary">₹{s.revenue?.toFixed(2)}</td>
                    <td className="text-danger">₹{s.expenses?.toFixed(2)}</td>
                    <td className={`fw-bold fs-6 ${s.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                      ₹{s.netProfit?.toFixed(2)}
                    </td>
                    <td>{s.ordersCount}</td>
                    <td>{s.staffCount} members</td>
                    <td>{s.productCount} SKUs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerReports;
