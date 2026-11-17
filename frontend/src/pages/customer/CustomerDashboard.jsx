import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, ordersRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/orders/my-orders')
        ]);
        if (meRes.data.success) setProfile(meRes.data.profile);
        if (ordersRes.data.success) setRecentOrders(ordersRes.data.orders.slice(0, 5));
      } catch (err) {
        console.error('Customer dashboard load error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="fade-in">
      {/* Welcome Card */}
      <div className="smp-card p-4 mb-4 bg-white border-0 shadow-sm">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <i className="bi bi-person fs-3"></i>
            </div>
            <div>
              <h4 className="fw-bold brand-font mb-0">Welcome, {user?.name || 'Valued Customer'}!</h4>
              <p className="text-muted small mb-0">
                Customer ID: <strong>{profile?.customerId || 'CUST-MEMBER'}</strong> | {user?.email}
              </p>
            </div>
          </div>

          <div className="d-flex gap-2">
            <Link to="/products" className="btn btn-primary rounded-pill btn-sm px-3 fw-semibold">
              <i className="bi bi-bag me-1"></i> Shop New Dresses
            </Link>
            <Link to="/customer/profile" className="btn btn-outline-secondary rounded-pill btn-sm px-3">
              <i className="bi bi-gear me-1"></i> Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4 col-sm-6">
          <div className="smp-card p-3 d-flex align-items-center gap-3 bg-white">
            <div className="p-3 bg-primary-subtle text-primary rounded-3">
              <i className="bi bi-box-seam fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold">{profile?.totalPurchases || recentOrders.length}</div>
              <small className="text-muted">Total Orders Placed</small>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-sm-6">
          <div className="smp-card p-3 d-flex align-items-center gap-3 bg-white">
            <div className="p-3 bg-warning-subtle text-warning rounded-3">
              <i className="bi bi-star-fill fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold">{profile?.loyaltyPoints || 150}</div>
              <small className="text-muted">SMP Loyalty Reward Points</small>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-sm-12">
          <div className="smp-card p-3 d-flex align-items-center gap-3 bg-white">
            <div className="p-3 bg-danger-subtle text-danger rounded-3">
              <i className="bi bi-heart-fill fs-3"></i>
            </div>
            <div>
              <div className="fs-4 fw-bold">{profile?.wishlist?.length || 0}</div>
              <small className="text-muted">Saved in Wishlist</small>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="smp-card p-4 bg-white mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold brand-font mb-0">Recent Orders</h5>
          <Link to="/customer/orders" className="small text-primary text-decoration-none fw-semibold">
            View All Orders <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-cart3 fs-1 d-block mb-2 text-secondary"></i>
            <p className="mb-2">You haven't placed any orders yet.</p>
            <Link to="/products" className="btn btn-primary btn-sm rounded-pill px-3">
              Start Shopping Now
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => (
                  <tr key={ord._id}>
                    <td className="fw-bold text-primary">{ord.orderNumber}</td>
                    <td>{new Date(ord.createdAt).toLocaleDateString()}</td>
                    <td>{ord.items?.length || 1} item(s)</td>
                    <td className="fw-bold">₹{ord.grandTotal?.toFixed(2)}</td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {ord.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        ord.orderStatus === 'DELIVERED'
                          ? 'bg-success'
                          : ord.orderStatus === 'CANCELLED'
                          ? 'bg-danger'
                          : 'bg-primary'
                      }`}>
                        {ord.orderStatus}
                      </span>
                    </td>
                    <td>
                      <Link to="/customer/orders" className="btn btn-outline-primary btn-sm py-0 px-2 rounded-pill">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Saved Delivery Address Snapshot */}
      <div className="smp-card p-4 bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold brand-font mb-0">Saved Delivery Addresses</h5>
          <Link to="/customer/profile" className="small text-primary text-decoration-none fw-semibold">
            Manage Addresses
          </Link>
        </div>

        {profile?.addresses && profile.addresses.length > 0 ? (
          <div className="row g-3">
            {profile.addresses.map((addr) => (
              <div className="col-md-6" key={addr._id}>
                <div className={`p-3 rounded-3 border ${addr.isDefault ? 'border-primary bg-primary-subtle' : 'bg-light'}`}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="badge bg-secondary text-uppercase">{addr.title}</span>
                    {addr.isDefault && <span className="badge bg-primary">Default</span>}
                  </div>
                  <div className="fw-semibold small">{addr.street}</div>
                  <div className="text-muted small">{addr.city}, {addr.state} - {addr.pincode}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted small mb-0">No address saved yet. Please add your address in profile.</p>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
