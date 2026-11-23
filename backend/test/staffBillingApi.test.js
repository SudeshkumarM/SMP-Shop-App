const test = require('node:test');
const assert = require('node:assert/strict');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Shop = require('../models/Shop');
const Branch = require('../models/Branch');
const QRCode = require('../models/QRCode');
const ScannerSettings = require('../models/ScannerSettings');
const WhatsAppService = require('../services/whatsappService');
const { getScannerSettings } = require('../controllers/scannerController');
const { scannerFeatureEnabled } = require('../middleware/scannerFeatureMiddleware');
const {
  getBillingPaymentQrs,
  lookupProductPOS,
  createBillingTransaction,
  updateBill,
  deleteBill
} = require('../controllers/billingController');
const billingRoutes = require('../routes/billingRoutes');

const shopId = '507f1f77bcf86cd799439011';
const staffId = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439013';
const productId = '507f1f77bcf86cd799439014';
const paymentQrId = '507f1f77bcf86cd799439015';
const invoiceId = '507f1f77bcf86cd799439016';
const orderId = '507f1f77bcf86cd799439017';

const makeQuery = (value) => {
  const query = {
    session() { return query; },
    select() { return query; },
    sort() { return query; },
    lean() { return Promise.resolve(value); },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); }
  };
  return query;
};

const makeSession = () => ({
  async withTransaction(callback) {
    return callback();
  },
  async endSession() {}
});

const withModelStubs = async (stubs, callback) => {
  const originals = stubs.map(([model, method, replacement]) => {
    const original = model[method];
    model[method] = replacement;
    return [model, method, original];
  });
  try {
    await callback();
  } finally {
    originals.forEach(([model, method, original]) => {
      model[method] = original;
    });
  }
};

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('only Admins and Owners can edit or permanently delete bills', async () => {
  const updateRouteLayer = billingRoutes.stack.find((layer) => (
    layer.route?.path === '/invoice/:id' && layer.route.methods.put
  ));
  assert.ok(updateRouteLayer, 'update invoice route should be registered');

  const deleteRouteLayer = billingRoutes.stack.find((layer) => (
    layer.route?.path === '/invoice/:id' && layer.route.methods.delete
  ));
  assert.ok(deleteRouteLayer, 'delete invoice route should be registered');

  const updateGuard = updateRouteLayer.route.stack[0].handle;
  const deleteGuard = deleteRouteLayer.route.stack[0].handle;
  for (const role of ['staff']) {
    for (const guard of [updateGuard, deleteGuard]) {
      let nextCalled = false;
      const response = makeResponse();
      guard({ user: { role } }, response, () => { nextCalled = true; });
      assert.equal(response.statusCode, 403);
      assert.equal(response.body.message, 'Only Admin or Owner users can edit or delete bills.');
      assert.equal(nextCalled, false);
    }

    for (const controller of [updateBill, deleteBill]) {
      const controllerResponse = makeResponse();
      await controller({
        user: { role },
        params: { id: invoiceId },
        body: { reason: 'Test', items: [] }
      }, controllerResponse);
      assert.equal(controllerResponse.statusCode, 403);
    }
  }

  for (const role of ['admin', 'owner']) {
    for (const guard of [updateGuard, deleteGuard]) {
      let nextCalled = false;
      guard({ user: { role } }, makeResponse(), () => { nextCalled = true; });
      assert.equal(nextCalled, true);
    }
  }

  await withModelStubs([
    [Invoice, 'findById', () => makeQuery(null)],
    [Invoice, 'startSession', async () => makeSession()]
  ], async () => {
    for (const role of ['admin', 'owner']) {
      const controllerResponse = makeResponse();
      await deleteBill({
        user: { _id: userId, role },
        params: { id: invoiceId },
        body: { reason: 'Test' }
      }, controllerResponse);
      assert.equal(controllerResponse.statusCode, 404);
      assert.equal(controllerResponse.body.message, 'Invoice not found');

      const updateResponse = makeResponse();
      await updateBill({
        user: { _id: userId, role },
        params: { id: invoiceId },
        body: { reason: 'Test', items: [] }
      }, updateResponse);
      assert.equal(updateResponse.statusCode, 404);
      assert.equal(updateResponse.body.message, 'Invoice not found or deleted');
    }
  });
});

