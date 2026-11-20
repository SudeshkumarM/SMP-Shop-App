const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeIndianMobile,
  validateRegistration
} = require('../utils/authValidation');

const validRegistration = {
  fullName: 'Sample Customer',
  username: 'sample_customer',
  email: 'sample@example.test',
  phone: '9876543210',
  password: 'StrongPass123'
};

test('accepts a valid registration and normalizes Indian phone input', () => {
  const result = validateRegistration({
    ...validRegistration,
    email: ' SAMPLE@example.test ',
    username: 'Sample_Customer',
    phone: '+91 98765 43210'
  });

  assert.equal(result.error, undefined);
  assert.equal(result.value.email, 'sample@example.test');
  assert.equal(result.value.username, 'sample_customer');
  assert.equal(result.value.phone, '9876543210');
  assert.equal(normalizeIndianMobile('+91 98765 43210'), '9876543210');
});

test('rejects invalid email, username, mobile number, and weak password', () => {
  const cases = [
    { ...validRegistration, email: 'not-an-email' },
    { ...validRegistration, username: 'x' },
    { ...validRegistration, phone: '1234567890' },
    { ...validRegistration, password: 'weakpass' }
  ];

  for (const registration of cases) {
    assert.ok(validateRegistration(registration).error);
  }
});
