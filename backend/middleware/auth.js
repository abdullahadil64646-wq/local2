const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const EnhancedSubscription = require('../models/EnhancedSubscription');
const redis = require('redis');
const requestIp = require('request-ip');
const geoip = require('geoip-lite');
const rateLimit = require('express-rate-limit');

// Initialize Redis client for session management
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        console.error('Redis connection refused');
        return new Error('The server refused the connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        return new Error('Retry time exhausted');
      }
      if (options.attempt > 10) {
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000);
    }
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected for session management');
  });
}

// JWT Configuration
const JWT_CONFIG = {
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  resetTokenExpiry: process.env.JWT_RESET_EXPIRY || '1h',
  verificationTokenExpiry: process.env.JWT_VERIFICATION_EXPIRY || '24h',
  issuer: 'saaslocal.pk',
  audience: 'saaslocal-users'
};

// Rate limiting configurations
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return requestIp.getClientIp(req) || req.connection.remoteAddress;
  },
  skip: (req) => {
    // Skip rate limiting for certain routes in development
    return process.env.NODE_ENV === 'development' && req.path.includes('/verify');
  }
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again in 15 minutes',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = requestIp.getClientIp(req) || req.connection.remoteAddress;
    const email = req.body.email || '';
    return `${ip}-${email}`;
  }
});

// Advanced security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove powered by header
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Generate JWT tokens with enhanced security
const generateTokens = async (userId, sessionId = null) => {
  try {
    const user = await User.findById(userId).select('email role isActive lastLogin');
    
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Generate unique session ID if not provided
    if (!sessionId) {
      sessionId = crypto.randomBytes(32).toString('hex');
    }

    // Access token payload
    const accessPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      sessionId: sessionId,
      tokenType: 'access',
      iat: Math.floor(Date.now() / 1000),
      iss: JWT_CONFIG.issuer,
      aud: JWT_CONFIG.audience
    };

    // Refresh token payload
    const refreshPayload = {
      userId: user._id,
      sessionId: sessionId,
      tokenType: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      iss: JWT_CONFIG.issuer,
      aud: JWT_CONFIG.audience
    };

    // Generate tokens
    const accessToken = jwt.sign(accessPayload, process.env.JWT_SECRET, {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign(refreshPayload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      algorithm: 'HS256'
    });

    // Store session in Redis if available
    if (redisClient && redisClient.connected) {
      const sessionData = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        isActive: true
      };

      await redisClient.setex(
        `session:${sessionId}`,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(sessionData)
      );
    }

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      tokenType: 'Bearer'
    };

  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate authentication tokens');
  }
};

// Verify and decode JWT tokens
const verifyToken = async (token, tokenType = 'access') => {
  try {
    const secret = tokenType === 'refresh' ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
    
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    // Additional token validation
    if (decoded.tokenType !== tokenType) {
      throw new Error('Invalid token type');
    }

    // Check if session exists in Redis
    if (redisClient && redisClient.connected && decoded.sessionId) {
      const sessionData = await redisClient.get(`session:${decoded.sessionId}`);
      
      if (!sessionData) {
        throw new Error('Session expired or invalid');
      }

      const session = JSON.parse(sessionData);
      
      if (!session.isActive) {
        throw new Error('Session is inactive');
      }

      // Update last access time
      session.lastAccess = new Date().toISOString();
      await redisClient.setex(
        `session:${decoded.sessionId}`,
        7 * 24 * 60 * 60,
        JSON.stringify(session)
      );
    }

    return decoded;

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not active');
    }
    
    throw error;
  }
};

// Main authentication middleware
const auth = async (req, res, next) => {
  try {
    // Extract token from header
    let token = req.header('Authorization');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Remove Bearer prefix
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    // Verify token
    const decoded = await verifyToken(token, 'access');
    
    // Get user from database with fresh data
    const user = await User.findById(decoded.userId)
      .select('-password -refreshTokens')
      .populate('subscription');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check for account suspension
    if (user.suspendedUntil && new Date() < user.suspendedUntil) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily suspended.',
        suspendedUntil: user.suspendedUntil,
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Log security info
    const clientIp = requestIp.getClientIp(req);
    const geo = geoip.lookup(clientIp);
    
    // Update user's last activity
    user.lastLogin = new Date();
    user.lastIpAddress = clientIp;
    
    if (geo) {
      user.lastLocation = {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone
      };
    }

    // Save without triggering password hashing
    await User.updateOne(
      { _id: user._id },
      {
        lastLogin: user.lastLogin,
        lastIpAddress: user.lastIpAddress,
        lastLocation: user.lastLocation
      }
    );

    // Attach user and session info to request
    req.user = user;
    req.sessionId = decoded.sessionId;
    req.tokenData = decoded;
    req.clientIp = clientIp;
    req.geoLocation = geo;

    next();

  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle specific error cases
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please refresh your session.',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.message === 'Session expired or invalid') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.',
        code: 'SESSION_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      code: 'INVALID_TOKEN'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.header('Authorization');
    
    if (!token || !token.startsWith('Bearer ')) {
      return next();
    }

    token = token.slice(7);
    const decoded = await verifyToken(token, 'access');
    
    const user = await User.findById(decoded.userId)
      .select('-password -refreshTokens')
      .populate('subscription');

    if (user && user.isActive) {
      req.user = user;
      req.sessionId = decoded.sessionId;
      req.tokenData = decoded;
    }

    next();

  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

// Admin role requirement
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
      code: 'ADMIN_ACCESS_REQUIRED'
    });
  }

  next();
};

