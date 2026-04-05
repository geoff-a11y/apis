// src/lib/evolution-engine.ts — Evolution engine configuration and scoring for v3
// Manages generation flow with cost-optimized model selection

import { calculateUnifiedFitness, applyConstraintPenalties, Weights, WEIGHT_PRESETS } from './unified-fitness';
import { estimateHumanScore, EstimatedHumanScore } from './human-estimator';
import { calculateSEOScore, SEOScore, VariantContent as SEOVariantContent } from './seo-judge';
import { VariantScores } from './baseline-scorer';

// ============================================================================
// Configuration
// ============================================================================

export interface EvolutionConfig {
  populationSize: number;
  generations: number;
  topK: number;
  mutationsPerParent: number;
  elitism: number;
  humanJudgeGenerations: number[];
  humanJudgeTopN: number;
  maxUserGuidedGenerations: number;
  mutationModel: {
    gen1to4: string;
    gen5: string;
    userGuided: string;
  };
}

export const EVOLUTION_CONFIG_V3: EvolutionConfig = {
  populationSize: 30,
  generations: 5,
  topK: 8,
  mutationsPerParent: 1,           // REDUCED from 4 → 1 for cost
  elitism: 2,
  humanJudgeGenerations: [4, 5],   // Only Gen 4 and 5 get full Human Judge
  humanJudgeTopN: 5,               // Only top 5 per generation
  maxUserGuidedGenerations: 3,     // Max 3 additional user-guided generations
  mutationModel: {
    gen1to4: 'claude-sonnet',      // Cheaper model for early gens
    gen5: 'claude-opus',           // Opus only for final generation
    userGuided: 'claude-opus',     // Opus for user-guided refinement
  },
};

// ============================================================================
// Types
// ============================================================================

export interface VariantContent {
  id: string;
  title?: string;
  description?: string;
  features?: string[];
  content?: string;
  schema?: Record<string, unknown>;
}

export interface ScoredVariant extends VariantContent {
  scores: {
    ai: number;
    seo: number;
    human: number;
  };
  seoBreakdown?: SEOScore;
  humanBreakdown?: EstimatedHumanScore;
  fitness: number;
  penalizedFitness: number;
  disqualified: boolean;
  generation: number;
  parentId?: string;
  isElite?: boolean;
}

export interface GenerationResult {
  generation: number;
  variants: ScoredVariant[];
  bestFitness: number;
  avgFitness: number;
  humanJudgeUsed: boolean;
  modelUsed: string;
  userFeedback?: string;
}

export interface HumanJudgeResult {
  total: number;
  breakdown: {
    clarity: number;
    persuasiveness: number;
    trustworthiness: number;
    actionability: number;
  };
  feedback?: string;
  fidelityViolations?: string[];
}

export type HumanJudgeFunction = (
  variant: VariantContent,
  context: { generation: number; original: VariantContent }
) => Promise<HumanJudgeResult>;

export type EstimatorFunction = (variant: VariantContent) => EstimatedHumanScore;

export interface ScoringOptions {
  fullJudge?: HumanJudgeFunction;
  estimator?: EstimatorFunction;
  weights?: Weights;
  keyword?: string;
  baseline?: VariantScores;
  original?: VariantContent;
}

// ============================================================================
// Model Selection
// ============================================================================

/**
 * Get the model to use for mutations in a given generation
 */
export function getModelForGeneration(
  generation: number,
  options?: { userGuided?: boolean }
): string {
  if (options?.userGuided) {
    return EVOLUTION_CONFIG_V3.mutationModel.userGuided;
  }

  if (generation >= 5) {
    return EVOLUTION_CONFIG_V3.mutationModel.gen5;
  }

  return EVOLUTION_CONFIG_V3.mutationModel.gen1to4;
}

/**
 * Check if Human Judge should be used for this generation
 */
