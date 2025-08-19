const mongoose = require('mongoose');

const enhancedSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String, enum: ['basic', 'pro', 'premium'], required: true, default: 'basic' },
  pricing: { basic: { type: Number, default: 1500 }, pro: { type: Number, default: 3000 }, premium: { type: Number, default: 5000 } },
  features: {
    socialPlatforms: { type: Number, default: function(){ return this.plan==='basic'?1:this.plan==='pro'?2:3; } },
    monthlyPosts: { type: Number, default: function(){ return this.plan==='basic'?6:10; } },
    monthlyVideos: { type: Number, default: function(){ return this.plan==='basic'?0:this.plan==='pro'?2:5; } },
    maxProducts: { type: Number, default: function(){ return this.plan==='basic'?20:this.plan==='pro'?100:99999; } },
    hasShoppingCart: { type: Boolean, default: function(){ return this.plan!=='basic'; } },
    hasPaymentGateway: { type: Boolean, default: function(){ return this.plan!=='basic'; } },
    hasAIChatbot: { type: Boolean, default: function(){ return this.plan==='premium'; } },
    hasDeliveryIntegration: { type: Boolean, default: function(){ return this.plan==='premium'; } },
    seoLevel: { type: String, enum: ['basic','good','advanced'], default: function(){ return this.plan==='basic'?'basic':this.plan==='pro'?'good':'advanced'; } },
    hasHashtagResearch: { type: Boolean, default: function(){ return this.plan==='premium'; } },
    hasAnalytics: { type: Boolean, default: function(){ return this.plan!=='basic'; } }
  },
  usage: {
    currentMonth: { postsGenerated: { type: Number, default: 0 }, videosGenerated: { type: Number, default: 0 }, postsPublished: { type: Number, default: 0 } },
    lastMonth: { postsGenerated: { type: Number, default: 0 }, videosGenerated: { type: Number, default: 0 }, postsPublished: { type: Number, default: 0 } },
    totalLifetime: { postsGenerated: { type: Number, default: 0 }, videosGenerated: { type: Number, default: 0 }, postsPublished: { type: Number, default: 0 } }
  },
  billing: {
    status: { type: String, enum: ['active','cancelled','suspended','pending','trial'], default: 'trial' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    payments: [{ amount: Number, currency: { type: String, default: 'PKR' }, status: { type: String, enum: ['paid','failed','pending'] }, stripePaymentIntentId: String, paidAt: Date, createdAt: { type: Date, default: Date.now } }],
    nextBillingDate: Date,
    nextBillingAmount: Number
  },
  trial: { isActive: { type: Boolean, default: true }, startDate: Date, endDate: Date, daysRemaining: { type: Number, default: 14 } },
  appliedOffers: [{ offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }, offerCode: String, discountAmount: Number, discountPercentage: Number, appliedAt: { type: Date, default: Date.now } }],
  analytics: { activeDays: { type: Number, default: 0 }, totalRevenue: { type: Number, default: 0 }, averageMonthlyRevenue: { type: Number, default: 0 }, churnRisk: { type: String, enum: ['low','medium','high'], default: 'low' } },
  autoRenewal: { enabled: { type: Boolean, default: true }, reminderSent: { type: Boolean, default: false }, reminderDate: Date }
},{ timestamps:true, toJSON:{virtuals:true}, toObject:{virtuals:true} });

enhancedSubscriptionSchema.virtual('daysUntilNextBilling').get(function(){ if(!this.billing.nextBillingDate) return 0; const diff = new Date(this.billing.nextBillingDate)-Date.now(); return Math.ceil(diff/86400000); });

enhancedSubscriptionSchema.virtual('currentPlanPrice').get(function(){ return this.pricing[this.plan]||0; });

enhancedSubscriptionSchema.virtual('usagePercentage').get(function(){ const used=this.usage.currentMonth.postsGenerated; const limit=this.features.monthlyPosts; return limit>0?Math.round((used/limit)*100):0; });

enhancedSubscriptionSchema.methods.canGeneratePost=function(){ return this.usage.currentMonth.postsGenerated < this.features.monthlyPosts; };

enhancedSubscriptionSchema.methods.canGenerateVideo=function(){ return this.usage.currentMonth.videosGenerated < this.features.monthlyVideos; };

enhancedSubscriptionSchema.methods.incrementUsage=function(type){ if(type==='post'){ this.usage.currentMonth.postsGenerated++; this.usage.totalLifetime.postsGenerated++; } else if(type==='video'){ this.usage.currentMonth.videosGenerated++; this.usage.totalLifetime.videosGenerated++; } else if(type==='published'){ this.usage.currentMonth.postsPublished++; this.usage.totalLifetime.postsPublished++; } return this.save(); };

enhancedSubscriptionSchema.methods.resetMonthlyUsage=function(){ this.usage.lastMonth={...this.usage.currentMonth}; this.usage.currentMonth={ postsGenerated:0, videosGenerated:0, postsPublished:0 }; return this.save(); };

enhancedSubscriptionSchema.methods.upgradePlan=function(newPlan){ if(['basic','pro','premium'].includes(newPlan)){ this.plan=newPlan; this.features.socialPlatforms=newPlan==='basic'?1:newPlan==='pro'?2:3; this.features.monthlyPosts=newPlan==='basic'?6:10; this.features.monthlyVideos=newPlan==='basic'?0:newPlan==='pro'?2:5; this.features.maxProducts=newPlan==='basic'?20:newPlan==='pro'?100:99999; this.features.hasShoppingCart=newPlan!=='basic'; this.features.hasPaymentGateway=newPlan!=='basic'; this.features.hasAIChatbot=newPlan==='premium'; this.features.hasDeliveryIntegration=newPlan==='premium'; this.features.seoLevel=newPlan==='basic'?'basic':newPlan==='pro'?'good':'advanced'; this.features.hasHashtagResearch=newPlan==='premium'; this.features.hasAnalytics=newPlan!=='basic'; } return this.save(); };

enhancedSubscriptionSchema.statics.findActiveSubscriptions=function(){ return this.find({'billing.status':'active'}); };

enhancedSubscriptionSchema.index({ user:1 });
 enhancedSubscriptionSchema.index({ plan:1 });
 enhancedSubscriptionSchema.index({ 'billing.status':1 });
 enhancedSubscriptionSchema.index({ 'billing.nextBillingDate':1 });

module.exports = mongoose.model('EnhancedSubscription', enhancedSubscriptionSchema);
