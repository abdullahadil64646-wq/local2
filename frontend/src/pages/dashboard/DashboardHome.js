import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart, 
  LineChart, 
  Calendar, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  AlertCircle, 
  Layers 
} from 'lucide-react';

// Components
import StatCard from '../../components/dashboard/StatCard';
import RecentPostsList from '../../components/dashboard/RecentPostsList';
import SubscriptionOverview from '../../components/dashboard/SubscriptionOverview';
import PendingPostsCard from '../../components/dashboard/PendingPostsCard';
import DashboardLoader from '../../components/loaders/DashboardLoader';
import ErrorAlert from '../../components/alerts/ErrorAlert';
import UpcomingRenewalCard from '../../components/dashboard/UpcomingRenewalCard';

// Dashboard overview data
const fetchDashboardData = async () => {
  const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/dashboard/overview`);
  return response.data;
};

const DashboardHome = () => {
  const { user } = useAuth();
  const [postCreationAllowed, setPostCreationAllowed] = useState(true);
  
  const { data, isLoading, error } = useQuery('dashboardData', fetchDashboardData, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Check if user can create more posts
  useEffect(() => {
    const checkPostCreation = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/subscriptions/usage`);
        setPostCreationAllowed(response.data.usage.canGenerate.posts);
      } catch (error) {
        console.error('Error checking post creation status:', error);
      }
    };
    
    checkPostCreation();
  }, []);
  
  if (isLoading) {
    return <DashboardLoader />;
  }
  
  if (error) {
    return <ErrorAlert message="Error loading dashboard data. Please try again." />;
  }
  
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name}! 👋</h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your business today.</p>
        </div>
        
        <div className="mt-4 md:mt-0 space-x-2">
          {postCreationAllowed ? (
            <Link 
              to="/dashboard/create-post" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Post
            </Link>
          ) : (
            <Link 
              to="/dashboard/subscription" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Upgrade Plan
            </Link>
          )}
          
          <Link 
            to="/dashboard/store" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Manage Store
          </Link>
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Total Posts" 
          value={data.stats.totalPosts} 
          trend={data.stats.postsTrend} 
          trendLabel={data.stats.postsTrend > 0 ? "more than last month" : "less than last month"}
          icon={<BarChart className="h-6 w-6 text-blue-600" />}
        />
        
        <StatCard 
          title="Store Views" 
          value={data.stats.storeViews} 
          trend={data.stats.storeViewsTrend}
          trendLabel="vs. last week"
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
        />
        
        <StatCard 
          title="Orders" 
          value={data.stats.totalOrders} 
          trend={0} 
          trendLabel="this month"
          icon={<ShoppingBag className="h-6 w-6 text-purple-600" />}
        />
        
        <StatCard 
          title="Customers" 
          value={data.stats.totalCustomers} 
          trend={data.stats.customersTrend}
          trendLabel="new this month"
          icon={<Users className="h-6 w-6 text-orange-600" />}
        />
      </div>
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Social Media Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Performance Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Post Performance</h2>
              <select className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 3 months</option>
              </select>
            </div>
            
            {/* Chart Placeholder */}
            <div className="h-64 bg-gray-50 flex items-center justify-center rounded border border-gray-200">
              {data.charts.postPerformance ? (
                <div className="w-full h-full">
                  {/* Replace with actual chart component */}
                  <div className="w-full h-full bg-gradient-to-r from-blue-50 to-blue-100 flex items-center justify-center">
                    <p className="text-gray-500">Performance chart would be displayed here</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <LineChart className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Post more content to see performance analytics</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Recent Posts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Posts</h2>
            </div>
            
            <RecentPostsList posts={data.recentPosts || []} />
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg text-center">
              <Link 
                to="/dashboard/posts" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View all posts
              </Link>
            </div>
          </div>
        </div>
        
        {/* Right Column - Subscription & Pending Posts */}
        <div className="space-y-6">
          {/* Subscription Overview */}
          <SubscriptionOverview 
            plan={user?.plan || 'basic'}
            status={user?.subscriptionStatus || 'pending'}
            usagePercentage={data.subscription?.usagePercentage || 0}
            renewalDate={data.subscription?.nextBillingDate}
            monthlyPosts={data.subscription?.features?.monthlyPosts || 0}
            postsUsed={data.subscription?.usage?.currentMonth?.postsGenerated || 0}
          />
          
          {/* Pending Posts */}
          <PendingPostsCard pendingPosts={data.pendingPosts || []} />
          
          {/* Upcoming Renewal (conditionally rendered) */}
          {data.subscription?.daysUntilRenewal < 7 && data.subscription?.billing?.status === 'active' && (
            <UpcomingRenewalCard 
              daysLeft={data.subscription.daysUntilRenewal} 
              amount={data.subscription.nextBillingAmount}
              plan={user?.plan}
            />
          )}
          
          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Quick Links</h2>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                <li>
                  <Link 
                    to="/dashboard/social-media" 
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <span className="bg-blue-100 rounded-full p-1 mr-3">
                      <Layers className="h-4 w-4 text-blue-600" />
                    </span>
                    Connect social media accounts
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/dashboard/store/products/new" 
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <span className="bg-green-100 rounded-full p-1 mr-3">
                      <ShoppingBag className="h-4 w-4 text-green-600" />
                    </span>
                    Add new product
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/dashboard/store/settings" 
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <span className="bg-purple-100 rounded-full p-1 mr-3">
                      <AlertCircle className="h-4 w-4 text-purple-600" />
                    </span>
                    Complete store setup
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/store/{{storeSlug}}" 
                    className="flex items-center text-blue-600 hover:text-blue-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="bg-orange-100 rounded-full p-1 mr-3">
                      <Eye className="h-4 w-4 text-orange-600" />
                    </span>
                    View your store
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;