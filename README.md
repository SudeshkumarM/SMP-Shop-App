# SMP (Shop Management Platform)
### Scalable E-Commerce & Multi-Shop Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18.3-blue.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8.2-brightgreen.svg)](https://www.mongodb.com/)
[![Bootstrap 5](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

---

## 1. Executive Project Overview

**SMP (Shop Management Platform)** is an enterprise-grade, multi-tenant retail and e-commerce web platform. Designed with strict multi-tenant isolation, the system initially operates with **ONLY ONE flagship product — the Premium Cotton Shirt priced at ₹500**, while the underlying architecture supports seamless future expansion into a multi-shop **Shopping Mall** ecosystem (Electronics, Grocery, Footwear, Accessories, Supermarkets).

SMP provides **four completely segregated user modules**, each with isolated routing, dual-credential authentication (Username OR Email + Password), dedicated sidebar navigation, role-based authorization guards, and granular permissions:

1. **🛍️ Customer Module**: Consumer storefront featuring mobile OTP verification, dynamic filtering, real-time cart math, wishlist, multi-address checkout, mock payment gateway, order tracking, and dedicated Customer Help.
2. **💳 Staff Module**: High-speed Point of Sale (POS) counter billing terminal featuring barcode scanning (`890123450001`), SKU search, instant customer enrollment, invoice generation, atomic stock deduction, bill correction (if enabled by Admin), thermal printing, and PDF invoice downloads.
3. **⚙️ Admin Module**: Shop management console for inventory control, staff provisioning (with individual usernames e.g. `kumar01`, `staff02` and Staff IDs e.g. `STF-1001`), customer CRM with Excel export, product price & GST modification, bill editing/cancellation with audit logs, and tax/sales reporting.
4. **👑 Owner Module**: Highest executive authority console for business oversight across multiple shops and branches, tracking initial & operational capital investments, recurring overheads, and performing true mathematical Profit & Loss audits ($Gross\ Profit = Total\ Sales - Total\ Purchase\ Cost$; $Net\ Profit = Gross\ Profit - Total\ Expenses$).

---

## 2. Technology Stack & Ports

### Frontend Architecture
- **Core Library**: React.js 18 (Vite Bundler)
- **Local Dev Port**: `http://localhost:5172` (and network-accessible e.g. `http://177.20.50.7:5172`)
- **Styling & UI**: Bootstrap 5.3 + Bootstrap Icons + Custom CSS tokens
- **Routing**: React Router DOM v6 with declarative nested layouts & `ProtectedRoute` guards
- **State Management**: Context API (`AuthContext`, `CartContext`, `ToastContext`)
- **HTTP Client**: Axios with automatic JWT Bearer injection & error interceptors
- **Visualizations**: Recharts (Monthly Trends, Sales Charts)
- **Reporting & Exports**: jsPDF & jsPDF-AutoTable (PDF Invoices), XLSX (Excel Data Import/Export)
- **Deployment**: Vercel SPA rewrites configured via `frontend/vercel.json`

### Backend Architecture
- **Runtime**: Node.js v24 / v18+ LTS
- **Port**: `http://localhost:5000`
- **Framework**: Express.js REST API with rate-limiting & connection pooling (`maxPoolSize: 100`)
- **Authentication**: Stateless JSON Web Tokens (JWT) + bcryptjs password hashing
- **Security**: Rate limiting, CORS whitelist, atomic stock decrement transactions
- **File Storage**: Multer disk storage for product imagery & invoice assets
- **Barcode Engine**: Custom SVG/Canvas generation & SKU barcode checksum calculation
- **Notifications**: Dual-mode OTP service (Mandatory Mobile OTP verification for registration)

### Database Layer
- **Engine**: MongoDB Community Server v8.2+ (`mongodb://127.0.0.1:27017/smp_db`)
- **ODM**: Mongoose ODM with normalized schemas, compound indexes, and auto-timestamps
- **Multi-Tenant Design**: Every operational document is scoped with `shopId` and `branchId`

---

## 3. Seeded Demo Accounts & Credentials

The system comes pre-populated with a complete operational dataset. All user modules support login via **Username OR Email + Password**:

| Module | Role | Username | Email / ID | Password | Access Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **👑 Owner** | `owner` | `kumar` | `owner@smp.com` | `Password123` | Global Platform & All Mall Shops |
| **⚙️ Admin** | `admin` | `admin01` | `admin@smp.com` / `ADM-101` | `Password123` | SMP Elite Fashions (Shop Admin) |
| **💳 Staff 1** | `staff` | `kumar01` | `staff@smp.com` / `STF-1001` | `Password123` | Senior Cashier (Can Edit Bills) |
| **💳 Staff 2** | `staff` | `staff02` | `staff02@smp.com` / `STF-1002` | `Password123` | Billing Executive |
| **🛍️ Customer** | `customer` | `kumar_customer` | `customer@smp.com` / `9876543210`| `Password123` | Storefront & Personal Account |

*Note: Entering invalid credentials displays the exact standardized message: `"Invalid Username/Email or Password."`*

---

## 4. Single Product Architecture ("Shirt" @ ₹500)

Per the strict requirements, the platform initially contains **ONLY ONE category** and **ONLY ONE product**:

- **Category**: `Apparel & Clothing`
- **Product Name**: `Shirt`
- **Product SKU**: `SMP-SHIRT-001`
- **Barcode**: `890123450001`
- **Selling Price**: `₹500.00`
- **GST Rate**: `5%` (₹25.00)
- **Final Price**: `₹525.00`
- **Initial Stock**: `150 units`
- **Available Sizes**: `S`, `M`, `L`, `XL`, `XXL`
- **Available Colours**: `Classic White`, `Sky Blue`, `Navy Blue`, `Charcoal Grey`

Admin and Owner have complete authority to edit the Shirt name, image, price, GST rate, stock, or discounts. If deleted by Admin or Owner, the Shirt is soft-deleted (`isActive: false`) and immediately disappears from both the customer storefront and staff billing interfaces.

---

## 5. Four Segregated Modules & Complete URL Directory

### 5.1 Storefront & Public Routes (`PublicLayout`)
| Route | Component | Description |
| :--- | :--- | :--- |
| `/` | `Home.jsx` | Banner carousel, single Shirt showcase, offers, features |
| `/products` | `Products.jsx` | Store catalog displaying the single Shirt with filters |
| `/product/:id` | `ProductDetail.jsx` | Shirt gallery, size & color selectors, pricing breakdown (₹500 + 5% GST = ₹525) |
| `/cart` | `Cart.jsx` | Interactive cart, quantity updates, GST summary, guest session migration |
| `/about` | `About.jsx` | SMP corporate vision, expansion roadmap, leadership |
| `/contact` | `Contact.jsx` | Store contact form, store locator, branch directory |

### 5.2 Customer Portal (`CustomerLayout` + Route Guards)
| Route | Component | Description |
| :--- | :--- | :--- |
| `/customer/register` | `CustomerRegister.jsx` | Customer registration (Full Name, Username, Email, Phone, Password) with mobile OTP |
| `/customer/verify-otp` | `CustomerVerifyOtp.jsx` | 6-digit SMS OTP verification (no email OTP required) |
| `/customer/login` | `CustomerLogin.jsx` | Dual-credential login (Username/Email + Password), Welcome Kumar! greeting |
| `/customer/forgot-password` | `ForgotPassword.jsx` | Identity verification & secure password reset |
| `/customer/dashboard` | `CustomerDashboard.jsx` | Personal shopping metrics, recent orders, saved addresses |
| `/customer/profile` | `CustomerProfile.jsx` | Profile update (name, username, email, phone) & password change |
| `/customer/orders` | `CustomerOrders.jsx` | Order tracking, status timeline, PDF invoice download |
| `/customer/wishlist` | `CustomerWishlist.jsx` | Saved favorite products with quick "Move to Cart" |
| `/customer/checkout` | `CustomerCheckout.jsx` | Multi-address selection, new address modal, delivery options |
| `/customer/payment` | `CustomerPayment.jsx` | UPI, Card, NetBanking & COD mock gateway with invoice modal |
| `/customer/help` | `CustomerHelp.jsx` | **Customer Help Center**: Registration, OTP, Login, Shopping, Payment, Orders |

### 5.3 Staff Billing / POS Terminal (`StaffLayout`)
| Route | Component | Description |
| :--- | :--- | :--- |
| `/staff/login` | `StaffLogin.jsx` | Individual staff username/email login |
| `/staff/dashboard` | `StaffDashboard.jsx` | Today's counter sales, bills generated, customers served |
| `/staff/billing` | `StaffBilling.jsx` | **POS Terminal**: Barcode scan (`890123450001`), SKU search, quick customer add, GST math, stock auto-deduct |
| `/staff/billing-history` | `StaffBillingHistory.jsx` | Historical cashier transactions with reprint & PDF download |
| `/staff/customers` | `StaffCustomers.jsx` | Customer directory & purchase history lookup |
| `/staff/products` | `StaffProducts.jsx` | Real-time stock check for Shirt across sizes and colors |
| `/staff/orders` | `StaffOrders.jsx` | In-store customer order pickup verification |
| `/staff/profile` | `StaffProfile.jsx` | Staff identity, assigned branch, and shift history |
| `/staff/help` | `StaffHelp.jsx` | **Staff Operating Manual**: POS billing steps, printing, product check, admin escalation |

### 5.4 Admin Shop Management (`AdminLayout`)
| Route | Component | Description |
| :--- | :--- | :--- |
| `/admin/login` | `AdminLogin.jsx` | Dedicated Admin Login Portal |
| `/admin/dashboard` | `AdminDashboard.jsx` | Shop sales KPIs, 7-day sales graph, low stock alerts, recent orders |
| `/admin/customers` | `AdminCustomers.jsx` | Customer CRM, purchase logs, block/activate, Excel export |
| `/admin/staff` | `AdminStaff.jsx` | Staff provisioning (Username, Staff ID, Job Role, "Can Edit Bills" toggle) |
| `/admin/products` | `AdminProducts.jsx` | Shirt product management: edit price (₹500), GST (5%), stock, delete/restore |
| `/admin/billing` | `AdminBilling.jsx` | **Bill Management**: View all bills, edit bill items/quantities, cancel bill, audit logs |
| `/admin/categories` | `AdminCategories.jsx` | Category management |
| `/admin/inventory` | `AdminInventory.jsx` | Stock ledger, purchase entry restock, supplier directory |
| `/admin/orders` | `AdminOrders.jsx` | Order lifecycle (Confirm -> Process -> Dispatch -> Deliver) |
| `/admin/reports` | `AdminReports.jsx` | Daily/Weekly/Monthly Sales, Staff Performance, and GST Tax returns |
| `/admin/help` | `AdminHelp.jsx` | **Admin Operations Manual**: Staff provisioning, CRM, Shirt pricing, GST, Bill audits |
| `/admin/settings` | `AdminSettings.jsx` | Shop GSTIN, contact details, currency, and tax parameters |

### 5.5 Owner Executive Corporate Governance (`OwnerLayout`)
| Route | Component | Description |
| :--- | :--- | :--- |
| `/owner/login` | `OwnerLogin.jsx` | Master Owner Portal (Highest authority) |
| `/owner/dashboard` | `OwnerDashboard.jsx` | **Owner Dashboard with 12 Database Metrics** (see below) |
| `/owner/shops` | `OwnerShops.jsx` | Multi-shop CRUD (Dress Shop, Supermarket, Electronics, etc.) |
| `/owner/branches` | `OwnerBranches.jsx` | Multi-branch location & store manager management |
| `/owner/admins` | `OwnerAdmins.jsx` | Admin account provisioning and shop assignment |
| `/owner/billing` | `OwnerBilling.jsx` | Platform-wide billing oversight and audit inspection |
| `/owner/investments` | `OwnerInvestments.jsx` | Capital investment tracking (Initial capital, renovation, IT, inventory) |
| `/owner/expenses` | `OwnerExpenses.jsx` | Overhead expense auditing (Rent, salaries, electricity, marketing) |
| `/owner/profits` | `OwnerProfits.jsx` | **True P&L Statement**: Revenue - COGS = Gross Profit; Gross Profit - Expenses = Net Profit |
| `/owner/reports` | `OwnerReports.jsx` | Consolidated cross-shop revenue, tax, and inventory valuation |
| `/owner/settings` | `OwnerSettings.jsx` | Platform-wide configurations, audit log retention, security |

---

## 6. Owner Dashboard: 12 Database Metrics

The Owner Dashboard calculates and displays the exact 12 financial and operational metrics from MongoDB:

1. **Total Investment**: Sum of all capital injections (`Investment.find()`)
2. **Total Sales**: Sum of all gross order revenues (`Order.find()`)
3. **Total Expenses**: Sum of all operating overheads (`Expense.find()`)
4. **Total Purchase Cost**: Cost of goods sold (COGS) calculated per sold unit
5. **Gross Profit**: $\text{Total Sales} - \text{Total Purchase Cost}$
6. **Net Profit**: $\text{Gross Profit} - \text{Total Expenses}$
7. **Daily Profit**: Today's Gross Profit minus Today's Expenses
8. **Monthly Profit**: Current Month's Gross Profit minus Current Month's Expenses
9. **Yearly Profit**: Current Year's Gross Profit minus Current Year's Expenses
10. **GST Collection**: Cumulative 5% GST collected across all customer and POS bills
11. **Total Bills**: Count of all active, non-deleted invoices
12. **Business Performance**: Executive health rating and ROI calculation

---

## 7. Performance & 1,000 Concurrent Users Verification

SMP is engineered for high-concurrency retail environments with:
- Connection pooling (`maxPoolSize: 100`, `minPoolSize: 10`).
- Database indexing on `sku`, `barcode`, `invoiceNumber`, `shopId`, `username`, `email`.
- **Atomic Stock Protection**: Uses `Product.findOneAndUpdate({ _id, availableQuantity: { $gte: qty } }, { $inc: { availableQuantity: -qty } })` to eliminate race conditions under simultaneous load.

### Load Test Results (`npm run test:load`)

```text
=============================================================
  🚀 SMP 1,000 CONCURRENT USERS LOAD & STRESS TEST
=============================================================
  ▸ Target: 1,000 Concurrent User Operations
  ▸ Backend: http://localhost:5000
=============================================================

✓ Staff Authenticated for Billing Test: Kumar (STF-1001)
✓ Target Product: "Shirt" (Price: ₹500, Initial Stock: 101)

--- Phase 1: 1,000 Concurrent Catalog & Search Queries ---
✓ Phase 1 Results:
  Total Requests:        1000
  Successful (200 OK):   1000
  Failed Requests:       0
  Total Time:            3.87 seconds
  Throughput:            259 requests/second
  Average Latency:       167 ms
  95th Percentile (p95): 236 ms

--- Phase 2: Concurrent Atomic Billing & Anti-Race-Condition Audit ---
Attempting 50 simultaneous high-concurrency bill creations on the Shirt product...
✓ Phase 2 Results:
  Simultaneous Bills Sent: 50
  Successfully Invoiced:   50
  Stock Integrity Audit:
    Initial Stock:         101
    Final Stock:           51
    Total Units Deducted:  50
    Stock Math Match:      ✓ 100% PERFECT (ZERO OVERSELLING)

=============================================================
  🎯 1,000 CONCURRENT USERS BENCHMARK PASSED SUCCESSFULLY!
=============================================================
```

---

## 8. How to Run Locally

### 1. Seed Database with Initial Data
```bash
npm run seed
```

### 2. Run Automated Verification Tests
```bash
# Run End-to-End Test Suite across all 4 modules
npm run test:e2e

# Run 1,000 Concurrent Users Load Test
npm run test:load
```

### 3. Start Development Servers
```bash
npm run dev
# Or: npm start
```

This concurrently launches:
- **Backend REST API**: `http://localhost:5000`
- **Frontend Client**: `http://localhost:5172` (and network-accessible e.g. `http://177.20.50.7:5172`)
- **Database**: Connected to `mongodb://127.0.0.1:27017/smp_db`
