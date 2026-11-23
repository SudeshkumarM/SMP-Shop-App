import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const StaffOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders');
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (e) {
      console.error(e);
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

  const filteredOrders = statusFilter
    ? orders.filter(o => o.orderStatus === statusFilter)
    : orders;

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Shop Order Processing</h3>
          <small className="text-muted">Manage packaging, dispatch, and delivery updates</small>
        </div>

        <select
          className="form-select form-select-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="">All Statuses</option>
          <option value="PLACED">Placed</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-box-seam display-4 text-secondary mb-2 d-block"></i>
            <h5>No Orders Found</h5>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Order Type</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Update Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o._id}>
                    <td className="fw-bold text-primary">{o.orderNumber}</td>
                    <td>
                      <div>{o.customerDetails?.name || 'Customer'}</div>
                      <small className="text-muted">{o.customerDetails?.phone}</small>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {o.orderType}
                      </span>
                    </td>
                    <td>{o.items?.length || 1} item(s)</td>
                    <td className="fw-bold">₹{o.grandTotal?.toFixed(2)}</td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {o.paymentMethod} ({o.paymentStatus})
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        o.orderStatus === 'DELIVERED' ? 'bg-success' : 'bg-primary'
                      }`}>
                        {o.orderStatus}
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
                      </select>
                    </td>
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

export default StaffOrders;
