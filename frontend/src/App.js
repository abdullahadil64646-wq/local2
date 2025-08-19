import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import components
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import ProtectedRoute from './components/common/ProtectedRoute';

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('./pages/auth/LoginPages'));
const SignupPage = React.lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/auth/ForgotPasswordPage'));
const VerifyEmailPage = React.lazy(() => import('./pages/auth/VerifyEmailPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/auth/ResetPasswordPage'));

// Dashboard pages
const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const CreatePostPage = React.lazy(() => import('./pages/dashboard/CreatePostPage'));
const PostsPage = React.lazy(() => import('./pages/dashboard/PostsPage'));
const SocialMediaPage = React.lazy(() => import('./pages/dashboard/SocialMediaPage'));
const StorePage = React.lazy(() => import('./pages/dashboard/StorePage'));
const AnalyticsPage = React.lazy(() => import('./pages/dashboard/AnalyticsPage'));
const SubscriptionPage = React.lazy(() => import('./pages/dashboard/SubscriptionPage'));
const ProfilePage = React.lazy(() => import('./pages/dashboard/ProfilePage'));
const SettingsPage = React.lazy(() => import('./pages/dashboard/SettingsPage'));
const NotificationsPage = React.lazy(() => import('./pages/dashboard/NotificationsPage'));

// Store pages
const StoreHomePage = React.lazy(() => import('./pages/store/StoreHomePage'));
const ProductsPage = React.lazy(() => import('./pages/store/ProductsPage'));
const OrdersPage = React.lazy(() => import('./pages/store/OrdersPage'));
const CustomersPage = React.lazy(() => import('./pages/store/CustomersPage'));
const StoreSettingsPage = React.lazy(() => import('./pages/store/StoreSettingsPage'));

// AI Tools pages
const AIContentPage = React.lazy(() => import('./pages/ai/AIContentPage'));
const AIImagesPage = React.lazy(() => import('./pages/ai/AIImagesPage'));
const AIVideosPage = React.lazy(() => import('./pages/ai/AIVideosPage'));
const AIHashtagsPage = React.lazy(() => import('./pages/ai/AIHashtagsPage'));

// Public pages
const LandingPage = React.lazy(() => import('./pages/public/LandingPage'));
const PricingPage = React.lazy(() => import('./pages/public/PricingPage'));
const FeaturesPage = React.lazy(() => import('./pages/public/FeaturesPage'));
const AboutPage = React.lazy(() => import('./pages/public/AboutPage'));
const ContactPage = React.lazy(() => import('./pages/public/ContactPage'));
const HelpPage = React.lazy(() => import('./pages/public/HelpPage'));

// Error pages
const NotFoundPage = React.lazy(() => import('./pages/errors/NotFoundPage'));
const ServerErrorPage = React.lazy(() => import('./pages/errors/ServerErrorPage'));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
      <div className="text-xl font-semibold text-gray-700 mb-2">SaaS Local</div>
      <div className="text-gray-500">Loading your Pakistani business platform...</div>
    </div>
  </div>
);

// Dashboard Layout Component
const DashboardLayout = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Public Layout Component
const PublicLayout = ({ children }) => (
  <div className="min-h-screen bg-white">
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  </div>
);

// Auth Layout Component
const AuthLayout = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

// Main App Component
const AppContent = () => {
  const { isLoading, isAuthenticated, user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show loading on initial app load
  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <>
      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 text-sm">
          ⚠️ You are offline. Some features may not work properly.
        </div>
      )}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <PublicLayout>
            <LandingPage />
          </PublicLayout>
        } />
        
        <Route path="/pricing" element={
          <PublicLayout>
            <PricingPage />
          </PublicLayout>
        } />
        
        <Route path="/features" element={
          <PublicLayout>
            <FeaturesPage />
          </PublicLayout>
        } />
        
        <Route path="/about" element={
          <PublicLayout>
            <AboutPage />
          </PublicLayout>
        } />
        
        <Route path="/contact" element={
          <PublicLayout>
            <ContactPage />
          </PublicLayout>
        } />
        
        <Route path="/help" element={
          <PublicLayout>
            <HelpPage />
          </PublicLayout>
        } />

        {/* Auth Routes */}
        <Route path="/login" element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        } />
        
        <Route path="/signup" element={
          <AuthLayout>
            <SignupPage />
          </AuthLayout>
        } />
        
        <Route path="/forgot-password" element={
          <AuthLayout>
            <ForgotPasswordPage />
          </AuthLayout>
        } />
        
        <Route path="/verify-email" element={
          <AuthLayout>
            <VerifyEmailPage />
          </AuthLayout>
        } />
        
        <Route path="/reset-password" element={
          <AuthLayout>
            <ResetPasswordPage />
          </AuthLayout>
        } />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Social Media & Content Routes */}
        <Route path="/dashboard/create-post" element={
          <ProtectedRoute>
            <DashboardLayout>
              <CreatePostPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/posts" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PostsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/social-media" element={
          <ProtectedRoute>
            <DashboardLayout>
              <SocialMediaPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Store Routes */}
        <Route path="/dashboard/store" element={
          <ProtectedRoute>
            <DashboardLayout>
              <StorePage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/store/products" element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProductsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/store/orders" element={
          <ProtectedRoute>
            <DashboardLayout>
              <OrdersPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/store/customers" element={
          <ProtectedRoute>
            <DashboardLayout>
              <CustomersPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/store/settings" element={
          <ProtectedRoute>
            <DashboardLayout>
              <StoreSettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Analytics Route */}
        <Route path="/dashboard/analytics" element={
          <ProtectedRoute requireFeature="analytics">
            <DashboardLayout>
              <AnalyticsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* AI Tools Routes (Premium Features) */}
        <Route path="/dashboard/ai/content" element={
          <ProtectedRoute requirePlan="pro">
            <DashboardLayout>
              <AIContentPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/ai/images" element={
          <ProtectedRoute requirePlan="pro">
            <DashboardLayout>
              <AIImagesPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/ai/videos" element={
          <ProtectedRoute requirePlan="premium">
            <DashboardLayout>
              <AIVideosPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/ai/hashtags" element={
          <ProtectedRoute requirePlan="pro">
            <DashboardLayout>
              <AIHashtagsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Account Management Routes */}
        <Route path="/dashboard/subscription" element={
          <ProtectedRoute>
            <DashboardLayout>
              <SubscriptionPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/profile" element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProfilePage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/settings" element={
          <ProtectedRoute>
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/notifications" element={
          <ProtectedRoute>
            <DashboardLayout>
              <NotificationsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Public Store Routes (Customer-facing) */}
        <Route path="/store/:storeUrl" element={
          <PublicLayout>
            <StoreHomePage />
          </PublicLayout>
        } />

        {/* Error Routes */}
        <Route path="/500" element={
          <PublicLayout>
            <ServerErrorPage />
          </PublicLayout>
        } />

        {/* 404 - Must be last */}
        <Route path="*" element={
          <PublicLayout>
            <NotFoundPage />
          </PublicLayout>
        } />
      </Routes>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            fontSize: '14px',
          },
          success: {
            style: {
              background: '#22c55e',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#22c55e',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
          loading: {
            style: {
              background: '#3b82f6',
            },
          },
        }}
      />
    </>
  );
};

// Main App with providers
const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
        
        {/* React Query Devtools - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;