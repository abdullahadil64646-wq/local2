const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const EcommerceStore = require('../models/EcommerceStore');
const { auth } = require('../middleware/auth');
const { 
  createJazzCashPayment, 
  verifyJazzCashPayment,
  createEasyPaisaPayment,
  verifyEasyPaisaPayment 
} = require('../services/paymentService');

const router = express.Router();

// @route   POST /api/payments/create-payment-intent
// @desc    Create Stripe payment intent for subscription
// @access  Private
router.post('/create-payment-intent', [
  body('plan').isIn(['basic', 'pro', 'premium']).withMessage('Invalid plan'),
  body('offerCode').optional().isString()
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { plan, offerCode } = req.body;
    const user = await User.findById(req.user._id);

    // Calculate amount based on plan
    const planPricing = {
      basic: 1500,
      pro: 3000,
      premium: 5000
    };

    let amount = planPricing[plan];
    let appliedOffer = null;

    // Apply offer if provided
    if (offerCode) {
      const Offer = require('../models/Offer');
      const UserOffer = require('../models/UserOffer');
      
      const offer = await Offer.findOne({ code: offerCode.toUpperCase(), isActive: true });
      
      if (offer && offer.isValid) {
        const userOfferUsage = await UserOffer.findOne({ user: user._id, offer: offer._id });
        const usageCount = userOfferUsage?.usage?.timesUsed || 0;

        if (offer.canUserUse(user, usageCount)) {
          const offerResult = offer.applyOffer(amount);
          amount = offerResult.finalAmount;
          appliedOffer = {
            code: offer.code,
            discountAmount: offerResult.discountAmount,
            finalAmount: offerResult.finalAmount
          };
        }
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe expects amount in smallest currency unit
      currency: 'pkr',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: user._id.toString(),
        plan: plan,
        offerCode: offerCode || '',
        originalAmount: planPricing[plan].toString(),
        discountAmount: appliedOffer ? appliedOffer.discountAmount.toString() : '0'
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      appliedOffer: appliedOffer
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent',
      error: error.message
    });
  }
});

// @route   POST /api/payments/webhook/stripe
// @desc    Handle Stripe webhooks
// @access  Public
router.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handleSuccessfulPayment(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handleFailedPayment(failedPayment);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handleRecurringPayment(invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({received: true});

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({error: 'Webhook processing failed'});
  }
});

