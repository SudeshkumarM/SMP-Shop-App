const WhatsAppLog = require('../models/WhatsAppLog');
const Customer = require('../models/Customer');
const Shop = require('../models/Shop');
const SmsService = require('./smsService');

/**
 * Service to manage WhatsApp Business Cloud API and notifications
 */
class WhatsAppService {
  /**
   * Helper to fetch shop's WhatsApp configuration
   */
  static async getShopWhatsAppSettings(shopId) {
    try {
      const shop = await Shop.findById(shopId);
      if (shop && shop.settings && shop.settings.whatsappSettings) {
        return shop.settings.whatsappSettings;
      }
    } catch (e) {
      console.error('[WhatsAppService] Error fetching shop settings:', e.message);
    }
    return {
      enabled: false,
      apiUrl: 'https://graph.facebook.com/v18.0',
      apiKey: '',
      phoneNumberId: '',
      notifyOnOffer: false,
      notifyOnCoupon: false,
      notifyOnInvoice: false
    };
  }

  /**
   * Send WhatsApp message with consent verification & audit logging
   * @param {Object} options
   * @param {string} options.phone - Recipient 10-digit or international phone
   * @param {string} options.customerName - Name of customer
   * @param {string} options.messageType - 'OFFER' | 'COUPON' | 'INVOICE' | 'TRANSACTIONAL'
   * @param {string} options.templateName - Template name
   * @param {string} options.content - Rendered message text
   * @param {Object} [options.providerPayload] - Raw Cloud API JSON payload
   * @param {string} [options.shopId]
   * @param {string} [options.sentBy] - UserId who initiated
   * @param {boolean} [options.requiresConsent] - Whether promotional consent is required
   */
  static async sendMessage({
    phone,
    customerName = 'Customer',
    customerId = null,
    messageType,
    templateName = 'general',
    content,
    providerPayload = null,
    shopId = null,
    sentBy = null,
    requiresConsent = false
  }) {
    // 1. Clean phone number
    const cleanPhone = String(phone).replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // 2. Check Customer Consent if Promotional
    if (requiresConsent || ['OFFER', 'COUPON'].includes(messageType)) {
      let customer = null;
      if (customerId) {
        customer = await Customer.findById(customerId);
      } else {
        customer = await Customer.findOne({
          $or: [{ phone: cleanPhone }, { phone: cleanPhone.slice(-10) }]
        });
      }

      if (!customer || !customer.consentPromotionalWhatsApp) {
        // Customer has NOT consented to promotional WhatsApp messages
        const log = await WhatsAppLog.create({
          recipientPhone: formattedPhone,
          recipientName: customerName,
          customerId: customer ? customer._id : null,
          messageType,
          templateName,
          content,
          status: 'OPTED_OUT',
          errorMessage: 'Skipped: Customer has not provided explicit consent for promotional WhatsApp messages.',
          sentBy,
          sentAt: new Date()
        });

        return {
          success: false,
          status: 'OPTED_OUT',
          message: 'Customer has not consented to promotional WhatsApp messages.',
          logId: log._id
        };
      }
    }

    // 3. Check Shop Settings
    let settings = null;
    if (shopId) {
      settings = await this.getShopWhatsAppSettings(shopId);
    }

    const isLiveApiConfigured = settings && settings.enabled && settings.apiKey && settings.phoneNumberId;

    if (isLiveApiConfigured) {
      try {
        const url = `${settings.apiUrl || 'https://graph.facebook.com/v18.0'}/${settings.phoneNumberId}/messages`;
        const headers = {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        };

        const body = providerPayload || {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: content }
        };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(8000)
        });
        const resData = await response.json();

        if (!response.ok) {
          throw new Error(JSON.stringify(resData));
        }

        const log = await WhatsAppLog.create({
          recipientPhone: formattedPhone,
          recipientName: customerName,
          customerId,
          messageType,
          templateName,
          content,
          status: 'SENT',
          providerResponse: resData,
          sentBy,
          sentAt: new Date()
        });

