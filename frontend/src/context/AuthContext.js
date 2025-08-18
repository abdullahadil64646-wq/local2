import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Create Auth Context
const AuthContext = createContext();

// Action Types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SIGNUP_START: 'SIGNUP_START',
  SIGNUP_SUCCESS: 'SIGNUP_SUCCESS',
  SIGNUP_FAILURE: 'SIGNUP_FAILURE',
  UPDATE_USER: 'UPDATE_USER',
  UPDATE_SUBSCRIPTION: 'UPDATE_SUBSCRIPTION',
  UPDATE_STORE: 'UPDATE_STORE',
  REFRESH_TOKEN_START: 'REFRESH_TOKEN_START',
  REFRESH_TOKEN_SUCCESS: 'REFRESH_TOKEN_SUCCESS',
  REFRESH_TOKEN_FAILURE: 'REFRESH_TOKEN_FAILURE',
  VERIFY_EMAIL_START: 'VERIFY_EMAIL_START',
  VERIFY_EMAIL_SUCCESS: 'VERIFY_EMAIL_SUCCESS',
  VERIFY_EMAIL_FAILURE: 'VERIFY_EMAIL_FAILURE',
  UPDATE_NOTIFICATIONS: 'UPDATE_NOTIFICATIONS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USAGE: 'UPDATE_USAGE',
  UPDATE_TRIAL_STATUS: 'UPDATE_TRIAL_STATUS',
  CONNECT_SOCIAL_MEDIA: 'CONNECT_SOCIAL_MEDIA',
  DISCONNECT_SOCIAL_MEDIA: 'DISCONNECT_SOCIAL_MEDIA',
  UPDATE_BUSINESS_HEALTH: 'UPDATE_BUSINESS_HEALTH',
  SET_OFFLINE_MODE: 'SET_OFFLINE_MODE'
};

