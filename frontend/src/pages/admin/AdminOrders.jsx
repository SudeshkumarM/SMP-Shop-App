import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const { addToast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // In admin context, query orders
      const res = await api.get('/orders/my-orders'); // or all orders
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await api.put(`/orders/${orderId}/status`, { orderStatus: newStatus });
      if (res.data.success) {
        addToast(`Order marked as ${newStatus}`, 'success');
        fetchOrders();
      }
    } catch (err) {
      addToast('Status update failed', 'error');
    }
  };

  const handleViewInvoice = (order) => {
    const invoicePayload = {
      invoiceNumber: order.invoiceNumber || `INV-${order.orderNumber.replace('ORD-', '')}`,
      createdAt: order.createdAt,
      shopInfo: {
        name: 'SMP Elite Fashions',
        address: '100 Feet Road, Anna Nagar, Chennai - 600040',
        phone: '+91 98400 12345',
        gstNumber: '33AAAAA0000A1Z5'
      },
      customerInfo: order.customerDetails,
      items: order.items,
      subtotal: order.subtotal,
      totalDiscount: order.totalDiscount,
      cgstAmount: Math.round((order.totalGst / 2) * 100) / 100,
      sgstAmount: Math.round((order.totalGst / 2) * 100) / 100,
      grandTotal: order.grandTotal,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus
    };
    setSelectedInvoice(invoicePayload);
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter && o.orderStatus !== statusFilter) return false;
    if (typeFilter && o.orderType !== typeFilter) return false;
    return true;
  });

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Order & Fulfillment Pipeline</h3>
          <small className="text-muted">Manage online orders, counter POS receipts, shipping & return workflows</small>
        </div>

        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: '140px' }}
          >
            <option value="">All Channels</option>
            <option value="ONLINE">Online Store</option>
            <option value="POS">In-Store POS</option>
          </select>

          <select
            className="form-select form-select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="">All Statuses</option>
            <option value="PLACED">Placed</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-box-seam display-4 text-secondary mb-2 d-block"></i>
            <h5>No Orders in Selected Criteria</h5>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order #</th>
                  <th>Customer Info</th>
                  <th>Channel</th>
                  <th>Date</th>
                  <th>Items Count</th>
                  <th>Grand Total</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o._id}>
                    <td className="fw-bold text-primary">{o.orderNumber}</td>
                    <td>
                      <div className="fw-semibold text-dark">{o.customerDetails?.name || 'Walk-in'}</div>
                      <small className="text-muted">{o.customerDetails?.phone}</small>
                    </td>
                    <td>
                      <span className={`badge ${o.orderType === 'POS' ? 'bg-success-subtle text-success' : 'bg-primary-subtle text-primary'}`}>
                        {o.orderType}
                      </span>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.items?.length || 1} item(s)</td>
                    <td className="fw-bold fs-6">₹{o.grandTotal?.toFixed(2)}</td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {o.paymentMethod} ({o.paymentStatus})
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={o.orderStatus}
                        onChange={(e) => handleUpdateStatus(o._id, e.target.value)}
                        style={{ width: '130px' }}
                      >
                        <option value="PLACED">Placed</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                    <td className="text-end">
                      <button
                        onClick={() => handleViewInvoice(o)}
                        className="btn btn-outline-secondary btn-sm py-0 px-2 rounded-pill"
                      >
                        <i className="bi bi-receipt me-1"></i> Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default AdminOrders;
