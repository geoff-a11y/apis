import productsBenchmark from '../../data/benchmark_analysis.json';
import servicesBenchmark from '../../data/benchmark_analysis_expansion.json';

// API configuration
const API_URL = process.env.NEXT_PUBLIC_ML_SCORE_API_URL || 'https://api.agentonomics.io';

// Types
export type BenchmarkType = 'products' | 'services' | 'combined';

export interface BenchmarkSummary {
  total_pages: number;
  avg_score: number;
  score_range: { min: number; max: number };
  success_rate: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  avg_score: number;
  min: number;
  max: number;
}

export interface DimensionAnalysis {
  dimension_id: string;
  dimension_name: string;
  avg_score: number;
  presence_rate: number;
  avg_gap: number;
  pages_at_target: number;
}

export interface ModelDistribution {
  [model: string]: { avg: number; min: number; max: number };
}

export interface TopPerformer {
  url: string;
  domain: string;
  category: string;
  universal_score: number;
  model_scores: Record<string, number>;
  top_signals: string[];
  why_successful: string;
}

export interface BottomPerformer {
  url: string;
  domain: string;
  category: string;
  universal_score: number;
  model_scores: Record<string, number>;
  missing_signals: string[];
  biggest_gaps: string[];
}

export interface PageSummary {
  url: string;
  domain: string;
  category: string;
  universal_score: number;
  model_scores: Record<string, number>;
  signal_count: number;
  avg_signal_score: number;
}

// Exported functions

// Get summary for specified benchmark type (defaults to combined for /score page)
export function getBenchmarkSummary(type: BenchmarkType = 'combined'): BenchmarkSummary {
  const products = productsBenchmark.summary as BenchmarkSummary;
  const services = servicesBenchmark.summary as BenchmarkSummary;

  switch (type) {
    case 'products':
      return products;
    case 'services':
      return services;
    case 'combined':
    default:
      // Combined summary
      const totalPages = products.total_pages + services.total_pages;
      return {
        total_pages: totalPages,
        avg_score: Math.round(
          ((products.avg_score * products.total_pages) + (services.avg_score * services.total_pages)) / totalPages * 100
        ) / 100,
        score_range: {
          min: Math.min(products.score_range.min, services.score_range.min),
          max: Math.max(products.score_range.max, services.score_range.max),
        },
        success_rate: (products.success_rate + services.success_rate) / 2,
      };
  }
}

// Get categories for specified benchmark type
export function getBenchmarkCategories(type: BenchmarkType = 'products'): CategoryStats[] {
  switch (type) {
    case 'services':
      return servicesBenchmark.by_category as CategoryStats[];
    case 'products':
    default:
      return productsBenchmark.by_category as CategoryStats[];
  }
}

// Get dimension analysis for specified benchmark type
// Note: Using unknown to handle type mismatch in benchmark data
export function getDimensionAnalysis(type: BenchmarkType = 'products'): DimensionAnalysis[] {
  switch (type) {
    case 'services':
      return (servicesBenchmark as unknown as { dimension_analysis?: DimensionAnalysis[] }).dimension_analysis || [];
    case 'products':
    default:
      return (productsBenchmark as unknown as { dimension_analysis?: DimensionAnalysis[] }).dimension_analysis || [];
  }
}

// Get model distribution (only available for products benchmark)
export function getModelDistribution(): ModelDistribution {
  return (productsBenchmark as unknown as { model_distribution?: ModelDistribution }).model_distribution || {};
}

// Get top performers for specified benchmark type
// Note: Services benchmark has different schema - using unknown to handle type mismatch
export function getTopPerformers(type: BenchmarkType = 'products'): TopPerformer[] {
  switch (type) {
    case 'services':
      return (servicesBenchmark as unknown as { top_performers?: TopPerformer[] }).top_performers || [];
    case 'products':
    default:
      return (productsBenchmark as unknown as { top_performers?: TopPerformer[] }).top_performers || [];
  }
}

// Get bottom performers for specified benchmark type
export function getBottomPerformers(type: BenchmarkType = 'products'): BottomPerformer[] {
  switch (type) {
    case 'services':
      return (servicesBenchmark as unknown as { bottom_performers?: BottomPerformer[] }).bottom_performers || [];
    case 'products':
    default:
      return (productsBenchmark as unknown as { bottom_performers?: BottomPerformer[] }).bottom_performers || [];
  }
}

// Get all pages for specified benchmark type
export function getAllPages(type: BenchmarkType = 'products'): PageSummary[] {
  switch (type) {
    case 'services':
      return (servicesBenchmark as unknown as { all_pages?: PageSummary[] }).all_pages || [];
    case 'products':
    default:
      return (productsBenchmark as unknown as { all_pages?: PageSummary[] }).all_pages || [];
  }
}

// Get generated timestamp
export function getGeneratedAt(type: BenchmarkType = 'products'): string {
  switch (type) {
    case 'services':
      return servicesBenchmark.generated_at;
    case 'products':
    default:
      return productsBenchmark.generated_at;
  }
}

