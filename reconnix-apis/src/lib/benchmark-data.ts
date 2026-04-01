import benchmarkData from '../../data/benchmark_analysis.json';

// Types
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
export function getBenchmarkSummary(): BenchmarkSummary {
  return benchmarkData.summary as BenchmarkSummary;
}

export function getBenchmarkCategories(): CategoryStats[] {
  return benchmarkData.by_category as CategoryStats[];
}

export function getDimensionAnalysis(): DimensionAnalysis[] {
  return benchmarkData.dimension_analysis as DimensionAnalysis[];
}

export function getModelDistribution(): ModelDistribution {
  return benchmarkData.model_distribution as ModelDistribution;
}

export function getTopPerformers(): TopPerformer[] {
  return benchmarkData.top_performers as TopPerformer[];
}

export function getBottomPerformers(): BottomPerformer[] {
  return benchmarkData.bottom_performers as BottomPerformer[];
}

export function getAllPages(): PageSummary[] {
  return benchmarkData.all_pages as PageSummary[];
}

export function getGeneratedAt(): string {
  return benchmarkData.generated_at;
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
