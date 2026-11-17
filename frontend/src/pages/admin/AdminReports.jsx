import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminReports = () => {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'products', 'staff', 'gst', 'inventory'
  const [period, setPeriod] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const [salesData, setSalesData] = useState({ summary: {}, report: [] });
  const [productData, setProductData] = useState({ report: [] });
  const [staffData, setStaffData] = useState({ report: [] });
  const [gstData, setGstData] = useState({ summary: {}, rateBuckets: {} });
  const [inventoryData, setInventoryData] = useState({ summary: {}, items: [] });

  const fetchCurrentReport = async () => {
    setLoading(true);
    try {
      const params = { period, startDate, endDate };

      if (activeTab === 'sales') {
        const res = await api.get('/reports/sales', { params });
        if (res.data.success) setSalesData(res.data);
      } else if (activeTab === 'products') {
        const res = await api.get('/reports/products');
        if (res.data.success) setProductData(res.data);
      } else if (activeTab === 'staff') {
        const res = await api.get('/reports/staff');
        if (res.data.success) setStaffData(res.data);
      } else if (activeTab === 'gst') {
        const res = await api.get('/reports/gst', { params: { startDate, endDate } });
        if (res.data.success) setGstData(res.data);
      } else if (activeTab === 'inventory') {
        const res = await api.get('/reports/inventory');
        if (res.data.success) setInventoryData(res.data);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to fetch report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentReport();
  }, [activeTab, period, startDate, endDate]);

  const handleExportExcel = async (title, dataToExport) => {
    if (!dataToExport || dataToExport.length === 0) {
      addToast('No data available to export', 'warning');
      return;
    }
    try {
      const res = await api.post('/reports/export-excel', { title, data: dataToExport }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Report exported successfully', 'success');
    } catch (e) {
      addToast('Export failed', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Operational & Financial Reports</h3>
          <small className="text-muted">Analyze sales performance, staff billing throughput, inventory valuation & GST returns</small>
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

      {/* Tabs */}
      <ul className="nav nav-pills gap-2 mb-4 bg-white p-2 rounded-3 shadow-sm">
        <li className="nav-item">
          <button
            onClick={() => setActiveTab('sales')}
            className={`nav-link rounded-pill fw-semibold ${activeTab === 'sales' ? 'active bg-primary' : 'text-secondary'}`}
          >
            <i className="bi bi-graph-up me-1"></i> Sales Report
          </button>
        </li>
        <li className="nav-item">
          <button
            onClick={() => setActiveTab('products')}
            className={`nav-link rounded-pill fw-semibold ${activeTab === 'products' ? 'active bg-primary' : 'text-secondary'}`}
          >
            <i className="bi bi-tags me-1"></i> Product Performance
          </button>
        </li>
        <li className="nav-item">
          <button
            onClick={() => setActiveTab('staff')}
            className={`nav-link rounded-pill fw-semibold ${activeTab === 'staff' ? 'active bg-primary' : 'text-secondary'}`}
          >
            <i className="bi bi-person-workspace me-1"></i> Staff Sales
          </button>
        </li>
        <li className="nav-item">
          <button
            onClick={() => setActiveTab('gst')}
            className={`nav-link rounded-pill fw-semibold ${activeTab === 'gst' ? 'active bg-primary' : 'text-secondary'}`}
          >
            <i className="bi bi-receipt me-1"></i> GST Tax Report
          </button>
        </li>
        <li className="nav-item">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`nav-link rounded-pill fw-semibold ${activeTab === 'inventory' ? 'active bg-primary' : 'text-secondary'}`}
          >
            <i className="bi bi-boxes me-1"></i> Inventory Valuation
          </button>
        </li>
      </ul>

      {/* TAB 1: SALES REPORT */}
      {activeTab === 'sales' && (
        <div>
          {/* Period buttons & Export */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="btn-group btn-group-sm">
              {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`btn ${period === p ? 'btn-primary' : 'btn-outline-secondary'} text-capitalize`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleExportExcel(`SMP_Sales_Report_${period}`, salesData.report)}
              className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold"
            >
              <i className="bi bi-file-earmark-excel me-1"></i> Export Sales
            </button>
          </div>

          {/* Sales Summary KPIs */}
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">Total Sales Turnover</small>
                <div className="fs-4 fw-bold text-primary">₹{salesData.summary?.totalRevenue?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">Total Orders</small>
                <div className="fs-4 fw-bold">{salesData.summary?.totalOrders || 0}</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">Avg Order Value</small>
                <div className="fs-4 fw-bold">₹{salesData.summary?.averageOrderValue?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">Total Tax Collected</small>
                <div className="fs-4 fw-bold text-success">₹{salesData.summary?.totalGst?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>

          {/* Sales Chart */}
          <div className="smp-card p-4 bg-white shadow-sm mb-4">
            <h5 className="fw-bold brand-font mb-3">Sales Trends</h5>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData.report}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#2874f0" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales Table */}
          <div className="smp-card p-4 bg-white shadow-sm">
            <h5 className="fw-bold brand-font mb-3">Period Breakdown Table</h5>
            <div className="table-responsive">
              <table className="table table-hover align-middle small mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Period</th>
                    <th>Orders Count</th>
                    <th>Gross Turnover</th>
                    <th>Discount Given</th>
                    <th>GST Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.report.map((r, i) => (
                    <tr key={i}>
                      <td className="fw-bold">{r.period}</td>
                      <td>{r.ordersCount}</td>
                      <td className="fw-bold text-primary">₹{r.revenue?.toFixed(2)}</td>
                      <td className="text-success">-₹{r.discount?.toFixed(2)}</td>
                      <td>₹{r.gst?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT SALES */}
      {activeTab === 'products' && (
        <div className="smp-card p-4 bg-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold brand-font mb-0">Product Sales & Margin Velocity</h5>
            <button
              onClick={() => handleExportExcel('SMP_Product_Sales', productData.report)}
              className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold"
            >
              <i className="bi bi-file-earmark-excel me-1"></i> Export Products
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Units Sold</th>
                  <th>Total Revenue</th>
                  <th>Cost of Goods</th>
                  <th>Gross Margin</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {productData.report.map((p, i) => (
                  <tr key={i}>
                    <td className="fw-bold">{p.productName}</td>
                    <td>{p.sku}</td>
                    <td className="fw-bold">{p.unitsSold} units</td>
                    <td className="fw-bold text-primary">₹{p.revenue?.toFixed(2)}</td>
                    <td>₹{p.cost?.toFixed(2)}</td>
                    <td className="fw-bold text-success">₹{p.grossProfit?.toFixed(2)}</td>
                    <td>
                      <span className="badge bg-success-subtle text-success">
                        {p.marginPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF REPORT */}
      {activeTab === 'staff' && (
        <div className="smp-card p-4 bg-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold brand-font mb-0">Staff Billing Throughput</h5>
            <button
              onClick={() => handleExportExcel('SMP_Staff_Performance', staffData.report)}
              className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold"
            >
              <i className="bi bi-file-earmark-excel me-1"></i> Export Staff
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Staff ID</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Total Bills Issued</th>
                  <th>Total Sales Volume</th>
                  <th>Avg Bill Size</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staffData.report.map((s, i) => (
                  <tr key={i}>
                    <td className="fw-bold text-primary">{s.staffId}</td>
                    <td className="fw-bold">{s.fullName}</td>
                    <td>{s.department}</td>
                    <td className="fw-bold">{s.totalBills} bills</td>
                    <td className="fw-bold text-success">₹{s.totalRevenue?.toFixed(2)}</td>
                    <td>₹{s.averageBillValue?.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${s.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GST REPORT */}
      {activeTab === 'gst' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold brand-font mb-0">GST Summary (CGST / SGST / IGST)</h5>
            <button
              onClick={() => handleExportExcel('SMP_GST_Report', [
                { 'Metric': 'Total Taxable Turnover', 'Amount': gstData.summary?.totalTaxableTurnover },
                { 'Metric': 'CGST Amount', 'Amount': gstData.summary?.totalCgst },
                { 'Metric': 'SGST Amount', 'Amount': gstData.summary?.totalSgst },
                { 'Metric': 'Total Tax', 'Amount': gstData.summary?.totalTax }
              ])}
              className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold"
            >
              <i className="bi bi-file-earmark-excel me-1"></i> Export GST
            </button>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">Taxable Turnover</small>
                <div className="fs-4 fw-bold">₹{gstData.summary?.totalTaxableTurnover?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">CGST (Central Tax)</small>
                <div className="fs-4 fw-bold text-primary">₹{gstData.summary?.totalCgst?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">SGST (State Tax)</small>
                <div className="fs-4 fw-bold text-primary">₹{gstData.summary?.totalSgst?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">Total Tax Liability</small>
                <div className="fs-4 fw-bold text-danger">₹{gstData.summary?.totalTax?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>

          <div className="smp-card p-4 bg-white shadow-sm">
            <h6 className="fw-bold mb-3">GST Rate-Wise Tax Slabs</h6>
            <div className="table-responsive">
              <table className="table table-bordered small align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Tax Slab Rate</th>
                    <th>Taxable Value</th>
                    <th>CGST Amount</th>
                    <th>SGST Amount</th>
                    <th>Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gstData.rateBuckets || {}).map(([rate, vals]) => (
                    <tr key={rate}>
                      <td className="fw-bold">{rate}</td>
                      <td>₹{vals.taxable?.toFixed(2)}</td>
                      <td>₹{vals.cgst?.toFixed(2)}</td>
                      <td>₹{vals.sgst?.toFixed(2)}</td>
                      <td className="fw-bold text-danger">₹{vals.totalTax?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INVENTORY VALUATION */}
      {activeTab === 'inventory' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold brand-font mb-0">Inventory Valuation & Asset Report</h5>
            <button
              onClick={() => handleExportExcel('SMP_Inventory_Valuation', inventoryData.items)}
              className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold"
            >
              <i className="bi bi-file-earmark-excel me-1"></i> Export Inventory
            </button>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4 col-sm-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">Total Stock Units</small>
                <div className="fs-4 fw-bold">{inventoryData.summary?.totalStockUnits || 0}</div>
              </div>
            </div>
            <div className="col-md-4 col-sm-6">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">Valuation at Cost (Asset Value)</small>
                <div className="fs-4 fw-bold text-primary">₹{inventoryData.summary?.totalCostValuation?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
            <div className="col-md-4 col-sm-12">
              <div className="smp-card p-3 bg-white">
                <small className="text-muted text-uppercase fw-bold">Potential Retail Realization</small>
                <div className="fs-4 fw-bold text-success">₹{inventoryData.summary?.totalRetailValuation?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>

          <div className="smp-card p-4 bg-white shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle small mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Cost Price</th>
                    <th>Selling Price</th>
                    <th>Valuation (Cost)</th>
                    <th>Potential Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {(inventoryData.items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="fw-bold">{item.name}</td>
                      <td>{item.sku}</td>
                      <td className="fw-bold">{item.stock}</td>
                      <td>₹{item.unitCost}</td>
                      <td>₹{item.unitPrice}</td>
                      <td className="fw-bold">₹{item.costValuation?.toFixed(2)}</td>
                      <td className="fw-bold text-success">₹{item.potentialProfit?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
