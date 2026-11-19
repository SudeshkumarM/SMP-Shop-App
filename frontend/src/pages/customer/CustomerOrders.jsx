import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { addToast } = useToast();

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/my-orders');
      if (res.data.success) {
        setOrders(res.data.orders);
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

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await api.put(`/orders/${orderId}/cancel`);
      if (res.data.success) {
        addToast('Order cancelled successfully', 'info');
        fetchOrders();
      }
    } catch (e) {
      addToast(e.response?.data?.message || 'Could not cancel order', 'error');
    }
  };

  const handleViewInvoice = (order) => {
    // Generate invoice payload for modal preview
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-success';
      case 'CANCELLED':
        return 'bg-danger';
      case 'SHIPPED':
        return 'bg-info text-dark';
      case 'PROCESSING':
        return 'bg-warning text-dark';
      default:
        return 'bg-primary';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold brand-font text-white mb-0">My Orders & Tracking</h3>
          <small style={{ color: '#94A3B8' }}>Track status, download GST tax invoices, and manage past purchases</small>
        </div>
        <Link to="/products" className="btn btn-outline-primary text-white btn-sm rounded-pill px-3 shadow-sm">
          Explore Products
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="smp-card p-5 text-center" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          <i className="bi bi-box-seam display-4 mb-3" style={{ color: '#38BDF8' }}></i>
          <h4 className="text-white">No Orders Found</h4>
          <p className="small" style={{ color: '#CBD5E1' }}>You haven't ordered any items yet.</p>
          <Link to="/products" className="btn btn-primary rounded-pill px-4 shadow-sm">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {orders.map((order) => (
            <div key={order._id} className="smp-card p-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
              {/* Order Card Header */}
              <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-3 mb-3 gap-2" style={{ borderColor: '#334155' }}>
                <div>
                  <span className="small text-uppercase fw-bold" style={{ color: '#94A3B8' }}>Order Placed:</span>{' '}
                  <span className="small fw-semibold text-white">{new Date(order.createdAt).toLocaleDateString()}</span>
                  <span className="mx-2 text-secondary">|</span>
                  <span className="small text-uppercase fw-bold" style={{ color: '#94A3B8' }}>Order #:</span>{' '}
                  <span className="small fw-bold text-info">{order.orderNumber}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge ${getStatusBadge(order.orderStatus)} px-3 py-1 rounded-pill`}>
                    {order.orderStatus}
                  </span>
                  <button
                    onClick={() => handleViewInvoice(order)}
                    className="btn btn-outline-secondary text-white btn-sm py-1 px-3 rounded-pill"
                  >
                    <i className="bi bi-file-earmark-text me-1"></i> Tax Invoice
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="d-flex flex-column gap-3 mb-3">
                {order.items.map((item, i) => (
                  <div key={i} className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                    <div className="d-flex align-items-center gap-3">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=200&q=80'}
                        alt={item.productName}
                        className="rounded-3 object-fit-cover shadow-sm"
                        style={{ width: '60px', height: '60px' }}
                      />
                      <div>
                        <h6 className="fw-bold text-white mb-0">{item.productName}</h6>
                        <small style={{ color: '#94A3B8' }}>
                          Size: <strong className="text-white">{item.size || 'Std'}</strong> | Color: <strong className="text-white">{item.colour || 'Def'}</strong> | Qty: <strong className="text-white">{item.quantity}</strong>
                        </small>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-white">₹{item.totalAmount.toFixed(2)}</div>
                      <small style={{ color: '#94A3B8' }}>(₹{item.unitPrice} each)</small>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Footer & Actions */}
              <div className="d-flex flex-wrap justify-content-between align-items-center pt-3 border-top gap-2 small" style={{ borderColor: '#334155' }}>
                <div style={{ color: '#94A3B8' }}>
                  <span>Payment:</span>{' '}
                  <strong className="text-white">{order.paymentMethod}</strong> ({order.paymentStatus})
                  {order.trackingNumber && (
                    <span className="ms-3 badge" style={{ backgroundColor: '#0F172A', color: '#38BDF8', border: '1px solid #334155' }}>
                      Tracking #: {order.trackingNumber}
                    </span>
                  )}
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="fs-6 text-white">
                    Grand Total: <strong className="text-info fs-5">₹{order.grandTotal.toFixed(2)}</strong>
                  </div>
                  {['PLACED', 'CONFIRMED'].includes(order.orderStatus) && (
                    <button
                      onClick={() => handleCancelOrder(order._id)}
                      className="btn btn-outline-danger btn-sm rounded-pill px-3"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default CustomerOrders;
