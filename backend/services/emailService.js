const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const info = await mailer.sendMail({
      from: process.env.EMAIL_FROM || 'SMP Platform <noreply@smpshop.com>',
      to,
      subject,
      text: text || '',
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL ERROR]', error.message);
    return { success: false, error: error.message };
  }
};

const sendOrderConfirmation = async (order) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2874f0; text-align: center;">SMP (Shop Management Platform)</h2>
      <h3>Order Confirmation - ${order.orderNumber}</h3>
      <p>Thank you for shopping with us, <strong>${order.customerDetails.name}</strong>!</p>
      <p>Your order has been placed and is currently being processed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f7f7f7;">
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Item</th>
            <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">Qty</th>
            <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName} (${item.size || 'Standard'})</td>
              <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
              <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">₹${item.totalAmount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="text-align: right; margin-top: 10px;">
        <p><strong>Subtotal:</strong> ₹${order.subtotal.toFixed(2)}</p>
        <p><strong>GST:</strong> ₹${order.totalGst.toFixed(2)}</p>
        <p style="font-size: 1.2rem; color: #2e7d32;"><strong>Grand Total: ₹${order.grandTotal.toFixed(2)}</strong></p>
      </div>
      <p style="margin-top: 20px; font-size: 0.9rem; color: #666;">Delivery Address: ${order.customerDetails.shippingAddress.street}, ${order.customerDetails.shippingAddress.city}, ${order.customerDetails.shippingAddress.state} - ${order.customerDetails.shippingAddress.pincode}</p>
      <p style="text-align: center; margin-top: 30px; font-size: 0.8rem; color: #999;">SMP Elite Fashions & Multi-Shop Platform</p>
    </div>
  `;

  if (order.customerDetails.email) {
    return await sendEmail({
      to: order.customerDetails.email,
      subject: `Order Confirmed: ${order.orderNumber} - SMP`,
      html
    });
  }
};

module.exports = {
  sendEmail,
  sendOrderConfirmation
};
