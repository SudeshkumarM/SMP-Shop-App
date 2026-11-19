import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import StaffLayout from '../layouts/StaffLayout';
import AdminLayout from '../layouts/AdminLayout';
import OwnerLayout from '../layouts/OwnerLayout';

// Route Guard
import ProtectedRoute from '../components/common/ProtectedRoute';

// Public & Storefront Pages
import Home from '../pages/public/Home';
import Products from '../pages/public/Products';
import ProductDetail from '../pages/public/ProductDetail';
import Cart from '../pages/public/Cart';
import About from '../pages/public/About';
import Contact from '../pages/public/Contact';

// Customer Pages
import CustomerRegister from '../pages/customer/CustomerRegister';
import CustomerVerifyOtp from '../pages/customer/CustomerVerifyOtp';
import CustomerLogin from '../pages/customer/CustomerLogin';
import ForgotPassword from '../pages/customer/ForgotPassword';
import ResetPassword from '../pages/customer/ResetPassword';
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import CustomerProfile from '../pages/customer/CustomerProfile';
import CustomerOrders from '../pages/customer/CustomerOrders';
import CustomerWishlist from '../pages/customer/CustomerWishlist';
import CustomerCheckout from '../pages/customer/CustomerCheckout';
import CustomerPayment from '../pages/customer/CustomerPayment';
import CustomerHelp from '../pages/customer/CustomerHelp';

// Staff Pages
import StaffLogin from '../pages/staff/StaffLogin';
import StaffDashboard from '../pages/staff/StaffDashboard';
import StaffBilling from '../pages/staff/StaffBilling';
import StaffBillingHistory from '../pages/staff/StaffBillingHistory';
import StaffCustomers from '../pages/staff/StaffCustomers';
import StaffProducts from '../pages/staff/StaffProducts';
import StaffOrders from '../pages/staff/StaffOrders';
import StaffProfile from '../pages/staff/StaffProfile';
import StaffHelp from '../pages/staff/StaffHelp';

// Admin Pages
import AdminLogin from '../pages/admin/AdminLogin';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminCustomers from '../pages/admin/AdminCustomers';
import AdminStaff from '../pages/admin/AdminStaff';
import AdminProducts from '../pages/admin/AdminProducts';
import AdminBilling from '../pages/admin/AdminBilling';
import AdminCategories from '../pages/admin/AdminCategories';
import AdminInventory from '../pages/admin/AdminInventory';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminReports from '../pages/admin/AdminReports';
import AdminHelp from '../pages/admin/AdminHelp';
import AdminSettings from '../pages/admin/AdminSettings';
import AdminDeliverySettings from '../pages/admin/AdminDeliverySettings';
import AdminGstSettings from '../pages/admin/AdminGstSettings';
import AdminOffers from '../pages/admin/AdminOffers';
import AdminBarcodeManagement from '../pages/admin/AdminBarcodeManagement';
import AdminQRManagement from '../pages/admin/AdminQRManagement';
import AdminScannerSettings from '../pages/admin/AdminScannerSettings';
import AdminWhatsAppSettings from '../pages/admin/AdminWhatsAppSettings';

// Owner Pages
import OwnerLogin from '../pages/owner/OwnerLogin';
import OwnerDashboard from '../pages/owner/OwnerDashboard';
import OwnerShops from '../pages/owner/OwnerShops';
import OwnerBranches from '../pages/owner/OwnerBranches';
import OwnerAdmins from '../pages/owner/OwnerAdmins';
import OwnerBilling from '../pages/owner/OwnerBilling';
import OwnerInvestments from '../pages/owner/OwnerInvestments';
import OwnerExpenses from '../pages/owner/OwnerExpenses';
import OwnerProfits from '../pages/owner/OwnerProfits';
import OwnerReports from '../pages/owner/OwnerReports';
import OwnerSettings from '../pages/owner/OwnerSettings';
import OwnerHelp from '../pages/owner/OwnerHelp';
import OwnerWhatsAppSettings from '../pages/owner/OwnerWhatsAppSettings';

// Common Audit & Bill History Page
import CompleteBillHistory from '../pages/common/CompleteBillHistory';

