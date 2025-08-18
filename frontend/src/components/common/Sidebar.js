import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from 'react-query';
import axios from 'axios';
import {
  HomeIcon,
  PlusIcon,
  DocumentTextIcon,
  ShareIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  BellIcon,
  CreditCardIcon,
  QuestionMarkCircleIcon,
  LogoutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  PhotoIcon,
  VideoCameraIcon,
  TagIcon,
  UsersIcon,
  DevicePhoneMobileIcon,
  CloudIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ChatBubbleBottomCenterTextIcon,
  RocketLaunchIcon,
  StarIcon,
  FireIcon,
  BoltIcon,
  TrophyIcon,
  HeartIcon,
  LightBulbIcon,
  MegaphoneIcon,
  PresentationChartLineIcon,
  CommandLineIcon,
  BeakerIcon,
  AcademicCapIcon,
  BookmarkIcon,
  FolderIcon,
  ArchiveBoxIcon,
  InboxIcon,
  CalendarIcon,
  ClipboardIcon,
  DocumentDuplicateIcon,
  LinkIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GiftIcon,
  KeyIcon,
  LockClosedIcon,
  EyeSlashIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  Cog6ToothIcon,
  PaintBrushIcon,
  LanguageIcon,
  BanknotesIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  SignalIcon,
  WifiIcon,
  Battery50Icon,
  DeviceTabletIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ShareIcon as ShareIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  CogIcon as CogIconSolid,
  UserIcon as UserIconSolid,
  BellIcon as BellIconSolid,
  CreditCardIcon as CreditCardIconSolid
} from '@heroicons/react/24/solid';

