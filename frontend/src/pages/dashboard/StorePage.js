import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShoppingBagIcon,
  TagIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const StorePage = () => {
  const { user, canAccessFeature } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // State management
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Fetch store data
  const { data: storeData, isLoading, error } = useQuery('storeData', async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/ecommerce/store`);
    return response.data;
  });

  // Delete product mutation
  const deleteProductMutation = useMutation(
    async (productId) => {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/ecommerce/products/${productId}`);
    },
    {
      onSuccess: () => {
        toast.success('Product deleted successfully');
        queryClient.invalidateQueries('storeData');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete product');
      }
    }
  );

  // Bulk actions mutation
  const bulkActionMutation = useMutation(
    async ({ action, productIds }) => {
      const promises = productIds.map(id => {
        switch (action) {
          case 'delete':
            return axios.delete(`${process.env.REACT_APP_API_URL}/api/ecommerce/products/${id}`);
          case 'activate':
            return axios.put(`${process.env.REACT_APP_API_URL}/api/ecommerce/products/${id}`, { isActive: true });
          case 'deactivate':
            return axios.put(`${process.env.REACT_APP_API_URL}/api/ecommerce/products/${id}`, { isActive: false });
          default:
            return Promise.resolve();
        }
      });
      await Promise.all(promises);
    },
    {
      onSuccess: (_, { action }) => {
        toast.success(`Bulk ${action} completed successfully`);
        setSelectedProducts([]);
        queryClient.invalidateQueries('storeData');
      },
      onError: (error) => {
        toast.error(`Bulk action failed: ${error.message}`);
      }
    }
  );

  // Filter and sort products
  const filteredProducts = React.useMemo(() => {
    let products = storeData?.store?.products || [];

    // Search filter
    if (searchQuery) {
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      products = products.filter(product => product.category === selectedCategory);
    }

    // Sort products
    products.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'stock-low':
          return a.inventory.quantity - b.inventory.quantity;
        case 'stock-high':
          return b.inventory.quantity - a.inventory.quantity;
        default:
          return 0;
      }
    });

    return products;
  }, [storeData?.store?.products, searchQuery, selectedCategory, sortBy]);

  // Get unique categories
  const categories = React.useMemo(() => {
    const allCategories = storeData?.store?.products?.map(p => p.category) || [];
    return [...new Set(allCategories)];
  }, [storeData?.store?.products]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    setSearchParams(params);
  }, [searchQuery, selectedCategory, sortBy, setSearchParams]);

  // Handle product selection
  const handleProductSelect = (productId, checked) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Handle bulk action
  const handleBulkAction = (action) => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products first');
      return;
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedProducts.length} product(s)?`;
    if (window.confirm(confirmMessage)) {
      bulkActionMutation.mutate({ action, productIds: selectedProducts });
    }
  };

  // Handle delete product
  const handleDeleteProduct = (productId, productName) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  // Calculate store stats
  const storeStats = React.useMemo(() => {
    const products = storeData?.store?.products || [];
    const analytics = storeData?.store?.analytics || {};
    
    return {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.isActive).length,
      outOfStock: products.filter(p => p.inventory.quantity === 0).length,
      lowStock: products.filter(p => 
        p.inventory.quantity <= p.inventory.lowStockThreshold && p.inventory.quantity > 0
      ).length,
      totalValue: products.reduce((sum, p) => sum + (p.price * p.inventory.quantity), 0),
      totalOrders: analytics.totalOrders || 0,
      totalRevenue: analytics.totalRevenue || 0
    };
  }, [storeData]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Store</h3>
          <p className="text-red-700">Unable to load store data. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
          <p className="mt-1 text-gray-600">
            Manage your products, orders, and store settings
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <Link
            to="/dashboard/store/settings"
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            Settings
          </Link>
          
          <Link
            to="/dashboard/store/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Store Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <TagIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{storeStats.totalProducts}</p>
              <p className="text-xs text-gray-500">{storeStats.activeProducts} active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Store Value</p>
              <p className="text-2xl font-bold text-gray-900">PKR {storeStats.totalValue.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Inventory value</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Stock Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{storeStats.lowStock + storeStats.outOfStock}</p>
              <p className="text-xs text-gray-500">{storeStats.outOfStock} out of stock</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <ShoppingBagIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{storeStats.totalOrders}</p>
              <p className="text-xs text-gray-500">PKR {storeStats.totalRevenue.toLocaleString()} revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="price-low">Price Low-High</option>
              <option value="price-high">Price High-Low</option>
              <option value="stock-low">Stock Low-High</option>
              <option value="stock-high">Stock High-Low</option>
            </select>

            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'grid'
                    ? 'bg-blue-50 text-blue-700 border-blue-500'
                    : 'bg-white text-gray-500 hover:text-gray-700'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium border-l ${
                  viewMode === 'list'
                    ? 'bg-blue-50 text-blue-700 border-blue-500'
                    : 'bg-white text-gray-500 hover:text-gray-700'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
            <span className="text-sm font-medium text-blue-900">
              {selectedProducts.length} product(s) selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200"
              >
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products List/Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <TagIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Start by adding your first product to your store'}
            </p>
            <Link
              to="/dashboard/store/products/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="p-6">
            {/* Select All Checkbox */}
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedProducts.length === filteredProducts.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
                Select all ({filteredProducts.length} products)
              </label>
            </div>

            {/* Products Display */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedProducts.includes(product.id)}
                    onSelect={(checked) => handleProductSelect(product.id, checked)}
                    onDelete={() => handleDeleteProduct(product.id, product.name)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    selected={selectedProducts.includes(product.id)}
                    onSelect={(checked) => handleProductSelect(product.id, checked)}
                    onDelete={() => handleDeleteProduct(product.id, product.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Product Card Component for Grid View
const ProductCard = ({ product, selected, onSelect, onDelete }) => {
  const getStockStatus = () => {
    if (product.inventory.quantity === 0) return { status: 'out', color: 'bg-red-100 text-red-800' };
    if (product.inventory.quantity <= product.inventory.lowStockThreshold) return { status: 'low', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'good', color: 'bg-green-100 text-green-800' };
  };

  const stockInfo = getStockStatus();

  return (
    <div className={`relative bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 ${
      selected ? 'ring-2 ring-blue-500' : 'border-gray-200'
    }`}>
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>

      {/* Product Image */}
      <div className="aspect-w-1 aspect-h-1 w-full h-48 bg-gray-200">
        {product.images.length > 0 ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="h-12 w-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
            <p className="text-sm text-gray-500 truncate">{product.category}</p>
          </div>
          <div className={`ml-2 flex-shrink-0 ${product.isActive ? 'text-green-500' : 'text-gray-400'}`}>
            {product.isActive ? <CheckCircleIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">PKR {product.price.toLocaleString()}</span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${stockInfo.color}`}>
            {product.inventory.quantity} in stock
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <Link
            to={`/dashboard/store/products/${product.id}`}
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            View Details
          </Link>
          <div className="flex items-center space-x-2">
            <Link
              to={`/dashboard/store/products/${product.id}/edit`}
              className="text-gray-400 hover:text-gray-600"
            >
              <PencilIcon className="h-4 w-4" />
            </Link>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Product List Item Component for List View
