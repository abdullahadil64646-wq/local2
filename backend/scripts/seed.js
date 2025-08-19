const mongoose = require('mongoose');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Import models
    const User = require('../models/User');
    const EnhancedSubscription = require('../models/EnhancedSubscription');
    const EcommerceStore = require('../models/EcommerceStore');
    const Offer = require('../models/Offer');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-local-stores');
    console.log('📊 Connected to MongoDB for seeding');

    // Clear existing data (be careful!)
    const shouldClearData = process.argv.includes('--clear');
    if (shouldClearData) {
      console.log('🗑️ Clearing existing data...');
      await User.deleteMany({});
      await EnhancedSubscription.deleteMany({});
      await EcommerceStore.deleteMany({});
      await Offer.deleteMany({});
      console.log('✅ Data cleared');
    }

    // Create sample offers
    console.log('💰 Creating sample offers...');
    
    // First create an admin user for offers
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      adminUser = await User.create({
        name: 'Abdullah Adil',
        email: 'admin@saaslocal.pk',
        password: hashedPassword,
        phone: '+923211234567',
        role: 'admin',
        businessName: 'SaaS Local Platform',
        businessType: 'services',
        address: {
          city: 'Karachi',
          province: 'Sindh',
          country: 'pakistan'
        },
        isActive: true,
        isEmailVerified: true,
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date()
      });
      console.log('✅ Created admin user for offers');
    }
    
    const offers = [
      {
        name: 'Welcome Discount',
        code: 'WELCOME20',
        description: 'Get 20% off your first month subscription',
        discount: {
          type: 'percentage',
          value: 20,
          currency: 'PKR'
        },
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        },
        usage: {
          totalLimit: 1000,
          perUserLimit: 1,
          currentUsage: 0
        },
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Premium Upgrade',
        code: 'PREMIUM500',
        description: 'PKR 500 off Premium plan',
        discount: {
          type: 'fixed',
          value: 500,
          currency: 'PKR'
        },
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
        },
        usage: {
          totalLimit: 100,
          perUserLimit: 1,
          currentUsage: 0
        },
        targeting: {
          applicablePlans: ['premium']
        },
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Student Discount',
        code: 'STUDENT30',
        description: '30% off for students',
        discount: {
          type: 'percentage',
          value: 30,
          maxDiscount: 1000,
          currency: 'PKR'
        },
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        },
        usage: {
          totalLimit: 500,
          perUserLimit: 1,
          currentUsage: 0
        },
        targeting: {
          userType: 'new_users'
        },
        isActive: true,
        createdBy: adminUser._id
      }
    ];

    for (const offer of offers) {
      const existingOffer = await Offer.findOne({ code: offer.code });
      if (!existingOffer) {
        await Offer.create(offer);
        console.log(`✅ Created offer: ${offer.code}`);
      }
    }

    // Create sample demo businesses (if needed)
    console.log('🏪 Creating demo business accounts...');
    
    const demoBusinesses = [
      {
        name: 'Ahmed Karyana Store',
        email: 'ahmed@karayanastore.com',
        businessName: 'Ahmed Karyana Store',
        businessType: 'karyana',
        businessDescription: 'Your local grocery store with fresh items daily',
        phone: '+923001234567',
        address: {
          street: 'Main Bazar Road',
          city: 'Karachi',
          state: 'Sindh',
          country: 'Pakistan'
        }
      },
      {
        name: 'Fatima Fashion',
        email: 'fatima@fashion.com',
        businessName: 'Fatima Fashion',
        businessType: 'clothing',
        businessDescription: 'Latest fashion trends for women',
        phone: '+923007654321',
        address: {
          street: 'Gulshan Market',
          city: 'Karachi', 
          state: 'Sindh',
          country: 'Pakistan'
        }
      },
      {
        name: 'Hassan Electronics',
        email: 'hassan@electronics.com',
        businessName: 'Hassan Electronics',
        businessType: 'electronics',
        businessDescription: 'Mobile phones, laptops and accessories',
        phone: '+923009876543',
        address: {
          street: 'Saddar Electronics Market',
          city: 'Karachi',
          state: 'Sindh', 
          country: 'Pakistan'
        }
      }
    ];

    // Only create demo accounts if specifically requested
    if (process.argv.includes('--demo')) {
      for (const business of demoBusinesses) {
        const existingUser = await User.findOne({ email: business.email });
        if (!existingUser) {
          // Create user
          const user = await User.create({
            ...business,
            password: 'demo123', // Will be hashed by pre-save middleware
            isActive: true,
            isEmailVerified: true,
            acceptedTermsAt: new Date(),
            acceptedPrivacyAt: new Date()
          });

          // Create subscription
          await EnhancedSubscription.create({
            user: user._id,
            plan: 'basic',
            billing: {
              status: 'trial'
            },
            trial: {
              isActive: true,
              startDate: new Date(),
              endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              daysRemaining: 14
            }
          });

          // Create store
          await EcommerceStore.create({
            owner: user._id,
            storeSettings: {
              name: business.businessName,
              description: business.businessDescription,
              currency: 'PKR',
              contact: {
                email: business.email,
                phone: business.phone,
                address: business.address
              }
            },
            storeUrl: business.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
            isActive: true
          });

          console.log(`✅ Created demo business: ${business.businessName}`);
        }
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📝 Usage:');
    console.log('  npm run seed          - Add offers only');
    console.log('  npm run seed --demo   - Add offers + demo businesses');
    console.log('  npm run seed --clear  - Clear all data first');
    console.log('');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from database');
    process.exit(0);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
