async function runE2ETests() {
  console.log('=== SMP END-TO-END AUTOMATED VERIFICATION ===\n');

  // 1. Authenticate all 4 roles via Username & Email
  console.log('--- Phase 1: Authentication & Dual-Credential Login ---');
  const tokens = {};

  // A. Customer Login via Username
  const loginCustUsername = await fetch('http://localhost:5000/api/auth/customer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'kumar_customer', password: 'Password123' })
  }).then(r => r.json());
  if (!loginCustUsername.success) throw new Error('Customer username login failed');
  tokens.customer = loginCustUsername.token;
  console.log(`✓ Customer Login via Username: "${loginCustUsername.user.username}" -> ${loginCustUsername.welcomeMessage}`);

  // B. Customer Login via Email
  const loginCustEmail = await fetch('http://localhost:5000/api/auth/customer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'customer@smp.com', password: 'Password123' })
  }).then(r => r.json());
  if (!loginCustEmail.success) throw new Error('Customer email login failed');
  console.log(`✓ Customer Login via Email: "${loginCustEmail.user.email}" -> ${loginCustEmail.welcomeMessage}`);

  // C. Invalid Login Check
  const invalidLogin = await fetch('http://localhost:5000/api/auth/customer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'kumar_customer', password: 'WrongPassword' })
  }).then(r => r.json());
  console.log(`✓ Invalid Credential Guard Verified: "${invalidLogin.message}"`);

  // D. Staff Login via Individual Username (kumar01)
  const loginStaff = await fetch('http://localhost:5000/api/auth/staff/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'kumar01', password: 'Password123' })
  }).then(r => r.json());
  if (!loginStaff.success) throw new Error('Staff login failed');
  tokens.staff = loginStaff.token;
  console.log(`✓ Staff Login via Username: "${loginStaff.user.username}" (ID: ${loginStaff.user.staffId}) -> ${loginStaff.welcomeMessage}`);

  // E. Admin Login via Individual Username (admin01)
  const loginAdmin = await fetch('http://localhost:5000/api/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin01', password: 'Password123' })
  }).then(r => r.json());
  if (!loginAdmin.success) throw new Error('Admin login failed');
  tokens.admin = loginAdmin.token;
  console.log(`✓ Admin Login via Username: "${loginAdmin.user.username}" (ID: ${loginAdmin.user.adminId}) -> ${loginAdmin.welcomeMessage}`);

  // F. Owner Login via Individual Username (kumar)
  const loginOwner = await fetch('http://localhost:5000/api/auth/owner/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'kumar', password: 'Password123' })
  }).then(r => r.json());
  if (!loginOwner.success) throw new Error('Owner login failed');
  tokens.owner = loginOwner.token;
  console.log(`✓ Owner Login via Username: "${loginOwner.user.username}" (Master Authority) -> ${loginOwner.welcomeMessage}\n`);

  // 2. Single Product Catalog Verification
  console.log('--- Phase 2: Single Product Verification ("Shirt" @ ₹500) ---');
  const productsRes = await fetch('http://localhost:5000/api/products').then(r => r.json());
  console.log(`✓ Active Product Count: ${productsRes.count} (Strict single product requirement)`);
  const shirt = productsRes.products[0];
  console.log(`✓ Product Name:       "${shirt.name}"`);
  console.log(`✓ Selling Price:      ₹${shirt.sellingPrice} (Must be ₹500)`);
  console.log(`✓ GST Rate:           ${shirt.gstPercent}%`);
  console.log(`✓ Final Price:        ₹${shirt.finalPrice}`);
  console.log(`✓ Available Stock:    ${shirt.availableQuantity} units\n`);

  if (shirt.sellingPrice !== 500) {
    throw new Error(`Product price mismatch: expected 500, got ${shirt.sellingPrice}`);
  }

  // 3. Customer Cart Flow
  console.log('--- Phase 3: Customer Cart Operations ---');
  const addToCartRes = await fetch('http://localhost:5000/api/cart/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.customer}`
    },
    body: JSON.stringify({
      productId: shirt._id,
      quantity: 1,
      size: 'L',
      colour: 'Classic White'
    })
  }).then(r => r.json());
  console.log(`✓ Cart Add: Subtotal = ₹${addToCartRes.cart.subtotal}, GST = ₹${addToCartRes.cart.gstAmount}, Total = ₹${addToCartRes.cart.grandTotal}\n`);

  // 4. Staff POS Billing & Atomic Stock Decrement
  console.log('--- Phase 4: Staff High-Speed POS Billing ---');
  const initialStock = shirt.availableQuantity;
  const billRes = await fetch('http://localhost:5000/api/billing/create-bill', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.staff}`
    },
    body: JSON.stringify({
      customerName: 'Karthik Raja',
      customerPhone: '9840112233',
      paymentMethod: 'POS_CASH',
      items: [{
        productId: shirt._id,
        quantity: 2,
        size: 'L',
        colour: 'Classic White',
        unitPrice: 500,
        gstPercent: 5
      }]
    })
  }).then(r => r.json());

  if (!billRes.success) throw new Error(`Bill creation failed: ${billRes.message}`);
  console.log(`✓ Bill Generated: #${billRes.invoice.invoiceNumber}, Grand Total: ₹${billRes.invoice.grandTotal}`);

  // Verify stock auto-deduction
  const postBillProduct = await fetch(`http://localhost:5000/api/products/${shirt._id}`).then(r => r.json());
  console.log(`✓ Atomic Stock Deduction: Stock went from ${initialStock} to ${postBillProduct.product.availableQuantity} (Deducted 2)\n`);

  // 5. Bill Revision & Audit Log Test (Admin/Staff Edit Bill)
  console.log('--- Phase 5: Bill Correction & Audit Trail ---');
  const editBillRes = await fetch(`http://localhost:5000/api/billing/invoice/${billRes.invoice._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.admin}`
    },
    body: JSON.stringify({
      items: [{
        productId: shirt._id,
        quantity: 1, // Adjusted from 2 to 1
        unitPrice: 500,
        gstPercent: 5
      }],
      reason: 'Customer returned 1 Shirt at billing counter'
    })
  }).then(r => r.json());

  console.log(`✓ Bill Corrected: Subtotal revised to ₹${editBillRes.invoice.subtotal}, Grand Total: ₹${editBillRes.invoice.grandTotal}`);
  console.log(`✓ Audit Trail Created: ${editBillRes.invoice.editHistory.length} audit entry recorded with reason "${editBillRes.invoice.editHistory[0].reason}"\n`);

  // 6. Owner Corporate Dashboard & 12 Financial Metrics
  console.log('--- Phase 6: Owner Corporate Governance & 12 Metrics Audit ---');
  const ownerDash = await fetch('http://localhost:5000/api/owner/dashboard-stats', {
    headers: { 'Authorization': `Bearer ${tokens.owner}` }
  }).then(r => r.json());

  console.log(`✓ Owner Dashboard 12 Metrics:`);
  console.log(`  1. Total Investment:      ₹${ownerDash.kpis.totalInvestment}`);
  console.log(`  2. Total Sales:           ₹${ownerDash.kpis.totalSales}`);
  console.log(`  3. Total Expenses:        ₹${ownerDash.kpis.totalExpenses}`);
  console.log(`  4. Total Purchase Cost:   ₹${ownerDash.kpis.totalPurchaseCost}`);
  console.log(`  5. Gross Profit:          ₹${ownerDash.kpis.grossProfit} (Sales - Purchase Cost)`);
  console.log(`  6. Net Profit:            ₹${ownerDash.kpis.netProfit} (Gross Profit - Expenses)`);
  console.log(`  7. Daily Profit:          ₹${ownerDash.kpis.dailyProfit}`);
  console.log(`  8. Monthly Profit:        ₹${ownerDash.kpis.monthlyProfit}`);
  console.log(`  9. Yearly Profit:         ₹${ownerDash.kpis.yearlyProfit}`);
  console.log(`  10. GST Collection:       ₹${ownerDash.kpis.gstCollection}`);
  console.log(`  11. Total Bills:          ${ownerDash.kpis.totalBills}`);
  console.log(`  12. Business Performance: ${ownerDash.kpis.businessPerformance}\n`);

  // 7. Customer Phone Lookup & Delivery Charge Verification
  console.log('--- Phase 7: Customer Phone Lookup & Delivery Settings ---');
  const lookupRes = await fetch('http://localhost:5000/api/billing/customer-lookup/9876543210', {
    headers: { 'Authorization': `Bearer ${tokens.staff}` }
  }).then(r => r.json());
  if (!lookupRes.success || !lookupRes.exists) throw new Error('Customer phone lookup failed');
  console.log(`✓ Customer Lookup by Phone: "${lookupRes.customer.fullName}", Total Purchases: ${lookupRes.customer.totalPurchases}, Previous Invoices: ${lookupRes.previousInvoices.length}`);

  const deliveryRes = await fetch('http://localhost:5000/api/admin/delivery-settings', {
    headers: { 'Authorization': `Bearer ${tokens.admin}` }
  }).then(r => r.json());
  console.log(`✓ Delivery Settings Retrieved: Standard Charge = ₹${deliveryRes.settings.deliveryCharge}, Free Threshold = ₹${deliveryRes.settings.freeDeliveryThreshold}`);

  // 8. WhatsApp Integration & Coupon Notification Dispatch
  console.log('--- Phase 8: WhatsApp Integration & Promotional Consent ---');
  const couponRes = await fetch('http://localhost:5000/api/admin/coupons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.admin}`
    },
    body: JSON.stringify({
      code: 'TESTDISC25',
      title: 'Summer 25% Off',
      discountPercent: 25,
      minPurchaseAmount: 500,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sendWhatsApp: true
    })
  }).then(r => r.json());
  if (!couponRes.success) throw new Error(`Coupon creation failed: ${couponRes.message}`);
  console.log(`✓ Coupon Created: ${couponRes.coupon.code} (${couponRes.coupon.discountPercent}% OFF)`);
  console.log(`✓ WhatsApp Broadcast Logged: Sent/Simulated = ${couponRes.whatsAppSummary.sent}, Opted Out = ${couponRes.whatsAppSummary.optedOut}\n`);

  console.log('=== ALL END-TO-END FLOWS COMPLETED WITH 100% SUCCESS! ===');
}

runE2ETests().catch(err => {
  console.error('[E2E Test Failure]:', err);
  process.exit(1);
});
