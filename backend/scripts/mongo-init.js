// MongoDB Initialization Script for Docker
// This script runs when MongoDB container starts for the first time

// Switch to the application database
db = db.getSiblingDB('saas-local-stores');

// Create application user with read/write permissions
db.createUser({
  user: 'saas_user',
  pwd: 'saas_password_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'saas-local-stores'
    }
  ]
});

// Create indexes for better performance
print('Creating indexes...');

// User collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ businessType: 1 });
db.users.createIndex({ 'address.city': 1 });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ referralCode: 1 }, { unique: true });

// Enhanced Subscription indexes
db.enhancedsubscriptions.createIndex({ user: 1 }, { unique: true });
db.enhancedsubscriptions.createIndex({ plan: 1 });
db.enhancedsubscriptions.createIndex({ 'billing.status': 1 });
db.enhancedsubscriptions.createIndex({ 'billing.nextBillingDate': 1 });
db.enhancedsubscriptions.createIndex({ 'trial.endDate': 1 });

// Ecommerce Store indexes
db.ecommercestores.createIndex({ owner: 1 }, { unique: true });
db.ecommercestores.createIndex({ storeUrl: 1 }, { unique: true });
db.ecommercestores.createIndex({ isActive: 1 });
db.ecommercestores.createIndex({ 'storeSettings.isActive': 1 });

// Posting Queue indexes
db.postingqueues.createIndex({ user: 1 });
db.postingqueues.createIndex({ status: 1 });
db.postingqueues.createIndex({ scheduledFor: 1 });
db.postingqueues.createIndex({ postedAt: -1 });
db.postingqueues.createIndex({ 'platforms.name': 1 });

// Offers indexes
db.offers.createIndex({ code: 1 }, { unique: true });
db.offers.createIndex({ isActive: 1 });
db.offers.createIndex({ validFrom: 1, validUntil: 1 });

// User Offers indexes
db.useroffers.createIndex({ user: 1, offer: 1 }, { unique: true });
db.useroffers.createIndex({ isUsed: 1 });
db.useroffers.createIndex({ usedAt: -1 });

print('✅ Database initialized successfully with indexes');

// Insert default admin user
print('Creating default admin user...');
db.users.insertOne({
  name: 'Abdullah Adil',
  email: 'admin@saaslocal.pk',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsJqQX6q.', // hashed: admin123
  role: 'admin',
  businessName: 'SaaS Local Platform',
  businessType: 'services',
  isActive: true,
  isEmailVerified: true,
  acceptedTermsAt: new Date(),
  acceptedPrivacyAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
});

print('✅ Default admin user created');
print('📧 Admin Login: admin@saaslocal.pk');
print('🔑 Admin Password: admin123');
print('');
print('🚀 SaaS Local Stores Database Setup Complete!');