const Sidebar = () => {
  const { 
    user, 
    subscription, 
    businessHealth, 
    usage, 
    logout, 
    isOffline,
    unreadNotifications 
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Local state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [quickStats, setQuickStats] = useState({
    postsToday: 0,
    postsThisMonth: 0,
    engagementRate: 0,
    storeOrders: 0
  });

  // Fetch quick stats
  const { data: statsData } = useQuery(
    'sidebar-quick-stats',
    () => axios.get('/api/dashboard/quick-stats').then(res => res.data),
    {
      refetchInterval: 60000, // Refresh every minute
      onSuccess: (data) => {
        if (data.success) {
          setQuickStats(data.stats);
        }
      }
    }
  );

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Handle logout
  const handleLogout = useCallback(() => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  }, [logout]);

  // Toggle dropdown
  const toggleDropdown = useCallback((dropdown) => {
    setActiveDropdown(prev => prev === dropdown ? null : dropdown);
  }, []);

  // Main navigation items
  const mainNavItems = useMemo(() => [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      activeIcon: HomeIconSolid,
      badge: null,
      description: 'Overview and analytics'
    },
    {
      name: 'Create Post',
      href: '/dashboard/create-post',
      icon: PlusIcon,
      activeIcon: PlusIcon,
      badge: subscription?.features ? {
        text: `${usage?.postsUsed || 0}/${subscription.features.monthlyPosts}`,
        color: (usage?.postsUsed || 0) >= subscription.features.monthlyPosts ? 'red' : 'blue'
      } : null,
      description: 'AI-powered content creation',
      highlight: true
    },
    {
      name: 'Posts',
      href: '/dashboard/posts',
      icon: DocumentTextIcon,
      activeIcon: DocumentTextIconSolid,
      badge: quickStats.postsToday > 0 ? {
        text: quickStats.postsToday.toString(),
        color: 'green'
      } : null,
      description: 'Manage your content',
      dropdown: [
        { name: 'All Posts', href: '/dashboard/posts', icon: DocumentTextIcon },
        { name: 'Scheduled', href: '/dashboard/posts?status=scheduled', icon: ClockIcon },
        { name: 'Published', href: '/dashboard/posts?status=posted', icon: CheckCircleIcon },
        { name: 'Failed', href: '/dashboard/posts?status=failed', icon: XCircleIcon },
        { name: 'Draft', href: '/dashboard/posts?status=draft', icon: PencilIcon }
      ]
    },
    {
      name: 'Social Media',
      href: '/dashboard/social-media',
      icon: ShareIcon,
      activeIcon: ShareIconSolid,
      badge: user?.socialMedia ? {
        text: Object.values(user.socialMedia).filter(platform => platform?.connected).length.toString(),
        color: 'purple'
      } : null,
      description: 'Connect platforms',
      dropdown: [
        { name: 'Connections', href: '/dashboard/social-media', icon: ShareIcon },
        { name: 'Facebook', href: '/dashboard/social-media/facebook', icon: DevicePhoneMobileIcon },
        { name: 'Instagram', href: '/dashboard/social-media/instagram', icon: PhotoIcon },
        { name: 'Twitter', href: '/dashboard/social-media/twitter', icon: ChatBubbleBottomCenterTextIcon },
        { name: 'Analytics', href: '/dashboard/social-media/analytics', icon: ChartBarIcon }
      ]
    },
    {
      name: 'Store',
      href: '/dashboard/store',
      icon: ShoppingBagIcon,
      activeIcon: ShoppingBagIconSolid,
      badge: quickStats.storeOrders > 0 ? {
        text: quickStats.storeOrders.toString(),
        color: 'green'
      } : null,
      description: 'E-commerce management',
      dropdown: [
        { name: 'Overview', href: '/dashboard/store', icon: BuildingStorefrontIcon },
        { name: 'Products', href: '/dashboard/store/products', icon: TagIcon },
        { name: 'Orders', href: '/dashboard/store/orders', icon: ClipboardIcon },
        { name: 'Customers', href: '/dashboard/store/customers', icon: UsersIcon },
        { name: 'Settings', href: '/dashboard/store/settings', icon: CogIcon }
      ]
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: ChartBarIcon,
      activeIcon: ChartBarIconSolid,
      badge: businessHealth?.grade ? {
        text: businessHealth.grade,
        color: businessHealth.grade === 'A' ? 'green' : businessHealth.grade === 'B' ? 'blue' : 'yellow'
      } : null,
      description: 'Performance insights',
      dropdown: [
        { name: 'Overview', href: '/dashboard/analytics', icon: PresentationChartLineIcon },
        { name: 'Social Media', href: '/dashboard/analytics/social', icon: ShareIcon },
        { name: 'Store Performance', href: '/dashboard/analytics/store', icon: ShoppingBagIcon },
        { name: 'Audience', href: '/dashboard/analytics/audience', icon: UsersIcon },
        { name: 'Reports', href: '/dashboard/analytics/reports', icon: DocumentDuplicateIcon }
      ]
    }
  ], [user, subscription, usage, quickStats, businessHealth]);

  // Secondary navigation items
  const secondaryNavItems = useMemo(() => [
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: BellIcon,
      activeIcon: BellIconSolid,
      badge: unreadNotifications > 0 ? {
        text: unreadNotifications > 99 ? '99+' : unreadNotifications.toString(),
        color: 'red'
      } : null,
      description: 'Alerts and updates'
    },
    {
      name: 'Subscription',
      href: '/dashboard/subscription',
      icon: CreditCardIcon,
      activeIcon: CreditCardIconSolid,
      badge: subscription?.trial?.isActive ? {
        text: `${subscription.trial.daysRemaining}d`,
        color: subscription.trial.daysRemaining <= 3 ? 'red' : 'orange'
      } : null,
      description: 'Plans and billing'
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: UserIcon,
      activeIcon: UserIconSolid,
      badge: !user?.isEmailVerified ? {
        text: '!',
        color: 'red'
      } : null,
      description: 'Account settings'
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: CogIcon,
      activeIcon: CogIconSolid,
      badge: null,
      description: 'App preferences',
      dropdown: [
        { name: 'General', href: '/dashboard/settings', icon: Cog6ToothIcon },
        { name: 'Security', href: '/dashboard/settings/security', icon: ShieldCheckIcon },
        { name: 'Notifications', href: '/dashboard/settings/notifications', icon: BellIcon },
        { name: 'Appearance', href: '/dashboard/settings/appearance', icon: PaintBrushIcon },
        { name: 'Language', href: '/dashboard/settings/language', icon: LanguageIcon },
        { name: 'Billing', href: '/dashboard/settings/billing', icon: BanknotesIcon }
      ]
    }
  ], [user, subscription, unreadNotifications]);

  // AI Tools section
  const aiToolsItems = useMemo(() => [
    {
      name: 'Content Generator',
      href: '/dashboard/ai/content',
      icon: SparklesIcon,
      description: 'AI-powered writing',
      badge: { text: 'AI', color: 'purple' }
    },
    {
      name: 'Image Generator',
      href: '/dashboard/ai/images',
      icon: PhotoIcon,
      description: 'Create AI images',
      badge: usage?.imagesUsed >= subscription?.features?.monthlyImages ? {
        text: 'Full',
        color: 'red'
      } : null
    },
    {
      name: 'Video Editor',
      href: '/dashboard/ai/videos',
      icon: VideoCameraIcon,
      description: 'AI video tools',
      badge: { text: 'New', color: 'green' }
    },
    {
      name: 'Hashtag Helper',
      href: '/dashboard/ai/hashtags',
      icon: TagIcon,
      description: 'Smart hashtags',
      badge: null
    }
  ], [usage, subscription]);

  // Quick actions
  const quickActions = useMemo(() => [
    {
      name: 'Quick Post',
      action: () => navigate('/dashboard/create-post'),
      icon: RocketLaunchIcon,
      color: 'blue',
      shortcut: 'Ctrl+N'
    },
    {
      name: 'View Analytics',
      action: () => navigate('/dashboard/analytics'),
      icon: TrophyIcon,
      color: 'green',
      shortcut: 'Ctrl+A'
    },
    {
      name: 'Check Store',
      action: () => navigate('/dashboard/store'),
      icon: StarIcon,
      color: 'purple',
      shortcut: 'Ctrl+S'
    },
    {
      name: 'Help Center',
      action: () => window.open('https://help.saaslocal.pk', '_blank'),
      icon: LightBulbIcon,
      color: 'orange',
      shortcut: 'F1'
    }
  ], [navigate]);

  // Check if route is active
  const isActiveRoute = useCallback((href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  }, [location.pathname]);

  // Get business health status
  const getBusinessHealthStatus = () => {
    if (!businessHealth) return { color: 'gray', text: 'Unknown' };
    
    const score = businessHealth.score;
    if (score >= 90) return { color: 'green', text: 'Excellent' };
    if (score >= 80) return { color: 'blue', text: 'Good' };
    if (score >= 70) return { color: 'yellow', text: 'Fair' };
    return { color: 'red', text: 'Needs Work' };
  };

  // Navigation item component
  const NavItem = ({ item, isSecondary = false }) => {
    const isActive = isActiveRoute(item.href);
    const Icon = isActive ? (item.activeIcon || item.icon) : item.icon;
    const hasDropdown = item.dropdown && item.dropdown.length > 0;
    const isDropdownOpen = activeDropdown === item.name;

    return (
      <div className="dropdown-container">
        <Link
          to={hasDropdown ? '#' : item.href}
          onClick={hasDropdown ? (e) => {
            e.preventDefault();
            toggleDropdown(item.name);
          } : undefined}
          className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            isActive
              ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          } ${item.highlight ? 'ring-2 ring-blue-200 bg-gradient-to-r from-blue-50 to-purple-50' : ''}`}
        >
          <Icon className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'} transition-colors ${
            isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
          }`} />
          
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.name}</span>
              
              {/* Badge */}
              {item.badge && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  item.badge.color === 'red' ? 'bg-red-100 text-red-800' :
                  item.badge.color === 'green' ? 'bg-green-100 text-green-800' :
                  item.badge.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                  item.badge.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                  item.badge.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                  item.badge.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.badge.text}
                </span>
              )}

              {/* Dropdown arrow */}
              {hasDropdown && (
                <ChevronRightIcon className={`h-4 w-4 transition-transform ${
                  isDropdownOpen ? 'rotate-90' : ''
                }`} />
              )}
            </>
          )}
        </Link>

        {/* Dropdown menu */}
        {hasDropdown && isDropdownOpen && !isCollapsed && (
          <div className="mt-1 ml-8 space-y-1">
            {item.dropdown.map((subItem) => {
              const SubIcon = subItem.icon;
              const isSubActive = isActiveRoute(subItem.href);
              
              return (
                <Link
                  key={subItem.name}
                  to={subItem.href}
                  className={`group flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    isSubActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <SubIcon className={`h-4 w-4 mr-3 ${
                    isSubActive ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  {subItem.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SL</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">SaaS Local</h1>
              <p className="text-xs text-gray-500">Pakistani Business Platform</p>
            </div>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* User info */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.businessName || 'Business'}
              </p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isOffline ? 'bg-red-400' : 'bg-green-400'
                }`}></div>
                <span className="text-xs text-gray-500">
                  {isOffline ? 'Offline' : 'Online'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="px-3 py-4 space-y-1">
          {/* Main section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Main
              </h3>
            )}
            {mainNavItems.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>

          {/* AI Tools section */}
          {subscription?.plan !== 'basic' && (
            <div className="mt-6 space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                  <SparklesIcon className="h-3 w-3 mr-1" />
                  AI Tools
                </h3>
              )}
              {aiToolsItems.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {!isCollapsed && (
            <div className="mt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2 px-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.name}
                      onClick={action.action}
                      title={`${action.name} (${action.shortcut})`}
                      className={`p-3 rounded-lg border-2 border-dashed transition-all duration-200 hover:scale-105 ${
                        action.color === 'blue' ? 'border-blue-300 hover:border-blue-400 hover:bg-blue-50' :
                        action.color === 'green' ? 'border-green-300 hover:border-green-400 hover:bg-green-50' :
                        action.color === 'purple' ? 'border-purple-300 hover:border-purple-400 hover:bg-purple-50' :
                        'border-orange-300 hover:border-orange-400 hover:bg-orange-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${
                        action.color === 'blue' ? 'text-blue-600' :
                        action.color === 'green' ? 'text-green-600' :
                        action.color === 'purple' ? 'text-purple-600' :
                        'text-orange-600'
                      }`} />
                      <div className="text-xs text-gray-600 font-medium">
                        {action.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Business Health Score */}
          {!isCollapsed && businessHealth && (
            <div className="mt-6 px-3">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Business Health</h4>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    businessHealth.grade === 'A' ? 'bg-green-100 text-green-800' :
                    businessHealth.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                    businessHealth.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Grade {businessHealth.grade}
                  </span>
                </div>
                <div className="flex items-center mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        businessHealth.score >= 90 ? 'bg-green-500' :
                        businessHealth.score >= 80 ? 'bg-blue-500' :
                        businessHealth.score >= 70 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${businessHealth.score}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-semibold text-gray-900">
                    {businessHealth.score}/100
                  </span>
                </div>
                <Link
                  to="/dashboard/analytics"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  View details →
                </Link>
              </div>
            </div>
          )}

          {/* Usage Stats */}
          {!isCollapsed && subscription && (
            <div className="mt-4 px-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Monthly Usage</h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Posts</span>
                      <span>{usage?.postsUsed || 0}/{subscription.features.monthlyPosts}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          (usage?.postsUsed || 0) >= subscription.features.monthlyPosts 
                            ? 'bg-red-500' 
                            : 'bg-blue-500'
                        }`}
                        style={{ 
                          width: `${Math.min(((usage?.postsUsed || 0) / subscription.features.monthlyPosts) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {subscription.features.monthlyImages > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>AI Images</span>
                        <span>{usage?.imagesUsed || 0}/{subscription.features.monthlyImages}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            (usage?.imagesUsed || 0) >= subscription.features.monthlyImages 
                              ? 'bg-red-500' 
                              : 'bg-purple-500'
                          }`}
                          style={{ 
                            width: `${Math.min(((usage?.imagesUsed || 0) / subscription.features.monthlyImages) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                <Link
                  to="/dashboard/subscription"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block"
                >
                  Upgrade plan →
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Secondary navigation */}
      <div className="border-t border-gray-200">
        <nav className="px-3 py-4 space-y-1">
          {!isCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Account
            </h3>
          )}
          {secondaryNavItems.map((item) => (
            <NavItem key={item.name} item={item} isSecondary />
          ))}
        </nav>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-gray-200 p-4">
        {!isCollapsed && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <MoonIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <SunIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              <Link
                to="/help"
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                title="Help & Support"
              >
                <QuestionMarkCircleIcon className="h-4 w-4 text-gray-500" />
              </Link>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-red-100 transition-colors group"
              title="Logout"
            >
              <LogoutIcon className="h-4 w-4 text-gray-500 group-hover:text-red-600" />
            </button>
          </div>
        )}

        {/* Status indicator */}
        <div className={`flex items-center justify-center py-2 px-3 rounded-lg ${
          isOffline ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isOffline ? 'bg-red-400 animate-pulse' : 'bg-green-400'
          }`}></div>
          {!isCollapsed && (
            <span className={`text-xs font-medium ${
              isOffline ? 'text-red-700' : 'text-green-700'
            }`}>
              {isOffline ? 'Working Offline' : 'Connected'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;