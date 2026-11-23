const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCategoryFilter } = require('../controllers/productController');

test('ALL categories does not filter categories by status', () => {
  assert.deepEqual(buildCategoryFilter('', 'ALL'), { filter: {} });
});

test('category search composes with active and inactive status filters', () => {
  const active = buildCategoryFilter('shirt', 'ACTIVE').filter;
  const inactive = buildCategoryFilter('shirt', 'INACTIVE').filter;

  assert.equal(active.$and[0].$or[0].status.test('ACTIVE'), true);
  assert.equal(active.$and[1].$or[0].name.$regex, 'shirt');
  assert.equal(inactive.$and[0].$or[0].status.test('INACTIVE'), true);
  assert.equal(inactive.$and[1].$or[0].name.$regex, 'shirt');
});

test('invalid category status is rejected and search input is treated literally', () => {
  assert.equal(buildCategoryFilter('', 'unknown').error, 'Status must be ALL, ACTIVE, or INACTIVE.');
  const filter = buildCategoryFilter('shirt.*', 'ALL').filter;
  assert.equal(filter.$or[0].name.$regex, 'shirt\\.\\*');
});