// Initial State
const initialState = {
  user: null,
  subscription: null,
  store: null,
  tokens: {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    expiresAt: localStorage.getItem('tokenExpiresAt')
  },
  isAuthenticated: false,
  isLoading: true,
  isLoginLoading: false,
  isSignupLoading: false,
  isRefreshing: false,
  error: null,
  notifications: [],
  unreadNotifications: 0,
  usage: {
    postsUsed: 0,
    postsLimit: 0,
    videosUsed: 0,
    videosLimit: 0,
    imagesUsed: 0,
    imagesLimit: 0,
    storageUsed: 0,
    storageLimit: 0
  },
  businessHealth: {
    score: 0,
    grade: 'D',
    factors: []
  },
  isOffline: false,
  lastSync: null,
  sessionTimeout: null
};

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoginLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        subscription: action.payload.subscription,
        store: action.payload.store,
        tokens: {
          accessToken: action.payload.tokens.accessToken,
          refreshToken: action.payload.tokens.refreshToken,
          expiresAt: action.payload.tokens.expiresAt
        },
        isAuthenticated: true,
        isLoginLoading: false,
        isLoading: false,
        error: null,
        usage: action.payload.usage || state.usage,
        lastSync: new Date().toISOString()
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        subscription: null,
        store: null,
        tokens: {
          accessToken: null,
          refreshToken: null,
          expiresAt: null
        },
        isAuthenticated: false,
        isLoginLoading: false,
        isLoading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.SIGNUP_START:
      return {
        ...state,
        isSignupLoading: true,
        error: null
      };

    case AUTH_ACTIONS.SIGNUP_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        subscription: action.payload.subscription,
        store: action.payload.store,
        tokens: {
          accessToken: action.payload.tokens.accessToken,
          refreshToken: action.payload.tokens.refreshToken,
          expiresAt: action.payload.tokens.expiresAt
        },
        isAuthenticated: true,
        isSignupLoading: false,
        isLoading: false,
        error: null,
        lastSync: new Date().toISOString()
      };

    case AUTH_ACTIONS.SIGNUP_FAILURE:
      return {
        ...state,
        isSignupLoading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
        tokens: {
          accessToken: null,
          refreshToken: null,
          expiresAt: null
        }
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
        lastSync: new Date().toISOString()
      };

    case AUTH_ACTIONS.UPDATE_SUBSCRIPTION:
      return {
        ...state,
        subscription: { ...state.subscription, ...action.payload },
        usage: action.payload.usage || state.usage,
        lastSync: new Date().toISOString()
      };

    case AUTH_ACTIONS.UPDATE_STORE:
      return {
        ...state,
        store: { ...state.store, ...action.payload },
        lastSync: new Date().toISOString()
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_START:
      return {
        ...state,
        isRefreshing: true
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        tokens: {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
          expiresAt: action.payload.expiresAt
        },
        isRefreshing: false,
        isAuthenticated: true
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_FAILURE:
      return {
        ...initialState,
        isLoading: false,
        isRefreshing: false,
        tokens: {
          accessToken: null,
          refreshToken: null,
          expiresAt: null
        }
      };

    case AUTH_ACTIONS.VERIFY_EMAIL_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.VERIFY_EMAIL_SUCCESS:
      return {
        ...state,
        user: { ...state.user, isEmailVerified: true, emailVerifiedAt: action.payload.emailVerifiedAt },
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.VERIFY_EMAIL_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.UPDATE_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload.notifications,
        unreadNotifications: action.payload.unreadCount
      };

    case AUTH_ACTIONS.UPDATE_USAGE:
      return {
        ...state,
        usage: { ...state.usage, ...action.payload }
      };

    case AUTH_ACTIONS.UPDATE_TRIAL_STATUS:
      return {
        ...state,
        subscription: {
          ...state.subscription,
          trial: { ...state.subscription?.trial, ...action.payload }
        }
      };

    case AUTH_ACTIONS.CONNECT_SOCIAL_MEDIA:
      return {
        ...state,
        user: {
          ...state.user,
          socialMedia: {
            ...state.user.socialMedia,
            [action.payload.platform]: {
              ...state.user.socialMedia?.[action.payload.platform],
              connected: true,
              connectedAt: new Date().toISOString(),
              ...action.payload.data
            }
          }
        }
      };

    case AUTH_ACTIONS.DISCONNECT_SOCIAL_MEDIA:
      return {
        ...state,
        user: {
          ...state.user,
          socialMedia: {
            ...state.user.socialMedia,
            [action.payload.platform]: {
              connected: false,
              disconnectedAt: new Date().toISOString()
            }
          }
        }
      };

    case AUTH_ACTIONS.UPDATE_BUSINESS_HEALTH:
      return {
        ...state,
        businessHealth: action.payload
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.SET_OFFLINE_MODE:
      return {
        ...state,
        isOffline: action.payload
      };

    default:
      return state;
  }
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Configure axios defaults
  useEffect(() => {
    axios.defaults.baseURL = process.env.REACT_APP_API_URL;
    
    // Request interceptor for adding auth token
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = state.tokens.accessToken;
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling token refresh
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (error.response.data?.code === 'TOKEN_EXPIRED' && state.tokens.refreshToken) {
            try {
              await refreshAccessToken();
              // Retry original request with new token
              const newToken = localStorage.getItem('accessToken');
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axios(originalRequest);
              }
            } catch (refreshError) {
              // Refresh failed, logout user
              logout();
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token or different error, logout user
            logout();
          }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup interceptors
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [state.tokens.accessToken, state.tokens.refreshToken]);

  // Check online/offline status
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: AUTH_ACTIONS.SET_OFFLINE_MODE, payload: false });
      // Sync data when coming back online
      if (state.isAuthenticated) {
        syncUserData();
      }
    };

    const handleOffline = () => {
      dispatch({ type: AUTH_ACTIONS.SET_OFFLINE_MODE, payload: true });
      toast.error('You are offline. Some features may not work.', {
        duration: 3000,
        position: 'bottom-center'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (!navigator.onLine) {
      dispatch({ type: AUTH_ACTIONS.SET_OFFLINE_MODE, payload: true });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.isAuthenticated]);

  // Auto-logout on token expiry
  useEffect(() => {
    if (state.tokens.expiresAt) {
      const expiryTime = new Date(state.tokens.expiresAt).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      if (timeUntilExpiry > 0) {
        const timeoutId = setTimeout(() => {
          toast.error('Your session has expired. Please log in again.');
          logout();
        }, timeUntilExpiry);

        return () => clearTimeout(timeoutId);
      } else if (state.isAuthenticated) {
        // Token already expired
        logout();
      }
    }
  }, [state.tokens.expiresAt, state.isAuthenticated]);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Auto-sync user data periodically
  useEffect(() => {
    if (state.isAuthenticated && !state.isOffline) {
      const syncInterval = setInterval(() => {
        syncUserData();
      }, 5 * 60 * 1000); // Sync every 5 minutes

      return () => clearInterval(syncInterval);
    }
  }, [state.isAuthenticated, state.isOffline]);

  // Initialize authentication state
  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const expiresAt = localStorage.getItem('tokenExpiresAt');

      if (!token) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }

      // Check if token is expired
      if (expiresAt && new Date(expiresAt) <= new Date()) {
        if (refreshToken) {
          await refreshAccessToken();
        } else {
          logout();
          return;
        }
      }

      // Get user data
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        const userData = response.data.user;
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: userData,
            subscription: userData.subscription,
            store: userData.store,
            tokens: {
              accessToken: token,
              refreshToken: refreshToken,
              expiresAt: expiresAt
            },
            usage: extractUsageData(userData.subscription)
          }
        });

        // Load notifications
        loadNotifications();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      
      // Try to refresh token if available
      if (localStorage.getItem('refreshToken')) {
        try {
          await refreshAccessToken();
          await initializeAuth(); // Retry after refresh
        } catch (refreshError) {
          logout();
        }
      } else {
        logout();
      }
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      const response = await axios.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        const { user, tokens, subscription, store } = response.data;
        
        // Store tokens
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        // Calculate expiry time
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
        localStorage.setItem('tokenExpiresAt', expiresAt);

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user,
            subscription,
            store,
            tokens: {
              ...tokens,
              expiresAt
            },
            usage: extractUsageData(subscription)
          }
        });

        // Load additional data
        loadNotifications();
        calculateBusinessHealth();

        toast.success(`Welcome back, ${user.name}! 🎉`, {
          duration: 4000,
          position: 'top-center'
        });

        return { success: true, user };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });

      toast.error(errorMessage, {
        duration: 5000,
        position: 'top-center'
      });

      throw error;
    }
  };

  // Signup function
  const signup = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SIGNUP_START });
      
      const response = await axios.post('/api/auth/signup', userData);
      
      if (response.data.success) {
        const { user, tokens, subscription, store } = response.data;
        
        // Store tokens
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        // Calculate expiry time
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        localStorage.setItem('tokenExpiresAt', expiresAt);

        dispatch({
          type: AUTH_ACTIONS.SIGNUP_SUCCESS,
          payload: {
            user,
            subscription,
            store,
            tokens: {
              ...tokens,
              expiresAt
            }
          }
        });

        toast.success(`Welcome to SaaS Local, ${user.name}! 🎉 Please verify your email to unlock all features.`, {
          duration: 6000,
          position: 'top-center'
        });

        return { success: true, user };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Signup failed. Please try again.';
      
      dispatch({
        type: AUTH_ACTIONS.SIGNUP_FAILURE,
        payload: errorMessage
      });

      toast.error(errorMessage, {
        duration: 5000,
        position: 'top-center'
      });

      throw error;
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout API if authenticated
      if (state.isAuthenticated) {
        await axios.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
      
      // Clear state
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      
      toast.success('Logged out successfully', {
        duration: 3000,
        position: 'top-center'
      });
    }
  }, [state.isAuthenticated]);

  // Refresh access token
  const refreshAccessToken = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.REFRESH_TOKEN_START });
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('/api/auth/refresh-token', {
        refreshToken
      });

      if (response.data.success) {
        const tokens = response.data;
        
        // Store new tokens
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        localStorage.setItem('tokenExpiresAt', expiresAt);

        dispatch({
          type: AUTH_ACTIONS.REFRESH_TOKEN_SUCCESS,
          payload: {
            ...tokens,
            expiresAt
          }
        });

        return tokens;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      
      dispatch({ type: AUTH_ACTIONS.REFRESH_TOKEN_FAILURE });
      
      // Clear tokens and logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
      
      throw error;
    }
  };

  // Verify email
  const verifyEmail = async (token) => {
    try {
      dispatch({ type: AUTH_ACTIONS.VERIFY_EMAIL_START });
      
      const response = await axios.post('/api/auth/verify-email', { token });
      
      if (response.data.success) {
        dispatch({
          type: AUTH_ACTIONS.VERIFY_EMAIL_SUCCESS,
          payload: {
            emailVerifiedAt: response.data.user.emailVerifiedAt
          }
        });

        toast.success('Email verified successfully! 🎉 Welcome bonus added to your account.', {
          duration: 5000,
          position: 'top-center'
        });

        // Reload user data to get updated subscription
        await syncUserData();

        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Email verification failed';
      
      dispatch({
        type: AUTH_ACTIONS.VERIFY_EMAIL_FAILURE,
        payload: errorMessage
      });

      toast.error(errorMessage, {
        duration: 5000,
        position: 'top-center'
      });

      throw error;
    }
  };

  // Update user profile
  const updateUser = async (updates) => {
    try {
      const response = await axios.put('/api/auth/profile', updates);
      
      if (response.data.success) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: response.data.user
        });

        toast.success('Profile updated successfully', {
          duration: 3000,
          position: 'top-center'
        });

        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Connect social media
  const connectSocialMedia = async (platform, credentials) => {
    try {
      const response = await axios.post(`/api/social-media/connect/${platform}`, credentials);
      
      if (response.data.success) {
        dispatch({
          type: AUTH_ACTIONS.CONNECT_SOCIAL_MEDIA,
          payload: {
            platform,
            data: response.data
          }
        });

        toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully! 🎉`, {
          duration: 4000,
          position: 'top-center'
        });

        // Recalculate business health
        calculateBusinessHealth();

        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || `Failed to connect ${platform}`;
      toast.error(errorMessage);
      throw error;
    }
  };

  // Disconnect social media
  const disconnectSocialMedia = async (platform) => {
    try {
      const response = await axios.delete(`/api/social-media/disconnect/${platform}`);
      
      if (response.data.success) {
        dispatch({
          type: AUTH_ACTIONS.DISCONNECT_SOCIAL_MEDIA,
          payload: { platform }
        });

        toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected`, {
          duration: 3000,
          position: 'top-center'
        });

        // Recalculate business health
        calculateBusinessHealth();

        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || `Failed to disconnect ${platform}`;
      toast.error(errorMessage);
      throw error;
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      const response = await axios.get('/api/dashboard/notifications');
      
      if (response.data.success) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_NOTIFICATIONS,
          payload: {
            notifications: response.data.notifications,
            unreadCount: response.data.unreadCount
          }
        });
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    }
  };

  // Sync user data
  const syncUserData = async () => {
    try {
      if (state.isOffline) return;

      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        const userData = response.data.user;
        
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: userData
        });

        if (userData.subscription) {
          dispatch({
            type: AUTH_ACTIONS.UPDATE_SUBSCRIPTION,
            payload: {
              ...userData.subscription,
              usage: extractUsageData(userData.subscription)
            }
          });
        }

        if (userData.store) {
          dispatch({
            type: AUTH_ACTIONS.UPDATE_STORE,
            payload: userData.store
          });
        }

        // Update business health
        calculateBusinessHealth();
      }
    } catch (error) {
      console.error('Sync user data error:', error);
      
      // If sync fails due to auth error, don't logout immediately
      // Let the axios interceptor handle it
      if (error.response?.status !== 401) {
        console.warn('Non-auth sync error, continuing...');
      }
    }
  };

  // Calculate business health score
  const calculateBusinessHealth = useCallback(() => {
    if (!state.user || !state.subscription) return;

    let score = 0;
    const factors = [];

    // Email verification (20 points)
    const emailScore = state.user.isEmailVerified ? 20 : 0;
    factors.push({
      factor: 'Email Verification',
      score: emailScore,
      maxScore: 20,
      status: emailScore === 20 ? 'good' : 'poor'
    });
    score += emailScore;

    // Social media connections (30 points)
    const connectedPlatforms = Object.keys(state.user.socialMedia || {}).filter(
      platform => state.user.socialMedia[platform]?.connected
    ).length;
    const socialScore = Math.min((connectedPlatforms / 3) * 30, 30);
    factors.push({
      factor: 'Social Media',
      score: Math.round(socialScore),
      maxScore: 30,
      status: socialScore >= 25 ? 'good' : socialScore >= 15 ? 'okay' : 'poor'
    });
    score += socialScore;

    // Business profile completion (25 points)
    let profileScore = 0;
    if (state.user.businessDescription) profileScore += 8;
    if (state.user.phone) profileScore += 7;
    if (state.user.address?.city) profileScore += 5;
    if (state.user.businessType && state.user.businessType !== 'other') profileScore += 5;
    factors.push({
      factor: 'Business Profile',
      score: profileScore,
      maxScore: 25,
      status: profileScore >= 20 ? 'good' : profileScore >= 12 ? 'okay' : 'poor'
    });
    score += profileScore;

    // Store setup (25 points)
    let storeScore = 0;
    if (state.store?.isActive) storeScore += 10;
    if (state.store?.products?.length > 0) storeScore += 15;
    factors.push({
      factor: 'Store Setup',
      score: storeScore,
      maxScore: 25,
      status: storeScore >= 20 ? 'good' : storeScore >= 10 ? 'okay' : 'poor'
    });
    score += storeScore;

    // Determine grade
    let grade = 'D';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';

    dispatch({
      type: AUTH_ACTIONS.UPDATE_BUSINESS_HEALTH,
      payload: {
        score: Math.round(score),
        grade,
        factors
      }
    });
  }, [state.user, state.subscription, state.store]);

  // Update usage stats
  const updateUsage = (usageType, amount = 1) => {
    const updatedUsage = { ...state.usage };
    
    switch (usageType) {
      case 'posts':
        updatedUsage.postsUsed += amount;
        break;
      case 'videos':
        updatedUsage.videosUsed += amount;
        break;
      case 'images':
        updatedUsage.imagesUsed += amount;
        break;
      case 'storage':
        updatedUsage.storageUsed += amount;
        break;
      default:
        break;
    }

    dispatch({
      type: AUTH_ACTIONS.UPDATE_USAGE,
      payload: updatedUsage
    });
  };

  // Check if user can access a feature
  const canAccessFeature = useCallback((feature) => {
    if (!state.subscription) return false;

    const features = state.subscription.features || {};
    
    switch (feature) {
      case 'analytics':
        return features.analytics === true;
      case 'customBranding':
        return features.customBranding === true;
      case 'prioritySupport':
        return features.prioritySupport === true;
      case 'apiAccess':
        return features.apiAccess === true;
      case 'multipleStores':
        return state.subscription.plan === 'premium';
      case 'advancedAutomation':
        return ['pro', 'premium'].includes(state.subscription.plan);
      case 'unlimitedPosts':
        return state.subscription.plan === 'premium';
      default:
        return true;
    }
  }, [state.subscription]);

  // Check if user can perform an action based on usage limits
  const canPerformAction = useCallback((action) => {
    if (!state.subscription) return false;

    const features = state.subscription.features || {};
    const usage = state.usage || {};

    switch (action) {
      case 'createPost':
        return usage.postsUsed < features.monthlyPosts;
      case 'generateVideo':
        return usage.videosUsed < features.monthlyVideos;
      case 'generateImage':
        return usage.imagesUsed < features.monthlyImages;
      case 'uploadFile':
        return usage.storageUsed < (features.storageLimit * 1024); // Convert GB to MB
      default:
        return true;
    }
  }, [state.subscription, state.usage]);

  // Get trial status
  const getTrialStatus = useCallback(() => {
    if (!state.subscription?.trial) return null;

    const trial = state.subscription.trial;
    const daysRemaining = trial.daysRemaining || 0;
    const isActive = trial.isActive && daysRemaining > 0;

    return {
      isActive,
      daysRemaining,
      endDate: trial.endDate,
      isExpiring: daysRemaining <= 3 && isActive,
      isExpired: daysRemaining <= 0
    };
  }, [state.subscription]);

  // Helper function to extract usage data from subscription
  const extractUsageData = (subscription) => {
    if (!subscription) return {};

    const usage = subscription.usage?.currentMonth || {};
    const features = subscription.features || {};

    return {
      postsUsed: usage.postsGenerated || 0,
      postsLimit: features.monthlyPosts || 0,
      videosUsed: usage.videosGenerated || 0,
      videosLimit: features.monthlyVideos || 0,
      imagesUsed: usage.imagesGenerated || 0,
      imagesLimit: features.monthlyImages || 0,
      storageUsed: usage.storageUsed || 0,
      storageLimit: (features.storageLimit || 0) * 1024 // Convert GB to MB
    };
  };

  // Memoized context value
  const contextValue = useMemo(() => ({
    // State
    user: state.user,
    subscription: state.subscription,
    store: state.store,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    isLoginLoading: state.isLoginLoading,
    isSignupLoading: state.isSignupLoading,
    isRefreshing: state.isRefreshing,
    error: state.error,
    notifications: state.notifications,
    unreadNotifications: state.unreadNotifications,
    usage: state.usage,
    businessHealth: state.businessHealth,
    isOffline: state.isOffline,
    lastSync: state.lastSync,

    // Actions
    login,
    signup,
    logout,
    verifyEmail,
    updateUser,
    connectSocialMedia,
    disconnectSocialMedia,
    loadNotifications,
    syncUserData,
    updateUsage,
    refreshAccessToken,

    // Utilities
    canAccessFeature,
    canPerformAction,
    getTrialStatus,
    calculateBusinessHealth,

    // Clear error
    clearError: () => dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR })
  }), [
    state,
    login,
    signup,
    logout,
    verifyEmail,
    updateUser,
    connectSocialMedia,
    disconnectSocialMedia,
    loadNotifications,
    syncUserData,
    updateUsage,
    refreshAccessToken,
    canAccessFeature,
    canPerformAction,
    getTrialStatus,
    calculateBusinessHealth
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// HOC for protected routes
export const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      // Redirect to login - you might want to use your routing solution here
      window.location.href = '/login';
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };
};

