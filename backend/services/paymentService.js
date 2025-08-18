const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

// JazzCash Payment Service
const createJazzCashPayment = async (order, customerInfo) => {
  try {
    // JazzCash API configuration
    const merchantId = process.env.JAZZCASH_MERCHANT_ID;
    const password = process.env.JAZZCASH_PASSWORD;
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
    
    if (!merchantId || !password || !integritySalt) {
      throw new Error('JazzCash configuration missing. Please check environment variables.');
    }

    const dateTime = moment().format('YYYYMMDDHHmmss');
    const txnRef = order.orderNumber;
    const amount = Math.round(order.total * 100); // Amount in paisas
    const billRef = order._id.toString();
    const description = `Payment for Order #${order.orderNumber}`;

    // Prepare data for integrity hash
    const hashData = {
      pp_Amount: amount,
      pp_BillReference: billRef,
      pp_Description: description,
      pp_Language: 'EN',
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_ReturnURL: `${process.env.BACKEND_URL}/api/payments/jazzcash/verify`,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: dateTime,
      pp_TxnExpiryDateTime: moment().add(1, 'days').format('YYYYMMDDHHmmss'),
      pp_TxnRefNo: txnRef,
      pp_TxnType: '',
      pp_Version: '1.1',
      pp_CustomerEmail: customerInfo.email,
      pp_CustomerMobile: customerInfo.phone,
      ppmpf_1: order.storeId
    };

    // Generate integrity hash
    let hashString = '';
    Object.keys(hashData).sort().forEach(key => {
      hashString += `&${key}=${hashData[key]}`;
    });
    hashString = integritySalt + hashString;
    
    const hash = crypto.createHmac('sha256', integritySalt).update(hashString).digest('hex');
    
    // Prepare payment request
    const paymentData = {
      ...hashData,
      pp_SecureHash: hash
    };

    // Make API call to JazzCash
    const response = await axios.post('https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform', 
      paymentData, 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // JazzCash redirects to a payment page, so we return the URL
    return {
      success: true,
      paymentUrl: `https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform?${new URLSearchParams(paymentData).toString()}`,
      transactionId: txnRef
    };

  } catch (error) {
    console.error('JazzCash payment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify JazzCash payment
const verifyJazzCashPayment = async (responseData) => {
  try {
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
    
    // Extract secure hash from response
    const receivedHash = responseData.pp_SecureHash;
    delete responseData.pp_SecureHash;
    
    // Generate hash for verification
    let hashString = '';
    Object.keys(responseData).sort().forEach(key => {
      hashString += `&${key}=${responseData[key]}`;
    });
    hashString = integritySalt + hashString;
    
    const calculatedHash = crypto.createHmac('sha256', integritySalt).update(hashString).digest('hex');
    
    // Compare hashes
    if (receivedHash !== calculatedHash) {
      return {
        success: false,
        message: 'Hash verification failed'
      };
    }

    // Check transaction status
    if (responseData.pp_ResponseCode !== '000') {
      return {
        success: false,
        message: `Transaction failed with code: ${responseData.pp_ResponseCode}`,
        responseMessage: responseData.pp_ResponseMessage
      };
    }

    return {
      success: true,
      transactionId: responseData.pp_TxnRefNo,
      amount: responseData.pp_Amount / 100, // Convert back to rupees
      responseCode: responseData.pp_ResponseCode,
      responseMessage: responseData.pp_ResponseMessage,
      billReference: responseData.pp_BillReference
    };

  } catch (error) {
    console.error('JazzCash verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// EasyPaisa Payment Service
const createEasyPaisaPayment = async (order, customerInfo) => {
  try {
    // EasyPaisa API configuration
    const storeId = process.env.EASYPAISA_STORE_ID;
    const hashKey = process.env.EASYPAISA_HASH_KEY;
    
    if (!storeId || !hashKey) {
      throw new Error('EasyPaisa configuration missing. Please check environment variables.');
    }

    const orderId = order.orderNumber;
    const amount = Math.round(order.total);
    const billRef = order._id.toString();
    const description = `Payment for Order #${order.orderNumber}`;
    const transactionDateTime = moment().format('YYYYMMDDHHmmss');

    // Prepare data for integrity hash
    const dataToHash = `${storeId}${orderId}${amount}${hashKey}`;
    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    // Prepare payment request
    const paymentData = {
      storeId: storeId,
      orderId: orderId,
      transactionAmount: amount,
      transactionType: 'MA',
      mobileAccountNo: customerInfo.phone,
      emailAddress: customerInfo.email,
      tokenExpiry: moment().add(1, 'days').format('YYYYMMDDHHmmss'),
      bankIdentificationNumber: '0',
      encryptedHashRequest: hash,
      merchantPaymentMethod: '',
      postBackURL: `${process.env.BACKEND_URL}/api/payments/easypaisa/verify`,
      storeType: 'ECOM'
    };

    // Make API call to EasyPaisa
    const response = await axios.post('https://easypaystg.easypaisa.com.pk/easypay/Index.jsp', 
      paymentData, 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // EasyPaisa also redirects to a payment page
    return {
      success: true,
      paymentUrl: `https://easypaystg.easypaisa.com.pk/easypay/Index.jsp?${new URLSearchParams(paymentData).toString()}`,
      transactionId: orderId
    };

  } catch (error) {
    console.error('EasyPaisa payment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify EasyPaisa payment
const verifyEasyPaisaPayment = async (responseData) => {
  try {
    const hashKey = process.env.EASYPAISA_HASH_KEY;
    
    // Extract hash from response
    const receivedHash = responseData.encryptedHashResponse;
    
    // Generate hash for verification
    const dataToHash = `${responseData.storeId}${responseData.orderId}${responseData.transactionAmount}${responseData.transactionStatus}${hashKey}`;
    const calculatedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    
    // Compare hashes
    if (receivedHash !== calculatedHash) {
      return {
        success: false,
        message: 'Hash verification failed'
      };
    }

    // Check transaction status
    if (responseData.transactionStatus !== '0000') {
      return {
        success: false,
        message: `Transaction failed with code: ${responseData.transactionStatus}`,
        responseMessage: responseData.statusDesc
      };
    }

    return {
      success: true,
      transactionId: responseData.orderId,
      amount: responseData.transactionAmount,
      responseCode: responseData.transactionStatus,
      responseMessage: responseData.statusDesc
    };

  } catch (error) {
    console.error('EasyPaisa verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Common payment analytics function
const trackPaymentAnalytics = async (storeId, orderId, paymentMethod, amount) => {
  try {
    // We would implement analytics tracking here
    // For now, we'll just log it
    console.log(`Payment tracked: Store ${storeId}, Order ${orderId}, Method ${paymentMethod}, Amount ${amount}`);
    
    return {
      success: true,
      message: 'Payment analytics tracked'
    };
  } catch (error) {
    console.error('Payment analytics error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createJazzCashPayment,
  verifyJazzCashPayment,
  createEasyPaisaPayment,
  verifyEasyPaisaPayment,
  trackPaymentAnalytics
};