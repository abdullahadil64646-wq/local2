-- ===========================================
-- Grocery Store Database Schema for Supabase
-- Migration from MongoDB to PostgreSQL
-- ===========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ===========================================
-- USERS TABLE
-- ===========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('admin', 'customer', 'store_manager')),
    
    -- Business Information
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    
    -- Address Information
    address JSONB DEFAULT '{}',
    
    -- Account Status
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP,
    
    -- Terms and Privacy
    accepted_terms_at TIMESTAMP,
    accepted_privacy_at TIMESTAMP,
    
    -- Social Auth
    google_id VARCHAR(255),
    facebook_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- STORES TABLE
-- ===========================================
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Store Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    store_url VARCHAR(255) UNIQUE,
    
    -- Store Settings
    settings JSONB DEFAULT '{}',
    
    -- Business Hours
    business_hours JSONB DEFAULT '{}',
    
    -- Contact Information
    contact_info JSONB DEFAULT '{}',
    
    -- Location
    location JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- PRODUCT CATEGORIES TABLE
-- ===========================================
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    parent_id UUID REFERENCES product_categories(id),
    
    -- Grocery Specific Categories
    category_type VARCHAR(50) DEFAULT 'grocery' CHECK (category_type IN ('grocery', 'fruits', 'vegetables', 'dairy', 'meat', 'bakery', 'beverages', 'snacks', 'household')),
    
    -- Display Settings
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- PRODUCTS TABLE
-- ===========================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'PKR',
    
    -- Images
    images JSONB DEFAULT '[]',
    
    -- Inventory
    quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    track_quantity BOOLEAN DEFAULT true,
    
    -- Grocery Specific
    unit VARCHAR(20), -- kg, liter, piece, etc.
    weight DECIMAL(8,2), -- in grams
    expiry_date DATE,
    brand VARCHAR(100),
    origin_country VARCHAR(100) DEFAULT 'Pakistan',
    
    -- Product Tags
    tags JSONB DEFAULT '[]',
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    keywords JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Analytics
    views_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- CUSTOMERS TABLE
-- ===========================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Customer Statistics
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_order_date TIMESTAMP,
    
    -- Preferences
    delivery_addresses JSONB DEFAULT '[]',
    preferences JSONB DEFAULT '{}',
    
    -- Timestamps
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ORDERS TABLE
-- ===========================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    
    -- Order Information
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Customer Information
    customer_info JSONB NOT NULL,
    
    -- Delivery Information
    delivery_address JSONB NOT NULL,
    delivery_instructions TEXT,
    
    -- Order Totals
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment Information
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_details JSONB DEFAULT '{}',
    
    -- Delivery Information
    delivery_service VARCHAR(50), -- bykea, yango, tcs, leopards
    tracking_number VARCHAR(100),
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled')),
    
    -- Order Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'refunded')),
    
    -- Special Instructions
    notes TEXT,
    
    -- Timestamps
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ORDER ITEMS TABLE
-- ===========================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    -- Product Information (snapshot at time of order)
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Product Details
    product_details JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- SHOPPING CART TABLE
-- ===========================================
CREATE TABLE shopping_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Cart Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- CART ITEMS TABLE
-- ===========================================
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES shopping_carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- SUBSCRIPTIONS TABLE
-- ===========================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Subscription Details
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    
    -- Billing
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'PKR',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    
    -- Dates
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    next_billing_date TIMESTAMP,
    
    -- Usage Tracking
    usage_stats JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- PAYMENT TRANSACTIONS TABLE
-- ===========================================
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Transaction Details
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    gateway VARCHAR(50) NOT NULL, -- jazzcash, easypaisa, stripe, cod
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
    
    -- Gateway Response
    gateway_response JSONB DEFAULT '{}',
    
    -- Timestamps
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- DELIVERY TRACKING TABLE
-- ===========================================
CREATE TABLE delivery_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Delivery Service
    service VARCHAR(50) NOT NULL, -- bykea, yango, tcs, leopards
    tracking_number VARCHAR(100),
    
    -- Status Updates
    status VARCHAR(50),
    status_message TEXT,
    location JSONB,
    
    -- Estimated Times
    estimated_pickup_time TIMESTAMP,
    estimated_delivery_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    
    -- Costs
    delivery_cost DECIMAL(10,2),
    
    -- Service Response
    service_response JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- STORE ANALYTICS TABLE
-- ===========================================
CREATE TABLE store_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Date for analytics
    date DATE NOT NULL,
    
    -- Metrics
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    
    -- Product Metrics
    total_products_sold INTEGER DEFAULT 0,
    top_selling_products JSONB DEFAULT '[]',
    
    -- Traffic Metrics
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(store_id, date)
);

-- ===========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ===========================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Store indexes
CREATE INDEX idx_stores_owner_id ON stores(owner_id);
CREATE INDEX idx_stores_is_active ON stores(is_active);

-- Product indexes
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_tags ON products USING gin(tags);

-- Order indexes
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Cart indexes
CREATE INDEX idx_shopping_carts_customer_id ON shopping_carts(customer_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- Analytics indexes
CREATE INDEX idx_store_analytics_store_date ON store_analytics(store_id, date);

-- ===========================================
-- TRIGGERS FOR UPDATED_AT
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_carts_updated_at BEFORE UPDATE ON shopping_carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_tracking_updated_at BEFORE UPDATE ON delivery_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();