export function shouldUseHumanJudge(generation: number): boolean {
  return EVOLUTION_CONFIG_V3.humanJudgeGenerations.includes(generation);
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculate AI score based on behavioral genome signals
 * Simplified version - full implementation uses model-weights.ts
 */
function calculateAIScore(variant: VariantContent): number {
  let score = 50; // Base score

  const allText = [
    variant.title || '',
    variant.description || '',
    ...(variant.features || []),
    variant.content || '',
  ].join(' ').toLowerCase();

  // Positive signals
  if (/warranty|guarantee/.test(allText)) score += 8;
  if (/return|refund/.test(allText)) score += 6;
  if (/\d+\s*year|\d+\s*month/.test(allText)) score += 4;
  if (/free shipping|fast delivery/.test(allText)) score += 5;
  if (/review|rating|star/.test(allText)) score += 6;
  if (/award|certified|verified/.test(allText)) score += 5;
  if (/sustainable|eco|green/.test(allText)) score += 3;
  if (/trusted|reliable|proven/.test(allText)) score += 4;
  if (/save|discount|deal/.test(allText)) score += 3;
  if (variant.schema && Object.keys(variant.schema).length > 0) score += 5;

  // Negative signals
  if (allText.length < 100) score -= 10;
  if (!(variant.features && variant.features.length >= 3)) score -= 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Score a single variant with all three judges
 * Uses estimation for Human score unless full judge is provided
 */
export function scoreVariant(
  variant: VariantContent,
  options: ScoringOptions = {}
): Omit<ScoredVariant, 'generation' | 'parentId' | 'isElite'> {
  const weights = options.weights || WEIGHT_PRESETS.balanced;
  const keyword = options.keyword || 'product';

  // Calculate AI score
  const aiScore = calculateAIScore(variant);

  // Calculate SEO score (rule-based)
  const seoResult = calculateSEOScore(variant as SEOVariantContent, keyword);

  // Calculate Human score (estimated)
  const estimator = options.estimator || estimateHumanScore;
  const humanResult = estimator(variant);

  const scores = {
    ai: aiScore,
    seo: seoResult.total,
    human: humanResult.score,
  };

  // Calculate unified fitness
  const fitness = calculateUnifiedFitness(scores, weights, options.baseline);

  // Apply penalties
  const penalized = applyConstraintPenalties(
    { weighted: fitness.weighted },
    { hardFails: seoResult.hardFails, softFails: seoResult.softFails },
    { fidelityViolations: undefined } // Will be set by Human Judge if used
  );

  return {
    ...variant,
    scores,
    seoBreakdown: seoResult,
    humanBreakdown: humanResult,
    fitness: fitness.weighted,
    penalizedFitness: penalized.penalized,
    disqualified: penalized.disqualified,
  };
}

/**
 * Score a generation of variants
 * For Gen 4-5: Also runs full Human Judge on top 5
 */
export async function scoreGeneration(
  generation: number,
  variants: VariantContent[],
  options: ScoringOptions = {}
): Promise<ScoredVariant[]> {
  const weights = options.weights || WEIGHT_PRESETS.balanced;
  const keyword = options.keyword || 'product';
  const estimator = options.estimator || estimateHumanScore;

  // First pass: Score all variants with estimation
  let scored = variants.map(variant => {
    const result = scoreVariant(variant, { ...options, estimator });
    return {
      ...result,
      generation,
    } as ScoredVariant;
  });

  // Sort by penalized fitness
  scored.sort((a, b) => b.penalizedFitness - a.penalizedFitness);

  // For Gen 4-5: Run full Human Judge on top N variants
  if (shouldUseHumanJudge(generation) && options.fullJudge && options.original) {
    const topN = Math.min(EVOLUTION_CONFIG_V3.humanJudgeTopN, scored.length);
    const topVariants = scored.slice(0, topN);

    for (const variant of topVariants) {
      try {
        const humanResult = await options.fullJudge(variant, {
          generation,
          original: options.original,
        });

        // Update with full Human Judge score
        variant.scores.human = humanResult.total;

        // Recalculate fitness with new Human score
        const fitness = calculateUnifiedFitness(variant.scores, weights, options.baseline);

        // Apply penalties including fidelity violations
        const penalized = applyConstraintPenalties(
          { weighted: fitness.weighted },
          {
            hardFails: variant.seoBreakdown?.hardFails || [],
            softFails: variant.seoBreakdown?.softFails || [],
          },
          { fidelityViolations: humanResult.fidelityViolations }
        );

        variant.fitness = fitness.weighted;
        variant.penalizedFitness = penalized.penalized;
        variant.disqualified = penalized.disqualified;
      } catch (error) {
        // If Human Judge fails, keep estimated score
        console.error(`Human Judge failed for variant ${variant.id}:`, error);
      }
    }

    // Re-sort after Human Judge updates
    scored.sort((a, b) => b.penalizedFitness - a.penalizedFitness);
  }

  return scored;
}

// ============================================================================
// Elite Preservation
// ============================================================================

/**
 * Select elite variants to preserve unchanged
 */
export function selectElites(
  variants: ScoredVariant[],
  count: number = EVOLUTION_CONFIG_V3.elitism
): ScoredVariant[] {
  // Sort by penalized fitness and take top N
  const sorted = [...variants].sort((a, b) => b.penalizedFitness - a.penalizedFitness);
  return sorted.slice(0, count).map(v => ({
    ...v,
    isElite: true,
  }));
}

/**
 * Select parent variants for mutation
 */
export function selectParents(
  variants: ScoredVariant[],
  count: number = EVOLUTION_CONFIG_V3.topK
): ScoredVariant[] {
  // Exclude disqualified variants
  const qualified = variants.filter(v => !v.disqualified);

  // Sort by penalized fitness and take top K
  const sorted = [...qualified].sort((a, b) => b.penalizedFitness - a.penalizedFitness);
  return sorted.slice(0, count);
}

// ============================================================================
// Generation Running
// ============================================================================

export interface MutatorFunction {
  (context: {
    parents: ScoredVariant[];
    generation: number;
    model: string;
    count: number;
    userFeedback?: string;
  }): Promise<VariantContent[]>;
}

/**
 * Run a single generation
 */
export async function runGeneration(
  previousVariants: ScoredVariant[],
  generation: number,
  options: {
    mutator: MutatorFunction;
    scoringOptions?: ScoringOptions;
    userFeedback?: string;
  }
): Promise<GenerationResult> {
  const config = EVOLUTION_CONFIG_V3;
  const model = getModelForGeneration(generation, { userGuided: !!options.userFeedback });

  // Select elites to preserve
  const elites = selectElites(previousVariants, config.elitism);

  // Select parents for mutation
  const parents = selectParents(previousVariants, config.topK);

  // Generate mutations
  const mutationCount = config.populationSize - elites.length;
  const newVariants = await options.mutator({
    parents,
    generation,
    model,
    count: mutationCount,
    userFeedback: options.userFeedback,
  });

  // Combine elites with new variants
  const allVariants: VariantContent[] = [
    ...elites,
    ...newVariants,
  ];

  // Score the generation
  const scored = await scoreGeneration(generation, allVariants, options.scoringOptions);

  // Mark elites
  for (const variant of scored) {
    if (elites.some(e => e.id === variant.id)) {
      variant.isElite = true;
    }
  }

  // Calculate statistics
  const fitnesses = scored.map(v => v.penalizedFitness);
  const bestFitness = Math.max(...fitnesses);
  const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;

  return {
    generation,
    variants: scored,
    bestFitness,
    avgFitness,
    humanJudgeUsed: shouldUseHumanJudge(generation),
    modelUsed: model,
    userFeedback: options.userFeedback,
  };
}

// ============================================================================
// Full Optimization Run
// ============================================================================

export interface OptimizationResult {
  generations: GenerationResult[];
  finalVariants: ScoredVariant[];
  bestVariant: ScoredVariant;
  totalGenerations: number;
  status: 'completed' | 'error';
}

/**
 * Run full optimization (5 generations + optional user-guided)
 */
export async function runFullOptimization(options: {
  initialVariants: VariantContent[];
  mutator: MutatorFunction;
  scoringOptions?: ScoringOptions;
  userFeedback?: string;
  maxGenerations?: number;
}): Promise<OptimizationResult> {
  const maxGens = options.maxGenerations || EVOLUTION_CONFIG_V3.generations;
  const generations: GenerationResult[] = [];

  // Score initial population (Generation 0)
  let currentVariants = await scoreGeneration(0, options.initialVariants, options.scoringOptions);

  // Run standard generations
  for (let gen = 1; gen <= maxGens; gen++) {
    const result = await runGeneration(currentVariants, gen, {
      mutator: options.mutator,
      scoringOptions: options.scoringOptions,
    });

    generations.push(result);
    currentVariants = result.variants;
  }

  // Run user-guided generation if feedback provided
  if (options.userFeedback) {
    const userGuidedGen = maxGens + 1;

    // Check max user-guided generations
    const userGuidedCount = generations.filter(g => g.userFeedback).length;
    if (userGuidedCount >= EVOLUTION_CONFIG_V3.maxUserGuidedGenerations) {
      throw new Error(`Maximum user-guided generations (${EVOLUTION_CONFIG_V3.maxUserGuidedGenerations}) reached`);
    }

    const result = await runGeneration(currentVariants, userGuidedGen, {
      mutator: options.mutator,
      scoringOptions: options.scoringOptions,
      userFeedback: options.userFeedback,
    });

    generations.push(result);
    currentVariants = result.variants;
  }

  // Find best variant
  const allVariants = currentVariants;
  const bestVariant = allVariants.reduce((best, v) =>
    v.penalizedFitness > best.penalizedFitness ? v : best
  );

  return {
    generations,
    finalVariants: currentVariants,
    bestVariant,
    totalGenerations: generations.length,
    status: 'completed',
  };
}
