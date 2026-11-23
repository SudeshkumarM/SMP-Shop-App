const crypto = require('crypto');
const mongoose = require('mongoose');
const SmsService = require('./smsService');
const { sendAuthVerificationCode } = require('./emailService');
const { normalizeEmail, normalizeIndianMobile } = require('../utils/authValidation');
const OtpVerification = require('../models/OtpVerification');

const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESEND_LIMIT = 5;
const MAX_ATTEMPTS = 5;

class OtpServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'OtpServiceError';
    this.statusCode = statusCode;
  }
}

const hashOtp = (identifier, purpose, otp) => {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || process.env.CAPTCHA_HASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new OtpServiceError('OTP verification is not configured.', 503);
  }

  return crypto
    .createHmac('sha256', secret)
    .update(`${purpose}:${identifier}:${otp}`)
    .digest('hex');
};

const normalizeIdentifier = (identifier, channel) => {
  if (channel === 'email') return normalizeEmail(identifier);
  return normalizeIndianMobile(identifier);
};

const sendOtp = async (identifier, channel, otp) => {
  if (channel === 'sms') {
    return SmsService.sendVerificationOtp({ phone: identifier, otp });
  }
  return sendAuthVerificationCode({ to: identifier, code: otp });
};

const createAndSendOtp = async (
  identifier,
  purpose,
  { channel } = {}
) => {
  const normalizedIdentifier = normalizeIdentifier(identifier, channel);
  if (!normalizedIdentifier) {
    throw new OtpServiceError(`A valid ${channel === 'email' ? 'email address' : 'mobile number'} is required.`);
  }
  if (!['FORGOT_PASSWORD', 'EMAIL_VERIFICATION'].includes(purpose)) {
    throw new OtpServiceError('Unsupported verification request.');
  }
  if (!['sms', 'email'].includes(channel)) {
    throw new OtpServiceError('Choose a valid recovery method.');
  }

  // Check for existing active OTP and enforce cooldown/resend limits
  const existingRecord = await OtpVerification.findOne({
    identifier: normalizedIdentifier,
    purpose,
    expiresAt: { $gt: new Date() }
  });

  if (existingRecord) {
    // Check resend cooldown
    const timeSinceLastResend = Date.now() - existingRecord.lastResentAt.getTime();
    if (timeSinceLastResend < RESEND_COOLDOWN_SECONDS * 1000) {
      const remainingCooldown = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - timeSinceLastResend) / 1000);
      throw new OtpServiceError(`Please wait ${remainingCooldown} seconds before requesting another code.`, 429);
    }

    // Check resend limit
    if (existingRecord.resendCount >= MAX_RESEND_LIMIT) {
      throw new OtpServiceError('Maximum resend limit reached. Try again after the code expires.', 429);
    }

    // Update existing record
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(normalizedIdentifier, purpose, otp);

    existingRecord.otpHash = otpHash;
    existingRecord.attempts = 0;
    existingRecord.isVerified = false;
    existingRecord.expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
    existingRecord.resendCount += 1;
    existingRecord.lastResentAt = new Date();
    await existingRecord.save();

    try {
      await sendOtp(normalizedIdentifier, channel, otp);
    } catch (error) {
      // Rollback on send failure
      existingRecord.resendCount -= 1;
      await existingRecord.save();
      console.error(`[Auth OTP] ${channel.toUpperCase()} provider rejected verification request.`);
      throw new OtpServiceError(
        channel === 'sms'
          ? 'Unable to send SMS at this time. Check provider configuration and try again.'
          : 'Unable to send email at this time. Check email provider configuration and try again.',
        502
      );
    }

    return {
      success: true,
      otpId: String(existingRecord._id),
      otp,
      identifier: normalizedIdentifier,
      channel,
      expiresInSeconds: OTP_EXPIRY_SECONDS
    };
  }

  // Create new OTP record
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(normalizedIdentifier, purpose, otp);

  const mongoRecord = await OtpVerification.create({
    identifier: normalizedIdentifier,
    purpose,
    otpHash,
    attempts: 0,
    resendCount: 0,
    lastResentAt: new Date(),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
    isVerified: false
  });

  try {
    await sendOtp(normalizedIdentifier, channel, otp);
  } catch (error) {
    // Delete record on send failure
    await OtpVerification.findByIdAndDelete(mongoRecord._id);
    console.error(`[Auth OTP] ${channel.toUpperCase()} provider rejected verification request.`);
    throw new OtpServiceError(
      channel === 'sms'
        ? 'Unable to send SMS at this time. Check provider configuration and try again.'
        : 'Unable to send email at this time. Check email provider configuration and try again.',
      502
    );
  }

  return {
    success: true,
    otpId: String(mongoRecord._id),
    otp,
    identifier: normalizedIdentifier,
    channel,
    expiresInSeconds: OTP_EXPIRY_SECONDS
  };
};

const verifyOtp = async (identifier, otp, purpose, channel) => {
  if (!['FORGOT_PASSWORD', 'EMAIL_VERIFICATION'].includes(purpose)) {
    throw new OtpServiceError('Unsupported verification request.');
  }
  const normalizedIdentifier = normalizeIdentifier(identifier, channel);
  if (!normalizedIdentifier || !/^\d{6}$/.test(String(otp || ''))) {
    return { success: false, message: 'Enter the 6-digit verification code.' };
  }

  const suppliedHash = hashOtp(normalizedIdentifier, purpose, String(otp));
  const mongoRecord = await OtpVerification.findOne({
    identifier: normalizedIdentifier,
    purpose,
    expiresAt: { $gt: new Date() },
    isVerified: false
  });

  if (!mongoRecord) {
    return { success: false, message: 'No active verification request was found. Request a new code.' };
  }

  if (mongoRecord.attempts >= MAX_ATTEMPTS) {
    return { success: false, message: 'Too many incorrect attempts. Request a new code.' };
  }

  if (mongoRecord.otpHash !== suppliedHash) {
    mongoRecord.attempts += 1;
    await mongoRecord.save();
    return { success: false, message: 'The verification code is incorrect.' };
  }

  return {
    success: true,
    otpId: String(mongoRecord._id)
  };
};

const consumeOtp = async (otpId, purpose) => {
  if (!['FORGOT_PASSWORD', 'EMAIL_VERIFICATION'].includes(purpose)) {
    throw new OtpServiceError('Unsupported verification request.');
  }

  await OtpVerification.findByIdAndUpdate(otpId, { isVerified: true });
};

module.exports = {
  OtpServiceError,
  createAndSendOtp,
  verifyOtp,
  consumeOtp
};
