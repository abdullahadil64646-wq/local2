const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const Offer = require('../models/Offer');
const UserOffer = require('../models/UserOffer');
const { auth } = require('../middleware/auth');
const { createStripeCustomer, createStripeSubscription, cancelStripeSubscription } = require('../services/stripeService');

const router = express.Router();

router.get('/plans', async (req,res)=>{
  try {
    const plans = {
      basic: { name:'Basic Plan', price:1500, currency:'PKR', interval:'month', features:{ socialPlatforms:1, monthlyPosts:6, monthlyVideos:0, maxProducts:20, hasShoppingCart:false, hasPaymentGateway:false, hasAIChatbot:false, hasDeliveryIntegration:false, seoLevel:'basic', hasHashtagResearch:false, hasAnalytics:false }, description:'Perfect for small businesses starting their digital journey', highlights:['6 social media posts per month','1 platform (Facebook)','Basic ecommerce store (20 products)','Decent SEO optimization','Email support'] },
      pro: { name:'Pro Plan', price:3000, currency:'PKR', interval:'month', features:{ socialPlatforms:2, monthlyPosts:10, monthlyVideos:2, maxProducts:100, hasShoppingCart:true, hasPaymentGateway:true, hasAIChatbot:false, hasDeliveryIntegration:false, seoLevel:'good', hasHashtagResearch:false, hasAnalytics:true }, description:'Best for growing businesses ready to scale', highlights:['10 posts + 2 videos per month','2 platforms (Facebook + Instagram)','Advanced ecommerce with payment gateway','Good SEO with analytics','Priority support'] },
      premium: { name:'Premium Plan', price:5000, currency:'PKR', interval:'month', features:{ socialPlatforms:3, monthlyPosts:10, monthlyVideos:5, maxProducts:99999, hasShoppingCart:true, hasPaymentGateway:true, hasAIChatbot:true, hasDeliveryIntegration:true, seoLevel:'advanced', hasHashtagResearch:true, hasAnalytics:true }, description:'Complete solution for established businesses', highlights:['10 posts + 5 videos per month','3 platforms (Facebook + Instagram + Twitter)','Full ecommerce + AI chatbot + delivery','Advanced SEO with hashtag research','Dedicated support'] }
    };
    res.json({ success:true, plans });
  } catch(error){
    res.status(500).json({ success:false, message:'Server error', error:error.message });
  }
});

router.get('/current', auth, async (req,res)=>{
  try {
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });
    if(!subscription){ return res.status(404).json({ success:false, message:'No subscription found' }); }
    res.json({ success:true, subscription:{ id:subscription._id, plan:subscription.plan, features:subscription.features, usage:subscription.usage, billing:subscription.billing, trial:subscription.trial, analytics:subscription.analytics, currentPlanPrice:subscription.currentPlanPrice, usagePercentage:subscription.usagePercentage, daysUntilNextBilling:subscription.daysUntilNextBilling } });
  } catch(error){
    res.status(500).json({ success:false, message:'Server error', error:error.message });
  }
});

router.post('/upgrade', [ body('plan').isIn(['basic','pro','premium']).withMessage('Invalid plan selected'), body('offerCode').optional().isString() ], auth, async (req,res)=>{
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ success:false, message:'Validation failed', errors:errors.array() });
    const { plan, offerCode } = req.body;
    const subscription = await EnhancedSubscription.findOne({ user: req.user._id });
    if(!subscription) return res.status(404).json({ success:false, message:'No subscription found' });
    if(subscription.plan === plan) return res.status(400).json({ success:false, message:'You are already on this plan' });
    const planPricing = { basic:1500, pro:3000, premium:5000 };
    let finalAmount = planPricing[plan];
    let appliedOffer = null;
    if(offerCode){
      const offer = await Offer.findOne({ code: offerCode.toUpperCase(), isActive:true });
      if(offer){
        if(offer.discountPercentage){ finalAmount -= Math.round(finalAmount * (offer.discountPercentage/100)); }
        else if(offer.discountAmount){ finalAmount -= offer.discountAmount; }
        if(finalAmount < 0) finalAmount = 0;
        appliedOffer = offer;
        subscription.appliedOffers.push({ offerId: offer._id, offerCode: offer.code, discountAmount: offer.discountAmount, discountPercentage: offer.discountPercentage });
        await subscription.save();
      }
    }
    await subscription.upgradePlan(plan);
    subscription.billing.status = 'active';
    subscription.billing.nextBillingDate = new Date(Date.now() + 30*24*60*60*1000);
    subscription.billing.nextBillingAmount = planPricing[plan];
    await subscription.save();
    res.json({ success:true, message:'Subscription upgraded successfully', subscription, chargedAmount: finalAmount, appliedOffer });
  } catch(error){
    res.status(500).json({ success:false, message:'Server error', error:error.message });
  }
});

module.exports = router;
