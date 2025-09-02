const groceryCategories = [
  {
    id: 'fruits-vegetables',
    name: 'Fruits & Vegetables',
    description: 'Fresh fruits, vegetables, and organic produce',
    icon: '🥕',
    subcategories: [
      { id: 'fresh-fruits', name: 'Fresh Fruits', icon: '🍎' },
      { id: 'vegetables', name: 'Vegetables', icon: '🥬' },
      { id: 'herbs', name: 'Herbs & Seasonings', icon: '🌿' },
      { id: 'organic', name: 'Organic Produce', icon: '🥒' }
    ]
  },
  {
    id: 'dairy-eggs',
    name: 'Dairy & Eggs',
    description: 'Milk, cheese, yogurt, butter, and fresh eggs',
    icon: '🥛',
    subcategories: [
      { id: 'milk', name: 'Milk & Cream', icon: '🥛' },
      { id: 'cheese', name: 'Cheese', icon: '🧀' },
      { id: 'yogurt', name: 'Yogurt & Lassi', icon: '🥄' },
      { id: 'butter', name: 'Butter & Ghee', icon: '🧈' },
      { id: 'eggs', name: 'Eggs', icon: '🥚' }
    ]
  },
  {
    id: 'meat-poultry',
    name: 'Meat & Poultry',
    description: 'Fresh meat, chicken, seafood, and frozen options',
    icon: '🍖',
    subcategories: [
      { id: 'chicken', name: 'Chicken', icon: '🍗' },
      { id: 'beef', name: 'Beef & Mutton', icon: '🥩' },
      { id: 'seafood', name: 'Fish & Seafood', icon: '🐟' },
      { id: 'frozen-meat', name: 'Frozen Meat', icon: '❄️' }
    ]
  },
  {
    id: 'bakery',
    name: 'Bakery & Bread',
    description: 'Fresh bread, pastries, cakes, and baked goods',
    icon: '🍞',
    subcategories: [
      { id: 'bread', name: 'Bread & Roti', icon: '🍞' },
      { id: 'pastries', name: 'Pastries & Cakes', icon: '🧁' },
      { id: 'biscuits', name: 'Biscuits & Cookies', icon: '🍪' },
      { id: 'naan', name: 'Naan & Kulcha', icon: '🥖' }
    ]
  },
  {
    id: 'pantry',
    name: 'Pantry Staples',
    description: 'Rice, lentils, flour, oil, and cooking essentials',
    icon: '🍚',
    subcategories: [
      { id: 'rice', name: 'Rice & Grains', icon: '🍚' },
      { id: 'lentils', name: 'Lentils & Beans', icon: '🫘' },
      { id: 'flour', name: 'Flour & Atta', icon: '🌾' },
      { id: 'oil', name: 'Cooking Oil & Ghee', icon: '🫗' },
      { id: 'spices', name: 'Spices & Masala', icon: '🌶️' }
    ]
  },
  {
    id: 'beverages',
    name: 'Beverages',
    description: 'Soft drinks, juices, tea, coffee, and water',
    icon: '🥤',
    subcategories: [
      { id: 'soft-drinks', name: 'Soft Drinks', icon: '🥤' },
      { id: 'juices', name: 'Juices & Shakes', icon: '🧃' },
      { id: 'tea-coffee', name: 'Tea & Coffee', icon: '☕' },
      { id: 'water', name: 'Water', icon: '💧' },
      { id: 'energy-drinks', name: 'Energy Drinks', icon: '⚡' }
    ]
  },
  {
    id: 'snacks',
    name: 'Snacks & Confectionery',
    description: 'Chips, nuts, chocolates, and sweet treats',
    icon: '🍿',
    subcategories: [
      { id: 'chips', name: 'Chips & Crisps', icon: '🍟' },
      { id: 'nuts', name: 'Nuts & Dry Fruits', icon: '🥜' },
      { id: 'chocolates', name: 'Chocolates & Candies', icon: '🍫' },
      { id: 'traditional', name: 'Traditional Sweets', icon: '🍯' }
    ]
  },
  {
    id: 'frozen',
    name: 'Frozen Foods',
    description: 'Frozen vegetables, ready meals, and ice cream',
    icon: '❄️',
    subcategories: [
      { id: 'frozen-veg', name: 'Frozen Vegetables', icon: '🥶' },
      { id: 'ready-meals', name: 'Ready to Cook', icon: '🍱' },
      { id: 'ice-cream', name: 'Ice Cream & Desserts', icon: '🍦' },
      { id: 'frozen-meat', name: 'Frozen Meat', icon: '🧊' }
    ]
  },
  {
    id: 'household',
    name: 'Household & Cleaning',
    description: 'Detergents, tissues, and household essentials',
    icon: '🧽',
    subcategories: [
      { id: 'detergents', name: 'Detergents & Soap', icon: '🧼' },
      { id: 'tissues', name: 'Tissues & Paper', icon: '📄' },
      { id: 'cleaning', name: 'Cleaning Supplies', icon: '🧽' },
      { id: 'air-fresheners', name: 'Air Fresheners', icon: '🌸' }
    ]
  },
  {
    id: 'personal-care',
    name: 'Personal Care',
    description: 'Shampoo, soap, toothpaste, and beauty products',
    icon: '🧴',
    subcategories: [
      { id: 'hair-care', name: 'Hair Care', icon: '💇' },
      { id: 'skin-care', name: 'Skin Care', icon: '🧴' },
      { id: 'oral-care', name: 'Oral Care', icon: '🦷' },
      { id: 'feminine-care', name: 'Feminine Care', icon: '🌸' }
    ]
  }
];

