const test = require('node:test');
const assert = require('node:assert/strict');
const SmsService = require('../services/smsService');

test('sends an OTP to the requested Indian number and accepts only provider success', async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    authKey: process.env.MSG91_AUTH_KEY,
    templateId: process.env.MSG91_TEMPLATE_ID,
    otpVariable: process.env.MSG91_OTP_VARIABLE
  };
  let request;

  process.env.MSG91_AUTH_KEY = 'test-auth-key';
  process.env.MSG91_TEMPLATE_ID = 'test-template';
  process.env.MSG91_OTP_VARIABLE = 'OTP';
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ type: 'success' }) };
  };

  try {
    const result = await SmsService.sendVerificationOtp({
      phone: '9876543210',
      otp: '804216'
    });

    assert.deepEqual(result, { accepted: true });
    assert.equal(request.url, 'https://control.msg91.com/api/v5/flow/');
    assert.equal(request.options.headers.authkey, 'test-auth-key');
    assert.deepEqual(JSON.parse(request.options.body), {
      template_id: 'test-template',
      short_url: '0',
      recipients: [{ mobiles: '919876543210', OTP: '804216' }]
    });
  } finally {
    global.fetch = originalFetch;
    if (originalEnv.authKey === undefined) delete process.env.MSG91_AUTH_KEY;
    else process.env.MSG91_AUTH_KEY = originalEnv.authKey;
    if (originalEnv.templateId === undefined) delete process.env.MSG91_TEMPLATE_ID;
    else process.env.MSG91_TEMPLATE_ID = originalEnv.templateId;
    if (originalEnv.otpVariable === undefined) delete process.env.MSG91_OTP_VARIABLE;
    else process.env.MSG91_OTP_VARIABLE = originalEnv.otpVariable;
  }
});

test('does not report success when MSG91 rejects a verification request', async () => {
  const originalFetch = global.fetch;
  const originalAuthKey = process.env.MSG91_AUTH_KEY;
  const originalTemplateId = process.env.MSG91_TEMPLATE_ID;
  process.env.MSG91_AUTH_KEY = 'test-auth-key';
  process.env.MSG91_TEMPLATE_ID = 'test-template';
  global.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ type: 'error' })
  });

  try {
    await assert.rejects(
      SmsService.sendVerificationOtp({ phone: '9876543210', otp: '804216' }),
      /SMS provider rejected the OTP request/
    );
  } finally {
    global.fetch = originalFetch;
    if (originalAuthKey === undefined) delete process.env.MSG91_AUTH_KEY;
    else process.env.MSG91_AUTH_KEY = originalAuthKey;
    if (originalTemplateId === undefined) delete process.env.MSG91_TEMPLATE_ID;
    else process.env.MSG91_TEMPLATE_ID = originalTemplateId;
  }
});
