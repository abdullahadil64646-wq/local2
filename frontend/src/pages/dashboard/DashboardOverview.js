import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from 'react-query';
import axios from 'axios';
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ShareIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ShoppingBagIcon,
  CalendarIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import {
  Line,
  Bar,
  Doughnut,
  Area
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DashboardOverview = () => {
  const { user, canAccessFeature } = useAuth();
  const [timeRange, setTimeRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery(
    ['dashboardOverview', timeRange],
    async () => {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/dashboard/overview?period=${timeRange}`);
      return response.data;
    },
    {
      refetchInterval: 60000, // Refresh every minute
      staleTime: 30000
    }
  );

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          }
        }
      }
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-700">Unable to load dashboard data. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  const data = dashboardData?.data;

  // Calculate trend indicators
  const getTrendIndicator = (current, previous) => {
    if (!previous || previous === 0) return { trend: 'neutral', percentage: 0 };
    
    const change = ((current - previous) / previous) * 100;
    return {
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(change).toFixed(1)
    };
  };

  // Time range options
  const timeRangeOptions = [
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'quarter', label: 'Last 3 Months' },
    { value: 'year', label: 'Last Year' }
  ];

  // Stat cards data
  const statCards = [
    {
      id: 'posts',
      title: 'Total Posts',
      value: data?.stats?.totalPosts || 0,
      trend: getTrendIndicator(data?.stats?.totalPosts || 0, (data?.stats?.totalPosts || 0) - (data?.stats?.postsTrend || 0)),
      icon: ShareIcon,
      color: 'blue',
      description: 'Published across all platforms'
    },
    {
      id: 'views',
      title: 'Store Views',
      value: data?.stats?.storeViews || 0,
      trend: getTrendIndicator(data?.stats?.storeViews || 0, (data?.stats?.storeViews || 0) - (data?.stats?.storeViewsTrend || 0)),
      icon: EyeIcon,
      color: 'green',
      description: 'Unique store visitors'
    },
    {
      id: 'orders',
      title: 'Total Orders',
      value: data?.stats?.totalOrders || 0,
      trend: getTrendIndicator(data?.stats?.totalOrders || 0, data?.stats?.totalOrders - data?.stats?.ordersTrend || 0),
      icon: ShoppingBagIcon,
      color: 'purple',
      description: 'Orders received'
    },
    {
      id: 'customers',
      title: 'Customers',
      value: data?.stats?.totalCustomers || 0,
      trend: getTrendIndicator(data?.stats?.totalCustomers || 0, (data?.stats?.totalCustomers || 0) - (data?.stats?.customersTrend || 0)),
      icon: UsersIcon,
      color: 'yellow',
      description: 'Total customer base'
    }
  ];

  // Post performance chart data
  const postPerformanceData = data?.charts?.postPerformance ? {
    labels: data.charts.postPerformance.map(item => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Posts',
        data: data.charts.postPerformance.map(item => item.posts),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Engagement',
        data: data.charts.postPerformance.map(item => item.engagement),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y1'
      }
    ]
  } : null;

  // Platform breakdown chart data
  const platformData = data?.charts?.platformBreakdown ? {
    labels: ['Facebook', 'Instagram', 'Twitter'],
    datasets: [{
      data: [
        data.charts.platformBreakdown.facebook.postsThisMonth,
        data.charts.platformBreakdown.instagram.postsThisMonth,
        data.charts.platformBreakdown.twitter.postsThisMonth
      ],
      backgroundColor: [
        '#1877f2', // Facebook blue
        '#E4405F', // Instagram pink
        '#1DA1F2'  // Twitter blue
      ],
      borderWidth: 0
    }]
  } : null;

  // Revenue chart data
  const revenueData = data?.charts?.revenueChart ? {
    labels: ['Last Month', 'This Month'],
    datasets: [{
      label: 'Revenue (PKR)',
      data: [
        data.charts.revenueChart.lastMonth,
        data.charts.revenueChart.thisMonth
      ],
      backgroundColor: [
        'rgba(156, 163, 175, 0.8)',
        'rgba(16, 185, 129, 0.8)'
      ],
      borderRadius: 8
    }]
  } : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="mt-1 text-gray-600">
            Here's what's happening with your business today
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Quick actions */}
          <Link
            to="/dashboard/create-post"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Post
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600 border-blue-200',
            green: 'bg-green-50 text-green-600 border-green-200',
            purple: 'bg-purple-50 text-purple-600 border-purple-200',
            yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200'
          };

          return (
            <div key={stat.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg border ${colorClasses[stat.color]}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <div className="flex items-center mt-1">
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value.toLocaleString()}
                    </p>
                    {stat.trend.trend !== 'neutral' && (
                      <div className={`ml-2 flex items-center text-sm ${
                        stat.trend.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.trend.trend === 'up' ? (
                          <ArrowUpIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 mr-1" />
                        )}
                        {stat.trend.percentage}%
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Post Performance</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Posts & Engagement</span>
            </div>
          </div>
          
          {postPerformanceData ? (
            <div className="h-80">
              <Line 
                data={postPerformanceData} 
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                    }
                  }
                }} 
              />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No post data available</p>
                <Link to="/dashboard/create-post" className="text-blue-600 hover:text-blue-500 text-sm">
                  Create your first post
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Platform Distribution</h2>
          
          {platformData ? (
            <div className="h-64">
              <Doughnut data={platformData} options={chartOptions} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ShareIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">Connect social media accounts</p>
                <Link to="/dashboard/social-media" className="text-blue-600 hover:text-blue-500 text-sm">
                  Connect now
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Posts</h2>
            <Link to="/dashboard/posts" className="text-sm text-blue-600 hover:text-blue-500">
              View all
            </Link>
          </div>
          
          <div className="space-y-4">
            {data?.recentPosts?.slice(0, 5).map((post) => (
              <div key={post.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  post.status === 'posted' ? 'bg-green-500' :
                  post.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{post.content}</p>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex space-x-1">
                      {post.platforms.map((platform) => (
                        <span key={platform} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={`flex-shrink-0 ${
                  post.status === 'posted' ? 'text-green-500' :
                  post.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {post.status === 'posted' ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : post.status === 'pending' ? (
                    <ClockIcon className="h-5 w-5" />
                  ) : (
                    <XCircleIcon className="h-5 w-5" />
                  )}
                </div>
              </div>
            )) || (
              <div className="text-center text-gray-500 py-8">
                <ShareIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No posts yet</p>
                <Link to="/dashboard/create-post" className="text-blue-600 hover:text-blue-500 text-sm">
                  Create your first post
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Store Summary */}
        {data?.storeSummary ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Store Overview</h2>
              <Link to="/dashboard/store" className="text-sm text-blue-600 hover:text-blue-500">
                Manage store
              </Link>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{data.storeSummary.totalProducts}</p>
                  <p className="text-sm text-blue-700">Products</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{data.storeSummary.totalOrders}</p>
                  <p className="text-sm text-green-700">Orders</p>
                </div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">PKR {data.storeSummary.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-purple-700">Total Revenue</p>
              </div>

              {/* Recent Orders */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Recent Orders</h3>
                <div className="space-y-2">
                  {data.storeSummary.recentOrders?.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">#{order.orderNumber}</span>
                      <span className="font-medium">PKR {order.total}</span>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-500">No recent orders</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Setup Your Store</h2>
            <div className="text-center py-8">
              <ShoppingBagIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">Start selling your products online</p>
              <Link
                to="/dashboard/store/setup"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Setup Store
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Business Health Score */}
      {data?.businessHealth && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Business Health Score</h2>
          
          <div className="flex items-center mb-6">
            <div className="flex-1">
              <div className="flex items-center">
                <span className="text-3xl font-bold text-gray-900">{data.businessHealth.overallScore}</span>
                <span className="text-lg text-gray-500 ml-1">/100</span>
                <span className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                  data.businessHealth.grade === 'A' ? 'bg-green-100 text-green-800' :
                  data.businessHealth.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                  data.businessHealth.grade === 'C' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  Grade {data.businessHealth.grade}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                <div 
                  className={`h-3 rounded-full ${
                    data.businessHealth.overallScore >= 80 ? 'bg-green-500' :
                    data.businessHealth.overallScore >= 60 ? 'bg-blue-500' :
                    data.businessHealth.overallScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${data.businessHealth.overallScore}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.businessHealth.factors.map((factor, index) => (
              <div key={index} className="text-center">
                <p className="text-sm text-gray-600">{factor.factor}</p>
                <p className="text-lg font-semibold text-gray-900">{factor.score}/{factor.maxScore}</p>
                <div className={`w-full h-2 rounded-full mt-1 ${
                  factor.status === 'good' ? 'bg-green-200' :
                  factor.status === 'okay' ? 'bg-yellow-200' : 'bg-red-200'
                }`}>
                  <div 
                    className={`h-2 rounded-full ${
                      factor.status === 'good' ? 'bg-green-500' :
                      factor.status === 'okay' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(factor.score / factor.maxScore) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {data?.quickActions && data.quickActions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Recommended Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.url}
                className={`p-4 rounded-lg border-2 border-dashed transition-colors duration-200 hover:bg-gray-50 ${
                  action.priority === 'high' ? 'border-red-300 bg-red-50' :
                  action.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' : 'border-blue-300 bg-blue-50'
                }`}
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    action.priority === 'high' ? 'bg-red-100 text-red-600' :
                    action.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <PlusIcon className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{action.title}</p>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;