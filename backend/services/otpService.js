const crypto = require('crypto');
const mongoose = require('mongoose');
const { supabase } = require('../config/supabase');
const SmsService = require('./smsService');
const { sendAuthVerificationCode } = require('./emailService');
const { normalizeEmail, normalizeIndianMobile } = require('../utils/authValidation');
const OtpVerification = require('../models/OtpVerification');

const TABLE = 'auth_otp_verifications';
const OTP_EXPIRY_SECONDS = 5 * 60;

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
  if (purpose !== 'FORGOT_PASSWORD') {
    throw new OtpServiceError('Unsupported verification request.');
  }
  if (!['sms', 'email'].includes(channel)) {
    throw new OtpServiceError('Choose a valid recovery method.');
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(normalizedIdentifier, purpose, otp);

  let otpId = null;
  let useMongoFallback = false;

  try {
    const { data, error: createError } = await supabase.rpc('begin_auth_otp', {
      p_identifier: normalizedIdentifier,
      p_purpose: purpose,
      p_channel: channel,
      p_otp_hash: otpHash,
      p_password_hash: null,
      p_registration_payload: null
    });

    if (createError) {
      if (
        createError.code === '42P01' ||
        createError.code === 'PGRST202' ||
        createError.message?.includes('does not exist')
      ) {
        useMongoFallback = true;
      } else {
        const cooldown = createError.message?.match(/OTP_RESEND_COOLDOWN:(\d+)/);
        if (cooldown) {
          throw new OtpServiceError(`Please wait ${cooldown[1]} seconds before requesting another code.`, 429);
        }
        if (createError.message?.includes('OTP_RESEND_LIMIT')) {
          throw new OtpServiceError('Maximum resend limit reached. Try again after the code expires.', 429);
        }
        console.error(`[Auth OTP] Could not create verification request (${createError.code || 'database error'}).`);
        useMongoFallback = true;
      }
    } else {
      otpId = data;
    }
  } catch (err) {
    if (err instanceof OtpServiceError) throw err;
    useMongoFallback = true;
  }

  if (useMongoFallback) {
    const mongoRecord = await OtpVerification.findOneAndUpdate(
      { identifier: normalizedIdentifier, purpose },
      {
        identifier: normalizedIdentifier,
        purpose,
        otpHash,
        attempts: 0,
        isVerified: false,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000)
      },
      { upsert: true, new: true }
    );
    otpId = String(mongoRecord._id);
  }

  try {
    await sendOtp(normalizedIdentifier, channel, otp);
  } catch (error) {
    if (!useMongoFallback && otpId) {
      await supabase
        .from(TABLE)
        .update({
          verification_status: 'expired',
          otp_hash: '0'.repeat(64),
          password_hash: null,
          registration_payload: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', otpId);
    } else if (otpId && mongoose.Types.ObjectId.isValid(otpId)) {
      await OtpVerification.findByIdAndDelete(otpId);
    }

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
    otpId,
    otp, // Available for development/testing if needed
    identifier: normalizedIdentifier,
    channel,
    expiresInSeconds: OTP_EXPIRY_SECONDS
  };
};

const verifyOtp = async (identifier, otp, purpose, channel) => {
  if (purpose !== 'FORGOT_PASSWORD') {
    throw new OtpServiceError('Unsupported verification request.');
  }
  const normalizedIdentifier = normalizeIdentifier(identifier, channel);
  if (!normalizedIdentifier || !/^\d{6}$/.test(String(otp || ''))) {
    return { success: false, message: 'Enter the 6-digit verification code.' };
  }

  let record = null;
  let useMongoFallback = false;

  try {
    const { data, error: lookupError } = await supabase
      .from(TABLE)
      .select('id, channel, otp_hash, verification_status, expires_at')
      .eq('identifier', normalizedIdentifier)
      .eq('purpose', purpose)
      .maybeSingle();

    if (lookupError) {
      if (lookupError.code === '42P01' || lookupError.message?.includes('does not exist')) {
        useMongoFallback = true;
      } else {
        useMongoFallback = true;
      }
    } else if (!data) {
      useMongoFallback = true;
    } else {
      record = data;
    }
  } catch (err) {
    if (err instanceof OtpServiceError) throw err;
    useMongoFallback = true;
  }

  if (useMongoFallback) {
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
    if (mongoRecord.attempts >= 5) {
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
  }

  if (record.channel !== channel) {
    return { success: false, message: 'Choose the same recovery method used to request the code.' };
  }

  const suppliedHash = hashOtp(normalizedIdentifier, purpose, String(otp));
  const { data: verificationStatus, error: verifyError } = await supabase.rpc('verify_auth_otp', {
    p_otp_id: record.id,
    p_otp_hash: suppliedHash
  });

  if (verifyError) {
    console.error(`[Auth OTP] Could not verify code (${verifyError.code || 'database error'}).`);
    throw new OtpServiceError('Verification service is temporarily unavailable.', 503);
  }

  if (verificationStatus !== 'verified') {
    const messages = {
      not_found: 'No active verification request was found. Request a new code.',
      consumed: 'This verification code has already been used.',
      expired: 'The verification code has expired. Request a new code.',
      locked: 'Too many incorrect attempts. Request a new code.'
    };
    return {
      success: false,
      message: messages[verificationStatus] || 'The verification code is incorrect.'
    };
  }

  return {
    success: true,
    otpId: record.id
  };
};

const consumeOtp = async (otpId, purpose) => {
  if (purpose !== 'FORGOT_PASSWORD') {
    throw new OtpServiceError('Unsupported verification request.');
  }

  if (mongoose.Types.ObjectId.isValid(otpId)) {
    await OtpVerification.findByIdAndUpdate(otpId, { isVerified: true });
    return;
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        verification_status: 'consumed',
        registration_status: 'not_applicable',
        otp_hash: '0'.repeat(64),
        password_hash: null,
        registration_payload: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', otpId)
      .eq('verification_status', 'verified')
      .select('id')
      .maybeSingle();

    if (error || !data) {
      console.error(`[Auth OTP] Could not consume verification record (${error?.code || 'record unavailable'}).`);
      throw new OtpServiceError('Verification could not be completed. Request a new code.', 503);
    }
  } catch (err) {
    if (err instanceof OtpServiceError) throw err;
  }
};

module.exports = {
  OtpServiceError,
  createAndSendOtp,
  verifyOtp,
  consumeOtp
};
