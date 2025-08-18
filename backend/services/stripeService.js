const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create Stripe customer
const createStripeCustomer = async (user) => {
  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user._id.toString(),
        businessName: user.businessName || '',
        businessType: user.businessType || '',
        country: 'Pakistan'
      }
    });

    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

// Update Stripe customer
const updateStripeCustomer = async (customerId, user) => {
  try {
    const customer = await stripe.customers.update(customerId, {
      email: user.email,
      name: user.name,
      metadata: {
        userId: user._id.toString(),
        businessName: user.businessName || '',
        businessType: user.businessType || '',
        country: 'Pakistan'
      }
    });

    return customer;
  } catch (error) {
    console.error('Error updating Stripe customer:', error);
    throw error;
  }
};

// Create Stripe product
const createStripeProduct = async (plan, price, currency = 'pkr') => {
  try {
    // Check if product already exists
    const existingProducts = await stripe.products.list({
      limit: 100,
    });
    
    let product = existingProducts.data.find(p => p.name.toLowerCase() === `${plan} plan`);
    
    if (!product) {
      product = await stripe.products.create({
        name: `${plan} Plan`,
        description: getPlanDescription(plan),
        metadata: {
          plan: plan
        }
      });
    }

    // Get existing prices for this product
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      currency: currency,
    });

    let price_obj = existingPrices.data.find(p => p.unit_amount === price * 100);

    if (!price_obj) {
      price_obj = await stripe.prices.create({
        product: product.id,
        unit_amount: price * 100,
        currency: currency,
        recurring: {
          interval: 'month'
        }
      });
    }

    return {
      product: product,
      price: price_obj
    };
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    throw error;
  }
};

// Create Stripe subscription
const createStripeSubscription = async (customerId, plan, amount, offer = null) => {
  try {
    // Create or get product and price
    const { price } = await createStripeProduct(plan, amount);

    const subscriptionData = {
      customer: customerId,
      items: [{ price: price.id }],
      metadata: {
        plan: plan,
        originalAmount: amount,
        offerCode: offer ? offer.code : '',
        discountAmount: offer ? offer.discountAmount : 0
      },
      expand: ['latest_invoice']
    };

    // Add trial days if it's a free trial offer
    if (offer && offer.discountPercentage === 100) {
      subscriptionData.trial_period_days = 30;
    }

    const subscription = await stripe.subscriptions.create(subscriptionData);

    return subscription;
  } catch (error) {
    console.error('Error creating Stripe subscription:', error);
    throw error;
  }
};

// Update Stripe subscription
const updateStripeSubscription = async (subscriptionId, plan, amount) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Create or get product and price for the new plan
    const { price } = await createStripeProduct(plan, amount);

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
      proration_behavior: 'create_prorations',
      items: [
        {
          id: subscription.items.data[0].id,
          price: price.id,
        },
      ],
      metadata: {
        plan: plan,
        updatedAt: new Date().toISOString()
      }
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating Stripe subscription:', error);
    throw error;
  }
};

// Cancel Stripe subscription
const cancelStripeSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        cancelledAt: new Date().toISOString()
      }
    });

    return subscription;
  } catch (error) {
    console.error('Error cancelling Stripe subscription:', error);
    throw error;
  }
};

// Create Stripe checkout session
const createCheckoutSession = async (customerId, plan, amount, offer = null) => {
  try {
    // Create or get product and price
    const { price } = await createStripeProduct(plan, amount);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success&plan=${plan}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=cancelled`,
      metadata: {
        plan: plan,
        originalAmount: amount,
        offerCode: offer ? offer.code : '',
        discountAmount: offer ? offer.discountAmount : 0
      }
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Create payment intent
const createPaymentIntent = async (amount, currency, metadata) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe uses smallest currency unit
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: metadata
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Get plan description
const getPlanDescription = (plan) => {
  switch(plan) {
    case 'basic':
      return 'Basic Plan: 6 social media posts monthly, 1 platform, basic ecommerce store';
    case 'pro':
      return 'Pro Plan: 10 posts + 2 videos monthly, 2 platforms, advanced ecommerce with payment';
    case 'premium':
      return 'Premium Plan: 10 posts + 5 videos monthly, 3 platforms, full ecommerce + AI chatbot';
    default:
      return 'SaaS Local Stores Platform Subscription';
  }
};

module.exports = {
  createStripeCustomer,
  updateStripeCustomer,
  createStripeProduct,
  createStripeSubscription,
  updateStripeSubscription,
  cancelStripeSubscription,
  createCheckoutSession,
  createPaymentIntent
};