// 404 Not Found Page Component
const NotFound = () => (
  <div className="container py-5 text-center my-auto">
    <div className="py-5">
      <div className="display-1 fw-bold text-primary mb-2">404</div>
      <h2 className="fw-bold mb-3 text-white">Page Not Found</h2>
      <p className="text-muted mb-4 lead">
        The requested page does not exist or has been moved within SMP.
      </p>
      <a href="/" className="btn btn-primary px-4 py-2 rounded-pill fw-semibold shadow-sm">
        <i className="bi bi-house me-2"></i> Return to Shopping Home
      </a>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* ============================================================ */}
      {/* 1. PUBLIC STOREFRONT ROUTES & AUTH (With Header & Footer)     */}
      {/* ============================================================ */}
      <Route element={<PublicLayout />}>
        {/* Core Storefront */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Customer Auth */}
        <Route path="/customer/register" element={<CustomerRegister />} />
        <Route path="/customer/verify-otp" element={<CustomerVerifyOtp />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/customer/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Customer Checkout & Payment */}
        <Route
          path="/customer/checkout"
          element={
            <ProtectedRoute allowedRoles={['customer', 'staff', 'admin', 'owner']}>
              <CustomerCheckout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/payment"
          element={
            <ProtectedRoute allowedRoles={['customer', 'staff', 'admin', 'owner']}>
              <CustomerPayment />
            </ProtectedRoute>
          }
        />

        {/* Separate Login Portals */}
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/owner/login" element={<OwnerLogin />} />

        {/* 404 Fallback */}
        <Route path="/404" element={<NotFound />} />
      </Route>

      {/* ============================================================ */}
      {/* 2. CUSTOMER MODULE (With Customer Account Sidebar)           */}
      {/* ============================================================ */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['customer', 'staff', 'admin', 'owner']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="wishlist" element={<CustomerWishlist />} />
        <Route path="help" element={<CustomerHelp />} />
      </Route>

      {/* ============================================================ */}
      {/* 3. STAFF MODULE (With Staff POS Sidebar & TopHeader)         */}
      {/* ============================================================ */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'owner']}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/staff/dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="billing" element={<StaffBilling />} />
        <Route path="billing-history" element={<StaffBillingHistory />} />
        <Route path="customers" element={<StaffCustomers />} />
        <Route path="products" element={<StaffProducts />} />
        <Route path="orders" element={<StaffOrders />} />
        <Route path="profile" element={<StaffProfile />} />
        <Route path="help" element={<StaffHelp />} />
      </Route>

      {/* ============================================================ */}
      {/* 4. ADMIN MODULE (With Admin Sidebar & TopHeader)             */}
      {/* ============================================================ */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'owner']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="complete-bill-history" element={<CompleteBillHistory role="admin" />} />
        <Route path="barcodes" element={<AdminBarcodeManagement role="admin" />} />
        <Route path="qr-codes" element={<AdminQRManagement role="admin" />} />
        <Route path="scanner-settings" element={<AdminScannerSettings role="admin" />} />
        <Route path="whatsapp-settings" element={<AdminWhatsAppSettings />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="delivery-settings" element={<AdminDeliverySettings />} />
        <Route path="gst-settings" element={<AdminGstSettings />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="help" element={<AdminHelp />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* ============================================================ */}
      {/* 5. OWNER MODULE (With Owner Executive Sidebar & TopHeader)    */}
      {/* ============================================================ */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute allowedRoles={['owner']}>
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="shops" element={<OwnerShops />} />
        <Route path="branches" element={<OwnerBranches />} />
        <Route path="admins" element={<OwnerAdmins />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="billing" element={<OwnerBilling />} />
        <Route path="complete-bill-history" element={<CompleteBillHistory role="owner" />} />
        <Route path="barcodes" element={<AdminBarcodeManagement role="owner" />} />
        <Route path="qr-codes" element={<AdminQRManagement role="owner" />} />
        <Route path="scanner-settings" element={<AdminScannerSettings role="owner" />} />
        <Route path="whatsapp-settings" element={<OwnerWhatsAppSettings />} />
        <Route path="delivery-settings" element={<AdminDeliverySettings />} />
        <Route path="gst-settings" element={<AdminGstSettings />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="investments" element={<OwnerInvestments />} />
        <Route path="expenses" element={<OwnerExpenses />} />
        <Route path="profits" element={<OwnerProfits />} />
        <Route path="reports" element={<OwnerReports />} />
        <Route path="settings" element={<OwnerSettings />} />
        <Route path="help" element={<OwnerHelp />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
