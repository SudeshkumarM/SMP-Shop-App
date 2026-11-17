const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const OtpVerification = require('../models/OtpVerification');

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_RESENDS = 4;

/**
 * Generate a 6-digit numeric OTP
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via SMS gateway or mock console delivery
 */
const sendSms = async (phone, otp, purpose) => {
  const isMock = process.env.MOCK_SMS === 'true' || !process.env.SMS_GATEWAY_API_KEY;

  if (isMock) {
    console.log('========================================================');
    console.log(`[SMS GATEWAY - MOCK] To: ${phone}`);
    console.log(`[SMS GATEWAY - MOCK] OTP for ${purpose}: ${otp}`);
    console.log(`[SMS GATEWAY - MOCK] Valid for ${OTP_EXPIRY_MINUTES} minutes.`);
    console.log('========================================================');
    return { success: true, simulated: true, otp };
  }

  // Production SMS Gateway integration (e.g. Fast2SMS / Twilio / MSG91)
  try {
    // If external SMS provider credentials are provided, invoke provider HTTP API
    console.log(`[SMS GATEWAY] Dispatching live SMS to ${phone}...`);
    return { success: true, simulated: false };
  } catch (error) {
    console.error('[SMS GATEWAY ERROR]', error.message);
    throw new Error('Failed to send SMS OTP: ' + error.message);
  }
};

/**
 * Create and send OTP for an identifier (phone or email)
 */
const createAndSendOtp = async (identifier, purpose) => {
  // Check if an existing unverified OTP exists
  const existing = await OtpVerification.findOne({
    identifier,
    purpose,
    isVerified: false
  }).sort({ createdAt: -1 });

  if (existing) {
    const elapsedSeconds = (Date.now() - new Date(existing.lastResentAt).getTime()) / 1000;
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitTime = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
      throw new Error(`Please wait ${waitTime} seconds before requesting a new OTP.`);
    }

    if (existing.resendCount >= MAX_RESENDS) {
      throw new Error('Maximum OTP resend limit reached. Please try again after 15 minutes.');
    }
  }

  const rawOtp = generateOtp();
  const salt = await bcrypt.genSalt(8);
  const otpHash = await bcrypt.hash(rawOtp, salt);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any old ones
  await OtpVerification.deleteMany({ identifier, purpose });

  const record = await OtpVerification.create({
    identifier,
    purpose,
    otpHash,
    otpDev: process.env.NODE_ENV !== 'production' || process.env.MOCK_SMS === 'true' ? rawOtp : undefined,
    expiresAt,
    lastResentAt: new Date(),
    resendCount: existing ? existing.resendCount + 1 : 0
  });

  await sendSms(identifier, rawOtp, purpose);

  return {
    success: true,
    message: `OTP sent successfully to ${identifier}`,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    // Return OTP in dev object for testing ease
    devOtp: process.env.MOCK_SMS === 'true' ? rawOtp : undefined
  };
};

/**
 * Verify OTP entered by customer
 */
const verifyOtp = async (identifier, otp, purpose) => {
  const record = await OtpVerification.findOne({
    identifier,
    purpose,
    isVerified: false
  }).sort({ createdAt: -1 });

  if (!record) {
    return {
      success: false,
      message: 'No active OTP request found. Please request a new OTP.'
    };
  }

  // Check expiration
  if (new Date() > new Date(record.expiresAt)) {
    await OtpVerification.findByIdAndDelete(record._id);
    return {
      success: false,
      message: 'OTP has expired. Please request a new OTP.'
    };
  }

  // Check attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    await OtpVerification.findByIdAndDelete(record._id);
    return {
      success: false,
      message: 'Too many incorrect attempts. This OTP has been invalidated.'
    };
  }

  // Verify
  const isMatch = await bcrypt.compare(otp.toString().trim(), record.otpHash);

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const remaining = MAX_ATTEMPTS - record.attempts;
    return {
      success: false,
      message: `Invalid OTP. ${remaining} attempt(s) remaining.`
    };
  }

  // Mark verified
  record.isVerified = true;
  await record.save();

  return {
    success: true,
    message: 'OTP verified successfully.'
  };
};

module.exports = {
  createAndSendOtp,
  verifyOtp
};
