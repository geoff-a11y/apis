/**
 * APIS Price Sensitivity Study Data Loader
 *
 * Provides types and accessor functions for the pricing study results
 * from the APIS-price confirmatory study (17,200 trials).
 */

import pricingData from '@/../data/pricing_analysis.json';

// ============================================================================
// Types
// ============================================================================

export interface PricePointData {
  multiplier: number;
  selection_rate: number;
  n: number;
}

export interface ModelBreakpoint {
  product_id: string;
  breakpoint: number;
  drop: number;
}

export interface ModelBreakpoints {
  breakpoints: ModelBreakpoint[];
  mean_breakpoint: number | null;
  note?: string;
}

export interface HypothesisResult {
  id: string;
  name: string;
  description: string;
  status: 'CONFIRMED' | 'NOT_FOUND' | 'PARTIAL' | 'PENDING';
  p_value: number | null;
  evidence: string;
}

export interface ReasoningByMultiplier {
  multiplier: number;
  selection_rate: number;
  price_mention: number;
  quality_mention: number;
}

export interface ReasoningByModel {
  price_mention: number;
  quality_mention: number;
  value_language: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  anchor_price: number;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  color: string;
}

export interface SubStudy {
  id: string;
  name: string;
  trials: number;
  hypotheses: string[];
}

export interface MerchantRecommendation {
  number: number;
  title: string;
  description: string;
}

export interface PricingStudySummary {
  headline: string;
  finding: string;
  mean_breakpoint: number;
  breakpoint_range: { min: number; max: number };
  key_insights: string[];
}

export interface StudyInfo {
  title: string;
  osf_registration: string;
  config_lock_date: string;
  total_trials: number;
  models_tested: number;
  products_tested: number;
  judge_agreement: number;
}

// ============================================================================
// Data Accessors
// ============================================================================

/**
 * Get the study metadata
 */
export function getStudyInfo(): StudyInfo {
  return pricingData.study_info;
}

/**
 * Get the summary findings
 */
export function getSummary(): PricingStudySummary {
  return pricingData.summary;
}

/**
 * Get pooled selection curve data (all models combined)
 */
export function getPooledSelectionCurve(): PricePointData[] {
  return pricingData.selection_curves.pooled;
}

/**
 * Get selection curve data for a specific model
 */
export function getModelBreakpoints(modelId: string): ModelBreakpoints | null {
  const byModel = pricingData.selection_curves.by_model as Record<string, ModelBreakpoints>;
  return byModel[modelId] || null;
}

/**
 * Get all model breakpoints
 */
export function getAllModelBreakpoints(): Record<string, ModelBreakpoints> {
  return pricingData.selection_curves.by_model as Record<string, ModelBreakpoints>;
}

/**
 * Get all hypothesis results
 */
export function getHypothesisResults(): HypothesisResult[] {
  return pricingData.hypotheses as HypothesisResult[];
}

/**
 * Get hypothesis by ID
 */
export function getHypothesis(id: string): HypothesisResult | null {
  const hypotheses = pricingData.hypotheses as HypothesisResult[];
  return hypotheses.find((h) => h.id === id) || null;
}

/**
 * Get confirmed hypotheses
 */
export function getConfirmedHypotheses(): HypothesisResult[] {
  const hypotheses = pricingData.hypotheses as HypothesisResult[];
  return hypotheses.filter((h) => h.status === 'CONFIRMED');
}

/**
 * Get psychological pricing results
 */
export function getPsychPricingResults(): {
  formats_tested: string[];
  result: string;
  finding: string;
} {
  return pricingData.psych_pricing;
}

/**
 * Get reasoning analysis data
 */
export function getReasoningAnalysis(): {
  note: string;
  by_multiplier: ReasoningByMultiplier[];
  by_model: Record<string, ReasoningByModel>;
  key_finding: string;
} {
  return pricingData.reasoning_analysis as {
    note: string;
    by_multiplier: ReasoningByMultiplier[];
    by_model: Record<string, ReasoningByModel>;
    key_finding: string;
  };
}

/**
 * Get all products tested
 */
export function getProducts(): Product[] {
  return pricingData.products;
}

/**
 * Get all models tested
 */
export function getModels(): Model[] {
  return pricingData.models;
}

/**
 * Get sub-studies
 */
export function getSubStudies(): SubStudy[] {
  return pricingData.sub_studies;
}

/**
 * Get merchant recommendations
 */
export function getMerchantRecommendations(): MerchantRecommendation[] {
  return pricingData.merchant_recommendations;
}

/**
 * Get model display info by ID
 */
export function getModelInfo(modelId: string): Model | null {
  return pricingData.models.find((m: Model) => m.id === modelId) || null;
}

/**
 * Get product by ID
 */
export function getProduct(productId: string): Product | null {
  return pricingData.products.find((p: Product) => p.id === productId) || null;
}

/**
 * Calculate the average breakpoint across all models with data
 */
export function getAverageBreakpoint(): number {
  const byModel = pricingData.selection_curves.by_model as Record<string, ModelBreakpoints>;
  const breakpoints = Object.values(byModel)
    .filter(m => m.mean_breakpoint !== null)
    .map(m => m.mean_breakpoint as number);

  if (breakpoints.length === 0) return 0;
  return breakpoints.reduce((a, b) => a + b, 0) / breakpoints.length;
}

/**
 * Get the price cliff data for visualization
 * Returns data points formatted for Recharts
 */
export function getPriceCliffChartData(): Array<{
  multiplier: string;
  selectionRate: number;
  trialCount: number;
}> {
  return pricingData.selection_curves.pooled.map((point: PricePointData) => ({
    multiplier: `${point.multiplier}x`,
    selectionRate: Math.round(point.selection_rate * 100),
    trialCount: point.n,
  }));
}

/**
 * Get model comparison data for breakpoint chart
 */
export function getModelBreakpointChartData(): Array<{
  model: string;
  modelId: string;
  breakpoint: number;
  color: string;
}> {
  const byModel = pricingData.selection_curves.by_model as Record<string, ModelBreakpoints>;

  return pricingData.models
    .filter((model: Model) => byModel[model.id]?.mean_breakpoint !== null)
    .map((model: Model) => ({
      model: model.name,
      modelId: model.id,
      breakpoint: byModel[model.id].mean_breakpoint as number,
      color: model.color,
    }))
    .sort((a, b) => a.breakpoint - b.breakpoint);
}

/**
 * Get hypothesis status counts
 */
export function getHypothesisStatusCounts(): Record<string, number> {
  const counts: Record<string, number> = {
    CONFIRMED: 0,
    NOT_FOUND: 0,
    PARTIAL: 0,
    PENDING: 0,
  };

  const hypotheses = pricingData.hypotheses as HypothesisResult[];
  hypotheses.forEach((h) => {
    counts[h.status] = (counts[h.status] || 0) + 1;
  });

  return counts;
}

// Export raw data for direct access if needed
export const rawPricingData = pricingData;
