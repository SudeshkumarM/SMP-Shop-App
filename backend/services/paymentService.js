const crypto = require('crypto');
const Payment = require('../models/Payment');

/**
 * Create a payment order / intent
 */
const createPaymentIntent = async ({ orderId, amount, currency = 'INR', customerId, shopId, paymentMethod }) => {
  const isMock = process.env.MOCK_PAYMENT === 'true' || !process.env.RAZORPAY_KEY_ID;

  const paymentId = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (isMock) {
    // Generate simulated payment session
    const payment = await Payment.create({
      paymentId,
      orderId,
      shopId,
      customerId,
      amount,
      currency,
      paymentMethod,
      status: paymentMethod === 'COD' ? 'PENDING' : 'SUCCESS',
      transactionRef: `TXN-SIM-${Date.now()}`,
      gatewayResponse: {
        simulated: true,
        mode: paymentMethod,
        timestamp: new Date().toISOString()
      }
    });

    return {
      success: true,
      paymentId: payment.paymentId,
      transactionRef: payment.transactionRef,
      mode: 'SIMULATED',
      amount,
      currency,
      status: payment.status
    };
  }

  // Real Razorpay / Gateway logic
  // e.g. const rzpOrder = await razorpay.orders.create({ amount: amount * 100, currency });
  return {
    success: true,
    paymentId,
    mode: 'PRODUCTION',
    keyId: process.env.RAZORPAY_KEY_ID
  };
};

/**
 * Verify payment callback
 */
const verifyPaymentSignature = async ({ orderId, paymentId, signature }) => {
  if (process.env.MOCK_PAYMENT === 'true' || !process.env.RAZORPAY_KEY_SECRET) {
    return { verified: true, simulated: true };
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return {
    verified: expectedSignature === signature
  };
};

module.exports = {
  createPaymentIntent,
  verifyPaymentSignature
};
