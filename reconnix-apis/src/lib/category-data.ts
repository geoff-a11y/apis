// src/lib/category-data.ts — Category definitions, benchmarks, and copy examples

import { CategoryData, ProductCategory } from './types';

export const CATEGORY_DATA: Record<ProductCategory, CategoryData> = {
  personal_care: {
    id: 'personal_care',
    display_name: 'Personal Care & Beauty',
    keywords: ['razor', 'shave', 'skincare', 'moisturizer', 'cosmetic', 'makeup', 'haircare', 'shampoo', 'conditioner', 'lotion', 'cream', 'serum', 'beauty', 'grooming', 'deodorant', 'soap', 'body wash'],
    important_dimensions: ['dim_04', 'dim_09', 'dim_15', 'dim_02', 'dim_13'],
    dimension_weights: {
      dim_04: 1.3,  // Scarcity - subscription models benefit
      dim_09: 1.5,  // Sustainability - very important for beauty
      dim_15: 1.2,  // Returns - try-before-commit matters
      dim_02: 1.2,  // Social proof - reviews crucial
      dim_13: 1.1,  // Established reliability
    },
    benchmarks: {
      average: 52,
      top_performer: 78,
      percentiles: { 25: 35, 50: 52, 75: 65, 90: 75 },
    },
    copy_examples: {
      dim_04: [
        'Selling fast - only 12 starter kits left this week',
        'Join 50,000+ subscribers who never run out',
        'Limited edition color - won\'t be restocked',
      ],
      dim_09: [
        'Plastic-free packaging, vegan-friendly formula',
        'Cruelty-free and certified B Corp',
        'Refillable system reduces waste by 80%',
      ],
      dim_15: [
        '30-day trial - full refund if you\'re not satisfied',
        'Free returns, no questions asked',
        'Try risk-free with our satisfaction guarantee',
      ],
      dim_02: [
        'Rated 4.8 stars by 15,000+ customers',
        'Featured in Allure\'s Best of Beauty 2026',
        '#1 dermatologist-recommended brand',
      ],
    },
    competitors: ['Harry\'s', 'Dollar Shave Club', 'Gillette', 'Native', 'Glossier'],
  },

  electronics: {
    id: 'electronics',
    display_name: 'Electronics & Technology',
    keywords: ['phone', 'laptop', 'computer', 'tablet', 'headphones', 'speaker', 'camera', 'tv', 'monitor', 'keyboard', 'mouse', 'charger', 'cable', 'smartwatch', 'earbuds', 'gaming', 'console'],
    important_dimensions: ['dim_14', 'dim_18', 'dim_13', 'dim_05', 'dim_17'],
    dimension_weights: {
      dim_14: 1.4,  // Warranty - very important for electronics
      dim_18: 1.3,  // Precision specs - tech buyers want details
      dim_13: 1.3,  // Established reliability - brand trust
      dim_05: 1.2,  // Price comparison - competitive market
      dim_17: 1.2,  // Recency - latest models matter
    },
    benchmarks: {
      average: 58,
      top_performer: 82,
      percentiles: { 25: 42, 50: 58, 75: 70, 90: 80 },
    },
    copy_examples: {
      dim_14: [
        '2-year manufacturer warranty included',
        'Extended protection plan available',
        'Lifetime technical support included',
      ],
      dim_18: [
        '12-hour battery life (tested at 50% brightness)',
        '120Hz AMOLED display, 2400x1080 resolution',
        'M3 chip with 8-core CPU, 10-core GPU',
      ],
      dim_13: [
        'Trusted by 10 million customers since 2015',
        'Award-winning design, 3 consecutive years',
        'Industry-leading reliability rating',
      ],
      dim_17: [
        'Latest 2026 model with newest features',
        'Updated March 2026 with enhanced performance',
        'New generation - 40% faster than predecessor',
      ],
    },
    competitors: ['Apple', 'Samsung', 'Sony', 'Bose', 'Anker'],
  },

  food_beverage: {
    id: 'food_beverage',
    display_name: 'Food & Beverage',
    keywords: ['food', 'snack', 'drink', 'beverage', 'coffee', 'tea', 'protein', 'supplement', 'vitamin', 'organic', 'grocery', 'meal', 'nutrition', 'bar', 'powder'],
    important_dimensions: ['dim_09', 'dim_01', 'dim_18', 'dim_11', 'dim_02'],
    dimension_weights: {
      dim_09: 1.4,  // Sustainability - organic/eco matters
      dim_01: 1.3,  // Third party authority - certifications
      dim_18: 1.3,  // Precision - nutrition facts
      dim_11: 1.2,  // Local preference - sourcing
      dim_02: 1.2,  // Social proof - taste reviews
    },
    benchmarks: {
      average: 48,
      top_performer: 72,
      percentiles: { 25: 32, 50: 48, 75: 60, 90: 70 },
    },
    copy_examples: {
      dim_09: [
        'USDA Certified Organic, non-GMO verified',
        'Sustainably sourced from family farms',
        'Carbon-neutral production process',
      ],
      dim_01: [
        'NSF Certified for Sport',
        'Third-party tested for purity',
        'FDA registered facility',
      ],
      dim_18: [
        '25g protein, 2g sugar, 150 calories per serving',
        'Contains 100% daily value of Vitamin D',
        'Macros: 40% protein, 35% carbs, 25% fat',
      ],
    },
    competitors: ['Huel', 'Athletic Greens', 'Oatly', 'Beyond Meat', 'Quest'],
  },

  home_goods: {
    id: 'home_goods',
    display_name: 'Home & Kitchen',
    keywords: ['furniture', 'mattress', 'pillow', 'bedding', 'kitchen', 'appliance', 'cookware', 'air fryer', 'vacuum', 'decor', 'lighting', 'storage', 'organization', 'towel', 'sheets'],
    important_dimensions: ['dim_14', 'dim_15', 'dim_13', 'dim_02', 'dim_18'],
    dimension_weights: {
      dim_14: 1.4,  // Warranty - furniture investment
      dim_15: 1.4,  // Returns - try at home
      dim_13: 1.2,  // Reliability - durability matters
      dim_02: 1.2,  // Social proof
      dim_18: 1.1,  // Precision specs
    },
    benchmarks: {
      average: 50,
      top_performer: 74,
      percentiles: { 25: 35, 50: 50, 75: 62, 90: 72 },
    },
    copy_examples: {
      dim_14: [
        '10-year warranty on all components',
        'Lifetime guarantee on frame',
        'Free replacement parts for 5 years',
      ],
      dim_15: [
        '100-night sleep trial - full refund if not satisfied',
        'Free pickup for returns within 30 days',
        'No-hassle returns, we cover shipping',
      ],
      dim_13: [
        'Family-owned since 1985, trusted by millions',
        'Over 100,000 5-star reviews',
        'Best-selling in category for 3 years running',
      ],
    },
    competitors: ['Casper', 'Purple', 'Dyson', 'KitchenAid', 'Instant Pot'],
  },

  apparel: {
    id: 'apparel',
    display_name: 'Clothing & Accessories',
    keywords: ['clothing', 'shirt', 'pants', 'dress', 'shoes', 'sneakers', 'jacket', 'coat', 'bag', 'watch', 'jewelry', 'accessory', 'fashion', 'wear', 'outfit', 'athletic'],
    important_dimensions: ['dim_15', 'dim_09', 'dim_02', 'dim_06', 'dim_18'],
    dimension_weights: {
      dim_15: 1.5,  // Returns - fit uncertainty
      dim_09: 1.3,  // Sustainability - ethical fashion
      dim_02: 1.3,  // Social proof - style validation
      dim_06: 1.2,  // Heritage - brand story
      dim_18: 1.1,  // Precision - sizing details
    },
    benchmarks: {
      average: 45,
      top_performer: 70,
      percentiles: { 25: 30, 50: 45, 75: 58, 90: 68 },
    },
    copy_examples: {
      dim_15: [
        'Free returns within 60 days, no questions asked',
        'Easy exchanges - we\'ll ship new size for free',
        'Virtual try-on available - see how it fits',
      ],
      dim_09: [
        'Made from 100% recycled materials',
        'Fair Trade Certified factory',
        'Carbon-neutral shipping on all orders',
      ],
      dim_06: [
        'Handcrafted in Italy since 1952',
        'Designed in Brooklyn, made ethically worldwide',
        'Third-generation family craftsmanship',
      ],
    },
    competitors: ['Nike', 'Allbirds', 'Everlane', 'Patagonia', 'Lululemon'],
  },

  telecom: {
    id: 'telecom',
    display_name: 'Telecom & Mobile',
    keywords: ['phone', 'mobile', 'cellular', 'wireless', '5g', '4g', 'lte', 'plan', 'unlimited', 'data', 'minutes', 'iphone', 'android', 'samsung', 'galaxy', 'ipad', 'carrier', 'network', 'prepaid', 'postpaid', 'sim', 'esim', 'trade-in', 'upgrade', 'att', 'verizon', 't-mobile'],
    important_dimensions: ['dim_05', 'dim_19', 'dim_15', 'dim_07', 'dim_14'],
    dimension_weights: {
      dim_05: 1.4,  // Price comparison - competitive plans
      dim_19: 1.3,  // Comparative claims - vs competitors
      dim_15: 1.3,  // Returns - trial periods
      dim_07: 1.2,  // Risk-free trial
      dim_14: 1.2,  // Warranty - device protection
    },
    benchmarks: {
      average: 55,
      top_performer: 82,
      percentiles: { 25: 40, 50: 55, 75: 68, 90: 80 },
    },
    copy_examples: {
      dim_05: [
        'Save $200 on iPhone with eligible trade-in',
        'Unlimited data for $45/mo vs. $65/mo at competitors',
        'Compare plans: AT&T vs. Verizon vs. T-Mobile',
      ],
      dim_19: [
        'Fastest 5G network in more cities than Verizon',
        'Better coverage than T-Mobile in rural areas',
        'Ranked #1 in network reliability by J.D. Power',
      ],
      dim_15: [
        '30-day risk-free trial - return if not satisfied',
        'Cancel anytime, no early termination fees',
        'Free device returns within 14 days',
      ],
    },
    competitors: ['AT&T', 'Verizon', 'T-Mobile', 'Xfinity', 'Mint Mobile'],
  },

  health_wellness: {
    id: 'health_wellness',
    display_name: 'Health & Wellness',
    keywords: ['health', 'wellness', 'fitness', 'exercise', 'gym', 'yoga', 'meditation', 'sleep', 'therapy', 'medical', 'device', 'tracker', 'supplement', 'vitamin'],
    important_dimensions: ['dim_01', 'dim_24', 'dim_14', 'dim_18', 'dim_13'],
    dimension_weights: {
      dim_01: 1.5,  // Third party authority - clinical backing
      dim_24: 1.4,  // Ethical practices - health claims
      dim_14: 1.3,  // Warranty - device protection
      dim_18: 1.3,  // Precision - specifications matter
      dim_13: 1.2,  // Reliability - health is serious
    },
    benchmarks: {
      average: 55,
      top_performer: 80,
      percentiles: { 25: 40, 50: 55, 75: 68, 90: 78 },
    },
    copy_examples: {
      dim_01: [
        'Clinically proven in 3 peer-reviewed studies',
        'Recommended by 9 out of 10 doctors',
        'FDA cleared medical device',
      ],
      dim_24: [
        'No false claims - backed by science',
        'Transparent ingredient sourcing',
        'Published clinical trial results',
      ],
      dim_18: [
        'Tracks 15 health metrics including HRV and SpO2',
        '98.5% accuracy compared to clinical devices',
        'Medical-grade sensors with continuous monitoring',
      ],
    },
    competitors: ['Whoop', 'Oura', 'Peloton', 'Theragun', 'Calm'],
  },

  other: {
    id: 'other',
    display_name: 'General Products',
    keywords: [],
    important_dimensions: ['dim_02', 'dim_13', 'dim_15', 'dim_14', 'dim_01'],
    dimension_weights: {},
    benchmarks: {
      average: 50,
      top_performer: 75,
      percentiles: { 25: 35, 50: 50, 75: 62, 90: 72 },
    },
    copy_examples: {
      dim_02: [
        'Trusted by thousands of satisfied customers',
        'Rated 4.5+ stars across major retailers',
        'Award-winning product design',
      ],
      dim_15: [
        'Easy returns within 30 days',
        'Satisfaction guaranteed or your money back',
        'Free return shipping on all orders',
      ],
    },
    competitors: [],
  },
};

