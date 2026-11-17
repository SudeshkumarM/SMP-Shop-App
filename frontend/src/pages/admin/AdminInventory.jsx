import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminInventory = () => {
  const [stats, setStats] = useState({ totalStockUnits: 0, totalItems: 0, lowStockCount: 0, outOfStockCount: 0 });
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Purchase Entry Form
  const [purchaseData, setPurchaseData] = useState({
    productId: '',
    quantity: 20,
    unitCost: 800,
    invoiceNumber: '',
    supplierId: '',
    notes: 'Restock shipment'
  });

  // Supplier Form
  const [supplierData, setSupplierData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    gstNumber: '',
    street: '',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395002'
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/inventory');
      if (res.data.success) {
        setStats(res.data.stats);
        setInventory(res.data.inventory || []);
        setSuppliers(res.data.suppliers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handlePurchaseEntry = async (e) => {
    e.preventDefault();
    if (!purchaseData.productId) {
      addToast('Please select a product to restock', 'warning');
      return;
    }

    try {
      const res = await api.post('/admin/inventory/purchase', purchaseData);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setShowPurchaseModal(false);
        fetchInventory();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to record purchase entry', 'error');
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/suppliers', supplierData);
      if (res.data.success) {
        addToast('Supplier added successfully', 'success');
        setShowSupplierModal(false);
        fetchInventory();
      }
    } catch (err) {
      addToast('Failed to add supplier', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Inventory & Stock Control Hub</h3>
          <small className="text-muted">Track reorder levels, purchase stock entries & supplier network</small>
        </div>

        <div className="d-flex gap-2">
          <button onClick={() => setShowSupplierModal(true)} className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold">
            <i className="bi bi-truck me-1"></i> Add Supplier
          </button>
          <button onClick={() => setShowPurchaseModal(true)} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
            <i className="bi bi-box-arrow-in-down me-1"></i> Record Purchase Entry
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-sm-6">
          <div className="smp-card p-3 bg-white h-100 d-flex align-items-center gap-3">
            <div className="p-3 bg-primary-subtle text-primary rounded-3">
              <i className="bi bi-boxes fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold">{stats.totalStockUnits}</div>
              <small className="text-muted">Total Stock Units</small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="smp-card p-3 bg-white h-100 d-flex align-items-center gap-3">
            <div className="p-3 bg-success-subtle text-success rounded-3">
              <i className="bi bi-check2-circle fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold">{stats.totalItems - stats.outOfStockCount}</div>
              <small className="text-muted">Available In-Stock Items</small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="smp-card p-3 bg-white h-100 d-flex align-items-center gap-3">
            <div className="p-3 bg-warning-subtle text-warning-emphasis rounded-3">
              <i className="bi bi-exclamation-triangle fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold">{stats.lowStockCount}</div>
              <small className="text-muted">Low Stock Threshold Alerts</small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="smp-card p-3 bg-white h-100 d-flex align-items-center gap-3">
            <div className="p-3 bg-danger-subtle text-danger rounded-3">
              <i className="bi bi-x-circle fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold">{stats.outOfStockCount}</div>
              <small className="text-muted">Out of Stock Items</small>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Stock Table */}
      <div className="smp-card p-4 bg-white shadow-sm mb-4">
        <h5 className="fw-bold brand-font mb-3">Live Stock Levels & Valuation</h5>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>SKU / Barcode</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Unit Cost</th>
                  <th>Stock Valuation</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((inv) => {
                  const p = inv.productId;
                  const isLow = inv.currentStock <= inv.reorderLevel;
                  return (
                    <tr key={inv._id}>
                      <td>
                        <div className="fw-bold text-dark">{p?.name || 'Product'}</div>
                        <small className="text-muted">SKU: {p?.sku}</small>
                      </td>
                      <td>
                        <span className="font-monospace">{p?.barcode}</span>
                      </td>
                      <td className="fw-bold fs-6">
                        {inv.currentStock} units
                      </td>
                      <td>{inv.reorderLevel} units</td>
                      <td>₹{inv.costPrice}</td>
                      <td className="fw-bold text-primary">₹{(inv.currentStock * inv.costPrice).toFixed(2)}</td>
                      <td>
                        {inv.currentStock === 0 ? (
                          <span className="badge bg-danger">Out of Stock</span>
                        ) : isLow ? (
                          <span className="badge bg-warning text-dark">Low Stock Alert</span>
                        ) : (
                          <span className="badge bg-success">Adequate Stock</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          onClick={() => {
                            setPurchaseData({ ...purchaseData, productId: p?._id, unitCost: inv.costPrice });
                            setShowPurchaseModal(true);
                          }}
                          className="btn btn-outline-primary btn-sm rounded-pill px-3"
                        >
                          + Restock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suppliers Table */}
      <div className="smp-card p-4 bg-white shadow-sm">
        <h5 className="fw-bold brand-font mb-3">Supplier Directory</h5>
        <div className="table-responsive">
          <table className="table table-hover align-middle small mb-0">
            <thead className="table-light">
              <tr>
                <th>Company</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th>Terms</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s._id}>
                  <td className="fw-bold text-dark">{s.companyName}</td>
                  <td>{s.contactPerson}</td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td className="font-monospace">{s.gstNumber || 'N/A'}</td>
                  <td><span className="badge bg-secondary">{s.paymentTerms}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Entry Modal */}
      {showPurchaseModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Record Incoming Purchase Entry</h5>
                <button type="button" className="btn-close" onClick={() => setShowPurchaseModal(false)}></button>
              </div>
              <form onSubmit={handlePurchaseEntry}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Select Product *</label>
                    <select
                      className="form-select"
                      required
                      value={purchaseData.productId}
                      onChange={(e) => setPurchaseData({ ...purchaseData, productId: e.target.value })}
                    >
                      <option value="">Choose a product to restock...</option>
                      {inventory.map((inv) => (
                        <option key={inv.productId?._id} value={inv.productId?._id}>
                          {inv.productId?.name} (Current Stock: {inv.currentStock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Quantity Added *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        className="form-control"
                        value={purchaseData.quantity}
                        onChange={(e) => setPurchaseData({ ...purchaseData, quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Unit Purchase Cost (₹) *</label>
                      <input
                        type="number"
                        required
                        className="form-control"
                        value={purchaseData.unitCost}
                        onChange={(e) => setPurchaseData({ ...purchaseData, unitCost: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Supplier Invoice / PO Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. PO-SURAT-8812"
                      className="form-control"
                      value={purchaseData.invoiceNumber}
                      onChange={(e) => setPurchaseData({ ...purchaseData, invoiceNumber: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Notes</label>
                    <input
                      type="text"
                      className="form-control"
                      value={purchaseData.notes}
                      onChange={(e) => setPurchaseData({ ...purchaseData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowPurchaseModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Submit Purchase Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Register Textile / Apparel Supplier</h5>
                <button type="button" className="btn-close" onClick={() => setShowSupplierModal(false)}></button>
              </div>
              <form onSubmit={handleCreateSupplier}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Supplier / Mill Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Surat Silk Mills"
                      className="form-control"
                      value={supplierData.companyName}
                      onChange={(e) => setSupplierData({ ...supplierData, companyName: e.target.value })}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Contact Person</label>
                      <input
                        type="text"
                        className="form-control"
                        value={supplierData.contactPerson}
                        onChange={(e) => setSupplierData({ ...supplierData, contactPerson: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Phone *</label>
                      <input
                        type="tel"
                        required
                        className="form-control"
                        value={supplierData.phone}
                        onChange={(e) => setSupplierData({ ...supplierData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">GSTIN</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        value={supplierData.gstNumber}
                        onChange={(e) => setSupplierData({ ...supplierData, gstNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={supplierData.city}
                        onChange={(e) => setSupplierData({ ...supplierData, city: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowSupplierModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Save Supplier
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

export default AdminInventory;
