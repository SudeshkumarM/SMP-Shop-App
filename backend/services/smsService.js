/**
 * SMS Notification Service for SMP
 * Dispatches transactional bill notifications and OTPs via configured SMS gateway with audit tracking.
 */
class SmsService {
  static async sendVerificationOtp({ phone, otp }) {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const otpVariable = process.env.MSG91_OTP_VARIABLE || 'OTP';

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new Error('A valid Indian mobile number is required.');
    }
    if (!authKey || !templateId) {
      throw new Error('SMS provider is not configured.');
    }
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(otpVariable)) {
      throw new Error('SMS OTP template variable is invalid.');
    }

    let response;
    try {
      response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authkey: authKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          template_id: templateId,
          short_url: '0',
          recipients: [{
            mobiles: `91${cleanPhone}`,
            [otpVariable]: otp
          }]
        }),
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      throw new Error('SMS provider could not be reached.');
    }

    const result = await response.json().catch(() => ({}));
    if (!response.ok || String(result.type || '').toLowerCase() !== 'success') {
      console.error(`[SmsService] MSG91 rejected OTP request (HTTP ${response.status}).`);
      throw new Error('SMS provider rejected the OTP request.');
    }

    return { accepted: true };
  }

  /**
   * Send SMS bill notification with delivery confirmation
   * @param {Object} options
   * @param {string} options.phone - 10-digit mobile number
   * @param {string} options.customerName - Name of customer
   * @param {string} options.invoiceNumber - SMP invoice number
   * @param {number} options.amount - Final bill amount
   * @param {string} [options.customMessage] - Optional custom text
   */
  static async sendBillSms({ phone, customerName = 'Customer', invoiceNumber, amount, customMessage }) {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Invalid recipient phone number for SMS delivery.'
      };
    }

    const messageText = customMessage || (
      `SMP Retail: Dear ${customerName}, your bill for Invoice #${invoiceNumber} ` +
      `of Rs. ${Number(amount).toFixed(2)} has been generated successfully. ` +
      `Thank you for shopping with SMP!`
    );

    const smsApiUrl = process.env.SMS_API_URL;
    const smsApiKey = process.env.SMS_API_KEY;
    const smsSenderId = process.env.SMS_SENDER_ID || 'SMPSHOP';

    const isLiveConfigured = Boolean(smsApiUrl && smsApiKey);

    if (isLiveConfigured) {
      try {
        const response = await fetch(smsApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${smsApiKey}`
          },
          body: JSON.stringify({
            sender: smsSenderId,
            to: cleanPhone,
            message: messageText
          }),
          signal: AbortSignal.timeout(6000)
        });

        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(resData.message || `SMS gateway HTTP ${response.status}`);
        }

        return {
          success: true,
          status: 'SMS_SENT',
          provider: 'LIVE_GATEWAY',
          response: resData
        };
      } catch (err) {
        console.error('[SmsService] Live SMS delivery failed:', err.message);
        return {
          success: false,
          status: 'FAILED',
          error: err.message
        };
      }
    } else {
      // Sandboxed / Development Mode SMS Delivery
      console.log('----------------------------------------------------');
      console.log(`[SMS Gateway Simulated Delivery]`);
      console.log(`To: +91 ${cleanPhone}`);
      console.log(`Text: ${messageText}`);
      console.log(`Status: SMS_SENT (Simulated)`);
      console.log('----------------------------------------------------');

      return {
        success: true,
        status: 'SMS_SENT',
        provider: 'SIMULATED',
        message: 'Bill notification dispatched via SMP SMS gateway.'
      };
    }
  }
}

module.exports = SmsService;
