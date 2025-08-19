import React from 'react';

const createPlaceholderPage = (pageName, description) => {
  return () => (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{pageName}</h1>
          <p className="text-gray-600 mb-8">{description}</p>
          <div className="bg-white rounded-lg shadow p-8">
            <p className="text-gray-500">This page is under development...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PostsPage = createPlaceholderPage('Posts', 'Manage your social media posts');
export const SocialMediaPage = createPlaceholderPage('Social Media', 'Connect and manage your social accounts');
export const AnalyticsPage = createPlaceholderPage('Analytics', 'View your business analytics');
export const SubscriptionPage = createPlaceholderPage('Subscription', 'Manage your subscription plan');
export const ProfilePage = createPlaceholderPage('Profile', 'Update your profile information');
export const SettingsPage = createPlaceholderPage('Settings', 'Configure your account settings');
export const NotificationsPage = createPlaceholderPage('Notifications', 'View your notifications');

// Store pages
export const StoreHomePage = createPlaceholderPage('Store Home', 'Your ecommerce store dashboard');
export const ProductsPage = createPlaceholderPage('Products', 'Manage your products');
export const OrdersPage = createPlaceholderPage('Orders', 'Manage customer orders');
export const CustomersPage = createPlaceholderPage('Customers', 'Manage your customers');
export const StoreSettingsPage = createPlaceholderPage('Store Settings', 'Configure your store');

// AI pages
export const AIContentPage = createPlaceholderPage('AI Content', 'Generate content with AI');
export const AIImagesPage = createPlaceholderPage('AI Images', 'Generate images with AI');
export const AIVideosPage = createPlaceholderPage('AI Videos', 'Generate videos with AI');
export const AIHashtagsPage = createPlaceholderPage('AI Hashtags', 'Generate hashtags with AI');

// Public pages
export const LandingPage = createPlaceholderPage('Home', 'Welcome to SaaS Local');
export const PricingPage = createPlaceholderPage('Pricing', 'Choose your plan');
export const FeaturesPage = createPlaceholderPage('Features', 'Explore our features');