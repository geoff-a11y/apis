// src/lib/types.ts — All TypeScript interfaces for APIS webapp

export interface Model {
  id: string;                    // "gpt54", "o3", "gemini", "claude", "llama", "sonar"
  name: string;                  // "GPT-5.4"
  provider: string;              // "OpenAI"
  model_string: string;          // "gpt-5.4-2026-03-05"
  temperature: number | null;
  reasoning_effort?: string;     // for o3
  measurement_date: string;      // "2026-03-27"
  color: string;                 // CSS var reference
  logo: string;                  // path to /public/images/model-logos/
  study_type: 'confirmatory' | 'exploratory' | 'pilot';
  notes?: string;
  fingerprint_description?: string;  // 1-2 sentence behavioral profile
}

export interface Dimension {
  id: string;                    // "dim_01"
  name: string;                  // "third_party_authority"
  display_name: string;          // "Third-Party Authority"
  cluster: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  cluster_name: string;          // "Evidence-Based Signal Processing"
  evidence_tier: 'a' | 'b' | 'c';
  replication: boolean;
  agentic: boolean;
  description: string;           // plain English
  what_it_measures: string;      // longer explanation
  signal_example: {
    absent: string;
    present: string;
  };
  published_source?: string;
}

export interface EffectSize {
  dimension_id: string;
  model_id: string;
  cohen_h: number;               // primary metric
  ci_lower: number;
  ci_upper: number;
  p_control: number;
  p_manipulation: number;
  n_trials: number;
  context: 'b2c' | 'b2b' | 'pooled';
  confirmatory: boolean;         // ICC >= 0.70
}

export interface BehavioralFingerprint {
  model_id: string;
  version: string;
  measurement_date: string;
  study_type: 'confirmatory' | 'exploratory';
  vector: number[];              // 26-dim, normalized 0-100
  dimension_order: string[];     // dim IDs in order
  mean_effect_size: number;
  top_dimensions: string[];      // top 5 by effect size
  notes?: string;
}

export interface CosineSimilarity {
  model_a: string;
  model_b: string;
  similarity: number;            // 0-1
}

export interface ICCResult {
  dimension_id: string;
  icc: number;
  krippendorff_alpha: number;
  manipulation_check_pass_rate: number;
  confirmatory: boolean;         // icc >= 0.70
  n_responses: number;
}

export interface InteractionCoefficient {
  dim_a: string;
  dim_b: string;
  co_occurrence_coefficient: number;
  interaction_type: 'additive' | 'multiplicative' | 'dominant' | 'diminishing';
  aic_winning_model: string;
  delta_aic: number;
}

export interface CopyRule {
  dimension_id: string;
  signal_absent_example: string;
  signal_patterns: string[];     // 3-5 specific copy templates
  zone_guidance: string;         // which zone is most effective
  intensity_guidance: {
    low: string;                 // 0.3 signal target
    medium: string;              // 0.7 signal target
    strong: string;              // 1.0 signal target
  };
}

export interface SignalPresence {
  dimension_id: string;
  score: number;                 // 0-1
  zone_contributions: {
    zone: string;
    score: number;
    evidence: string;
  }[];
}

export interface SignalInteraction {
  signal_ids: string[];
  combination_type: 'positive_pair' | 'negative_pair' | 'mixed_pair' | 'triple_combo';
  individual_effects: Record<string, number>;
  combined_effect: number;
  interaction_bonus: number;     // Can be positive (synergy) or negative (interference)
  model_used: 'multiplicative' | 'additive' | 'dominant' | 'diminishing';
}

export interface MLScore {
  id: string;                    // uuid
  url: string;
  scored_at: string;
  universal_score: number;       // 0-100
  client_score?: number;         // if distribution provided
  model_distribution?: Record<string, number>;
  model_tips?: Record<string, string[]>;  // Per-model improvement tips from AI
  product_title?: string;        // Product title from page
  product_description?: string;  // Brief description for hero section
  score_summary?: string;        // AI-generated 2-3 sentence summary
  signal_inventory: SignalPresence[];
  signal_interactions?: SignalInteraction[];  // Detected signal combinations
  interaction_adjustment?: number;            // Score adjustment from interactions
  readability_score: number;
  readability_flags: string[];
  recommendations: Recommendation[];
  platform?: 'web' | 'amazon' | 'walmart' | 'google_shopping';
  extraction_quality: 'full' | 'partial' | 'minimal';
  category?: string;             // Detected product category
  category_percentile?: number;  // Percentile within category
  category_average?: number;     // Average score in category
}

