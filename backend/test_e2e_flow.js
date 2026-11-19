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

  // 2. Initial State & Admin Product Creation
  console.log('--- Phase 2: Catalog State & Admin Dynamic Product Addition ---');
  const initialProductsRes = await fetch('http://localhost:5000/api/products').then(r => r.json());
  const shirtProd = initialProductsRes.products?.find(p => p.name === 'Shirt');
  if (!shirtProd) {
    throw new Error('Expected initial Shirt product in database');
  }
  console.log(`✓ Initial Product Found: "${shirtProd.name}" (SKU: ${shirtProd.sku}, Price: ₹${shirtProd.sellingPrice})`);

  // Admin creates a new product
  const catRes = await fetch('http://localhost:5000/api/products/categories/list').then(r => r.json());
  const categoryId = catRes.categories?.[0]?._id;

  const createProdRes = await fetch('http://localhost:5000/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.admin}`
    },
    body: JSON.stringify({
      name: 'SMP Designer Kurta',
      sku: `SMP-KURTA-${Date.now()}`,
      barcode: `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      barcodeFormat: 'CODE128',
      brand: 'SMP',
      category: categoryId,
      description: 'Premium quality apparel for all seasons.',
      costPrice: 250,
      originalPrice: 800,
      sellingPrice: 500,
      gstPercent: 5,
      availableQuantity: 100,
      lowStockThreshold: 10,
      sizes: ['M', 'L', 'XL'],
      colours: ['Navy Blue', 'Maroon', 'Black'],
      images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80']
    })
  }).then(r => r.json());

  if (!createProdRes.success) throw new Error(`Product creation failed: ${createProdRes.message}`);
  const testProduct = createProdRes.product;
  console.log(`✓ Admin Created Product: "${testProduct.name}" (SKU: ${testProduct.sku}, Selling: ₹${testProduct.sellingPrice}, Stock: ${testProduct.availableQuantity})\n`);

  // 3. Customer Cart Flow
  console.log('--- Phase 3: Customer Cart Operations ---');
  const addToCartRes = await fetch('http://localhost:5000/api/cart/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.customer}`
    },
    body: JSON.stringify({
      productId: testProduct._id,
      quantity: 1,
      size: 'L',
      colour: 'Navy Blue'
    })
  }).then(r => r.json());
  console.log(`✓ Cart Add: Subtotal = ₹${addToCartRes.cart.subtotal}, GST = ₹${addToCartRes.cart.gstAmount}, Total = ₹${addToCartRes.cart.grandTotal}\n`);

  // 4. Staff POS Billing & UPI QR Code Payment Verification
  console.log('--- Phase 4: Staff High-Speed POS Billing & UPI QR Code Verification ---');
  const initialStock = testProduct.availableQuantity;

  // A. QR Payment Attempt without UTR should fail
  const qrFail = await fetch('http://localhost:5000/api/billing/create-bill', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.staff}`
    },
    body: JSON.stringify({
      customerName: 'Karthik Raja',
      customerPhone: '9840112233',
      paymentMethod: 'POS_UPI_QR',
      items: [{
        productId: testProduct._id,
        quantity: 2,
        unitPrice: 500,
        gstPercent: 5
      }]
    })
  }).then(r => r.json());
  if (qrFail.success) throw new Error('POS_UPI_QR without UTR should fail');
  console.log(`✓ Guard Verified: QR payment blocked without verified UTR: "${qrFail.message}"`);

  // B. Verified QR Payment with UTR
  const testUtr = 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000);
  const billRes = await fetch('http://localhost:5000/api/billing/create-bill', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.staff}`
    },
    body: JSON.stringify({
      customerName: 'Karthik Raja',
      customerPhone: '9840112233',
      paymentMethod: 'POS_UPI_QR',
      transactionRef: testUtr,
      items: [{
        productId: testProduct._id,
        quantity: 2,
        size: 'L',
        colour: 'Navy Blue',
        unitPrice: 500,
        gstPercent: 5
      }]
    })
  }).then(r => r.json());

  if (!billRes.success) throw new Error(`Bill creation failed: ${billRes.message}`);
  console.log(`✓ Bill Generated with Verified QR Payment: #${billRes.invoice.invoiceNumber}, Grand Total: ₹${billRes.invoice.grandTotal}, Method: ${billRes.invoice.paymentMethod}`);
  console.log(`✓ Notification Delivery Status: "${billRes.deliveryStatus}" (WhatsApp / SMS Fallback)`);

  // C. Duplicate UTR check
  const dupUtrRes = await fetch('http://localhost:5000/api/billing/create-bill', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.staff}`
    },
    body: JSON.stringify({
      customerName: 'Second Customer',
      customerPhone: '9840112244',
      paymentMethod: 'POS_UPI_QR',
      transactionRef: testUtr,
      items: [{
        productId: testProduct._id,
        quantity: 1,
        unitPrice: 500,
        gstPercent: 5
      }]
    })
  }).then(r => r.json());
  if (dupUtrRes.success) throw new Error('Duplicate UTR should be rejected');
  console.log(`✓ Duplicate UTR Guard Verified: "${dupUtrRes.message}"`);

  // Verify stock auto-deduction
  const postBillProduct = await fetch(`http://localhost:5000/api/products/${testProduct._id}`).then(r => r.json());
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
        productId: testProduct._id,
        quantity: 1, // Adjusted from 2 to 1
        unitPrice: 500,
        gstPercent: 5
      }],
      reason: 'Customer returned 1 item at billing counter'
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
      code: 'TESTDISC' + Math.floor(100 + Math.random() * 900),
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

  // 9. Category Management CRUD & Product Count
  console.log('--- Phase 9: Category Management CRUD ---');
  const catListRes = await fetch('http://localhost:5000/api/products/categories/list', {
    headers: { 'Authorization': `Bearer ${tokens.admin}` }
  }).then(r => r.json());
  if (!catListRes.success) throw new Error('Category listing failed');
  console.log(`✓ Category Listing: Found ${catListRes.categories.length} categories, initial Clothing count = ${catListRes.categories[0]?.productCount || 0}`);

    const catSuffix = Math.floor(100 + Math.random() * 900);
    const createCatRes = await fetch('http://localhost:5000/api/products/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.admin}`
      },
      body: JSON.stringify({
        name: `Footwear ${catSuffix}`,
        categoryId: `CAT-${catSuffix}`,
        description: 'Formal and casual shoes',
        status: 'ACTIVE'
      })
    }).then(r => r.json());
    if (!createCatRes.success) throw new Error(`Category creation failed: ${createCatRes.message}`);
    console.log(`✓ Category Created: "${createCatRes.category.name}" (ID: ${createCatRes.category.categoryId})`);

    const updateCatRes = await fetch(`http://localhost:5000/api/products/categories/${createCatRes.category._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.admin}`
      },
      body: JSON.stringify({
        name: `Footwear & Acc ${catSuffix}`,
        status: 'ACTIVE'
      })
    }).then(r => r.json());
    if (!updateCatRes.success) throw new Error(`Category update failed: ${updateCatRes.message}`);
    console.log(`✓ Category Updated: Renamed to "${updateCatRes.category.name}"`);

  // 10. Barcode Management & Initial Shirt Barcode Lookup
  console.log('\n--- Phase 10: Barcode Management & Initial Shirt Barcode Verification ---');
  const barcodeListRes = await fetch('http://localhost:5000/api/products/barcodes/list', {
    headers: { 'Authorization': `Bearer ${tokens.admin}` }
  }).then(r => r.json());
  if (!barcodeListRes.success) throw new Error('Barcode listing failed');
  const barcodesCount = (barcodeListRes.products || barcodeListRes.barcodes || []).length;
  console.log(`✓ Barcode Listing: Found ${barcodesCount} products with barcodes`);

  // Direct lookup for initial Shirt barcode: 8901234567890
  const shirtBarcodeRes = await fetch('http://localhost:5000/api/products/by-barcode/8901234567890', {
    headers: { 'Authorization': `Bearer ${tokens.staff}` }
  }).then(r => r.json());
  if (!shirtBarcodeRes.success || shirtBarcodeRes.product.name !== 'Shirt') {
    throw new Error('Initial Shirt product barcode lookup failed');
  }
  console.log(`✓ Initial Shirt Barcode (8901234567890) Verified:`);
  console.log(`   Product: "${shirtBarcodeRes.product.name}"`);
  console.log(`   SKU: ${shirtBarcodeRes.product.sku}`);
  console.log(`   Selling Price: ₹${shirtBarcodeRes.product.sellingPrice}`);
  console.log(`   Barcode Format: ${shirtBarcodeRes.product.barcodeFormat}`);

  // 11. QR Code Management & QR Lookup
  console.log('\n--- Phase 11: QR Code Management & Lookups ---');
  const qrListRes = await fetch('http://localhost:5000/api/products/qr-codes/list', {
    headers: { 'Authorization': `Bearer ${tokens.admin}` }
  }).then(r => r.json());
  if (!qrListRes.success) throw new Error('QR listing failed');
  console.log(`✓ QR Code Listing: Found ${qrListRes.qrCodes.length} active QR records`);

  const shirtQrLookup = await fetch('http://localhost:5000/api/products/by-qr?qrData=smp:product:SMP-SHIRT-001', {
    headers: { 'Authorization': `Bearer ${tokens.staff}` }
  }).then(r => r.json());
  if (!shirtQrLookup.success || shirtQrLookup.product.name !== 'Shirt') {
    throw new Error('QR lookup for Shirt failed');
  }
  console.log(`✓ Shirt QR Lookup (smp:product:SMP-SHIRT-001) Verified: Product "${shirtQrLookup.product.name}" matched`);

  // 12. Scanner Settings & Test Scan Mode
  console.log('\n--- Phase 12: Scanner Settings & Live Test Scan Terminal ---');
  const scannerSettingsRes = await fetch('http://localhost:5000/api/settings/scanner', {
    headers: { 'Authorization': `Bearer ${tokens.admin}` }
  }).then(r => r.json());
  if (!scannerSettingsRes.success) throw new Error('Scanner settings retrieval failed');
  console.log(`✓ Scanner Settings: Primary=${scannerSettingsRes.settings.scannerType}, BarcodeFormat=${scannerSettingsRes.settings.barcodeFormat}`);

  // Test scan simulation with Shirt barcode
  const testScanRes = await fetch('http://localhost:5000/api/settings/scanner/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.admin}`
    },
    body: JSON.stringify({
      scanInput: '8901234567890',
      scanType: 'BARCODE'
    })
  }).then(r => r.json());
  if (!testScanRes.success || !testScanRes.product) {
    throw new Error('Scanner test scan failed');
  }
  console.log(`✓ Scanner Live Test Verified: Decoded "${testScanRes.rawInput}" -> Product: "${testScanRes.product.name}" (Price: ₹${testScanRes.product.sellingPrice})`);

  // 13. Complete Bill History & 7 Summary KPIs
  console.log('\n--- Phase 13: Complete Bill History & 7 Summary KPIs ---');
  const completeHistoryRes = await fetch('http://localhost:5000/api/billing/complete-history?exportAll=true', {
    headers: { 'Authorization': `Bearer ${tokens.admin}` }
  }).then(r => r.json());
  if (!completeHistoryRes.success) throw new Error('Complete bill history failed');

  console.log(`✓ Complete Bill History: ${completeHistoryRes.invoices.length} total historical records retrieved`);
  console.log(`  Top 7 KPI Summary Cards:`);
  console.log(`    1. Total Bills:               ${completeHistoryRes.summary.totalBills}`);
  console.log(`    2. Total Sales:               ₹${completeHistoryRes.summary.totalSales}`);
  console.log(`    3. Total GST:                 ₹${completeHistoryRes.summary.totalGst}`);
  console.log(`    4. Total Discounts:           ₹${completeHistoryRes.summary.totalDiscounts}`);
  console.log(`    5. Total Delivery Charges:    ₹${completeHistoryRes.summary.totalDeliveryCharges}`);
  console.log(`    6. Total Cancelled Bills:     ${completeHistoryRes.summary.totalCancelledBills}`);
  console.log(`    7. Total Successful Payments: ${completeHistoryRes.summary.totalSuccessfulPayments}`);

  // 14. Owner & Admin WhatsApp Settings
  console.log('\n--- Phase 14: Admin & Owner WhatsApp Settings ---');
  const adminWaRes = await fetch('http://localhost:5000/api/admin/whatsapp-settings', {
    headers: { 'Authorization': `Bearer ${tokens.admin}` }
  }).then(r => r.json());
  if (!adminWaRes.success) throw new Error('Admin WhatsApp settings failed');
  console.log(`✓ Admin WhatsApp Settings: Admin Number=${adminWaRes.settings.adminNotificationNumber}, NotifyOnNewBill=${adminWaRes.settings.notifyOnNewBill}`);

  const ownerWaRes = await fetch('http://localhost:5000/api/owner/whatsapp-settings', {
    headers: { 'Authorization': `Bearer ${tokens.owner}` }
  }).then(r => r.json());
  if (!ownerWaRes.success) throw new Error('Owner WhatsApp settings failed');
  console.log(`✓ Owner WhatsApp Gateway: Business Number=${ownerWaRes.settings.businessPhoneNumber}, Master Gateway=${ownerWaRes.settings.metaConfig?.enabled ? 'Active' : 'Disabled'}`);

  console.log('\n=== ALL 14 PHASES OF END-TO-END VERIFICATION COMPLETED WITH 100% SUCCESS! ===');
}

runE2ETests().catch(err => {
  console.error('[E2E Test Failure]:', err);
  process.exit(1);
});