// Get both benchmark summaries for comparison
export function getBenchmarkComparison(): {
  products: BenchmarkSummary;
  services: BenchmarkSummary;
  combined: BenchmarkSummary;
} {
  return {
    products: getBenchmarkSummary('products'),
    services: getBenchmarkSummary('services'),
    combined: getBenchmarkSummary('combined'),
  };
}

// Utility functions
export function getCategoryColor(category: string): string {
  const categoryColors: Record<string, string> = {
    apparel: '#f59e0b',        // amber-500
    electronics: '#3b82f6',    // blue-500
    food_beverage: '#10b981',  // emerald-500
    home_goods: '#8b5cf6',     // violet-500
    personal_care: '#ec4899',  // pink-500
    software: '#06b6d4',       // cyan-500
    telecom: '#f97316',        // orange-500
    finance: '#14b8a6',        // teal-500
    travel: '#6366f1',         // indigo-500
    media: '#a855f7',          // purple-500
    retail: '#84cc16',         // lime-500
    services: '#22c55e',       // green-500
  };

  return categoryColors[category] || '#6b7280'; // gray-500 as fallback
}

export function formatDimensionName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// === Live API Functions ===
// These fetch from the benchmark database API with fallback to static JSON

export interface LiveBenchmarkStats {
  total_pages: number;
  avg_score: number;
  score_range: { min: number; max: number };
  products_count: number;
  services_count: number;
  last_updated: string;
}

export interface LiveCategoryStats {
  category: string;
  count: number;
  avg_score: number;
  min_score: number;
  max_score: number;
}

export interface LiveDimensionStats {
  dimension_id: string;
  dimension_name: string;
  avg_score: number;
  presence_rate: number;
  pages_at_target: number;
}

export interface LiveTopPerformer {
  url: string;
  domain: string;
  category: string;
  universal_score: number;
  extraction_quality: string;
}

/**
 * Fetch live benchmark statistics from the API.
 * Falls back to combined static data if API is unavailable.
 */
export async function fetchLiveBenchmarkStats(): Promise<LiveBenchmarkStats> {
  try {
    const response = await fetch(`${API_URL}/benchmark/stats`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch live benchmark stats, using static fallback:', error);
    // Fallback to combined static data
    const combined = getBenchmarkSummary('combined');
    return {
      total_pages: combined.total_pages,
      avg_score: combined.avg_score,
      score_range: combined.score_range,
      products_count: getBenchmarkSummary('products').total_pages,
      services_count: getBenchmarkSummary('services').total_pages,
      last_updated: new Date().toISOString(),
    };
  }
}

/**
 * Fetch live category statistics from the API.
 * Falls back to static data if API is unavailable.
 */
export async function fetchLiveCategoryStats(): Promise<LiveCategoryStats[]> {
  try {
    const response = await fetch(`${API_URL}/benchmark/categories`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.categories;
  } catch (error) {
    console.warn('Failed to fetch live category stats, using static fallback:', error);
    // Fallback to products static data
    return getBenchmarkCategories('products').map(cat => ({
      category: cat.category,
      count: cat.count,
      avg_score: cat.avg_score,
      min_score: cat.min,
      max_score: cat.max,
    }));
  }
}

/**
 * Fetch live dimension analysis from the API.
 * Falls back to static data if API is unavailable.
 */
export async function fetchLiveDimensionStats(): Promise<LiveDimensionStats[]> {
  try {
    const response = await fetch(`${API_URL}/benchmark/dimensions`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.dimensions;
  } catch (error) {
    console.warn('Failed to fetch live dimension stats, using static fallback:', error);
    // Fallback to products static data
    return getDimensionAnalysis('products').map(dim => ({
      dimension_id: dim.dimension_id,
      dimension_name: dim.dimension_name,
      avg_score: dim.avg_score,
      presence_rate: dim.presence_rate,
      pages_at_target: dim.pages_at_target,
    }));
  }
}

/**
 * Fetch top performing pages from the API.
 * Falls back to static data if API is unavailable.
 */
export async function fetchLiveTopPerformers(limit: number = 10): Promise<LiveTopPerformer[]> {
  try {
    const response = await fetch(`${API_URL}/benchmark/top-performers?limit=${limit}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.pages;
  } catch (error) {
    console.warn('Failed to fetch live top performers, using static fallback:', error);
    // Fallback to products static data
    return getTopPerformers('products').slice(0, limit).map(p => ({
      url: p.url,
      domain: p.domain,
      category: p.category,
      universal_score: p.universal_score,
      extraction_quality: 'full',
    }));
  }
}

/**
 * Fetch bottom performing pages from the API.
 * Falls back to static data if API is unavailable.
 */
export async function fetchLiveBottomPerformers(limit: number = 10): Promise<LiveTopPerformer[]> {
  try {
    const response = await fetch(`${API_URL}/benchmark/bottom-performers?limit=${limit}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.pages;
  } catch (error) {
    console.warn('Failed to fetch live bottom performers, using static fallback:', error);
    // Fallback to products static data
    return getBottomPerformers('products').slice(0, limit).map(p => ({
      url: p.url,
      domain: p.domain,
      category: p.category,
      universal_score: p.universal_score,
      extraction_quality: 'full',
    }));
  }
}