test('Owner can manage bills across shops while Admin access stays shop-scoped', async () => {
  const invoice = {
    shopId: '507f1f77bcf86cd799439099',
    invoiceNumber: 'SMP-INV-TEST',
    isDeleted: false,
    items: [],
    customerInfo: {},
    editHistory: [],
    orderId: null,
    async save() {}
  };

  await withModelStubs([
    [Invoice, 'findById', () => makeQuery(invoice)],
    [Invoice, 'findByIdAndDelete', async () => invoice],
    [Invoice, 'startSession', async () => makeSession()]
  ], async () => {
    const adminUpdateResponse = makeResponse();
    await updateBill({
      user: { _id: userId, role: 'admin', shopId },
      params: { id: invoiceId },
      body: { items: [], reason: 'Admin scope test' }
    }, adminUpdateResponse);
    assert.equal(adminUpdateResponse.statusCode, 403);

    const ownerUpdateResponse = makeResponse();
    await updateBill({
      user: { _id: userId, role: 'owner' },
      params: { id: invoiceId },
      body: { items: [], reason: 'Owner scope test' }
    }, ownerUpdateResponse);
    assert.equal(ownerUpdateResponse.statusCode, 200);

    const adminDeleteResponse = makeResponse();
    await deleteBill({
      user: { _id: userId, role: 'admin', shopId },
      params: { id: invoiceId },
      body: { reason: 'Admin scope test' }
    }, adminDeleteResponse);
    assert.equal(adminDeleteResponse.statusCode, 403);

    const ownerDeleteResponse = makeResponse();
    await deleteBill({
      user: { _id: userId, role: 'owner' },
      params: { id: invoiceId },
      body: { reason: 'Owner scope test' }
    }, ownerDeleteResponse);
    assert.equal(ownerDeleteResponse.statusCode, 200);
    assert.match(ownerDeleteResponse.body.message, /permanently deleted/i);
  });
});

