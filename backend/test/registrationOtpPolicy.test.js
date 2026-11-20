const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://auth-test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_auth_test';

const {
  OtpServiceError,
  createAndSendOtp,
  verifyOtp,
  consumeOtp
} = require('../services/otpService');

test('registration OTP creation, verification, and consumption are disabled', async () => {
  await assert.rejects(
    createAndSendOtp('9876543210', 'REGISTRATION', { channel: 'sms' }),
    OtpServiceError
  );
  await assert.rejects(
    verifyOtp('9876543210', '123456', 'REGISTRATION', 'sms'),
    OtpServiceError
  );
  await assert.rejects(
    consumeOtp('registration-record', 'REGISTRATION'),
    OtpServiceError
  );
});
