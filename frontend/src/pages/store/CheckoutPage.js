import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { storeUrl } = useParams();
  
  const { cart = [], cartTotal = 0 } = location.state || {};

  // Form state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      area: '',
      city: '',
      postalCode: ''
    }
  });

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [deliveryOption, setDeliveryOption] = useState('standard');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Calculate totals
  const subtotal = cartTotal;
  const deliveryFee = deliveryOption === 'express' ? 300 : (subtotal >= 2000 ? 0 : 150);
  const tax = Math.round(subtotal * 0.05); // 5% tax
  const total = subtotal + deliveryFee + tax;

  // Create order mutation
  const createOrderMutation = useMutation(
    async (orderData) => {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/ecommerce/orders`, orderData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Order placed successfully!');
        if (data.paymentUrl) {
          // Redirect to payment gateway
          window.location.href = data.paymentUrl;
        } else {
          // COD order - redirect to success page
          navigate(`/store/${storeUrl}/order-success/${data.order.orderNumber}`);
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to place order');
      }
    }
  );

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!customerInfo.address.street || !customerInfo.address.area || !customerInfo.address.city) {
      toast.error('Please fill complete address');
      return;
    }

    if (!agreeToTerms) {
      toast.error('Please agree to terms and conditions');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Prepare order data
    const orderData = {
      storeUrl,
      customerInfo,
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      })),
      totals: {
        subtotal,
        delivery: deliveryFee,
        tax,
        total
      },
      paymentMethod,
      deliveryOption,
      specialInstructions
    };

    createOrderMutation.mutate(orderData);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">No items in cart</h2>
          <p className="text-gray-600 mt-2">Add some products to your cart first.</p>
          <button 
            onClick={() => navigate(`/store/${storeUrl}`)}
            className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your order and get fresh groceries delivered</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      placeholder="+92-XXX-XXXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Delivery Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={customerInfo.address.street}
                      onChange={(e) => setCustomerInfo({
                        ...customerInfo, 
                        address: {...customerInfo.address, street: e.target.value}
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      placeholder="House/Flat number, Street name"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Area/Locality *</label>
                      <input
                        type="text"
                        required
                        value={customerInfo.address.area}
                        onChange={(e) => setCustomerInfo({
                          ...customerInfo, 
                          address: {...customerInfo.address, area: e.target.value}
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                        placeholder="Area name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City *</label>
                      <select
                        required
                        value={customerInfo.address.city}
                        onChange={(e) => setCustomerInfo({
                          ...customerInfo, 
                          address: {...customerInfo.address, city: e.target.value}
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      >
                        <option value="">Select City</option>
                        <option value="Lahore">Lahore</option>
                        <option value="Karachi">Karachi</option>
                        <option value="Islamabad">Islamabad</option>
                        <option value="Rawalpindi">Rawalpindi</option>
                        <option value="Faisalabad">Faisalabad</option>
                        <option value="Multan">Multan</option>
                        <option value="Gujranwala">Gujranwala</option>
                        <option value="Sialkot">Sialkot</option>
                        <option value="Peshawar">Peshawar</option>
                        <option value="Quetta">Quetta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                      <input
                        type="text"
                        value={customerInfo.address.postalCode}
                        onChange={(e) => setCustomerInfo({
                          ...customerInfo, 
                          address: {...customerInfo.address, postalCode: e.target.value}
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                        placeholder="54000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Options */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TruckIcon className="h-5 w-5 mr-2" />
                  Delivery Options
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="delivery"
                      value="standard"
                      checked={deliveryOption === 'standard'}
                      onChange={(e) => setDeliveryOption(e.target.value)}
                      className="text-green-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Standard Delivery</span>
                        <span className="text-green-600 font-medium">
                          {subtotal >= 2000 ? 'FREE' : '₨150'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">2-4 hours delivery</p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="delivery"
                      value="express"
                      checked={deliveryOption === 'express'}
                      onChange={(e) => setDeliveryOption(e.target.value)}
                      className="text-green-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Express Delivery</span>
                        <span className="text-green-600 font-medium">₨300</span>
                      </div>
                      <p className="text-sm text-gray-600">30-60 minutes delivery</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Payment Method
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-green-500"
                    />
                    <div className="ml-3 flex-1">
                      <span className="font-medium">Cash on Delivery</span>
                      <p className="text-sm text-gray-600">Pay when your order arrives</p>
                    </div>
                    <img src="/images/payment/cod.png" alt="COD" className="h-8 w-8" />
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="jazzcash"
                      checked={paymentMethod === 'jazzcash'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-green-500"
                    />
                    <div className="ml-3 flex-1">
                      <span className="font-medium">JazzCash</span>
                      <p className="text-sm text-gray-600">Pay with JazzCash mobile wallet</p>
                    </div>
                    <img src="/images/payment/jazzcash.png" alt="JazzCash" className="h-8 w-12" />
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="easypaisa"
                      checked={paymentMethod === 'easypaisa'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-green-500"
                    />
                    <div className="ml-3 flex-1">
                      <span className="font-medium">Easypaisa</span>
                      <p className="text-sm text-gray-600">Pay with Easypaisa mobile wallet</p>
                    </div>
                    <img src="/images/payment/easypaisa.png" alt="Easypaisa" className="h-8 w-12" />
                  </label>
                </div>
              </div>

              {/* Special Instructions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Special Instructions</h2>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special delivery instructions..."
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {/* Terms and Conditions */}
              <div className="bg-white rounded-lg shadow p-6">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1 text-green-500"
                  />
                  <span className="ml-3 text-sm text-gray-600">
                    I agree to the{' '}
                    <a href="/terms" className="text-green-600 hover:underline">Terms and Conditions</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>
                  </span>
                </label>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              {/* Cart Items */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <img
                      src={item.images?.[0]?.url || '/images/product-placeholder.png'}
                      alt={item.name}
                      className="h-12 w-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-medium">₨{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₨{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `₨${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (5%)</span>
                  <span>₨{tax}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">₨{total}</span>
                  </div>
                </div>
              </div>

              {/* Estimated Delivery Time */}
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center text-green-700">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    Estimated delivery: {deliveryOption === 'express' ? '30-60 mins' : '2-4 hours'}
                  </span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handleSubmit}
                disabled={createOrderMutation.isLoading || !agreeToTerms}
                className="w-full mt-6 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {createOrderMutation.isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                )}
                {createOrderMutation.isLoading ? 'Placing Order...' : 'Place Order'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-3">
                Your payment information is secure and encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;