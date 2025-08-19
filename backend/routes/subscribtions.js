const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const Offer = require('../models/Offer');
const UserOffer = require('../models/UserOffer');
const { auth } = require('../middleware/auth');
const { createStripeCustomer, createStripeSubscription, cancelStripeSubscription } = require('../services/stripeService');

const router = express.Router();

// @route   GET /api/subscriptions/plans
// @desc    Get all available subscription plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const plans = {
      basic: {
        name: 'Basic Plan',
        price: 1500,
        currency: 'PKR',
        interval: 'month',
        features: {
          socialPlatforms: 1,
          monthlyPosts: 6,
          monthlyVideos: 0,
          maxProducts: 20,
          hasShoppingCart: false,
          hasPaymentGateway: false,
          hasAIChatbot: false,
          hasDeliveryIntegration: false,
          seoLevel: 'basic',
          hasHashtagResearch: false,
          hasAnalytics: false
        },
        description: 'Perfect for small businesses starting their digital journey',
        highlights: [
          '6 social media posts per month',
          '1 platform (Facebook)',
          'Basic ecommerce store (20 products)',
          'Decent SEO optimization',
          'Email support'
        ]
      },
      pro: {
        name: 'Pro Plan',
        price: 3000,
        currency: 'PKR',
        interval: 'month',
        features: {
          socialPlatforms: 2,
          monthlyPosts: 10,
          monthlyVideos: 2,
          maxProducts: 100,
          hasShoppingCart: true,
          hasPaymentGateway: true,
          hasAIChatbot: false,
          hasDeliveryIntegration: false,
          seoLevel: 'good',
          hasHashtagResearch: false,
          hasAnalytics: true
        },
        description: 'Best for growing businesses ready to scale',
        highlights: [
          '10 posts + 2 videos per month',
          '2 platforms (Facebook + Instagram)',
          'Advanced ecommerce with payment gateway',
          'Good SEO with analytics',
          'Priority support'
        ]
      },
      premium: {
        name: 'Premium Plan',
        price: 5000,
        currency: 'PKR',
        interval: 'month',
        features: {
          socialPlatforms: 3,
          monthlyPosts: 10,
          monthlyVideos: 5,
          maxProducts: 99999,
          hasShoppingCart: true,
          hasPaymentGateway: true,
          hasAIChatbot: true,
          hasDeliveryIntegration: true,
          seoLevel: 'advanced',
          hasHashtagResearch: true,
          hasAnalytics: true
        },
        description: 'Complete solution for established businesses',
        highlights: [
          '10 posts + 5 videos per month',
          '3 platforms (Facebook + Instagram + Twitter)',
          'Full ecommerce + AI chatbot + delivery',
          'Advanced SEO with hashtag research',
          'Dedicated support'
        ]
      }
    };

    res.json({
      success: true,
      plans
    });

  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/subscriptions/current
