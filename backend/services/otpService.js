const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const SmsService = require('./smsService');
const { sendAuthVerificationCode } = require('./emailService');
const { normalizeEmail, normalizeIndianMobile } = require('../utils/authValidation');

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
  const secret = process.env.OTP_HASH_SECRET;
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
  const { data: otpId, error: createError } = await supabase.rpc('begin_auth_otp', {
    p_identifier: normalizedIdentifier,
    p_purpose: purpose,
    p_channel: channel,
    p_otp_hash: otpHash,
    p_password_hash: null,
    p_registration_payload: null
  });

  if (createError) {
    const cooldown = createError.message?.match(/OTP_RESEND_COOLDOWN:(\d+)/);
    if (cooldown) {
      throw new OtpServiceError(`Please wait ${cooldown[1]} seconds before requesting another code.`, 429);
    }
    if (createError.message?.includes('OTP_RESEND_LIMIT')) {
      throw new OtpServiceError('Maximum resend limit reached. Try again after the code expires.', 429);
    }
    console.error(`[Auth OTP] Could not create verification request (${createError.code || 'database error'}).`);
    throw new OtpServiceError('Verification service is temporarily unavailable.', 503);
  }

  try {
    await sendOtp(normalizedIdentifier, channel, otp);
  } catch (error) {
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

  const { data: record, error: lookupError } = await supabase
    .from(TABLE)
    .select('id, channel, otp_hash, verification_status, expires_at')
    .eq('identifier', normalizedIdentifier)
    .eq('purpose', purpose)
    .maybeSingle();

  if (lookupError) {
    console.error(`[Auth OTP] Could not load verification request (${lookupError.code || 'database error'}).`);
    throw new OtpServiceError('Verification service is temporarily unavailable.', 503);
  }
  if (!record) {
    return { success: false, message: 'No active verification request was found. Request a new code.' };
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
};

module.exports = {
  OtpServiceError,
  createAndSendOtp,
  verifyOtp,
  consumeOtp
};