// Owner role requirement
const requireOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Owner access required.',
      code: 'OWNER_ACCESS_REQUIRED'
    });
  }

  next();
};

// Subscription plan requirement
const requirePlan = (planLevel) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      const subscription = await EnhancedSubscription.findOne({ user: req.user._id });

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required.',
          code: 'SUBSCRIPTION_REQUIRED',
          requiredPlan: planLevel
        });
      }

      // Check if subscription is active
      if (subscription.billing.status !== 'active' && !subscription.trial.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required.',
          code: 'SUBSCRIPTION_INACTIVE',
          currentStatus: subscription.billing.status
        });
      }

      // Plan hierarchy: basic < pro < premium
      const planHierarchy = {
        'basic': 1,
        'pro': 2,
        'premium': 3
      };

      const userPlanLevel = planHierarchy[subscription.plan] || 0;
      const requiredPlanLevel = planHierarchy[planLevel] || 0;

      if (userPlanLevel < requiredPlanLevel) {
        return res.status(403).json({
          success: false,
          message: `${planLevel} plan required for this feature.`,
          code: 'PLAN_UPGRADE_REQUIRED',
          currentPlan: subscription.plan,
          requiredPlan: planLevel
        });
      }

      req.subscription = subscription;
      next();

    } catch (error) {
      console.error('Plan requirement check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking subscription status.',
        code: 'SUBSCRIPTION_CHECK_ERROR'
      });
    }
  };
};

// Feature access control
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      const subscription = await EnhancedSubscription.findOne({ user: req.user._id });

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required.',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      // Check if feature is available in current plan
      const hasFeature = subscription.hasFeature(featureName);

      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          message: `This feature is not available in your ${subscription.plan} plan.`,
          code: 'FEATURE_NOT_AVAILABLE',
          featureName: featureName,
          currentPlan: subscription.plan
        });
      }

      req.subscription = subscription;
      next();

    } catch (error) {
      console.error('Feature requirement check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking feature availability.',
        code: 'FEATURE_CHECK_ERROR'
      });
    }
  };
};

// Usage limit check
const checkUsageLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      const subscription = await EnhancedSubscription.findOne({ user: req.user._id });

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required.',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      // Check specific usage limits
      let canUse = false;
      let errorMessage = '';

      switch (limitType) {
        case 'posts':
          canUse = subscription.canGeneratePost();
          errorMessage = `You've reached your monthly limit of ${subscription.features.monthlyPosts} posts.`;
          break;
        case 'videos':
          canUse = subscription.canGenerateVideo();
          errorMessage = `You've reached your monthly limit of ${subscription.features.monthlyVideos} videos.`;
          break;
        case 'images':
          canUse = subscription.canGenerateImage();
          errorMessage = `You've reached your monthly limit of ${subscription.features.monthlyImages} images.`;
          break;
        case 'storage':
          canUse = subscription.hasStorageAvailable(1); // 1MB default check
          errorMessage = `You've reached your storage limit of ${subscription.features.storageLimit}GB.`;
          break;
        default:
          canUse = true;
      }

      if (!canUse) {
        return res.status(403).json({
          success: false,
          message: errorMessage,
          code: 'USAGE_LIMIT_REACHED',
          limitType: limitType,
          currentUsage: subscription.usage.currentMonth,
          limits: subscription.features
        });
      }

      req.subscription = subscription;
      next();

    } catch (error) {
      console.error('Usage limit check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking usage limits.',
        code: 'USAGE_CHECK_ERROR'
      });
    }
  };
};

// Email verification requirement
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required.',
      code: 'EMAIL_VERIFICATION_REQUIRED'
    });
  }

  next();
};

