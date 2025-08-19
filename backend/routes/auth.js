const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const User = require('../models/User');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const EcommerceStore = require('../models/EcommerceStore');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const {
  auth,
  generateTokens,
  generateResetToken,
  verifyResetToken,
  generateVerificationToken,
  verifyEmailToken,
  loginRateLimiter,
  authRateLimiter,
  securityHeaders,
  validateDevice,
  logActivity,
  refreshAccessToken
} = require('../middleware/auth');

const router = express.Router();

// Apply security headers to all routes
router.use(securityHeaders);

// Enhanced rate limiting for authentication routes
const strictLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many failed login attempts. Please try again in 15 minutes.',
    retryAfter: 15 * 60 * 1000
  }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signups per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP. Please try again in an hour.',
    retryAfter: 60 * 60 * 1000
  }
});

// Speed limiting for brute force protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per window at full speed
  delayMs: 500 // Add 500ms delay per request after delayAfter
});

// Input validation schemas
const validateSignupInput = (data) => {
  const errors = [];

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (data.name && data.name.length > 50) {
    errors.push('Name must be less than 50 characters');
  }

  // Email validation
  if (!data.email || !validator.isEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }

  // Password validation
  if (!data.password) {
    errors.push('Password is required');
  } else {
    if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(data.password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(data.password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(data.password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(data.password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
  }

  // Business name validation
  if (data.businessName && data.businessName.length > 100) {
    errors.push('Business name must be less than 100 characters');
  }

  // Phone validation (Pakistani format)
  if (data.phone && !validator.isMobilePhone(data.phone, 'en-PK')) {
    errors.push('Please provide a valid Pakistani phone number');
  }

  return errors;
};

const validateLoginInput = (data) => {
  const errors = [];

  if (!data.email || !validator.isEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }

  if (!data.password || data.password.length < 1) {
    errors.push('Password is required');
  }

  return errors;
};

// @route   POST /api/auth/signup
// @desc    Register a new user with enhanced security
// @access  Public
router.post('/signup', signupLimiter, speedLimiter, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      businessName,
      businessType,
      businessDescription,
      phone,
      address,
      referralCode,
      acceptTerms,
      acceptPrivacy,
      marketingEmails
    } = req.body;

    // Input validation
    const validationErrors = validateSignupInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Terms acceptance validation
    if (!acceptTerms) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the Terms of Service to continue'
      });
    }

    if (!acceptPrivacy) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the Privacy Policy to continue'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Check for suspicious patterns
    const recentSignups = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      registrationIp: req.ip
    });

    if (recentSignups >= 5) {
      console.warn(`Suspicious signup activity from IP: ${req.ip}`);
      return res.status(429).json({
        success: false,
        message: 'Too many signups from this location. Please try again tomorrow.'
      });
    }

    // Process referral code
    let referredBy = null;
    if (referralCode) {
      const referringUser = await User.findOne({ referralCode: referralCode });
      if (referringUser) {
        referredBy = referringUser._id;
      }
    }

    // Hash password with enhanced security
  // Password hashing handled by User schema pre-save hook; use raw password here

    // Generate unique identifiers
    const userReferralCode = crypto.randomBytes(8).toString('hex').toUpperCase();
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user with comprehensive data
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
  password: password,
      businessName: businessName?.trim() || name.trim(),
      businessType: businessType || 'other',
      businessDescription: businessDescription?.trim(),
      phone: phone?.trim(),
      address: {
        street: address?.street?.trim(),
        city: address?.city?.trim(),
        state: address?.state?.trim(),
        zipCode: address?.zipCode?.trim(),
        country: address?.country?.trim() || 'Pakistan'
      },
      referralCode: userReferralCode,
      referredBy: referredBy,
      preferences: {
        marketingEmails: marketingEmails || false,
        autoContentGeneration: false,
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        language: 'en',
        timezone: 'Asia/Karachi'
      },
      security: {
        twoFactorEnabled: false,
        loginAlerts: true,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        passwordLastChanged: new Date()
      },
      registrationIp: req.ip,
      registrationUserAgent: req.get('User-Agent'),
      isActive: true,
      isEmailVerified: false,
      emailVerificationToken: crypto.createHash('sha256').update(emailVerificationToken).digest('hex'),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      acceptedTermsAt: new Date(),
      acceptedPrivacyAt: new Date()
    });

    await newUser.save();

    // Create basic subscription (trial)
    const subscription = new EnhancedSubscription({
      user: newUser._id,
      plan: 'basic',
      billing: {
        status: 'trial',
        currentPlan: {
          name: 'Basic Trial',
          price: 0,
          currency: 'PKR'
        }
      },
      trial: {
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        daysRemaining: 14
      },
      features: {
        monthlyPosts: 50,
        monthlyVideos: 10,
        monthlyImages: 100,
        socialPlatforms: 2,
        maxProducts: 25,
        storageLimit: 1, // 1GB
        analytics: false,
        customBranding: false,
        prioritySupport: false,
        apiAccess: false
      },
      usage: {
        currentMonth: {
          postsGenerated: 0,
          videosGenerated: 0,
          imagesGenerated: 0,
          storeViews: 0,
          storageUsed: 0
        }
      }
    });

    await subscription.save();

    // Create basic e-commerce store
    const store = new EcommerceStore({
      owner: newUser._id,
      storeSettings: {
        name: newUser.businessName,
        description: newUser.businessDescription || `Welcome to ${newUser.businessName}! We provide quality products and services.`,
        logo: null,
        banner: null,
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        currency: 'PKR',
        language: 'en',
        timezone: 'Asia/Karachi',
        isActive: true,
        featuredCategories: [],
        contact: {
          email: newUser.email,
          phone: newUser.phone,
          address: newUser.address
        },
        socialMedia: {
          facebook: '',
          instagram: '',
          twitter: '',
          whatsapp: newUser.phone
        },
        policies: {
          shipping: 'Standard shipping within Pakistan. 3-5 business days delivery.',
          returns: '7-day return policy for unused items in original packaging.',
          privacy: 'We respect your privacy and protect your personal information.'
        }
      },
      storeUrl: `${newUser.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      products: [],
      categories: [],
      orders: [],
      customers: [],
      analytics: {
        totalViews: 0,
        totalOrders: 0,
        totalRevenue: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        topProducts: [],
        monthlyStats: []
      },
      isActive: true
    });

    await store.save();

    // Update user with store reference
    newUser.store = store._id;
    await newUser.save();

    // Generate JWT tokens
    const tokens = await generateTokens(newUser._id);

    // Send verification email
    try {
      await emailService.sendEmailVerification(newUser, emailVerificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail signup if email fails
    }

    // Handle referral bonus
    if (referredBy) {
      try {
        const referringUser = await User.findById(referredBy);
        if (referringUser) {
          // Add referral bonus (could be credits, extended trial, etc.)
          referringUser.referralStats.totalReferrals += 1;
          referringUser.referralStats.activeReferrals += 1;
          await referringUser.save();

          // Could also send notification email to referring user
          console.log(`User ${referringUser.email} earned a referral bonus for ${newUser.email}`);
        }
      } catch (referralError) {
        console.error('Referral processing error:', referralError);
      }
    }

    // Log successful signup
    console.log(`✅ New user registered: ${newUser.email} from ${req.ip}`);

    // Return success response (without password)
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      businessName: newUser.businessName,
      businessType: newUser.businessType,
      isEmailVerified: newUser.isEmailVerified,
      referralCode: newUser.referralCode,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please check your email for verification.',
      user: userResponse,
      tokens: tokens,
      subscription: {
        plan: subscription.plan,
        trial: subscription.trial,
        features: subscription.features
      },
      store: {
        storeUrl: store.storeUrl,
        name: store.storeSettings.name
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `An account with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user with enhanced security
// @access  Public
router.post('/login', strictLoginLimiter, speedLimiter, validateDevice, async (req, res) => {
  try {
    const { email, password, rememberMe, twoFactorCode } = req.body;

    // Input validation
    const validationErrors = validateLoginInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Find user with security info
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password +security +loginAttempts +lockUntil');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked. Try again in ${lockTimeRemaining} minutes.`,
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        user.loginAttempts = 0;
        await user.save();
        
        return res.status(423).json({
          success: false,
          message: 'Too many failed login attempts. Account locked for 30 minutes.',
          code: 'ACCOUNT_LOCKED'
        });
      }
      
      await user.save();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        attemptsRemaining: 5 - user.loginAttempts
      });
    }

    // Check 2FA if enabled
    if (user.security.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(202).json({
          success: false,
          message: 'Two-factor authentication code required',
          code: 'TWO_FACTOR_REQUIRED',
          userId: user._id
        });
      }

      const isValidTwoFactor = speakeasy.totp.verify({
        secret: user.security.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2 // Allow 2 time steps tolerance
      });

      if (!isValidTwoFactor) {
        return res.status(401).json({
          success: false,
          message: 'Invalid two-factor authentication code',
          code: 'INVALID_TWO_FACTOR'
        });
      }
    }

    // Successful login - reset failed attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.lastIpAddress = req.ip;
    
    // Update location info
    if (req.geoLocation) {
      user.lastLocation = {
        country: req.geoLocation.country,
        region: req.geoLocation.region,
        city: req.geoLocation.city,
        timezone: req.geoLocation.timezone
      };
    }

    await user.save();

    // Generate tokens
    const tokens = await generateTokens(user._id);

    // Set secure cookies if remember me is enabled
    if (rememberMe) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      };

      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
    }

    // Get user's subscription and store info
    const [subscription, store] = await Promise.all([
      EnhancedSubscription.findOne({ user: user._id }),
      user.store ? require('../models/EcommerceStore').findById(user.store) : null
    ]);

    // Send login alert if enabled
    if (user.security.loginAlerts) {
      try {
        await emailService.sendLoginAlert(user, {
          ip: req.ip,
          location: req.geoLocation,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        });
      } catch (alertError) {
        console.error('Login alert email failed:', alertError);
      }
    }

    // Log successful login
    console.log(`✅ User logged in: ${user.email} from ${req.ip}`);

    // Prepare response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      businessName: user.businessName,
      businessType: user.businessType,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      referralCode: user.referralCode,
      socialMedia: user.socialMedia,
      preferences: user.preferences,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      tokens: tokens,
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.billing.status,
        trial: subscription.trial,
        features: subscription.features,
        usage: subscription.usage
      } : null,
      store: store ? {
        storeUrl: store.storeUrl,
        name: store.storeSettings.name,
        isActive: store.isActive
      } : null
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and invalidate session
// @access  Private
router.post('/logout', auth, logActivity('logout'), async (req, res) => {
  try {
    // Clear refresh tokens from database
    await User.updateOne(
      { _id: req.user._id },
      { $unset: { refreshTokens: 1 } }
    );

    // Clear cookies
    res.clearCookie('refreshToken');

    // Log logout
    console.log(`📤 User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token
// @access  Public
router.post('/refresh-token', refreshAccessToken);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', authRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    if (!user.isActive) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Check if a reset was requested recently
    if (user.passwordResetExpires && user.passwordResetExpires > Date.now()) {
      const timeRemaining = Math.ceil((user.passwordResetExpires - Date.now()) / (1000 * 60));
      return res.status(429).json({
        success: false,
        message: `Password reset already requested. Please wait ${timeRemaining} minutes before requesting again.`
      });
    }

    // Generate reset token
    const resetToken = await generateResetToken(user._id);

    // Send reset email
    try {
      await emailService.sendPasswordReset(user, resetToken);
    } catch (emailError) {
      console.error('Password reset email failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again.'
      });
    }

    // Log password reset request
    console.log(`🔐 Password reset requested for: ${user.email} from ${req.ip}`);

    res.json({
      success: true,
      message: 'Password reset link has been sent to your email address.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authRateLimiter, async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Validate password strength
    const passwordErrors = [];
    if (!/(?=.*[a-z])/.test(newPassword)) {
      passwordErrors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(newPassword)) {
      passwordErrors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(newPassword)) {
      passwordErrors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(newPassword)) {
      passwordErrors.push('Password must contain at least one special character');
    }

    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordErrors
      });
    }

    // Verify reset token
    const { user } = await verifyResetToken(token);

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password'
      });
    }

    // Hash new password
    const saltRounds = process.env.NODE_ENV === 'production' ? 14 : 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and clear reset tokens
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.security.passwordLastChanged = new Date();
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    // Invalidate all existing sessions by clearing refresh tokens
    await User.updateOne(
      { _id: user._id },
      { $unset: { refreshTokens: 1 } }
    );

    // Send password change confirmation email
    try {
      await emailService.sendPasswordChangeConfirmation(user);
    } catch (emailError) {
      console.error('Password change confirmation email failed:', emailError);
    }

    // Log password reset
    console.log(`🔐 Password reset completed for: ${user.email} from ${req.ip}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is invalid or has expired. Please request a new password reset.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Password reset failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email address
// @access  Public
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Verify email token
    const { user } = await verifyEmailToken(token);

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerifiedAt = new Date();

    await user.save();

    // Extend trial period as welcome bonus
    const subscription = await EnhancedSubscription.findOne({ user: user._id });
    if (subscription && subscription.trial.isActive) {
      subscription.trial.endDate = new Date(subscription.trial.endDate.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
      subscription.trial.daysRemaining += 7;
      await subscription.save();
    }

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    // Log email verification
    console.log(`✅ Email verified for: ${user.email}`);

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome bonus: 7 extra trial days added.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        emailVerifiedAt: user.emailVerifiedAt
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is invalid or has expired. Please request a new verification email.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Email verification failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Public
router.post('/resend-verification', authRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check if verification was sent recently
    if (user.emailVerificationExpires && user.emailVerificationExpires > Date.now()) {
      const timeRemaining = Math.ceil((user.emailVerificationExpires - Date.now()) / (1000 * 60));
      if (timeRemaining > 20) { // Allow resend only if more than 20 minutes remaining
        return res.status(429).json({
          success: false,
          message: `Verification email already sent. Please wait ${timeRemaining} minutes before requesting again.`
        });
      }
    }

    // Generate new verification token
    const verificationToken = await generateVerificationToken(user._id);

    // Send verification email
    try {
      await emailService.sendEmailVerification(user, verificationToken);
    } catch (emailError) {
      console.error('Verification email failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Verification email has been sent to your email address.'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email. Please try again.'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user data
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // Get user with populated subscription and store
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('subscription')
      .populate('store');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, logActivity('change_password'), async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    // Validate new password strength
    const passwordErrors = [];
    if (newPassword.length < 8) {
      passwordErrors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(newPassword)) {
      passwordErrors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(newPassword)) {
      passwordErrors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(newPassword)) {
      passwordErrors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(newPassword)) {
      passwordErrors.push('Password must contain at least one special character');
    }

    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordErrors
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password'
      });
    }

    // Hash new password
    const saltRounds = process.env.NODE_ENV === 'production' ? 14 : 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    user.security.passwordLastChanged = new Date();
    await user.save();

    // Send password change confirmation
    try {
      await emailService.sendPasswordChangeConfirmation(user);
    } catch (emailError) {
      console.error('Password change confirmation email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/setup-2fa
// @desc    Setup two-factor authentication
// @access  Private
router.post('/setup-2fa', auth, logActivity('setup_2fa'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.security.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is already enabled'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `SaaS Local (${user.email})`,
      issuer: 'SaaS Local',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not activated until verified)
    user.security.twoFactorSecret = secret.base32;
    user.security.twoFactorBackupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication setup initiated',
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
      backupCodes: user.security.twoFactorBackupCodes
    });

  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup two-factor authentication'
    });
  }
});

// @route   POST /api/auth/verify-2fa
// @desc    Verify and enable two-factor authentication
// @access  Private
router.post('/verify-2fa', auth, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Authentication code is required'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.security.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not set up'
      });
    }

    // Verify token
    const isValid = speakeasy.totp.verify({
      secret: user.security.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid authentication code'
      });
    }

    // Enable 2FA
    user.security.twoFactorEnabled = true;
    user.security.twoFactorVerifiedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      backupCodes: user.security.twoFactorBackupCodes
    });

  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify two-factor authentication'
    });
  }
});

// @route   POST /api/auth/disable-2fa
// @desc    Disable two-factor authentication
// @access  Private
router.post('/disable-2fa', auth, logActivity('disable_2fa'), async (req, res) => {
  try {
    const { password, backupCode } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user.security.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not enabled'
      });
    }

    // Verify password or backup code
    let isValid = false;

    if (password) {
      isValid = await bcrypt.compare(password, user.password);
    } else if (backupCode) {
      isValid = user.security.twoFactorBackupCodes.includes(backupCode.toUpperCase());
      if (isValid) {
        // Remove used backup code
        user.security.twoFactorBackupCodes = user.security.twoFactorBackupCodes.filter(
          code => code !== backupCode.toUpperCase()
        );
      }
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password or backup code'
      });
    }

    // Disable 2FA
    user.security.twoFactorEnabled = false;
    user.security.twoFactorSecret = undefined;
    user.security.twoFactorBackupCodes = [];
    user.security.twoFactorVerifiedAt = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });

  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable two-factor authentication'
    });
  }
});

module.exports = router;