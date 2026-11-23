const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePosBill } = require('../utils/billingCalculations');

const product = {
  _id: 'product-1',
  name: 'Coffee',
  sku: 'COFFEE-01',
  barcode: '8900000000012',
  sellingPrice: 100,
  gstPercent: 5,
  costPrice: 60
};

test('POS totals use saved product price and tax, not client line values', () => {
  const bill = calculatePosBill({
    items: [{ productId: product._id, quantity: 2, unitPrice: 0.01, gstPercent: 99 }],
    productsById: new Map([[product._id, product]])
  });

  assert.equal(bill.subtotal, 200);
  assert.equal(bill.totalGst, 10);
  assert.equal(bill.grandTotal, 210);
  assert.equal(bill.billItems[0].unitPrice, 100);
});

test('POS rejects zero, negative, and fractional quantities', () => {
  for (const quantity of [0, -1, 1.5]) {
    assert.throws(() => calculatePosBill({
      items: [{ productId: product._id, quantity }],
      productsById: new Map([[product._id, product]])
    }), { statusCode: 400 });
  }
});

test('POS rejects discounts above the saved-price subtotal', () => {
  assert.throws(() => calculatePosBill({
    items: [{ productId: product._id, quantity: 1 }],
    productsById: new Map([[product._id, product]]),
    discountType: 'flat',
    discountValue: 101
  }), { statusCode: 400 });
});

test('POS distributes rounded discounts without negative item discounts', () => {
  const bill = calculatePosBill({
    items: [
      { productId: product._id, quantity: 1 },
      { productId: product._id, quantity: 1 },
      { productId: product._id, quantity: 1 }
    ],
    productsById: new Map([[product._id, product]]),
    discountType: 'flat',
    discountValue: 1
  });

  assert.equal(bill.billItems.reduce((sum, item) => sum + item.discountAmount, 0), 1);
  assert.ok(bill.billItems.every((item) => item.discountAmount >= 0));
});

test('POS can calculate tax-free sales without restoring the default GST rate', () => {
  const bill = calculatePosBill({
    items: [{ productId: product._id, quantity: 1 }],
    productsById: new Map([[product._id, product]]),
    gstEnabled: false
  });

  assert.equal(bill.totalGst, 0);
  assert.equal(bill.grandTotal, 100);
});
