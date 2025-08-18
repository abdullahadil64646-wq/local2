import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Login validation schema
const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please enter a valid email format'
    ),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: Yup.boolean(),
  twoFactorCode: Yup.string().when('showTwoFactor', {
    is: true,
    then: (schema) => schema
      .required('Two-factor code is required')
      .matches(/^\d{6}$/, 'Code must be 6 digits'),
    otherwise: (schema) => schema.notRequired()
  })
});

const LoginPage = () => {
  const { login, isLoginLoading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [locationInfo, setLocationInfo] = useState(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionWarning, setSessionWarning] = useState(false);

  // Refs
  const formRef = useRef();
  const passwordRef = useRef();
  const twoFactorRef = useRef();
  const sessionTimeoutRef = useRef();

  // Get redirect path
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Clear errors on component mount
  useEffect(() => {
    clearError();
    detectDeviceAndLocation();
    setupSecurityFeatures();
    
    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [clearError]);

  // Handle account blocking
  useEffect(() => {
    if (isBlocked && blockTimer > 0) {
      const timer = setInterval(() => {
        setBlockTimer(prev => {
          if (prev <= 1) {
            setIsBlocked(false);
            setLoginAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isBlocked, blockTimer]);

  // Activity monitoring for session timeout
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      if (sessionWarning) {
        setSessionWarning(false);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Check for inactivity every minute
    const inactivityTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const fifteenMinutes = 15 * 60 * 1000;
      const thirteenMinutes = 13 * 60 * 1000;

      if (timeSinceLastActivity > thirteenMinutes && !sessionWarning) {
        setSessionWarning(true);
        toast.error('Your session will expire in 2 minutes due to inactivity', {
          duration: 5000
        });
      }

      if (timeSinceLastActivity > fifteenMinutes) {
        // Auto-logout due to inactivity
        toast.error('Session expired due to inactivity');
        window.location.reload();
      }
    }, 60000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(inactivityTimer);
    };
  }, [lastActivity, sessionWarning]);

  // Detect device and location information
  const detectDeviceAndLocation = async () => {
    // Get device info
    const deviceData = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      deviceMemory: navigator.deviceMemory || 'Unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };

    setDeviceInfo(deviceData);

    // Get approximate location (IP-based)
    try {
      const response = await fetch('https://ipapi.co/json/');
      const locationData = await response.json();
      setLocationInfo(locationData);
    } catch (error) {
      console.log('Location detection failed:', error);
    }
  };

  // Setup security features
  const setupSecurityFeatures = () => {
    // Detect caps lock
    const handleKeyDown = (e) => {
      setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'));
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, setFieldError, setFieldValue }) => {
    try {
      if (isBlocked) {
        toast.error(`Account temporarily blocked. Try again in ${blockTimer} seconds.`);
        return;
      }

      // Prepare login data
      const loginData = {
        email: values.email.toLowerCase().trim(),
        password: values.password,
        rememberMe: values.rememberMe,
        deviceInfo: deviceInfo,
        locationInfo: locationInfo,
        timestamp: new Date().toISOString()
      };

      // Add two-factor code if required
      if (showTwoFactor && values.twoFactorCode) {
        loginData.twoFactorCode = values.twoFactorCode;
      }

      const result = await login(loginData);

      if (result.success) {
        // Successful login
        toast.success(`Welcome back! 🎉`, {
          duration: 4000,
          position: 'top-center'
        });

        // Reset attempts on success
        setLoginAttempts(0);
        setIsBlocked(false);

        // Navigate to intended destination
        navigate(from, { replace: true });
      }

    } catch (error) {
      console.error('Login error:', error);
      
      const errorData = error.response?.data;
      
      // Handle specific error cases
      if (errorData?.code === 'TWO_FACTOR_REQUIRED') {
        setShowTwoFactor(true);
        setFieldValue('twoFactorCode', '');
        
        toast.info('Please enter your two-factor authentication code', {
          duration: 5000
        });
        
        // Focus on 2FA input
        setTimeout(() => {
          if (twoFactorRef.current) {
            twoFactorRef.current.focus();
          }
        }, 100);
        
      } else if (errorData?.code === 'ACCOUNT_LOCKED') {
        setIsBlocked(true);
        setBlockTimer(Math.ceil((errorData.lockUntil - Date.now()) / 1000));
        
        toast.error(`Account locked due to multiple failed attempts. Try again later.`, {
          duration: 8000
        });
        
      } else if (errorData?.code === 'ACCOUNT_DEACTIVATED') {
        toast.error('Your account has been deactivated. Please contact support.', {
          duration: 8000
        });
        
      } else if (errorData?.code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email address before logging in.', {
          duration: 6000
        });
        
        // Redirect to email verification
        navigate('/verify-email', { 
          state: { email: values.email }
        });
        
      } else if (errorData?.code === 'INVALID_CREDENTIALS') {
        // Handle failed login attempts
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          setIsBlocked(true);
          setBlockTimer(300); // 5 minutes
          
          toast.error('Too many failed attempts. Account blocked for 5 minutes.', {
            duration: 8000
          });
        } else {
          const attemptsRemaining = 5 - newAttempts;
          setFieldError('password', `Invalid credentials. ${attemptsRemaining} attempts remaining.`);
          
          toast.error(`Invalid email or password. ${attemptsRemaining} attempts remaining.`, {
            duration: 5000
          });
        }
        
        // Clear password field
        setFieldValue('password', '');
        if (passwordRef.current) {
          passwordRef.current.focus();
        }
        
      } else {
        // Generic error
        const message = errorData?.message || 'Login failed. Please try again.';
        toast.error(message, {
          duration: 5000
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Format block timer
  const formatBlockTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get device icon
  const getDeviceIcon = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return <DevicePhoneMobileIcon className="h-5 w-5" />;
    }
    return <ComputerDesktopIcon className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">SL</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">SaaS Local</h1>
                  <p className="text-sm text-gray-500">Pakistani Business Platform</p>
                </div>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back! 👋
            </h2>
            <p className="text-gray-600 mb-8">
              Sign in to your account to continue growing your business
            </p>
          </div>

          {/* Security Info */}
          {(deviceInfo.userAgent || locationInfo) && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">Security Information</span>
              </div>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex items-center">
                  {getDeviceIcon()}
                  <span className="ml-2">
                    {navigator.platform} • {navigator.language}
                  </span>
                </div>
                {locationInfo && (
                  <div className="flex items-center">
                    <GlobeAltIcon className="h-4 w-4" />
                    <span className="ml-2">
                      {locationInfo.city}, {locationInfo.country_name}
                    </span>
                  </div>
                )}
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4" />
                  <span className="ml-2">
                    {new Date().toLocaleString('en-PK', { 
                      timeZone: 'Asia/Karachi',
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })} PKT
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Account Blocked Warning */}
          {isBlocked && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-red-900">Account Temporarily Blocked</p>
                  <p className="text-xs text-red-700">
                    Too many failed attempts. Try again in {formatBlockTimer(blockTimer)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <Formik
            initialValues={{
              email: '',
              password: '',
              rememberMe: false,
              twoFactorCode: ''
            }}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
            innerRef={formRef}
          >
            {({ values, errors, touched, isSubmitting, setFieldValue }) => (
              <Form className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      disabled={isBlocked}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.email && touched.email 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-300'
                      } ${isBlocked ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                      placeholder="Enter your email address"
                    />
                  </div>
                  <ErrorMessage name="email" component="p" className="mt-1 text-sm text-red-600" />
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <Field
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      disabled={isBlocked}
                      ref={passwordRef}
                      className={`block w-full pl-10 pr-12 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.password && touched.password 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-300'
                      } ${isBlocked ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isBlocked}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                  
                  {/* Caps Lock Warning */}
                  {capsLockOn && (
                    <div className="mt-1 flex items-center text-sm text-amber-600">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      Caps Lock is on
                    </div>
                  )}
                  
                  <ErrorMessage name="password" component="p" className="mt-1 text-sm text-red-600" />
                </div>

                {/* Two-Factor Authentication Field */}
                {showTwoFactor && (
                  <div className="animate-fadeIn">
                    <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Two-Factor Authentication Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <Field
                        id="twoFactorCode"
                        name="twoFactorCode"
                        type="text"
                        maxLength="6"
                        ref={twoFactorRef}
                        disabled={isBlocked}
                        className={`block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center tracking-widest ${
                          errors.twoFactorCode && touched.twoFactorCode 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-300'
                        } ${isBlocked ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                        placeholder="000000"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the 6-digit code from your authenticator app
                    </p>
                    <ErrorMessage name="twoFactorCode" component="p" className="mt-1 text-sm text-red-600" />
                  </div>
                )}

                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Field
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      disabled={isBlocked}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
                    />
                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isBlocked || isLoginLoading}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200 ${
                    isSubmitting || isBlocked || isLoginLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105'
                  }`}
                >
                  {isSubmitting || isLoginLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Login Attempts Counter */}
                {loginAttempts > 0 && !isBlocked && (
                  <div className="text-center">
                    <p className="text-sm text-amber-600">
                      {5 - loginAttempts} attempts remaining before account lock
                    </p>
                  </div>
                )}
              </Form>
            )}
          </Formik>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Create your free account
              </Link>
            </p>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center mb-2">
              <ShieldCheckIcon className="h-4 w-4 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-900">Security & Privacy</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Your data is encrypted and secure</li>
              <li>• We never share your information</li>
              <li>• Session expires after 15 minutes of inactivity</li>
              <li>• All activities are logged for your security</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right Side - Marketing/Info */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:py-12 lg:px-20 xl:px-24 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-6">
            Grow Your Pakistani Business Online! 🇵🇰
          </h1>
          
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of Pakistani entrepreneurs using SaaS Local to automate their social media and boost sales
          </p>

          {/* Features List */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center text-left">
              <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-blue-100">AI-powered content generation in Urdu & English</span>
            </div>
            <div className="flex items-center text-left">
              <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-blue-100">Multi-platform posting (Facebook, Instagram, Twitter)</span>
            </div>
            <div className="flex items-center text-left">
              <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-blue-100">Complete e-commerce store setup</span>
            </div>
            <div className="flex items-center text-left">
              <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-blue-100">Pakistani business insights & analytics</span>
            </div>
            <div className="flex items-center text-left">
              <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-blue-100">24/7 customer support in Urdu</span>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
            <p className="text-blue-100 italic mb-4">
              "SaaS Local helped me grow my Karachi restaurant's online presence by 300% in just 2 months! The AI content generation understands Pakistani culture perfectly."
            </p>
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">AH</span>
              </div>
              <div className="text-left">
                <p className="text-white font-medium">Ahmed Hassan</p>
                <p className="text-blue-200 text-sm">Restaurant Owner, Karachi</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-white">2000+</div>
              <div className="text-blue-200 text-sm">Active Businesses</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">50K+</div>
              <div className="text-blue-200 text-sm">Posts Generated</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">₨10M+</div>
              <div className="text-blue-200 text-sm">Revenue Generated</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;