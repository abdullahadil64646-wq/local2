const mongoose = require('mongoose');
require('dotenv').config();

const checkDatabaseHealth = async () => {
  try {
    console.log('🏥 Checking database health...');
    
    // Connect to database
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-local-stores');
    console.log('✅ Database connection: OK');
    
    // Check database info
    const db = mongoose.connection.db;
    const admin = db.admin();
    const status = await admin.ping();
    console.log('✅ Database ping: OK');
    
    // Check collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Collections found: ${collections.length}`);
    
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Check indexes
    console.log('🗂️ Checking indexes...');
    for (const collection of collections) {
      const indexes = await db.collection(collection.name).listIndexes().toArray();
      console.log(`  ${collection.name}: ${indexes.length} indexes`);
    }
    
    // Import models to check basic functionality
    const User = require('../models/User');
    const EnhancedSubscription = require('../models/EnhancedSubscription');
    const EcommerceStore = require('../models/EcommerceStore');
    
    // Count documents
    const userCount = await User.countDocuments();
    const subscriptionCount = await EnhancedSubscription.countDocuments();
    const storeCount = await EcommerceStore.countDocuments();
    
    console.log('📈 Document counts:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Subscriptions: ${subscriptionCount}`);
    console.log(`  Stores: ${storeCount}`);
    
    // Check for admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      console.log('✅ Admin user exists');
    } else {
      console.log('⚠️ No admin user found');
    }
    
    console.log('🎉 Database health check completed successfully!');
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from database');
    process.exit(0);
  }
};

// Run health check if called directly
if (require.main === module) {
  checkDatabaseHealth();
}

module.exports = checkDatabaseHealth;
