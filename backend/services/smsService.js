const twilio = require('twilio');

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send SMS
const sendSMS = async (phone, message) => {
  try {
    // Format the phone number to match E.164 format
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      // Add Pakistan country code if not present
      formattedPhone = phone.startsWith('0') 
        ? '+92' + phone.substring(1) 
        : '+92' + phone;
    }
    
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    return {
      success: true,
      messageId: result.sid,
      status: result.status
    };
    
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send OTP verification code
const sendVerificationOTP = async (phone, code) => {
  const message = `Your SaaS Local Stores verification code is: ${code}. Valid for 10 minutes. Don't share this with anyone.`;
  return await sendSMS(phone, message);
};

// Send order confirmation
const sendOrderConfirmation = async (phone, orderNumber, totalAmount) => {
  const message = `Your order #${orderNumber} for Rs. ${totalAmount} has been received. We'll notify you when it's on the way. Thank you for shopping with us!`;
  return await sendSMS(phone, message);
};

// Send delivery update
const sendDeliveryUpdate = async (phone, orderNumber, status) => {
  let message;
  
  switch (status) {
    case 'confirmed':
      message = `Your order #${orderNumber} has been confirmed and is being prepared.`;
      break;
    case 'shipped':
      message = `Your order #${orderNumber} is on the way! You'll receive it shortly.`;
      break;
    case 'delivered':
      message = `Your order #${orderNumber} has been delivered. Enjoy! Please rate our service.`;
      break;
    default:
      message = `Your order #${orderNumber} status: ${status}. Thank you for your patience.`;
  }
  
  return await sendSMS(phone, message);
};

// Send subscription renewal reminder
const sendSubscriptionReminder = async (phone, plan, daysLeft, amount) => {
  const message = `Your SaaS Local Stores ${plan} plan will renew in ${daysLeft} days. The renewal amount is Rs. ${amount}. Ensure sufficient funds are available.`;
  return await sendSMS(phone, message);
};

// Send bulk SMS
const sendBulkSMS = async (recipients, message) => {
  try {
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients array is required');
    }
    
    const results = [];
    
    // Send messages in batches of 10
    const batchSize = 10;
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const promises = batch.map(recipient => {
        return sendSMS(recipient.phone, message);
      });
      
      const batchResults = await Promise.allSettled(promises);
      results.push(...batchResults);
    }
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    return {
      success: true,
      totalSent: successful,
      totalFailed: results.length - successful,
      results: results.map((r, i) => ({
        phone: recipients[i].phone,
        success: r.status === 'fulfilled' && r.value.success,
        error: r.status === 'rejected' ? r.reason : (r.value.success ? null : r.value.error)
      }))
    };
    
  } catch (error) {
    console.error('Bulk SMS sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendSMS,
  sendVerificationOTP,
  sendOrderConfirmation,
  sendDeliveryUpdate,
  sendSubscriptionReminder,
  sendBulkSMS
};