// Device/IP validation for sensitive operations
const validateDevice = async (req, res, next) => {
  try {
    const currentIp = requestIp.getClientIp(req);
    const userAgent = req.get('User-Agent');
    
    // Create device fingerprint
    const deviceFingerprint = crypto
      .createHash('sha256')
      .update(`${currentIp}${userAgent}`)
      .digest('hex');

    // Store device info for suspicious activity detection
    if (req.user.lastIpAddress && req.user.lastIpAddress !== currentIp) {
      const geo = geoip.lookup(currentIp);
      const lastGeo = req.user.lastLocation;

      // Check for suspicious location change
      if (lastGeo && geo && lastGeo.country !== geo.country) {
        console.warn(`Suspicious login detected for user ${req.user.email}: Country change from ${lastGeo.country} to ${geo.country}`);
        
        // In production, you might want to require additional verification
        // For now, we'll just log it
      }
    }

    req.deviceFingerprint = deviceFingerprint;
    req.currentIp = currentIp;
    
    next();

  } catch (error) {
    console.error('Device validation error:', error);
    next(); // Continue despite validation error
  }
};

// Generate password reset token
const generateResetToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const resetPayload = {
      userId: user._id,
      email: user.email,
      tokenType: 'reset',
      iat: Math.floor(Date.now() / 1000),
      iss: JWT_CONFIG.issuer,
      aud: JWT_CONFIG.audience
    };

    const resetToken = jwt.sign(resetPayload, process.env.JWT_RESET_SECRET, {
      expiresIn: JWT_CONFIG.resetTokenExpiry,
      algorithm: 'HS256'
    });

    // Store reset token hash in database
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return resetToken;

  } catch (error) {
    console.error('Reset token generation error:', error);
    throw new Error('Failed to generate reset token');
  }
};

// Verify password reset token
const verifyResetToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    if (decoded.tokenType !== 'reset') {
      throw new Error('Invalid token type');
    }

    // Check if token exists in database
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      _id: decoded.userId,
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Token is invalid or has expired');
    }

    return { user, decoded };

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Reset token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid reset token');
    }
    
    throw error;
  }
};

// Generate email verification token
const generateVerificationToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const verificationPayload = {
      userId: user._id,
      email: user.email,
      tokenType: 'verification',
      iat: Math.floor(Date.now() / 1000),
      iss: JWT_CONFIG.issuer,
      aud: JWT_CONFIG.audience
    };

    const verificationToken = jwt.sign(verificationPayload, process.env.JWT_VERIFICATION_SECRET, {
      expiresIn: JWT_CONFIG.verificationTokenExpiry,
      algorithm: 'HS256'
    });

    // Store verification token hash in database
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    user.emailVerificationToken = verificationTokenHash;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    return verificationToken;

  } catch (error) {
    console.error('Verification token generation error:', error);
    throw new Error('Failed to generate verification token');
  }
};

// Verify email verification token
const verifyEmailToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    if (decoded.tokenType !== 'verification') {
      throw new Error('Invalid token type');
    }

    // Check if token exists in database
    const verificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      _id: decoded.userId,
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Token is invalid or has expired');
    }

    return { user, decoded };

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Verification token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid verification token');
    }
    
    throw error;
  }
};

// Logout and invalidate session
const logout = async (req, res, next) => {
  try {
    const sessionId = req.sessionId;
    
    if (sessionId && redisClient && redisClient.connected) {
      await redisClient.del(`session:${sessionId}`);
    }

    // Clear any remember me tokens
    if (req.user) {
      await User.updateOne(
        { _id: req.user._id },
        { $unset: { refreshTokens: 1 } }
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};

// Refresh access token
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    const decoded = await verifyToken(refreshToken, 'refresh');
    
    // Generate new access token
    const tokens = await generateTokens(decoded.userId, decoded.sessionId);

    res.json({
      success: true,
      ...tokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};

// Activity logging middleware
const logActivity = (action) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        const activityLog = {
          userId: req.user._id,
          action: action,
          ipAddress: requestIp.getClientIp(req),
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
          success: true // Will be updated in error cases
        };

        // Store in database or logging service
        // For now, just log to console
        console.log(`User Activity: ${req.user.email} - ${action} from ${activityLog.ipAddress}`);
        
        req.activityLog = activityLog;
      }
      
      next();

    } catch (error) {
      console.error('Activity logging error:', error);
      next(); // Continue despite logging error
    }
  };
};

module.exports = {
  // Core authentication
  auth,
  optionalAuth,
  
  // Role-based access
  requireAdmin,
  requireOwner,
  requirePlan,
  requireFeature,
  requireEmailVerification,
  
  // Usage limits
  checkUsageLimit,
  
  // Security
  securityHeaders,
  validateDevice,
  
  // Rate limiting
  authRateLimiter,
  loginRateLimiter,
  
  // Token management
  generateTokens,
  verifyToken,
  generateResetToken,
  verifyResetToken,
  generateVerificationToken,
  verifyEmailToken,
  refreshAccessToken,
  
  // Session management
  logout,
  
  // Activity logging
  logActivity,
  
  // Utilities
  JWT_CONFIG
};