/**
 * Detect product category from URL and/or title
 */
export function detectCategory(url: string, title?: string): ProductCategory {
  const searchText = `${url} ${title || ''}`.toLowerCase();

  for (const [categoryId, categoryData] of Object.entries(CATEGORY_DATA)) {
    if (categoryId === 'other') continue;

    for (const keyword of categoryData.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return categoryId as ProductCategory;
      }
    }
  }

  return 'other';
}

/**
 * Get copy examples for a dimension in a category
 */
export function getCopyExamples(category: ProductCategory, dimensionId: string): string[] {
  const categoryData = CATEGORY_DATA[category];
  return categoryData.copy_examples[dimensionId] || CATEGORY_DATA.other.copy_examples[dimensionId] || [];
}

/**
 * Get the dimension weight for a category (default 1.0)
 */
export function getDimensionWeight(category: ProductCategory, dimensionId: string): number {
  const categoryData = CATEGORY_DATA[category];
  return categoryData.dimension_weights[dimensionId] || 1.0;
}

/**
 * Calculate percentile rank for a score in a category
 */
export function getPercentileRank(score: number, category: ProductCategory): number {
  const benchmarks = CATEGORY_DATA[category].benchmarks;
  const percentiles = benchmarks.percentiles;

  if (score <= percentiles[25]) return Math.round((score / percentiles[25]) * 25);
  if (score <= percentiles[50]) return 25 + Math.round(((score - percentiles[25]) / (percentiles[50] - percentiles[25])) * 25);
  if (score <= percentiles[75]) return 50 + Math.round(((score - percentiles[50]) / (percentiles[75] - percentiles[50])) * 25);
  if (score <= percentiles[90]) return 75 + Math.round(((score - percentiles[75]) / (percentiles[90] - percentiles[75])) * 15);
  return 90 + Math.round(((score - percentiles[90]) / (100 - percentiles[90])) * 10);
}