test('permanent bill deletion restores active stock and deletes atomically', async () => {
  let productRestores = 0;
  let inventoryRestores = 0;
  let orderCancellations = 0;
  let invoiceDeletes = 0;
  const session = makeSession();
  const invoice = {
    shopId,
    invoiceNumber: 'SMP-INV-STOCK',
    isDeleted: false,
    items: [{ productId, quantity: 2 }],
    orderId,
    async save() {}
  };

  await withModelStubs([
    [Invoice, 'startSession', async () => session],
    [Invoice, 'findById', () => makeQuery(invoice)],
    [Invoice, 'findByIdAndDelete', async (_id, options) => {
      assert.equal(options.session, session);
      invoiceDeletes++;
      return invoice;
    }],
    [Product, 'findByIdAndUpdate', async (_id, update, options) => {
      assert.equal(options.session, session);
      assert.equal(update.$inc.availableQuantity, 2);
      productRestores++;
    }],
    [Inventory, 'findOneAndUpdate', async (_filter, update, options) => {
      assert.equal(options.session, session);
      assert.equal(update.$inc.currentStock, 2);
      inventoryRestores++;
    }],
    [Order, 'findByIdAndUpdate', async (_id, update, options) => {
      assert.equal(options.session, session);
      assert.deepEqual(update, { orderStatus: 'CANCELLED', paymentStatus: 'REFUNDED' });
      orderCancellations++;
    }]
  ], async () => {
    const response = makeResponse();
    await deleteBill({
      user: { _id: userId, role: 'owner' },
      params: { id: invoiceId },
      body: { reason: 'Duplicate invoice' }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(productRestores, 1);
    assert.equal(inventoryRestores, 1);
    assert.equal(orderCancellations, 1);
    assert.equal(invoiceDeletes, 1);
  });
});

test('permanently deleting a previously cancelled bill does not restore stock twice', async () => {
  let stockUpdates = 0;
  const invoice = {
    shopId,
    invoiceNumber: 'SMP-INV-CANCELLED',
    isDeleted: true,
    items: [{ productId, quantity: 3 }],
    orderId
  };

  await withModelStubs([
    [Invoice, 'startSession', async () => makeSession()],
    [Invoice, 'findById', () => makeQuery(invoice)],
    [Invoice, 'findByIdAndDelete', async () => invoice],
    [Product, 'findByIdAndUpdate', async () => { stockUpdates++; }],
    [Inventory, 'findOneAndUpdate', async () => { stockUpdates++; }],
    [Order, 'findByIdAndUpdate', async () => { stockUpdates++; }]
  ], async () => {
    const response = makeResponse();
    await deleteBill({
      user: { _id: userId, role: 'owner' },
      params: { id: invoiceId },
      body: { reason: 'Remove prior cancellation record' }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(stockUpdates, 0);
  });
});

const shop = {
  _id: shopId,
  name: 'SMP Test Shop',
  settings: {
    gstSettings: { enabled: false },
    deliverySettings: { enabled: false },
    invoicePrefix: 'SMP'
  },
  address: {},
  contactPhone: '',
  contactEmail: '',
  gstNumber: ''
};

const staff = {
  _id: staffId,
  shopId,
  branchId: null,
  fullName: 'Test Cashier',
  staffId: 'STF-TEST',
  totalBillsGenerated: 0,
  totalSalesValue: 0,
  async save() {}
};

const user = { _id: userId, role: 'staff', shopId };

const contextStubs = [
  [Staff, 'findOne', () => makeQuery(staff)],
  [Shop, 'findOne', () => makeQuery(shop)]
];

test('payment QR settings only return active QR codes belonging to the cashier shop', async () => {
  let queriedFilter;
  const paymentQrs = [
    { _id: paymentQrId, title: 'Counter UPI', qrData: 'upi://pay?pa=shop@upi', imageUrl: '/uploads/owner-qr.png' },
    { _id: 'bad-image', title: 'Invalid legacy image', qrData: '', imageUrl: 'javascript:alert(1)' }
  ];
  await withModelStubs([
    ...contextStubs,
    [QRCode, 'find', (filter) => {
      queriedFilter = filter;
      return {
        select() { return this; },
        sort() { return this; },
        lean: async () => paymentQrs
      };
    }]
  ], async () => {
    const response = makeResponse();
    await getBillingPaymentQrs({ user }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.shopName, shop.name);
    assert.deepEqual(queriedFilter, { shopId, qrType: 'PAYMENT', status: 'ACTIVE' });
    assert.equal(response.body.paymentQrs.length, 1);
    assert.equal(response.body.paymentQrs[0].imageUrl, '/uploads/owner-qr.png');
    assert.equal(response.body.paymentQrs[0].qrData, 'upi://pay?pa=shop@upi');
  });
});

test('barcode lookup is exact, active, and scoped to the cashier shop', async () => {
  let queriedFilter;
  const savedProduct = {
    _id: productId,
    name: 'Saved Product',
    sku: 'SKU-001',
    barcode: '8900000000012',
    sellingPrice: 125,
    availableQuantity: 4
  };
  await withModelStubs([
    ...contextStubs,
    [Product, 'findOne', (filter) => {
      queriedFilter = filter;
      return {
        select() { return this; },
        lean: async () => savedProduct
      };
    }]
  ], async () => {
    const response = makeResponse();
    await lookupProductPOS({ user, params: { code: '8900000000012' } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.product, savedProduct);
    assert.equal(queriedFilter.shopId, shopId);
    assert.equal(queriedFilter.isActive, true);
    assert.deepEqual(queriedFilter.$or, [
      { barcode: { $regex: '^8900000000012$', $options: 'i' } },
      { sku: '8900000000012' },
      { qrCodeData: '8900000000012' }
    ]);
  });
});

test('staff scanner settings resolve the shop from the active staff profile', async () => {
  let queriedShopId;
  await withModelStubs([
    [Staff, 'findOne', () => makeQuery({ shopId })],
    [Shop, 'findOne', () => {
      throw new Error('Staff shop assignment should be used instead of the default shop.');
    }],
    [ScannerSettings, 'findOne', (filter) => {
      queriedShopId = filter.shopId;
      return Promise.resolve({ shopId, scannerActivated: true });
    }]
  ], async () => {
    const response = makeResponse();
    await getScannerSettings({ user: { _id: userId, role: 'staff' } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.settings.scannerActivated, true);
    assert.equal(queriedShopId, shopId);
  });
});

test('scanner feature enforcement checks the same staff-assigned shop', async () => {
  let queriedShopId;
  let nextCalled = false;
  await withModelStubs([
    [Staff, 'findOne', () => makeQuery({ shopId })],
    [Shop, 'findOne', () => {
      throw new Error('Staff shop assignment should be used instead of the default shop.');
    }],
    [ScannerSettings, 'findOne', (filter) => {
      queriedShopId = filter.shopId;
      return {
        select() { return this; },
        lean: async () => ({ scannerActivated: false })
      };
    }]
  ], async () => {
    const response = makeResponse();
    await scannerFeatureEnabled(
      { user: { _id: userId, role: 'staff' } },
      response,
      () => { nextCalled = true; }
    );

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.code, 'SCANNER_SYSTEM_DISABLED');
    assert.equal(queriedShopId, shopId);
    assert.equal(nextCalled, false);
  });
});

test('verified QR billing persists payment details and rejects unverified or stale-total attempts', async () => {
  const product = {
    _id: productId,
    name: 'Saved Product',
    sku: 'SKU-001',
    barcode: '8900000000012',
    sellingPrice: 100,
    gstPercent: 5,
    costPrice: 60,
    sizes: [],
    colours: [],
    availableQuantity: 5
  };
  const qr = {
    _id: paymentQrId,
    shopId,
    qrType: 'PAYMENT',
    status: 'ACTIVE',
    title: 'Owner UPI',
    imageUrl: '/uploads/owner-qr.png',
    qrData: 'upi://pay?pa=shop@upi'
  };
  let savedInvoice;
  let savedOrder;
  let stockUpdates = 0;
  let invoiceCreates = 0;
  let orderCreates = 0;
  const session = {
    withTransaction: async (callback) => callback(),
    async endSession() {}
  };
  const stubs = [
    ...contextStubs,
    [QRCode, 'findOne', () => makeQuery(qr)],
    [Product, 'find', () => makeQuery([product])],
    [Product, 'findOneAndUpdate', async () => {
      stockUpdates += 1;
      return { ...product, availableQuantity: 4 };
    }],
    [Inventory, 'findOne', () => makeQuery(null)],
    [Inventory, 'create', async (documents) => documents],
    [Customer, 'findOne', () => makeQuery(null)],
    [Invoice, 'startSession', async () => session],
    [Invoice, 'findOne', () => makeQuery(null)],
    [Invoice, 'countDocuments', () => makeQuery(0)],
    [Order, 'create', async (documents) => {
      orderCreates += 1;
      savedOrder = { _id: orderId, ...documents[0] };
      return [savedOrder];
    }],
    [Invoice, 'create', async (documents) => {
      invoiceCreates += 1;
      savedInvoice = { _id: invoiceId, deliveryStatus: 'PENDING', ...documents[0] };
      return [savedInvoice];
    }],
    [WhatsAppService, 'sendBillNotificationWithFallback', async () => null]
  ];

  await withModelStubs(stubs, async () => {
    const response = makeResponse();
    await createBillingTransaction({
      user,
      app: null,
      body: {
        requestId: 'request-qr-12345',
        items: [{ productId, quantity: 1 }],
        customerName: 'Test Customer',
        customerPhone: '9876543210',
        paymentMethod: 'POS_UPI_QR',
        expectedGrandTotal: 100,
        paymentConfirmed: true,
        paymentReference: 'UTR-TEST-123',
        paymentQrId
      }
    }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(savedInvoice.paymentStatus, 'PAID');
    assert.equal(savedInvoice.paymentMethod, 'POS_UPI_QR');
    assert.equal(savedInvoice.paymentDetails.amount, 100);
    assert.equal(savedInvoice.paymentDetails.transactionRef, 'UTR-TEST-123');
    assert.equal(String(savedInvoice.paymentDetails.paymentQrId), paymentQrId);
    assert.equal(savedInvoice.paymentDetails.paymentQrTitle, 'Owner UPI');
    assert.equal(savedOrder.paymentDetails.amount, 100);
    assert.equal(savedOrder.paymentDetails.transactionRef, 'UTR-TEST-123');

    const unverifiedResponse = makeResponse();
    await createBillingTransaction({
      user,
      body: {
        requestId: 'request-qr-failed1',
        items: [{ productId, quantity: 1 }],
        customerName: 'Test Customer',
        customerPhone: '9876543210',
        paymentMethod: 'POS_UPI_QR',
        expectedGrandTotal: 100,
        paymentConfirmed: false,
        paymentReference: 'UTR-TEST-456',
        paymentQrId
      }
    }, unverifiedResponse);
    assert.equal(unverifiedResponse.statusCode, 400);
    assert.equal(unverifiedResponse.body.success, false);

    const changedTotalResponse = makeResponse();
    await createBillingTransaction({
      user,
      body: {
        requestId: 'request-qr-stale01',
        items: [{ productId, quantity: 1 }],
        customerName: 'Test Customer',
        customerPhone: '9876543210',
        paymentMethod: 'POS_UPI_QR',
        expectedGrandTotal: 99,
        paymentConfirmed: true,
        paymentReference: 'UTR-TEST-789',
        paymentQrId
      }
    }, changedTotalResponse);
    assert.equal(changedTotalResponse.statusCode, 409);
    assert.equal(changedTotalResponse.body.success, false);
    assert.equal(stockUpdates, 1);
    assert.equal(invoiceCreates, 1);
    assert.equal(orderCreates, 1);
  });
});

test('repeat billing request returns the saved invoice without creating another bill', async () => {
  let orderCreateCalls = 0;
  let invoiceCreateCalls = 0;
  const savedInvoice = {
    _id: invoiceId,
    requestId: `${userId}:request-qr-12345`,
    orderId,
    grandTotal: 100
  };
  const savedOrder = { _id: orderId };
  const session = {
    withTransaction: async (callback) => callback(),
    async endSession() {}
  };
  await withModelStubs([
    [Invoice, 'startSession', async () => session],
    [Invoice, 'findOne', () => makeQuery(savedInvoice)],
    [Invoice, 'create', async () => {
      invoiceCreateCalls += 1;
      return [];
    }],
    [Order, 'findById', () => makeQuery(savedOrder)],
    [Order, 'create', async () => {
      orderCreateCalls += 1;
      return [];
    }]
  ], async () => {
    const response = makeResponse();
    await createBillingTransaction({
      user,
      body: {
        requestId: 'request-qr-12345',
        items: [{ productId, quantity: 1 }],
        customerName: 'Test Customer',
        customerPhone: '9876543210',
        paymentMethod: 'POS_CASH',
        expectedGrandTotal: 100,
        amountReceived: 100
      }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.duplicate, true);
    assert.equal(orderCreateCalls, 0);
    assert.equal(invoiceCreateCalls, 0);
  });
});

test('cash payment saves exact and excess receipts with correct change and rejects underpayment', async () => {
  const product = {
    _id: productId,
    name: 'Saved Product',
    sku: 'SKU-001',
    barcode: '8900000000012',
    sellingPrice: 100,
    gstPercent: 5,
    costPrice: 60,
    sizes: [],
    colours: [],
    availableQuantity: 5
  };
  const session = {
    withTransaction: async (callback) => callback(),
    async endSession() {}
  };
  const invoices = [];
  const orders = [];
  let stockUpdates = 0;
  const stubs = [
    ...contextStubs,
    [Product, 'find', () => makeQuery([product])],
    [Product, 'findOneAndUpdate', async () => {
      stockUpdates += 1;
      return { ...product, availableQuantity: 5 - stockUpdates };
    }],
    [Inventory, 'findOne', () => makeQuery(null)],
    [Inventory, 'create', async (documents) => documents],
    [Customer, 'findOne', () => makeQuery(null)],
    [Invoice, 'startSession', async () => session],
    [Invoice, 'findOne', () => makeQuery(null)],
    [Invoice, 'countDocuments', () => makeQuery(0)],
    [Order, 'create', async (documents) => {
      const order = { _id: orderId, ...documents[0] };
      orders.push(order);
      return [order];
    }],
    [Invoice, 'create', async (documents) => {
      const invoice = { _id: invoiceId, deliveryStatus: 'PENDING', ...documents[0] };
      invoices.push(invoice);
      return [invoice];
    }],
    [WhatsAppService, 'sendBillNotificationWithFallback', async () => null]
  ];

  await withModelStubs(stubs, async () => {
    for (const [requestId, amountReceived, expectedChange] of [
      ['cash-exact-123', 100, 0],
      ['cash-excess-123', 150, 50]
    ]) {
      const response = makeResponse();
      await createBillingTransaction({
        user,
        body: {
          requestId,
          items: [{ productId, quantity: 1 }],
          customerName: 'Cash Customer',
          customerPhone: '9876543210',
          paymentMethod: 'POS_CASH',
          expectedGrandTotal: 100,
          amountReceived
        }
      }, response);

      assert.equal(response.statusCode, 201);
      assert.equal(response.body.success, true);
      const savedInvoice = invoices[invoices.length - 1];
      const savedOrder = orders[orders.length - 1];
      assert.equal(savedInvoice.paymentStatus, 'PAID');
      assert.equal(savedInvoice.paymentDetails.amount, 100);
      assert.equal(savedInvoice.paymentDetails.amountReceived, amountReceived);
      assert.equal(savedInvoice.paymentDetails.changeDue, expectedChange);
      assert.equal(savedOrder.paymentDetails.amountReceived, amountReceived);
      assert.equal(savedOrder.paymentDetails.changeDue, expectedChange);
    }

    const underpaidResponse = makeResponse();
    await createBillingTransaction({
      user,
      body: {
        requestId: 'cash-short-1234',
        items: [{ productId, quantity: 1 }],
        customerName: 'Cash Customer',
        customerPhone: '9876543210',
        paymentMethod: 'POS_CASH',
        expectedGrandTotal: 100,
        amountReceived: 99
      }
    }, underpaidResponse);

    assert.equal(underpaidResponse.statusCode, 400);
    assert.equal(underpaidResponse.body.success, false);
    assert.equal(invoices.length, 2);
    assert.equal(orders.length, 2);
    assert.equal(stockUpdates, 2);
  });
});
