// src/lib/unified-fitness.ts — Weighted combination of three judges with constraint penalties
// Calculates final fitness score for evolutionary selection

import { calculateDelta, DeltaScore, VariantScores } from './baseline-scorer';

export interface WeightPreset {
  ai: number;
  seo: number;
  human: number;
}

export interface Weights {
  ai: number;       // 0-1, all should sum to 1.0
  seo: number;
  human: number;
}

export interface Contributions {
  ai: number;       // Score * weight contribution
  seo: number;
  human: number;
}

export interface UnifiedFitnessResult {
  weighted: number;              // Final weighted score 0-100
  contributions: Contributions;  // Individual contributions
  weights: Weights;              // Weights used
  delta?: DeltaScore;            // Delta from baseline if provided
}

export interface Penalty {
  type: 'hard_constraint' | 'soft_constraint' | 'fidelity';
  description: string;
  multiplier?: number;           // For hard constraints
  deduction?: number;            // For soft constraints
}

export interface PenalizedResult {
  penalized: number;             // Score after penalties
  original: number;              // Original score
  penalties: Penalty[];          // Applied penalties
  disqualified: boolean;         // True if any hard constraint failed
}

export interface SEOScoreForPenalty {
  hardFails?: string[];
  softFails?: string[];
}

export interface HumanScoreForPenalty {
  fidelityViolations?: string[];
}

/**
 * Preset weight configurations for different optimization goals
 */
export const WEIGHT_PRESETS: Record<string, WeightPreset> = {
  balanced: { ai: 0.33, seo: 0.34, human: 0.33 },
  ai_first: { ai: 0.50, seo: 0.25, human: 0.25 },
  seo_first: { ai: 0.25, seo: 0.50, human: 0.25 },
  conversion: { ai: 0.25, seo: 0.25, human: 0.50 },
};

/**
 * Soft constraint penalty values (points deducted)
 */
const SOFT_PENALTY_VALUES: Record<string, number> = {
  description_short: 5,
  missing_schema: 5,
  no_h1: 5,
  readability_difficult: 3,
  default: 5,
};

/**
 * Validate that weights sum to 1.0 (with tolerance)
 */
export function validateWeights(weights: Weights): boolean {
  const sum = weights.ai + weights.seo + weights.human;
  return Math.abs(sum - 1.0) < 0.001;
}

/**
 * Normalize weights to sum to 1.0
 */
export function normalizeWeights(weights: Weights): Weights {
  const sum = weights.ai + weights.seo + weights.human;
  if (sum === 0) {
    return { ai: 0.33, seo: 0.34, human: 0.33 };
  }
  return {
    ai: weights.ai / sum,
    seo: weights.seo / sum,
    human: weights.human / sum,
  };
}

/**
 * Calculate unified fitness score from three judge scores
 */
export function calculateUnifiedFitness(
  scores: { ai: number; seo: number; human: number },
  weights: Weights,
  baseline?: VariantScores
): UnifiedFitnessResult {
  // Ensure weights are normalized
  const normalizedWeights = normalizeWeights(weights);

  // Calculate weighted contributions
  const contributions: Contributions = {
    ai: scores.ai * normalizedWeights.ai,
    seo: scores.seo * normalizedWeights.seo,
    human: scores.human * normalizedWeights.human,
  };

  // Calculate total weighted score
  const weighted = contributions.ai + contributions.seo + contributions.human;

  // Calculate delta from baseline if provided
  let delta: DeltaScore | undefined;
  if (baseline) {
    delta = calculateDelta(
      { aiScore: scores.ai, seoScore: scores.seo, humanScore: scores.human },
      { aiScore: baseline.aiScore, seoScore: baseline.seoScore, humanScore: baseline.humanScore }
    );
  }

  return {
    weighted: Math.round(weighted * 10) / 10, // Round to 1 decimal
    contributions,
    weights: normalizedWeights,
    delta,
  };
}

/**
 * Apply constraint penalties to fitness score
 * - Hard constraints: multiply by 0.1 (severe penalty)
 * - Soft constraints: subtract points
 * - Fidelity violations: treat as hard constraint
 */
