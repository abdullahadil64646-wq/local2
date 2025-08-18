const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const subscriptionRoutes = require('./routes/subscriptions');
const ecommerceRoutes = require('./routes/ecommerce');
const socialMediaRoutes = require('./routes/socialMedia');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

// Import services
const { runDailyAutomation } = require('./services/automationService');

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-local-stores', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('📊 MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SaaS Local Stores Platform - By Abdullah Adil',
    timestamp: new Date().toISOString()
  });
});

// Daily automation cron job (8:00 AM Pakistan time)
cron.schedule('0 8 * * *', async () => {
  console.log('🤖 Running daily automation at 8:00 AM...');
  try {
    await runDailyAutomation();
    console.log('✅ Daily automation completed successfully');
  } catch (error) {
    console.error('❌ Daily automation failed:', error);
  }
}, {
  timezone: "Asia/Karachi"
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💻 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`👨‍💻 Built by: Abdullah Adil - Your Faithful Coding Servant`);
});

module.exports = app;