const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

// Email templates
const EMAIL_TEMPLATES = {
  welcome: 'welcome',
  'password-reset': 'password-reset',
  'email-verification': 'email-verification',
  'order-confirmation': 'order-confirmation',
  'payment-success': 'payment-success',
  'subscription-renewal': 'subscription-renewal',
  'post-published': 'post-published'
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Load email template
const loadTemplate = (templateName) => {
  try {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
    
    // For development, create template if it doesn't exist
    if (!fs.existsSync(templatePath)) {
      return getDefaultTemplate(templateName);
    }
    
    const template = fs.readFileSync(templatePath, 'utf-8');
    return handlebars.compile(template);
  } catch (error) {
    console.error(`Error loading email template ${templateName}:`, error);
    return getDefaultTemplate(templateName);
  }
};

// Get default template if file doesn't exist
const getDefaultTemplate = (templateName) => {
  const defaultTemplates = {
    'welcome': `
      <h1>Welcome to SaaS Local Stores!</h1>
      <p>Hello {{name}},</p>
      <p>Thank you for joining SaaS Local Stores. We're excited to have you on board!</p>
      <p>To verify your email address, please use this code: <strong>{{verificationToken}}</strong></p>
      <p>Your store is now ready at: <a href="{{storeUrl}}">{{storeUrl}}</a></p>
      <p>Best regards,<br>The SaaS Local Stores Team</p>
    `,
    'password-reset': `
      <h1>Password Reset Request</h1>
      <p>Hello {{name}},</p>
      <p>We received a request to reset your password. Use this code to reset your password:</p>
      <p><strong>{{resetToken}}</strong></p>
      <p>If you didn't request a password reset, please ignore this email.</p>
      <p>Best regards,<br>The SaaS Local Stores Team</p>
    `,
    'email-verification': `
      <h1>Verify Your Email</h1>
      <p>Hello {{name}},</p>
      <p>To verify your email address, please use this code:</p>
      <p><strong>{{verificationToken}}</strong></p>
      <p>Best regards,<br>The SaaS Local Stores Team</p>
    `,
    'order-confirmation': `
      <h1>Order Confirmation</h1>
      <p>Hello {{customerName}},</p>
      <p>Thank you for your order! Your order #{{orderNumber}} has been received and is being processed.</p>
      <p><strong>Order Details:</strong></p>
      <p>Total Amount: Rs. {{totalAmount}}</p>
      <p>Payment Method: {{paymentMethod}}</p>
      <p>We'll notify you when your order ships.</p>
      <p>Best regards,<br>{{businessName}}</p>
    `,
    'payment-success': `
      <h1>Payment Successful</h1>
      <p>Hello {{name}},</p>
      <p>Your payment of Rs. {{amount}} for {{description}} was successful.</p>
      <p>Transaction ID: {{transactionId}}</p>
      <p>Thank you for your business!</p>
      <p>Best regards,<br>The SaaS Local Stores Team</p>
    `,
    'subscription-renewal': `
      <h1>Subscription Renewal Notice</h1>
      <p>Hello {{name}},</p>
      <p>Your {{plan}} plan subscription will renew on {{renewalDate}}.</p>
      <p>The renewal amount is Rs. {{amount}}.</p>
      <p>If you wish to make any changes to your subscription, please do so before the renewal date.</p>
      <p>Best regards,<br>The SaaS Local Stores Team</p>
    `,
    'post-published': `
      <h1>Your Post Has Been Published!</h1>
      <p>Hello {{name}},</p>
      <p>Your post has been successfully published to {{platforms}}.</p>
      <p>You can view your post here: <a href="{{postUrl}}">View Post</a></p>
      <p>Best regards,<br>The SaaS Local Stores Team</p>
    `
  };
  
  return handlebars.compile(defaultTemplates[templateName] || `
    <h1>SaaS Local Stores Notification</h1>
    <p>Hello,</p>
    <p>This is a notification from SaaS Local Stores.</p>
  `);
};

// Send email
const sendEmail = async (options) => {
  try {
    if (!options.to || !options.subject) {
      throw new Error('Email recipient and subject are required');
    }

    const transporter = createTransporter();
    
    // Load template
    const template = loadTemplate(options.template || 'default');
    const htmlContent = template(options.data || {});

    const mailOptions = {
      from: `SaaS Local Stores <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: htmlContent,
      attachments: options.attachments || []
    };

    // Add CC and BCC if provided
    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };

  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send bulk emails
const sendBulkEmails = async (recipients, template, subject, data) => {
  try {
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients array is required');
    }

    const transporter = createTransporter();
    const templateFn = loadTemplate(template || 'default');

    // Send emails in batches of 10
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const promises = batch.map(recipient => {
        // Merge common data with recipient-specific data
        const recipientData = { ...data, ...recipient };
        const htmlContent = templateFn(recipientData);

        const mailOptions = {
          from: `SaaS Local Stores <${process.env.EMAIL_USER}>`,
          to: recipient.email,
          subject: subject,
          html: htmlContent
        };

        return transporter.sendMail(mailOptions);
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return {
      success: true,
      totalSent: results.length,
      results: results.map(info => ({
        messageId: info.messageId,
        recipient: info.envelope.to[0]
      }))
    };

  } catch (error) {
    console.error('Bulk email sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send verification email
const sendVerificationEmail = async (user, verificationToken) => {
  return await sendEmail({
    to: user.email,
    subject: 'Verify Your Email - SaaS Local Stores',
    template: 'email-verification',
    data: {
      name: user.name,
      verificationToken: verificationToken,
      verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`
    }
  });
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  return await sendEmail({
    to: user.email,
    subject: 'Password Reset - SaaS Local Stores',
    template: 'password-reset',
    data: {
      name: user.name,
      resetToken: resetToken,
      resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`
    }
  });
};

// Send order confirmation to customer
const sendOrderConfirmation = async (order, store) => {
  return await sendEmail({
    to: order.customer.email,
    subject: `Order Confirmation - ${store.storeSettings.name}`,
    template: 'order-confirmation',
    data: {
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
      totalAmount: order.totals.total,
      paymentMethod: order.payment.method,
      items: order.items,
      businessName: store.storeSettings.name,
      storeUrl: store.storeUrl
    }
  });
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmation
};