const Contact = require('../models/Contact');
const Shop = require('../models/Shop');
const { sendEmail } = require('../services/emailService');

/**
 * @desc    Submit contact form
 * @route   POST /api/contact
 * @access  Public
 */
const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    let shopId = null;
    const defaultShop = await Shop.findOne({ isActive: true });
    if (defaultShop) {
      shopId = defaultShop._id;
    }

    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      subject: subject.trim(),
      message: message.trim(),
      shopId,
      status: 'pending'
    });

    // Try to send email to owner (non-blocking)
    let emailDelivery = { success: false, configured: false };
    if (defaultShop && defaultShop.contactEmail) {
      try {
        emailDelivery = await sendEmail({
          to: defaultShop.contactEmail,
          subject: `New Contact Inquiry: ${subject}`,
          html: `
            <h2>New Contact Inquiry</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
            <hr>
            <p><small>This message was submitted via SMP Shop contact form.</small></p>
          `
        });
      } catch (emailError) {
        console.error('[Contact] Email delivery failed:', emailError.message);
        // Continue - contact is saved in MongoDB
      }
    }

    res.status(201).json({
      success: true,
      message: emailDelivery.success
        ? 'Your inquiry has been received and the owner was notified.'
        : 'Your inquiry was saved. Email notification could not be delivered.',
      emailDelivery: {
        delivered: emailDelivery.success === true,
        configured: emailDelivery.configured !== false
      },
      contact: {
        id: contact._id,
        name: contact.name,
        subject: contact.subject,
        status: contact.status
      }
    });
  } catch (error) {
    console.error('[Contact] Submission failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to submit your inquiry. Please try again.'
    });
  }
};

/**
 * @desc    Get all contact requests (Admin/Owner)
 * @route   GET /api/contact
 * @access  Private (Admin, Owner)
 */
const getContacts = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const contacts = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: contacts.length,
      contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update contact status
 * @route   PUT /api/contact/:id
 * @access  Private (Admin, Owner)
 */
const updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact request not found'
      });
    }

    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    contact.status = status;
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'Contact status updated',
      contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  submitContact,
  getContacts,
  updateContactStatus
};