export function applyConstraintPenalties(
  fitness: { weighted: number },
  seoScore: SEOScoreForPenalty,
  humanScore: HumanScoreForPenalty
): PenalizedResult {
  const penalties: Penalty[] = [];
  let penalizedScore = fitness.weighted;
  let disqualified = false;

  // Check for hard SEO constraints (apply 0.1 multiplier)
  if (seoScore.hardFails && seoScore.hardFails.length > 0) {
    for (const fail of seoScore.hardFails) {
      penalties.push({
        type: 'hard_constraint',
        description: `SEO hard fail: ${fail}`,
        multiplier: 0.1,
      });
    }
    penalizedScore *= 0.1;
    disqualified = true;
  }

  // Check for fidelity violations (treat as hard constraint)
  if (humanScore.fidelityViolations && humanScore.fidelityViolations.length > 0) {
    for (const violation of humanScore.fidelityViolations) {
      penalties.push({
        type: 'fidelity',
        description: `Fidelity violation: ${violation}`,
        multiplier: 0.1,
      });
    }
    // Only apply if not already disqualified
    if (!disqualified) {
      penalizedScore *= 0.1;
      disqualified = true;
    }
  }

  // Apply soft constraint penalties (subtract points)
  if (seoScore.softFails && seoScore.softFails.length > 0) {
    for (const fail of seoScore.softFails) {
      const deduction = SOFT_PENALTY_VALUES[fail] || SOFT_PENALTY_VALUES.default;
      penalties.push({
        type: 'soft_constraint',
        description: `SEO soft fail: ${fail}`,
        deduction,
      });
      penalizedScore -= deduction;
    }
  }

  // Ensure score never goes below 0
  penalizedScore = Math.max(0, penalizedScore);

  return {
    penalized: Math.round(penalizedScore * 10) / 10,
    original: fitness.weighted,
    penalties,
    disqualified,
  };
}

/**
 * Calculate full fitness with penalties
 */
export function calculateFullFitness(
  scores: { ai: number; seo: number; human: number },
  weights: Weights,
  seoScore: SEOScoreForPenalty,
  humanScore: HumanScoreForPenalty,
  baseline?: VariantScores
): {
  fitness: UnifiedFitnessResult;
  penalized: PenalizedResult;
  final: number;
} {
  const fitness = calculateUnifiedFitness(scores, weights, baseline);
  const penalized = applyConstraintPenalties(fitness, seoScore, humanScore);

  return {
    fitness,
    penalized,
    final: penalized.penalized,
  };
}

/**
 * Compare two variants by their fitness scores
 * Returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareFitness(
  a: { final: number; disqualified: boolean },
  b: { final: number; disqualified: boolean }
): number {
  // Disqualified variants always lose
  if (a.disqualified && !b.disqualified) return -1;
  if (!a.disqualified && b.disqualified) return 1;

  return a.final - b.final;
}

/**
 * Sort variants by fitness (highest first)
 */
export function sortByFitness<T extends { final: number; disqualified: boolean }>(
  variants: T[]
): T[] {
  return [...variants].sort((a, b) => -compareFitness(a, b));
}

/**
 * Get the best N variants by fitness
 */
export function getTopVariants<T extends { final: number; disqualified: boolean }>(
  variants: T[],
  n: number
): T[] {
  return sortByFitness(variants).slice(0, n);
}

/**
 * Calculate fitness statistics for a population
 */
export function calculateFitnessStats(
  variants: Array<{ final: number; disqualified: boolean }>
): {
  min: number;
  max: number;
  mean: number;
  median: number;
  disqualifiedCount: number;
} {
  const qualified = variants.filter(v => !v.disqualified);
  const scores = qualified.map(v => v.final).sort((a, b) => a - b);

  if (scores.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, disqualifiedCount: variants.length };
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = scores.length % 2 === 0
    ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
    : scores[Math.floor(scores.length / 2)];

  return {
    min: scores[0],
    max: scores[scores.length - 1],
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    disqualifiedCount: variants.length - qualified.length,
  };
}