// HOC for email verification requirement
export const withEmailVerification = (WrappedComponent) => {
  return function EmailVerifiedComponent(props) {
    const { user, isAuthenticated } = useAuth();
    
    if (!isAuthenticated) {
      window.location.href = '/login';
      return null;
    }
    
    if (!user?.isEmailVerified) {
      window.location.href = '/verify-email';
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };
};

// HOC for subscription requirement
export const withSubscription = (requiredPlan = null) => {
  return function SubscriptionRequiredComponent(WrappedComponent) {
    return function (props) {
      const { subscription, isAuthenticated } = useAuth();
      
      if (!isAuthenticated) {
        window.location.href = '/login';
        return null;
      }
      
      if (!subscription) {
        window.location.href = '/dashboard/subscription';
        return null;
      }
      
      if (requiredPlan) {
        const planHierarchy = { basic: 1, pro: 2, premium: 3 };
        const userPlanLevel = planHierarchy[subscription.plan] || 0;
        const requiredPlanLevel = planHierarchy[requiredPlan] || 0;
        
        if (userPlanLevel < requiredPlanLevel) {
          window.location.href = `/dashboard/subscription?upgrade=${requiredPlan}`;
          return null;
        }
      }
      
      return <WrappedComponent {...props} />;
    };
  };
};

export default AuthContext;