const ProductListItem = ({ product, selected, onSelect, onDelete }) => {
  const getStockStatus = () => {
    if (product.inventory.quantity === 0) return { status: 'Out of Stock', color: 'text-red-600' };
    if (product.inventory.quantity <= product.inventory.lowStockThreshold) return { status: 'Low Stock', color: 'text-yellow-600' };
    return { status: 'In Stock', color: 'text-green-600' };
  };

  const stockInfo = getStockStatus();

  return (
    <div className={`flex items-center p-4 border rounded-lg hover:bg-gray-50 ${
      selected ? 'ring-2 ring-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      {/* Selection Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />

      {/* Product Image */}
      <div className="ml-4 w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
        {product.images.length > 0 ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="h-6 w-6 text-gray-300" />
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="ml-4 flex-1 min-w-0">
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
          <div className={`ml-2 ${product.isActive ? 'text-green-500' : 'text-gray-400'}`}>
            {product.isActive ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
          </div>
        </div>
        <p className="text-sm text-gray-500">{product.category} • SKU: {product.inventory.sku}</p>
      </div>

      {/* Price */}
      <div className="ml-4 text-right">
        <p className="text-sm font-medium text-gray-900">PKR {product.price.toLocaleString()}</p>
        {product.originalPrice && (
          <p className="text-xs text-gray-500 line-through">PKR {product.originalPrice.toLocaleString()}</p>
        )}
      </div>

      {/* Stock */}
      <div className="ml-6 text-right">
        <p className={`text-sm font-medium ${stockInfo.color}`}>{stockInfo.status}</p>
        <p className="text-xs text-gray-500">{product.inventory.quantity} units</p>
      </div>

      {/* Actions */}
      <div className="ml-6 flex items-center space-x-2">
        <Link
          to={`/dashboard/store/products/${product.id}`}
          className="text-gray-400 hover:text-blue-600"
          title="View Details"
        >
          <EyeIcon className="h-4 w-4" />
        </Link>
        <Link
          to={`/dashboard/store/products/${product.id}/edit`}
          className="text-gray-400 hover:text-blue-600"
          title="Edit Product"
        >
          <PencilIcon className="h-4 w-4" />
        </Link>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-600"
          title="Delete Product"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StorePage;