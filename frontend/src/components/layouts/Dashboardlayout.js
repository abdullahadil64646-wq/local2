import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery } from 'react-query';
import axios from 'axios';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UserIcon,
  CogIcon,
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShareIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  TagIcon,
  TruckIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import {
  BellIcon as BellSolidIcon,
  HomeIcon as HomeSolidIcon,
  UserIcon as UserSolidIcon,
  ShareIcon as ShareSolidIcon,
  ShoppingBagIcon as ShoppingSolidIcon,
  ChartBarIcon as ChartSolidIcon
} from '@heroicons/react/24/solid';

const DashboardLayout = ({ children }) => {
  const { user, logout, canAccessFeature } = useAuth();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch quick stats for header
  const { data: quickStats } = useQuery('quickStats', async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/dashboard/quick-stats`);
    return response.data;
  }, {
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000
  });

  // Fetch notifications
  const { data: notifications } = useQuery('notifications', async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/dashboard/notifications`);
    return response.data;
  }, {
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000
  });

  // Navigation items with conditional rendering based on subscription
  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      iconSolid: HomeSolidIcon,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Social Media',
      href: '/dashboard/social-media',
      icon: ShareIcon,
      iconSolid: ShareSolidIcon,
      current: location.pathname.startsWith('/dashboard/social-media'),
      children: [
        { name: 'Connections', href: '/dashboard/social-media' },
        { name: 'Create Post', href: '/dashboard/create-post' },
        { name: 'All Posts', href: '/dashboard/posts' },
        { name: 'Analytics', href: '/dashboard/social-analytics', premium: true }
      ]
    },
    {
      name: 'Store',
      href: '/dashboard/store',
      icon: ShoppingBagIcon,
      iconSolid: ShoppingSolidIcon,
      current: location.pathname.startsWith('/dashboard/store'),
      children: [
        { name: 'Overview', href: '/dashboard/store' },
        { name: 'Products', href: '/dashboard/store/products' },
        { name: 'Orders', href: '/dashboard/store/orders' },
        { name: 'Customers', href: '/dashboard/store/customers' },
        { name: 'Analytics', href: '/dashboard/store/analytics', pro: true },
        { name: 'Settings', href: '/dashboard/store/settings' }
      ]
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: ChartBarIcon,
      iconSolid: ChartSolidIcon,
      current: location.pathname === '/dashboard/analytics',
      pro: true
    },
    {
      name: 'Subscription',
      href: '/dashboard/subscription',
      icon: CreditCardIcon,
      current: location.pathname === '/dashboard/subscription'
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: UserIcon,
      iconSolid: UserSolidIcon,
      current: location.pathname === '/dashboard/profile'
    }
  ];

  // Admin navigation for owner
  const adminNavigation = user?.isOwner ? [
    {
      name: 'Admin Panel',
      href: '/admin',
      icon: Squares2X2Icon,
      current: location.pathname.startsWith('/admin'),
      children: [
        { name: 'Dashboard', href: '/admin' },
        { name: 'Users', href: '/admin/users' },
        { name: 'Subscriptions', href: '/admin/subscriptions' },
        { name: 'Offers', href: '/admin/offers' },
        { name: 'Revenue', href: '/admin/revenue' },
        { name: 'Settings', href: '/admin/settings' }
      ]
    }
  ] : [];

  // Quick action items
  const quickActions = [
    {
      name: 'Create Post',
      href: '/dashboard/create-post',
      icon: PlusIcon,
      description: 'Generate AI content',
      color: 'bg-blue-500 hover:bg-blue-600',
      disabled: !quickStats?.stats?.canCreatePost
    },
    {
      name: 'Add Product',
      href: '/dashboard/store/products/new',
      icon: TagIcon,
      description: 'Add to store',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: 'View Store',
      href: `/store/${user?.businessName?.toLowerCase().replace(/\s+/g, '-')}`,
      icon: BuildingStorefrontIcon,
      description: 'Public view',
      color: 'bg-purple-500 hover:bg-purple-600',
      external: true
    }
  ];

  // Handle navigation click
  const handleNavClick = (item) => {
    if (item.pro && !canAccessFeature('analytics')) {
      navigate('/dashboard/subscription');
      return;
    }
    if (item.premium && !canAccessFeature('advanced_seo')) {
      navigate('/dashboard/subscription');
      return;
    }
    navigate(item.href);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
      if (!event.target.closest('.notifications-menu')) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render navigation item
  const renderNavItem = (item, level = 0) => {
    const isActive = item.current;
    const Icon = isActive && item.iconSolid ? item.iconSolid : item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const [childrenOpen, setChildrenOpen] = useState(isActive);

    const itemClasses = `
      group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200
      ${level === 0 ? 'mb-1' : 'mb-0 ml-4'}
      ${isActive 
        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }
      ${(item.pro || item.premium) && !canAccessFeature(item.pro ? 'analytics' : 'advanced_seo') 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer'
      }
    `;

    return (
      <div key={item.name}>
        <div
          className={itemClasses}
          onClick={() => hasChildren ? setChildrenOpen(!childrenOpen) : handleNavClick(item)}
        >
          {Icon && (
            <Icon
              className={`mr-3 flex-shrink-0 h-5 w-5 ${
                isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}
            />
          )}
          <span className="flex-1">{item.name}</span>
          
          {/* Feature badges */}
          {item.pro && !canAccessFeature('analytics') && (
            <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
              Pro
            </span>
          )}
          {item.premium && !canAccessFeature('advanced_seo') && (
            <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
              Premium
            </span>
          )}

          {/* Expand icon for items with children */}
          {hasChildren && (
            <ChevronRightIcon
              className={`ml-2 h-4 w-4 transition-transform duration-200 ${
                childrenOpen ? 'transform rotate-90' : ''
              }`}
            />
          )}
        </div>

        {/* Children items */}
        {hasChildren && childrenOpen && (
          <div className="mt-1 space-y-1">
            {item.children.map((child) => renderNavItem({ ...child, current: location.pathname === child.href }, 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            
            {/* Mobile sidebar content */}
            <div className="flex-shrink-0 flex items-center px-4">
              <Link to="/dashboard" className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SL</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">SaaS Local</span>
              </Link>
            </div>
            
            <div className="mt-5 flex-1 h-0 overflow-y-auto">
              <nav className="px-2 space-y-1">
                {[...navigation, ...adminNavigation].map(renderNavItem)}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-shrink-0 ${sidebarOpen ? 'lg:w-64' : 'lg:w-16'} transition-all duration-300`}>
        <div className="flex flex-col w-full">
          <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
            {/* Sidebar header */}
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-white border-b border-gray-200">
              <Link to="/dashboard" className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SL</span>
                </div>
                {sidebarOpen && (
                  <span className="ml-2 text-xl font-bold text-gray-900">SaaS Local</span>
                )}
              </Link>
            </div>

            {/* Sidebar navigation */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {[...navigation, ...adminNavigation].map((item) => 
                  sidebarOpen ? renderNavItem(item) : (
                    <div key={item.name} className="group relative">
                      <div
                        className={`flex items-center justify-center p-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                          item.current
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => handleNavClick(item)}
                      >
                        {item.icon && (
                          <item.icon className={`h-5 w-5 ${
                            item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          }`} />
                        )}
                      </div>
                      
                      {/* Tooltip for collapsed sidebar */}
                      <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                        {item.name}
                      </div>
                    </div>
                  )
                )}
              </nav>

              {/* Quick actions in sidebar */}
              {sidebarOpen && (
                <div className="px-4 pb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    {quickActions.map((action) => (
                      <Link
                        key={action.name}
                        to={action.href}
                        target={action.external ? '_blank' : undefined}
                        rel={action.external ? 'noopener noreferrer' : undefined}
                        className={`flex items-center p-2 text-sm rounded-md transition-colors duration-200 ${
                          action.disabled 
                            ? 'opacity-50 cursor-not-allowed' 
                            : `${action.color} text-white hover:opacity-90`
                        }`}
                      >
                        <action.icon className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium">{action.name}</div>
                          <div className="text-xs opacity-75">{action.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-0 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-gray-200">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            type="button"
            className="hidden lg:block px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={toggleSidebar}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 flex justify-between px-4">
            {/* Search bar */}
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <label htmlFor="search-field" className="sr-only">Search</label>
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </div>
                  <input
                    id="search-field"
                    className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                    placeholder="Search posts, products, customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    type="search"
                  />
                </div>
              </div>
            </div>

            {/* Right side of header */}
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              {/* Plan badge */}
              <div className="hidden md:block">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  quickStats?.stats?.plan === 'premium' 
                    ? 'bg-purple-100 text-purple-800'
                    : quickStats?.stats?.plan === 'pro'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {quickStats?.stats?.plan || 'Basic'} Plan
                </span>
              </div>

              {/* Usage indicator */}
              {quickStats?.stats?.usagePercentage > 0 && (
                <div className="hidden md:flex items-center text-sm text-gray-600">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className={`h-2 rounded-full ${
                        quickStats.stats.usagePercentage >= 90 ? 'bg-red-500' :
                        quickStats.stats.usagePercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(quickStats.stats.usagePercentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs">{quickStats.stats.usagePercentage}%</span>
                </div>
              )}

              {/* Notifications */}
              <div className="relative notifications-menu">
                <button
                  type="button"
                  className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <BellIcon className="h-6 w-6" />
                  {notifications?.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                      {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {notificationsOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                      </div>
                      
                      {notifications?.notifications?.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto">
                          {notifications.notifications.slice(0, 5).map((notification, index) => (
                            <div key={notification.id || index} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                              <div className="flex items-start">
                                <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                                  notification.priority === 'high' ? 'bg-red-500' :
                                  notification.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`} />
                                <div className="ml-3 flex-1">
                                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                  <p className="text-sm text-gray-500">{notification.message}</p>
                                  {notification.action && (
                                    <Link
                                      to={notification.action.url}
                                      className="text-xs text-blue-600 hover:text-blue-500 mt-1 inline-block"
                                      onClick={() => setNotificationsOpen(false)}
                                    >
                                      {notification.action.text}
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500">
                          <BellIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      )}
                      
                      {notifications?.notifications?.length > 5 && (
                        <div className="px-4 py-2 bg-gray-50 text-center">
                          <Link
                            to="/dashboard/notifications"
                            className="text-sm text-blue-600 hover:text-blue-500"
                            onClick={() => setNotificationsOpen(false)}
                          >
                            View all notifications
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative user-menu">
                <button
                  type="button"
                  className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden md:block ml-2 text-sm font-medium text-gray-700">
                    {user?.name || 'User'}
                  </span>
                  <ChevronDownIcon className="hidden md:block ml-1 h-4 w-4 text-gray-400" />
                </button>

                {/* User dropdown */}
                {userMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                      
                      <Link
                        to="/dashboard/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Your Profile
                      </Link>
                      
                      <Link
                        to="/dashboard/subscription"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Subscription
                      </Link>
                      
                      {user?.isOwner && (
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                      
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <ArrowRightOnRectangleIcon className="inline h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;