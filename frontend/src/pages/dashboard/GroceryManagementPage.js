import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TagIcon,
  CubeIcon,
  UserGroupIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const GroceryManagementPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState('products');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Fetch grocery data
  const { data: groceryData, isLoading, error } = useQuery('groceryManagement', async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/ecommerce/store`);
    return response.data;
  });

  // Auto-setup grocery categories mutation
  const setupGroceryCategoriesMutation = useMutation(
    async () => {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/ecommerce/setup-grocery-categories`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Grocery categories set up successfully!');
        queryClient.invalidateQueries('groceryManagement');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to setup categories');
      }
    }
  );

  // Add sample products mutation
  const addSampleProductsMutation = useMutation(
    async () => {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/ecommerce/add-sample-products`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Sample products added successfully!');
        queryClient.invalidateQueries('groceryManagement');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add sample products');
      }
    }
  );

  // Update product status mutation
  const updateProductStatusMutation = useMutation(
    async ({ productId, isActive }) => {
      const response = await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/ecommerce/products/${productId}`,
        { isActive }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Product status updated successfully!');
        queryClient.invalidateQueries('groceryManagement');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update product status');
      }
    }
  );

  // Calculate analytics
  const analytics = groceryData ? {
    totalProducts: groceryData.store.products?.length || 0,
    activeProducts: groceryData.store.products?.filter(p => p.isActive).length || 0,
    totalCategories: groceryData.store.categories?.length || 0,
    totalOrders: groceryData.store.orders?.length || 0,
    totalRevenue: groceryData.store.orders?.reduce((sum, order) => sum + (order.totals?.total || 0), 0) || 0,
    lowStockProducts: groceryData.store.products?.filter(p => 
      p.inventory?.trackQuantity && p.inventory.quantity < (p.inventory.lowStockThreshold || 10)
    ).length || 0,
    recentOrders: groceryData.store.orders?.slice(-5) || [],
    topSellingProducts: groceryData.store.products
      ?.sort((a, b) => (b.orders || 0) - (a.orders || 0))
      .slice(0, 5) || []
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Store</h2>
          <p className="text-gray-600 mt-2">Unable to load your grocery store data.</p>
          <button 
            onClick={() => queryClient.invalidateQueries('groceryManagement')}
            className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🛒 Grocery Store Management</h1>
          <p className="mt-1 text-gray-600">
            Manage your grocery inventory, categories, and analyze business performance
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => setupGroceryCategoriesMutation.mutate()}
            disabled={setupGroceryCategoriesMutation.isLoading}
            className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50"
          >
            <TagIcon className="h-4 w-4 mr-2" />
            {setupGroceryCategoriesMutation.isLoading ? 'Setting up...' : 'Setup Categories'}
          </button>
          
          <button
            onClick={() => addSampleProductsMutation.mutate()}
            disabled={addSampleProductsMutation.isLoading}
            className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
          >
            <CubeIcon className="h-4 w-4 mr-2" />
            {addSampleProductsMutation.isLoading ? 'Adding...' : 'Add Sample Products'}
          </button>
          
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Analytics
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CubeIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.totalProducts}</p>
                <p className="text-sm text-gray-600">{analytics.activeProducts} active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.totalOrders}</p>
                <p className="text-sm text-gray-600">All time</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">₨{analytics.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-gray-600">All time</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className={`h-8 w-8 ${analytics.lowStockProducts > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
                <p className={`text-2xl font-semibold ${analytics.lowStockProducts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {analytics.lowStockProducts}
                </p>
                <p className="text-sm text-gray-600">Need attention</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Top Selling Products</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics.topSellingProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">₨{product.price}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{product.orders || 0} sold</p>
                      <p className="text-sm text-gray-500">₨{(product.revenue || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {analytics.topSellingProducts.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No sales data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics.recentOrders.map((order) => (
                  <div key={order._id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Order #{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">{order.customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">₨{order.totals?.total || 0}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
                {analytics.recentOrders.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No orders yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Product Inventory</h3>
            <button
              onClick={() => setShowAddProduct(true)}
              className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groceryData?.store?.products?.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={product.images?.[0]?.url || '/images/product-placeholder.png'}
                        alt={product.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.inventory?.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₨{product.price}
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="ml-2 text-xs text-gray-500 line-through">₨{product.originalPrice}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {product.inventory?.trackQuantity ? (
                        <>
                          <span className={product.inventory.quantity < (product.inventory.lowStockThreshold || 10) ? 'text-red-600' : 'text-gray-900'}>
                            {product.inventory.quantity}
                          </span>
                          <span className="text-gray-500 text-xs ml-1">units</span>
                        </>
                      ) : (
                        <span className="text-gray-500">Not tracked</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{product.orders || 0} sold</div>
                      <div className="text-xs text-gray-500">₨{(product.revenue || 0).toLocaleString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => updateProductStatusMutation.mutate({ 
                        productId: product.id, 
                        isActive: !product.isActive 
                      })}
                      className={`${product.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                    >
                      {product.isActive ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!groceryData?.store?.products || groceryData.store.products.length === 0) && (
            <div className="text-center py-12">
              <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
              <p className="text-gray-600 mb-4">Get started by adding some grocery products to your store.</p>
              <button
                onClick={() => addSampleProductsMutation.mutate()}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Sample Products
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroceryManagementPage;