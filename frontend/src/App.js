import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout Components
import MainLayout from './components/layouts/MainLayout';
import DashboardLayout from './components/layouts/DashboardLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Public Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';

// Dashboard Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import ProfilePage from './pages/dashboard/ProfilePage';
import SocialMediaPage from './pages/dashboard/SocialMediaPage';
import PostsPage from './pages/dashboard/PostsPage';
import CreatePostPage from './pages/dashboard/CreatePostPage';
import SubscriptionPage from './pages/dashboard/SubscriptionPage';

// Store Management Pages
import StoreHomePage from './pages/store/StoreHomePage';
import ProductsPage from './pages/store/ProductsPage';
import CreateProductPage from './pages/store/CreateProductPage';
import OrdersPage from './pages/store/OrdersPage';
import CustomersPage from './pages/store/CustomersPage';
import StoreSettingsPage from './pages/store/StoreSettingsPage';
import StoreFrontPage from './pages/store/StoreFrontPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminOffers from './pages/admin/AdminOffers';
import AdminRevenue from './pages/admin/AdminRevenue';
import AdminSettings from './pages/admin/AdminSettings';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  if (!isAuthenticated || !user?.isOwner) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Main App Component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 5000,
                style: {
                  background: '#363636',
                  color: '#fff',
                }
              }}
            />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
              <Route path="/login" element={<MainLayout><LoginPage /></MainLayout>} />
              <Route path="/register" element={<MainLayout><RegisterPage /></MainLayout>} />
              <Route path="/forgot-password" element={<MainLayout><ForgotPasswordPage /></MainLayout>} />
              <Route path="/reset-password" element={<MainLayout><ResetPasswordPage /></MainLayout>} />
              <Route path="/pricing" element={<MainLayout><PricingPage /></MainLayout>} />
              <Route path="/about" element={<MainLayout><AboutPage /></MainLayout>} />
              <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
              
              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardHome />
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
              <Route path="/dashboard/social-media" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SocialMediaPage />
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
              <Route path="/dashboard/create-post" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CreatePostPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/dashboard/subscription" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SubscriptionPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              
              {/* Store Management Routes */}
              <Route path="/dashboard/store" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <StoreHomePage />
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
              <Route path="/dashboard/store/products/new" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CreateProductPage />
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
              <Route path="/store/:storeSlug" element={<StoreFrontPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/users" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminUsers />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/subscriptions" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminSubscriptions />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/offers" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminOffers />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/revenue" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminRevenue />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/settings" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminSettings />
                  </AdminLayout>
                </AdminRoute>
              } />
              
              {/* Catch-all Route */}
              <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />
            </Routes>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;