// @desc    Get user's current subscription
// @access  Private
router.get('/current', auth, async (req, res) => {
  try {
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    res.json({
      success: true,
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        features: subscription.features,
        usage: subscription.usage,
        billing: subscription.billing,
        trial: subscription.trial,
        analytics: subscription.analytics,
        currentPlanPrice: subscription.currentPlanPrice,
        usagePercentage: subscription.usagePercentage,
        daysUntilNextBilling: subscription.daysUntilNextBilling
      }
    });

  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/subscriptions/upgrade
// @desc    Upgrade user's subscription plan
// @access  Private
router.post('/upgrade', [
  body('plan').isIn(['basic', 'pro', 'premium']).withMessage('Invalid plan selected'),
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
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    // Check if already on this plan
    if (subscription.plan === plan) {
      return res.status(400).json({
        success: false,
        message: 'You are already on this plan'
      });
    }

    // Calculate pricing
    const planPricing = {
      basic: 1500,
      pro: 3000,
      premium: 5000
    };

    let finalAmount = planPricing[plan];
    let appliedOffer = null;
    let discountAmount = 0;

    // Apply offer code if provided
    if (offerCode) {
      const offer = await Offer.findOne({ code: offerCode.toUpperCase(), isActive: true });
      
      if (offer && offer.canUserUse(user)) {
        const userOfferUsage = await UserOffer.findOne({ user: user._id, offer: offer._id });
        const usageCount = userOfferUsage?.usage?.timesUsed || 0;

        if (offer.canUserUse(user, usageCount)) {
          const offerResult = offer.applyOffer(finalAmount);
          finalAmount = offerResult.finalAmount;
          discountAmount = offerResult.discountAmount;
          appliedOffer = {
            id: offer._id,
            code: offer.code,
            discountAmount: discountAmount,
            discountPercentage: offerResult.discountPercentage
          };
        }
      }
    }

    // Create Stripe customer if not exists
    if (!subscription.billing.stripeCustomerId) {
      const stripeCustomer = await createStripeCustomer(user);
      subscription.billing.stripeCustomerId = stripeCustomer.id;
    }

    // Create Stripe subscription
    const stripeSubscription = await createStripeSubscription(
      subscription.billing.stripeCustomerId,
      plan,
      finalAmount,
      appliedOffer
    );

    // Update subscription
    subscription.plan = plan;
    subscription.billing.status = 'active';
    subscription.billing.stripeSubscriptionId = stripeSubscription.id;
    subscription.billing.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.billing.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    subscription.billing.nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);
    subscription.billing.nextBillingAmount = finalAmount;

    // Update features based on new plan
    await subscription.upgradePlan(plan);

    // Record payment
    subscription.billing.payments.push({
      amount: finalAmount,
      currency: 'PKR',
      status: 'paid',
      stripePaymentIntentId: stripeSubscription.latest_invoice,
      paidAt: new Date()
    });

    // Apply offer if used
    if (appliedOffer) {
      subscription.appliedOffers.push({
        offerId: appliedOffer.id,
        offerCode: appliedOffer.code,
        discountAmount: discountAmount,
        appliedAt: new Date()
      });

      // Update or create UserOffer record
      let userOffer = await UserOffer.findOne({ user: user._id, offer: appliedOffer.id });
      if (!userOffer) {
        userOffer = new UserOffer({ user: user._id, offer: appliedOffer.id });
      }
      
      userOffer.usage.timesUsed += 1;
      userOffer.usage.totalSavings += discountAmount;
      userOffer.usage.lastUsedAt = new Date();
      if (!userOffer.usage.firstUsedAt) {
        userOffer.usage.firstUsedAt = new Date();
      }

      userOffer.applications.push({
        subscriptionId: subscription._id,
        originalAmount: planPricing[plan],
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        status: 'used'
      });

      await userOffer.save();

      // Update offer usage
      const offer = await Offer.findById(appliedOffer.id);
      if (offer) {
        await offer.incrementUsage(user._id, finalAmount);
      }
    }

    await subscription.save();

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan} plan!`,
      subscription: {
        plan: subscription.plan,
        status: subscription.billing.status,
        nextBillingDate: subscription.billing.nextBillingDate,
        nextBillingAmount: subscription.billing.nextBillingAmount,
        appliedOffer: appliedOffer
      }
    });

  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during subscription upgrade',
      error: error.message
    });
  }
});

// @route   POST /api/subscriptions/cancel
// @desc    Cancel user's subscription
// @access  Private
router.post('/cancel', auth, async (req, res) => {
  try {
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    if (subscription.billing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not active'
      });
    }

    // Cancel Stripe subscription
    if (subscription.billing.stripeSubscriptionId) {
      await cancelStripeSubscription(subscription.billing.stripeSubscriptionId);
    }

    // Update subscription to cancel at period end
    subscription.billing.cancelAtPeriodEnd = true;
    subscription.billing.status = 'cancelled';
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. Access will continue until the end of current billing period.',
      endsOn: subscription.billing.currentPeriodEnd
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during subscription cancellation',
      error: error.message
    });
  }
});

// @route   GET /api/subscriptions/usage
// @desc    Get user's subscription usage
// @access  Private
router.get('/usage', auth, async (req, res) => {
  try {
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    const usage = {
      current: subscription.usage.currentMonth,
      limits: {
        monthlyPosts: subscription.features.monthlyPosts,
        monthlyVideos: subscription.features.monthlyVideos
      },
      percentages: {
        posts: subscription.features.monthlyPosts > 0 ? 
          Math.round((subscription.usage.currentMonth.postsGenerated / subscription.features.monthlyPosts) * 100) : 0,
        videos: subscription.features.monthlyVideos > 0 ? 
          Math.round((subscription.usage.currentMonth.videosGenerated / subscription.features.monthlyVideos) * 100) : 0
      },
      canGenerate: {
        posts: subscription.canGeneratePost(),
        videos: subscription.canGenerateVideo()
      }
    };

    res.json({
      success: true,
      usage
    });

  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/subscriptions/billing-history
// @desc    Get user's billing history
// @access  Private
router.get('/billing-history', auth, async (req, res) => {
  try {
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    const billingHistory = subscription.billing.payments.map(payment => ({
      id: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      billingHistory,
      totalPaid: subscription.billing.payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0)
    });

  } catch (error) {
    console.error('Get billing history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;