const popularProducts = [
  // Fruits & Vegetables
  { name: 'Bananas', category: 'fruits-vegetables', subcategory: 'fresh-fruits', unit: 'dozen', basePrice: 120 },
  { name: 'Apples', category: 'fruits-vegetables', subcategory: 'fresh-fruits', unit: 'kg', basePrice: 250 },
  { name: 'Onions', category: 'fruits-vegetables', subcategory: 'vegetables', unit: 'kg', basePrice: 80 },
  { name: 'Potatoes', category: 'fruits-vegetables', subcategory: 'vegetables', unit: 'kg', basePrice: 60 },
  { name: 'Tomatoes', category: 'fruits-vegetables', subcategory: 'vegetables', unit: 'kg', basePrice: 100 },
  
  // Dairy & Eggs
  { name: 'Fresh Milk', category: 'dairy-eggs', subcategory: 'milk', unit: 'liter', basePrice: 140 },
  { name: 'Farm Eggs', category: 'dairy-eggs', subcategory: 'eggs', unit: 'dozen', basePrice: 250 },
  { name: 'Yogurt', category: 'dairy-eggs', subcategory: 'yogurt', unit: '1kg', basePrice: 180 },
  { name: 'Butter', category: 'dairy-eggs', subcategory: 'butter', unit: '500g', basePrice: 320 },
  
  // Meat & Poultry
  { name: 'Chicken Breast', category: 'meat-poultry', subcategory: 'chicken', unit: 'kg', basePrice: 650 },
  { name: 'Beef', category: 'meat-poultry', subcategory: 'beef', unit: 'kg', basePrice: 1200 },
  { name: 'Fish', category: 'meat-poultry', subcategory: 'seafood', unit: 'kg', basePrice: 800 },
  
  // Pantry Staples
  { name: 'Basmati Rice', category: 'pantry', subcategory: 'rice', unit: '5kg', basePrice: 1200 },
  { name: 'Wheat Flour', category: 'pantry', subcategory: 'flour', unit: '10kg', basePrice: 800 },
  { name: 'Cooking Oil', category: 'pantry', subcategory: 'oil', unit: '1L', basePrice: 350 },
  { name: 'Sugar', category: 'pantry', subcategory: 'flour', unit: 'kg', basePrice: 120 },
  
  // Beverages
  { name: 'Coca Cola', category: 'beverages', subcategory: 'soft-drinks', unit: '1.5L', basePrice: 150 },
  { name: 'Orange Juice', category: 'beverages', subcategory: 'juices', unit: '1L', basePrice: 200 },
  { name: 'Tea Bags', category: 'beverages', subcategory: 'tea-coffee', unit: '100 bags', basePrice: 180 },
  
  // Household Items
  { name: 'Detergent Powder', category: 'household', subcategory: 'detergents', unit: '1kg', basePrice: 280 },
  { name: 'Toilet Paper', category: 'household', subcategory: 'tissues', unit: '4 rolls', basePrice: 220 },
  
  // Personal Care
  { name: 'Shampoo', category: 'personal-care', subcategory: 'hair-care', unit: '400ml', basePrice: 350 },
  { name: 'Toothpaste', category: 'personal-care', subcategory: 'oral-care', unit: '75g', basePrice: 120 }
];

const storeSettings = {
  currency: 'PKR',
  timezone: 'Asia/Karachi',
  businessHours: {
    monday: { open: '08:00', close: '22:00', isOpen: true },
    tuesday: { open: '08:00', close: '22:00', isOpen: true },
    wednesday: { open: '08:00', close: '22:00', isOpen: true },
    thursday: { open: '08:00', close: '22:00', isOpen: true },
    friday: { open: '08:00', close: '22:00', isOpen: true },
    saturday: { open: '08:00', close: '22:00', isOpen: true },
    sunday: { open: '10:00', close: '20:00', isOpen: true }
  },
  deliverySettings: {
    minOrderAmount: 500,
    freeDeliveryThreshold: 2000,
    deliveryFee: 150,
    expressDeliveryFee: 300,
    deliveryAreas: [
      'Lahore',
      'Karachi', 
      'Islamabad',
      'Rawalpindi',
      'Faisalabad',
      'Multan',
      'Gujranwala',
      'Sialkot',
      'Peshawar',
      'Quetta'
    ],
    estimatedDeliveryTime: {
      standard: '2-4 hours',
      express: '30-60 minutes'
    }
  },
  paymentMethods: [
    {
      id: 'cod',
      name: 'Cash on Delivery',
      description: 'Pay when your order arrives',
      enabled: true,
      icon: 'cash'
    },
    {
      id: 'jazzcash',
      name: 'JazzCash',
      description: 'Mobile wallet payment',
      enabled: true,
      icon: 'jazzcash'
    },
    {
      id: 'easypaisa',
      name: 'Easypaisa', 
      description: 'Mobile wallet payment',
      enabled: true,
      icon: 'easypaisa'
    }
  ],
  notifications: {
    lowStockAlert: true,
    newOrderAlert: true,
    paymentAlert: true,
    deliveryAlert: true
  },
  inventory: {
    lowStockThreshold: 10,
    autoReorderEnabled: false,
    trackExpiry: true,
    expiryAlertDays: 7
  }
};

module.exports = {
  groceryCategories,
  popularProducts,
  storeSettings
};