export interface Recommendation {
  dimension_id: string;
  dimension_name?: string;
  current_signal: number;
  target_signal: number;
  gap: number;
  predicted_delta: number;
  copy_suggestion: string;
  zone: string;
  priority: 'high' | 'medium' | 'low';
  // AI-generated copy fields
  current_state?: string;         // What's currently on the page (or "Not present")
  action?: string;                // One sentence: what to do for this product
  why_change?: string;            // Why this matters for AI recommendations
  why_matters?: string;           // Alternative field name for why_change
  suggested_copy?: string;        // Specific copy to add
  placement?: string;             // Where to add it (e.g., "Add to product description")
  selection_impact?: string;      // e.g., "+38%" or "-13%"
  selection_impact_text?: string; // e.g., "38% more likely to be selected"
  research_basis?: string;        // Research backing for this recommendation
  ai_generated?: boolean;         // Whether this was AI-generated
  model?: string;                 // Which model generated it
}

export interface GlobalStats {
  models: number;
  dimensions: number;
  trials: number;
  last_updated: string;
  osf_id: string;
  osf_url: string;
}

export type ClusterKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const CLUSTER_NAMES: Record<ClusterKey, string> = {
  A: 'Evidence-Based Signal Processing',
  B: 'Value-Based Decision Making',
  C: 'Risk & Assurance',
  D: 'Information Processing',
  E: 'Choice Architecture',
  F: 'Agentic Behaviors',
};

export const CLUSTER_COLORS: Record<ClusterKey, string> = {
  A: 'cluster-a',
  B: 'cluster-b',
  C: 'cluster-c',
  D: 'cluster-d',
  E: 'cluster-e',
  F: 'cluster-f',
};

// ============================================================================
// NEW TYPES FOR SCORE RESULTS PAGE REDESIGN
// ============================================================================

export type ProductCategory =
  | 'personal_care'
  | 'electronics'
  | 'food_beverage'
  | 'home_goods'
  | 'apparel'
  | 'health_wellness'
  | 'telecom'
  | 'other';

export type UseCase =
  | 'b2c_consumer'
  | 'b2b_enterprise'
  | 'ecommerce_search';

export interface CategoryData {
  id: ProductCategory;
  display_name: string;
  keywords: string[];  // for auto-detection from URL/title
  important_dimensions: string[];
  dimension_weights: Record<string, number>;
  benchmarks: {
    average: number;
    top_performer: number;
    percentiles: Record<number, number>;
  };
  copy_examples: Record<string, string[]>;
  competitors: string[];
}

export interface UseCaseWeights {
  id: UseCase;
  name: string;
  description: string;
  model_weights: Record<string, number>;
}

export interface ModelPersonality {
  model_id: string;
  name: string;
  summary: string;
  strengths: string[];
  biases: string[];
  improvement_tips: string[];
  top_dimensions: string[];  // dimensions this model weights heavily
}

export interface DimensionExplanation {
  dimension_id: string;
  plain_language: string;
  why_it_matters: string;
  effect_magnitude: string;
  best_for_models: string[];
}

// Utility functions for score formatting
export function formatScore(decimal: number): string {
  return `${Math.round(decimal * 100)}/100`;
}

export function formatScoreShort(decimal: number): string {
  return `${Math.round(decimal * 100)}`;
}

export function formatGap(gap: number, benchmark?: number): string {
  const points = Math.round(gap * 100);
  if (benchmark !== undefined) {
    return `Room to improve: ${points} points (target: ${Math.round(benchmark * 100)})`;
  }
  return `Room to improve: ${points} points`;
}