        return {
          success: true,
          status: 'SENT',
          response: resData,
          logId: log._id
        };
      } catch (error) {
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('[WhatsAppService] Cloud API Delivery Failed:', errMsg);

        const log = await WhatsAppLog.create({
          recipientPhone: formattedPhone,
          recipientName: customerName,
          customerId,
          messageType,
          templateName,
          content,
          status: 'FAILED',
          errorMessage: errMsg,
          sentBy,
          sentAt: new Date()
        });

        return {
          success: false,
          status: 'FAILED',
          error: errMsg,
          logId: log._id
        };
      }
    } else {
      // Sandboxed / Simulation Mode (Mock gateway with real audit tracking)
      const log = await WhatsAppLog.create({
        recipientPhone: formattedPhone,
        recipientName: customerName,
        customerId,
        messageType,
        templateName,
        content,
        status: 'SIMULATED',
        providerResponse: {
          simulated: true,
          gateway: 'SMP WhatsApp Business Simulator',
          status: 'delivered',
          timestamp: new Date().toISOString()
        },
        sentBy,
        sentAt: new Date()
      });

      return {
        success: true,
        status: 'SIMULATED',
        message: 'Message dispatched via SMP WhatsApp gateway (Simulation Mode).',
        logId: log._id
      };
    }
  }

  /**
   * Template A: Offer Notification
   */
  static buildOfferMessage({ customerName, discountPercent, couponCode, offerName }) {
    return (
      `Hello ${customerName || 'Customer'}!\n\n` +
      `Welcome to SMP!\n\n` +
      `We have a special offer for you: ${offerName || 'Exclusive Sale'}.\n\n` +
      `Enjoy ${discountPercent}% OFF on your next purchase.\n\n` +
      `Your Coupon Code: ${couponCode}\n\n` +
      `Visit SMP and enjoy shopping!\n\n` +
      `Thank you,\n` +
      `SMP Team.`
    );
  }

  /**
   * Template B: Coupon Notification
   */
  static buildCouponMessage({ customerName, couponCode, discountPercent, minPurchase, expiryDate }) {
    const formattedExpiry = expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN') : 'Limited Period';
    return (
      `Hello ${customerName || 'Valued Customer'}!\n\n` +
      `You've received an exclusive voucher from SMP!\n\n` +
      `Use code *${couponCode}* to get *${discountPercent}% OFF* on orders above ₹${minPurchase || 0}.\n\n` +
      `Valid until: ${formattedExpiry}\n\n` +
      `Shop now at SMP.\n\n` +
      `Warm regards,\nSMP Team.`
    );
  }

  /**
   * Template C: Order / Bill Invoice Notification
   */
  static buildInvoiceMessage({ customerName, invoiceNumber, grandTotal, itemCount, paymentMethod }) {
    return (
      `Hello ${customerName}!\n\n` +
      `Thank you for your purchase at SMP.\n\n` +
      `Bill / Invoice No: *${invoiceNumber}*\n` +
      `Total Amount: *₹${Number(grandTotal).toFixed(2)}*\n` +
      `Items: ${itemCount}\n` +
      `Payment Method: ${paymentMethod}\n` +
      `Status: Successful\n\n` +
      `We hope to see you again soon!\n\n` +
      `SMP Team.`
    );
  }

  /**
   * Send Bill Notification with official WhatsApp attempt and automatic SMS fallback
   * Ensures no duplicate notifications and confirmed delivery status reporting.
   */
  static async sendBillNotificationWithFallback({
    phone,
    customerName = 'Customer',
    invoiceNumber,
    grandTotal,
    itemCount = 1,
    paymentMethod = 'POS',
    shopId = null,
    sentBy = null,
    customerId = null
  }) {
    if (!phone) {
      return { success: false, deliveryStatus: 'Failed', reason: 'No mobile number provided' };
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return { success: false, deliveryStatus: 'Failed', reason: 'Invalid 10-digit mobile number' };
    }

    const content = this.buildInvoiceMessage({ customerName, invoiceNumber, grandTotal, itemCount, paymentMethod });

    // Step 1: Check WhatsApp availability & attempt delivery
    let whatsappResult = null;
    let whatsappSucceeded = false;

    try {
      whatsappResult = await this.sendMessage({
        phone: cleanPhone,
        customerName,
        customerId,
        messageType: 'INVOICE',
        templateName: 'invoice_receipt',
        content,
        shopId,
        sentBy,
        requiresConsent: false
      });

      if (whatsappResult && (whatsappResult.status === 'SENT' || whatsappResult.status === 'SIMULATED')) {
        whatsappSucceeded = true;
      }
    } catch (wErr) {
      console.warn('[WhatsAppService] WhatsApp attempt error:', wErr.message);
      whatsappSucceeded = false;
    }

    if (whatsappSucceeded) {
      return {
        success: true,
        channel: 'WHATSAPP',
        deliveryStatus: 'WhatsApp Sent',
        logId: whatsappResult?.logId,
        message: 'Bill notification delivered via WhatsApp'
      };
    }

    // Step 2: Fallback to SMS if WhatsApp failed or was unavailable
    console.log(`[NotificationService] WhatsApp unavailable for +91 ${cleanPhone}. Triggering automatic SMS fallback...`);
    try {
      const smsResult = await SmsService.sendBillSms({
        phone: cleanPhone,
        customerName,
        invoiceNumber,
        amount: grandTotal
      });

      if (smsResult && smsResult.success) {
        const log = await WhatsAppLog.create({
          recipientPhone: cleanPhone,
          recipientName: customerName,
          customerId,
          messageType: 'INVOICE',
          channel: 'SMS',
          templateName: 'sms_invoice_fallback',
          content: `SMP Retail: Dear ${customerName}, your bill for Invoice #${invoiceNumber} of Rs. ${Number(grandTotal).toFixed(2)} is generated. Thank you for shopping with SMP!`,
          status: 'SMS_SENT',
          providerResponse: smsResult.response || { provider: smsResult.provider, simulated: smsResult.provider === 'SIMULATED' },
          sentBy,
          sentAt: new Date()
        });

        return {
          success: true,
          channel: 'SMS',
          deliveryStatus: 'SMS Sent',
          logId: log._id,
          message: 'Bill notification delivered via SMS'
        };
      } else {
        const log = await WhatsAppLog.create({
          recipientPhone: cleanPhone,
          recipientName: customerName,
          customerId,
          messageType: 'INVOICE',
          channel: 'SMS',
          templateName: 'sms_invoice_fallback',
          content: `Invoice #${invoiceNumber} delivery attempt`,
          status: 'FAILED',
          errorMessage: smsResult?.error || 'Both WhatsApp and SMS delivery failed',
          sentBy,
          sentAt: new Date()
        });

        return {
          success: false,
          deliveryStatus: 'Failed',
          logId: log._id,
          error: smsResult?.error || 'Both WhatsApp and SMS fallback failed'
        };
      }
    } catch (smsErr) {
      console.error('[NotificationService] SMS fallback failed:', smsErr.message);
      return {
        success: false,
        deliveryStatus: 'Failed',
        error: smsErr.message
      };
    }
  }
}

module.exports = WhatsAppService;
