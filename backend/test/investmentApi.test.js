const test = require('node:test');
const assert = require('node:assert/strict');
const Investment = require('../models/Investment');
const {
  createInvestment,
  deleteInvestment,
  getInvestments,
  updateInvestment
} = require('../controllers/ownerController');

const createResponse = () => ({
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

test('creates an investment with the new question fields and legacy-compatible values', async (t) => {
  let savedData;
  t.mock.method(Investment, 'create', async (data) => {
    savedData = data;
    return { ...data, _id: 'investment-id' };
  });

  const response = createResponse();
  await createInvestment({
    body: {
      amount: '500000',
      expectedProfit: '75000',
      date: '2025-05-10',
      duration: '1–3 Years',
      expectedReturnPercentage: '15',
      purpose: 'Business Growth',
      shopId: '507f1f77bcf86cd799439011',
      notes: 'Expand the store'
    },
    user: { _id: 'user-id' }
  }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(savedData.amount, 500000);
  assert.equal(savedData.expectedProfit, 75000);
  assert.equal(savedData.date.toISOString(), '2025-05-10T00:00:00.000Z');
  assert.equal(savedData.duration, '1–3 Years');
  assert.equal(savedData.expectedReturnPercentage, 15);
  assert.equal(savedData.purpose, 'Business Growth');
  assert.equal(savedData.title, 'Investment - Business Growth');
  assert.equal(savedData.category, 'Additional Working Capital');
});

test('rejects invalid investment amounts before writing', async (t) => {
  const create = t.mock.method(Investment, 'create', async () => ({}));
  const response = createResponse();

  await createInvestment({
    body: {
      amount: '-1',
      expectedProfit: '0',
      date: '2025-05-10',
      duration: '1–3 Years',
      expectedReturnPercentage: '15',
      purpose: 'Business Growth',
      shopId: '507f1f77bcf86cd799439011'
    },
    user: { _id: 'user-id' }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(create.mock.callCount(), 0);
});

test('rejects impossible calendar dates before writing', async (t) => {
  const create = t.mock.method(Investment, 'create', async () => ({}));
  const response = createResponse();

  await createInvestment({
    body: {
      amount: '100',
      expectedProfit: '0',
      date: '2025-02-31',
      duration: '1–3 Years',
      expectedReturnPercentage: '15',
      purpose: 'Business Growth',
      shopId: '507f1f77bcf86cd799439011'
    },
    user: { _id: 'user-id' }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(create.mock.callCount(), 0);
});

test('creates separate investment identifiers for successive records', async (t) => {
  const savedRecords = [];
  t.mock.method(Investment, 'create', async (data) => {
    savedRecords.push(data);
    return data;
  });
  const body = {
    title: 'Investment',
    amount: '100',
    shopId: '507f1f77bcf86cd799439011',
    expectedProfit: '20',
    date: '2025-05-10',
    duration: '1–3 Years',
    expectedReturnPercentage: '10',
    purpose: 'Business Growth'
  };

  await createInvestment({ body, user: { _id: 'user-id' } }, createResponse());
  await createInvestment({ body: { ...body, title: 'Second investment' }, user: { _id: 'user-id' } }, createResponse());

  assert.equal(savedRecords.length, 2);
  assert.notEqual(savedRecords[0].investmentId, savedRecords[1].investmentId);
});

test('returns saved investment details through the owner investments API', async (t) => {
  const savedInvestment = {
    amount: 500000,
    expectedProfit: 75000,
    duration: '1–3 Years',
    expectedReturnPercentage: 15,
    purpose: 'Business Growth',
    notes: 'Expand the store'
  };
  const query = {
    populate() {
      return this;
    },
    sort: async () => [savedInvestment]
  };
  t.mock.method(Investment, 'find', () => query);

  const response = createResponse();
  await getInvestments({ query: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.investments[0].expectedProfit, 75000);
  assert.equal(response.body.investments[0].purpose, 'Business Growth');
  assert.equal(response.body.investments[0].notes, 'Expand the store');
});

test('updates and deletes only the selected investment record', async (t) => {
  const records = new Map([
    ['first-id', { _id: 'first-id', title: 'First investment', amount: 100, notes: 'Original' }],
    ['second-id', { _id: 'second-id', title: 'Second investment', amount: 200, notes: 'Keep unchanged' }]
  ]);
  t.mock.method(Investment, 'findByIdAndUpdate', (id, update, options) => ({
    populate: async () => {
      assert.deepEqual(options, { new: true, runValidators: true });
      const current = records.get(id);
      if (!current) return null;
      const updated = { ...current, ...update.$set };
      records.set(id, updated);
      return updated;
    }
  }));
  t.mock.method(Investment, 'findByIdAndDelete', async (id) => {
    const selected = records.get(id);
    records.delete(id);
    return selected || null;
  });

  const updateResponse = createResponse();
  await updateInvestment({
    params: { id: 'first-id' },
    body: {
      title: 'Updated first investment',
      amount: '150',
      shopId: '507f1f77bcf86cd799439011',
      expectedProfit: '30',
      date: '2025-05-10',
      duration: '1–3 Years',
      expectedReturnPercentage: '20',
      purpose: 'Business Growth',
      notes: 'Updated notes'
    }
  }, updateResponse);

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(records.get('first-id').amount, 150);
  assert.equal(records.get('second-id').amount, 200);
  assert.equal(records.get('second-id').notes, 'Keep unchanged');

  const deleteResponse = createResponse();
  await deleteInvestment({ params: { id: 'second-id' } }, deleteResponse);

  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(records.has('second-id'), false);
  assert.equal(records.has('first-id'), true);
  assert.equal(records.get('first-id').title, 'Updated first investment');
});
