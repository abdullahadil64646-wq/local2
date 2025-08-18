const axios = require('axios');
const crypto = require('crypto');

// Bykea Delivery Service
class BykeaDeliveryService {
  constructor() {
    this.apiKey = process.env.BYKEA_API_KEY;
    this.baseURL = 'https://api.bykea.pk/v1';
    this.webhookSecret = process.env.BYKEA_WEBHOOK_SECRET;
  }

  // Create delivery order
  async createDelivery(orderData) {
    try {
      // Check API key
      if (!this.apiKey) {
        throw new Error('Bykea API key missing');
      }

      // Prepare delivery request
      const deliveryData = {
        pickup: {
          address: orderData.pickupAddress,
          coordinates: orderData.pickupCoordinates,
          contactPerson: orderData.pickupContact,
          contactNumber: orderData.pickupPhone,
          notes: orderData.pickupNotes || ''
        },
        dropoff: {
          address: orderData.dropoffAddress,
          coordinates: orderData.dropoffCoordinates,
          contactPerson: orderData.dropoffContact,
          contactNumber: orderData.dropoffPhone,
          notes: orderData.dropoffNotes || ''
        },
        packageDetails: {
          description: `Order #${orderData.orderNumber}`,
          weight: orderData.weight || 1,
          cash_collection: orderData.cashOnDelivery ? orderData.totalAmount : 0,
          itemType: orderData.itemType || 'parcel'
        },
        externalOrderId: orderData.orderNumber,
        serviceName: 'courier',
        referralCode: 'SAAS-LOCAL'
      };

      // Make API call to Bykea
      const response = await axios.post(`${this.baseURL}/deliveries`, deliveryData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        trackingNumber: response.data.trackingNumber,
        deliveryId: response.data.deliveryId,
        estimatedPrice: response.data.estimatedPrice,
        estimatedTime: response.data.estimatedDeliveryTime,
        status: response.data.status
      };

    } catch (error) {
      console.error('Bykea delivery creation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Track delivery
  async trackDelivery(trackingNumber) {
    try {
      const response = await axios.get(`${this.baseURL}/deliveries/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        status: response.data.status,
        currentLocation: response.data.currentLocation,
        estimatedDeliveryTime: response.data.estimatedDeliveryTime,
        timeline: response.data.timeline
      };

    } catch (error) {
      console.error('Bykea tracking error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Cancel delivery
  async cancelDelivery(trackingNumber, reason) {
    try {
      const response = await axios.post(`${this.baseURL}/deliveries/${trackingNumber}/cancel`, 
        { reason: reason || 'Cancelled by merchant' },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        status: 'cancelled',
        message: response.data.message || 'Delivery cancelled successfully'
      };

    } catch (error) {
      console.error('Bykea cancellation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get delivery cost estimate
  async getDeliveryCost(pickupCoordinates, dropoffCoordinates, packageDetails) {
    try {
      const response = await axios.post(`${this.baseURL}/delivery/estimate`, 
        {
          pickup: { coordinates: pickupCoordinates },
          dropoff: { coordinates: dropoffCoordinates },
          packageDetails: packageDetails
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        estimatedPrice: response.data.estimatedPrice,
        estimatedDistance: response.data.estimatedDistance,
        estimatedTime: response.data.estimatedTime
      };

    } catch (error) {
      console.error('Bykea cost estimate error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Validate webhook
  validateWebhook(payload, signature) {
    try {
      if (!this.webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const calculatedSignature = hmac.update(JSON.stringify(payload)).digest('hex');

      return calculatedSignature === signature;
    } catch (error) {
      console.error('Webhook validation error:', error);
      return false;
    }
  }
}

// TCS Courier Service
class TCSCourierService {
  constructor() {
    this.apiKey = process.env.TCS_API_KEY;
    this.username = process.env.TCS_USERNAME;
    this.password = process.env.TCS_PASSWORD;
    this.baseURL = 'https://api.tcs.com.pk/v1';
  }

  // Create shipment
  async createShipment(orderData) {
    try {
      // Check credentials
      if (!this.apiKey || !this.username || !this.password) {
        throw new Error('TCS credentials missing');
      }

      // Prepare shipment data
      const shipmentData = {
        shipperInfo: {
          name: orderData.shopName,
          email: orderData.shopEmail,
          phone: orderData.shopPhone,
          address: orderData.pickupAddress,
          city: orderData.pickupCity
        },
        consigneeInfo: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          phone: orderData.customerPhone,
          address: orderData.dropoffAddress,
          city: orderData.dropoffCity
        },
        shipmentDetails: {
          weight: orderData.weight || 1,
          pieces: orderData.pieces || 1,
          codAmount: orderData.cashOnDelivery ? orderData.totalAmount : 0,
          description: `Order #${orderData.orderNumber}`,
          service: 'overnight', // overnight, second_day, same_day
          customerReferenceNo: orderData.orderNumber
        }
      };

      // Make API call to TCS
      const response = await axios.post(`${this.baseURL}/shipments`, shipmentData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'username': this.username,
          'password': this.password
        }
      });

      return {
        success: true,
        trackingNumber: response.data.trackingNumber,
        shipmentId: response.data.shipmentId,
        cost: response.data.cost,
        estimatedDeliveryDate: response.data.estimatedDeliveryDate,
        status: response.data.status
      };

    } catch (error) {
      console.error('TCS shipment creation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Track shipment
  async trackShipment(trackingNumber) {
    try {
      const response = await axios.get(`${this.baseURL}/tracking/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'x-api-key': this.apiKey,
          'username': this.username,
          'password': this.password
        }
      });

      return {
        success: true,
        status: response.data.status,
        currentLocation: response.data.currentLocation,
        history: response.data.history,
        estimatedDeliveryDate: response.data.estimatedDeliveryDate
      };

    } catch (error) {
      console.error('TCS tracking error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Cancel shipment
  async cancelShipment(trackingNumber, reason) {
    try {
      const response = await axios.post(`${this.baseURL}/shipments/${trackingNumber}/cancel`, 
        { reason: reason || 'Cancelled by merchant' },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'username': this.username,
            'password': this.password
          }
        }
      );

      return {
        success: true,
        status: 'cancelled',
        message: response.data.message || 'Shipment cancelled successfully'
      };

    } catch (error) {
      console.error('TCS cancellation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get shipping cost
  async getShippingCost(originCity, destinationCity, weight) {
    try {
      const response = await axios.post(`${this.baseURL}/shipping/calculate`, 
        {
          origin: originCity,
          destination: destinationCity,
          weight: weight,
          service: 'overnight'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'username': this.username,
            'password': this.password
          }
        }
      );

      return {
        success: true,
        cost: response.data.cost,
        estimatedDeliveryTime: response.data.estimatedDeliveryTime
      };

    } catch (error) {
      console.error('TCS cost calculation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

// Leopards Courier Service
class LeopardsCourierService {
  constructor() {
    this.apiKey = process.env.LEOPARDS_API_KEY;
    this.username = process.env.LEOPARDS_USERNAME;
    this.baseURL = 'https://api.leopardscourier.com/v1';
  }

  // Book shipment
  async bookShipment(orderData) {
    try {
      // Check credentials
      if (!this.apiKey || !this.username) {
        throw new Error('Leopards credentials missing');
      }

      // Prepare booking data
      const bookingData = {
        shipperName: orderData.shopName,
        shipperEmail: orderData.shopEmail,
        shipperContact: orderData.shopPhone,
        shipperAddress: orderData.pickupAddress,
        shipperCity: orderData.pickupCity,
        
        consigneeName: orderData.customerName,
        consigneeEmail: orderData.customerEmail,
        consigneeContact: orderData.customerPhone,
        consigneeAddress: orderData.dropoffAddress,
        consigneeCity: orderData.dropoffCity,
        
        weight: orderData.weight || 1,
        pieces: orderData.pieces || 1,
        codAmount: orderData.cashOnDelivery ? orderData.totalAmount : 0,
        productDetails: `Order #${orderData.orderNumber}`,
        serviceType: 'overnight',
        referenceNo: orderData.orderNumber
      };

      // Make API call to Leopards
      const response = await axios.post(`${this.baseURL}/bookings`, bookingData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'x-api-user': this.username
        }
      });

      return {
        success: true,
        trackingNumber: response.data.cn,
        bookingId: response.data.bookingId,
        charges: response.data.charges,
        status: response.data.status
      };

    } catch (error) {
      console.error('Leopards booking error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Track shipment
  async trackShipment(trackingNumber) {
    try {
      const response = await axios.get(`${this.baseURL}/tracking/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'x-api-user': this.username
        }
      });

      return {
        success: true,
        status: response.data.status,
        currentLocation: response.data.currentLocation,
        history: response.data.history
      };

    } catch (error) {
      console.error('Leopards tracking error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Cancel shipment
  async cancelShipment(trackingNumber, reason) {
    try {
      const response = await axios.post(`${this.baseURL}/bookings/${trackingNumber}/cancel`, 
        { reason: reason || 'Cancelled by merchant' },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'x-api-user': this.username
          }
        }
      );

      return {
        success: true,
        status: 'cancelled',
        message: response.data.message || 'Shipment cancelled successfully'
      };

    } catch (error) {
      console.error('Leopards cancellation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get shipping charges
  async getShippingCharges(originCity, destinationCity, weight) {
    try {
      const response = await axios.post(`${this.baseURL}/calculate/charges`, 
        {
          origin: originCity,
          destination: destinationCity,
          weight: weight,
          serviceType: 'overnight'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'x-api-user': this.username
          }
        }
      );

      return {
        success: true,
        charges: response.data.charges
      };

    } catch (error) {
      console.error('Leopards charges calculation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

// Main Delivery Service
class DeliveryService {
  constructor() {
    this.bykea = new BykeaDeliveryService();
    this.tcs = new TCSCourierService();
    this.leopards = new LeopardsCourierService();
  }

  // Create delivery with any available service
  async createDelivery(orderData, service = 'bykea') {
    try {
      let result;
      
      switch (service.toLowerCase()) {
        case 'bykea':
          result = await this.bykea.createDelivery(orderData);
          break;
        case 'tcs':
          result = await this.tcs.createShipment(orderData);
          break;
        case 'leopards':
          result = await this.leopards.bookShipment(orderData);
          break;
        default:
          throw new Error('Invalid delivery service specified');
      }

      return {
        success: result.success,
        service: service.toLowerCase(),
        ...result
      };

    } catch (error) {
      console.error('Delivery creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Track delivery with any service
  async trackDelivery(trackingNumber, service = 'bykea') {
    try {
      let result;
      
      switch (service.toLowerCase()) {
        case 'bykea':
          result = await this.bykea.trackDelivery(trackingNumber);
          break;
        case 'tcs':
          result = await this.tcs.trackShipment(trackingNumber);
          break;
        case 'leopards':
          result = await this.leopards.trackShipment(trackingNumber);
          break;
        default:
          throw new Error('Invalid delivery service specified');
      }

      return {
        success: result.success,
        service: service.toLowerCase(),
        ...result
      };

    } catch (error) {
      console.error('Delivery tracking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cancel delivery with any service
  async cancelDelivery(trackingNumber, reason, service = 'bykea') {
    try {
      let result;
      
      switch (service.toLowerCase()) {
        case 'bykea':
          result = await this.bykea.cancelDelivery(trackingNumber, reason);
          break;
        case 'tcs':
          result = await this.tcs.cancelShipment(trackingNumber, reason);
          break;
        case 'leopards':
          result = await this.leopards.cancelShipment(trackingNumber, reason);
          break;
        default:
          throw new Error('Invalid delivery service specified');
      }

      return {
        success: result.success,
        service: service.toLowerCase(),
        ...result
      };

    } catch (error) {
      console.error('Delivery cancellation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get delivery cost estimate from multiple services
  async getDeliveryEstimates(orderData) {
    try {
      // Get quotes from all services in parallel
      const [bykeaResult, tcsResult, leopardsResult] = await Promise.all([
        this.bykea.getDeliveryCost(
          orderData.pickupCoordinates, 
          orderData.dropoffCoordinates, 
          { weight: orderData.weight || 1 }
        ),
        this.tcs.getShippingCost(
          orderData.pickupCity, 
          orderData.dropoffCity, 
          orderData.weight || 1
        ),
        this.leopards.getShippingCharges(
          orderData.pickupCity, 
          orderData.dropoffCity, 
          orderData.weight || 1
        )
      ]);

      return {
        success: true,
        estimates: {
          bykea: bykeaResult.success ? {
            cost: bykeaResult.estimatedPrice,
            estimatedTime: bykeaResult.estimatedTime,
            distance: bykeaResult.estimatedDistance
          } : null,
          tcs: tcsResult.success ? {
            cost: tcsResult.cost,
            estimatedTime: tcsResult.estimatedDeliveryTime
          } : null,
          leopards: leopardsResult.success ? {
            cost: leopardsResult.charges
          } : null
        }
      };

    } catch (error) {
      console.error('Delivery estimates error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new DeliveryService();