// Handle successful payment
async function handleSuccessfulPayment(paymentIntent) {
  try {
    const userId = paymentIntent.metadata.userId;
    const plan = paymentIntent.metadata.plan;
    const offerCode = paymentIntent.metadata.offerCode;
    
    const user = await User.findById(userId);
    let subscription = await EnhancedSubscription.findOne({ user: userId });

    if (!subscription) {
      subscription = new EnhancedSubscription({ user: userId, plan: 'basic' });
    }

    // Update subscription
    subscription.plan = plan;
    subscription.billing.status = 'active';
    subscription.billing.currentPeriodStart = new Date();
    subscription.billing.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    subscription.billing.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    subscription.billing.nextBillingAmount = parseInt(paymentIntent.metadata.originalAmount);

    // Upgrade plan features
    await subscription.upgradePlan(plan);

    // Record payment
    subscription.billing.payments.push({
      amount: paymentIntent.amount / 100,
      currency: 'PKR',
      status: 'paid',
      stripePaymentIntentId: paymentIntent.id,
      paidAt: new Date()
    });

    // Handle offer if applied
    if (offerCode) {
      const Offer = require('../models/Offer');
      const UserOffer = require('../models/UserOffer');
      
      const offer = await Offer.findOne({ code: offerCode.toUpperCase() });
      if (offer) {
        subscription.appliedOffers.push({
          offerId: offer._id,
          offerCode: offerCode,
          discountAmount: parseInt(paymentIntent.metadata.discountAmount),
          appliedAt: new Date()
        });

        // Update offer usage
        await offer.incrementUsage(userId, paymentIntent.amount / 100);

        // Update user offer
        let userOffer = await UserOffer.findOne({ user: userId, offer: offer._id });
        if (!userOffer) {
          userOffer = new UserOffer({ user: userId, offer: offer._id });
        }
        
        userOffer.usage.timesUsed += 1;
        userOffer.usage.totalSavings += parseInt(paymentIntent.metadata.discountAmount);
        userOffer.usage.lastUsedAt = new Date();
        
        await userOffer.save();
      }
    }

    await subscription.save();

    console.log(`Payment successful for user ${userId}, plan: ${plan}`);

  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

// Handle failed payment
async function handleFailedPayment(paymentIntent) {
  try {
    const userId = paymentIntent.metadata.userId;
    
    const subscription = await EnhancedSubscription.findOne({ user: userId });
    if (subscription) {
      subscription.billing.payments.push({
        amount: paymentIntent.amount / 100,
        currency: 'PKR',
        status: 'failed',
        stripePaymentIntentId: paymentIntent.id,
        createdAt: new Date()
      });
      
      await subscription.save();
    }

    console.log(`Payment failed for user ${userId}`);

  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

// Handle recurring payment
async function handleRecurringPayment(invoice) {
  try {
    const customerId = invoice.customer;
    
    const subscription = await EnhancedSubscription.findOne({ 
      'billing.stripeCustomerId': customerId 
    });

    if (subscription) {
      subscription.billing.payments.push({
        amount: invoice.amount_paid / 100,
        currency: 'PKR',
        status: 'paid',
        stripePaymentIntentId: invoice.payment_intent,
        paidAt: new Date()
      });

      // Extend billing period
      subscription.billing.currentPeriodStart = new Date(invoice.period_start * 1000);
      subscription.billing.currentPeriodEnd = new Date(invoice.period_end * 1000);
      subscription.billing.nextBillingDate = new Date(invoice.period_end * 1000);

      // Reset monthly usage
      await subscription.resetMonthlyUsage();

      await subscription.save();
    }

    console.log(`Recurring payment processed for customer ${customerId}`);

  } catch (error) {
    console.error('Error handling recurring payment:', error);
  }
}

// @route   POST /api/payments/jazzcash/create
// @desc    Create JazzCash payment for ecommerce order
// @access  Public
router.post('/jazzcash/create', [
  body('orderId').isMongoId().withMessage('Invalid order ID'),
  body('amount').isFloat({ min: 1 }).withMessage('Invalid amount'),
  body('customerInfo').isObject().withMessage('Customer info required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId, amount, customerInfo } = req.body;

    // Find the order
    const store = await EcommerceStore.findOne({ 'orders._id': orderId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = store.orders.id(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create JazzCash payment
    const jazzCashResponse = await createJazzCashPayment({
      orderNumber: order.orderNumber,
      total: amount,
      _id: orderId,
      storeId: store._id
    }, customerInfo);

    if (jazzCashResponse.success) {
      res.json({
        success: true,
        paymentUrl: jazzCashResponse.paymentUrl,
        transactionId: jazzCashResponse.transactionId
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create JazzCash payment',
        error: jazzCashResponse.error
      });
    }

  } catch (error) {
    console.error('JazzCash payment creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/payments/jazzcash/verify
// @desc    Verify JazzCash payment
// @access  Public
router.post('/jazzcash/verify', async (req, res) => {
  try {
    const verification = await verifyJazzCashPayment(req.body);

    if (verification.success) {
      // Update order status
      const store = await EcommerceStore.findOne({ 
        'orders.orderNumber': req.body.pp_TxnRefNo 
      });

      if (store) {
        const order = store.orders.find(o => o.orderNumber === req.body.pp_TxnRefNo);
        if (order) {
          order.payment.status = 'paid';
          order.payment.transactionId = req.body.pp_TxnId;
          order.payment.paidAt = new Date();
          order.status = 'confirmed';
          
          await store.save();
        }
      }

      res.json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

  } catch (error) {
    console.error('JazzCash verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/payments/easypaisa/create
// @desc    Create EasyPaisa payment for ecommerce order
// @access  Public
router.post('/easypaisa/create', [
  body('orderId').isMongoId().withMessage('Invalid order ID'),
  body('amount').isFloat({ min: 1 }).withMessage('Invalid amount'),
  body('customerInfo').isObject().withMessage('Customer info required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId, amount, customerInfo } = req.body;

    // Find the order
    const store = await EcommerceStore.findOne({ 'orders._id': orderId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = store.orders.id(orderId);

    // Create EasyPaisa payment
    const easyPaisaResponse = await createEasyPaisaPayment({
      orderNumber: order.orderNumber,
      total: amount,
      _id: orderId,
      storeId: store._id
    }, customerInfo);

    if (easyPaisaResponse.success) {
      res.json({
        success: true,
        paymentUrl: easyPaisaResponse.paymentUrl,
        transactionId: easyPaisaResponse.transactionId
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create EasyPaisa payment',
        error: easyPaisaResponse.error
      });
    }

  } catch (error) {
    console.error('EasyPaisa payment creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;