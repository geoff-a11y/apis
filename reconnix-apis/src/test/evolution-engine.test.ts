// src/test/evolution-engine.test.ts — Unit tests for Evolution Engine v3
import { describe, it, expect, vi } from 'vitest';
import {
  EVOLUTION_CONFIG_V3,
  getModelForGeneration,
  shouldUseHumanJudge,
  scoreVariant,
  scoreGeneration,
  selectElites,
  selectParents,
  runGeneration,
  runFullOptimization,
  ScoredVariant,
  VariantContent,
  MutatorFunction,
  HumanJudgeFunction,
} from '../lib/evolution-engine';
import { WEIGHT_PRESETS } from '../lib/unified-fitness';

// ============================================================================
// Configuration Tests
// ============================================================================

describe('Evolution Config', () => {
  it('validates config has required fields', () => {
    expect(EVOLUTION_CONFIG_V3).toHaveProperty('populationSize');
    expect(EVOLUTION_CONFIG_V3).toHaveProperty('generations');
    expect(EVOLUTION_CONFIG_V3).toHaveProperty('topK');
    expect(EVOLUTION_CONFIG_V3).toHaveProperty('humanJudgeGenerations');
  });

  it('humanJudgeGenerations contains only 4 and 5', () => {
    expect(EVOLUTION_CONFIG_V3.humanJudgeGenerations).toEqual([4, 5]);
  });

  it('uses cheaper model for early generations', () => {
    expect(EVOLUTION_CONFIG_V3.mutationModel.gen1to4).toBe('claude-sonnet');
    expect(EVOLUTION_CONFIG_V3.mutationModel.gen5).toBe('claude-opus');
  });

  it('has reasonable population size', () => {
    expect(EVOLUTION_CONFIG_V3.populationSize).toBeGreaterThanOrEqual(10);
    expect(EVOLUTION_CONFIG_V3.populationSize).toBeLessThanOrEqual(100);
  });

  it('elitism is less than topK', () => {
    expect(EVOLUTION_CONFIG_V3.elitism).toBeLessThan(EVOLUTION_CONFIG_V3.topK);
  });
});

// ============================================================================
// Model Selection Tests
// ============================================================================

describe('Model Selection', () => {
  it('selects Sonnet for mutations in Gen 1-4', () => {
    expect(getModelForGeneration(1)).toBe('claude-sonnet');
    expect(getModelForGeneration(2)).toBe('claude-sonnet');
    expect(getModelForGeneration(3)).toBe('claude-sonnet');
    expect(getModelForGeneration(4)).toBe('claude-sonnet');
  });

  it('selects Opus for mutations in Gen 5', () => {
    expect(getModelForGeneration(5)).toBe('claude-opus');
  });

  it('selects Opus for user-guided generations', () => {
    expect(getModelForGeneration(6, { userGuided: true })).toBe('claude-opus');
    expect(getModelForGeneration(7, { userGuided: true })).toBe('claude-opus');
  });

  it('uses userGuided model regardless of generation number', () => {
    expect(getModelForGeneration(1, { userGuided: true })).toBe('claude-opus');
    expect(getModelForGeneration(3, { userGuided: true })).toBe('claude-opus');
  });
});

describe('Human Judge Selection', () => {
  it('returns true for generation 4', () => {
    expect(shouldUseHumanJudge(4)).toBe(true);
  });

  it('returns true for generation 5', () => {
    expect(shouldUseHumanJudge(5)).toBe(true);
  });

  it('returns false for generations 1-3', () => {
    expect(shouldUseHumanJudge(1)).toBe(false);
    expect(shouldUseHumanJudge(2)).toBe(false);
    expect(shouldUseHumanJudge(3)).toBe(false);
  });

  it('returns false for generation 6+', () => {
    expect(shouldUseHumanJudge(6)).toBe(false);
    expect(shouldUseHumanJudge(7)).toBe(false);
  });
});

// ============================================================================
// Scoring Tests
// ============================================================================

describe('Variant Scoring', () => {
  it('returns score 0-100 for each dimension', () => {
    const variant: VariantContent = {
      id: 'v1',
      title: 'Great Product - Buy Now',
      description: 'Amazing features and warranty included',
      features: ['2 year warranty', 'Free shipping', 'Money back guarantee'],
    };

    const result = scoreVariant(variant);

    expect(result.scores.ai).toBeGreaterThanOrEqual(0);
    expect(result.scores.ai).toBeLessThanOrEqual(100);
    expect(result.scores.seo).toBeGreaterThanOrEqual(0);
    expect(result.scores.seo).toBeLessThanOrEqual(100);
    expect(result.scores.human).toBeGreaterThanOrEqual(0);
    expect(result.scores.human).toBeLessThanOrEqual(100);
  });

  it('includes SEO breakdown', () => {
    const variant: VariantContent = {
      id: 'v1',
      title: 'Widget Pro',
      description: 'A great product',
    };

    const result = scoreVariant(variant, { keyword: 'widget' });

    expect(result.seoBreakdown).toBeDefined();
    expect(result.seoBreakdown).toHaveProperty('breakdown');
  });

  it('includes Human breakdown', () => {
    const variant: VariantContent = {
      id: 'v1',
      title: 'Widget Pro - Buy Now',
      features: ['Save 50% today', 'Free shipping'],
    };

    const result = scoreVariant(variant);

    expect(result.humanBreakdown).toBeDefined();
    expect(result.humanBreakdown).toHaveProperty('score');
    expect(result.humanBreakdown).toHaveProperty('confidence');
  });

  it('calculates fitness correctly', () => {
    const variant: VariantContent = {
      id: 'v1',
      title: 'Widget',
      description: 'A product',
    };

    const result = scoreVariant(variant);

    expect(result.fitness).toBeGreaterThanOrEqual(0);
    expect(result.fitness).toBeLessThanOrEqual(100);
    expect(result.penalizedFitness).toBeLessThanOrEqual(result.fitness);
  });

  it('applies weight presets correctly', () => {
    const variant: VariantContent = {
      id: 'v1',
      title: 'Widget',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    };

    const balancedResult = scoreVariant(variant, { weights: WEIGHT_PRESETS.balanced });
    const aiFirstResult = scoreVariant(variant, { weights: WEIGHT_PRESETS.ai_first });

    // Both should produce valid fitness scores
    expect(balancedResult.fitness).toBeGreaterThanOrEqual(0);
    expect(aiFirstResult.fitness).toBeGreaterThanOrEqual(0);
  });
});

describe('Generation Scoring', () => {
  it('uses estimated Human score for Gen 1-3', async () => {
    const mockEstimator = vi.fn().mockReturnValue({
      score: 70,
      confidence: 'medium',
      ctaBonus: 5,
      benefitBonus: 5,
      socialProofBonus: 0,
      lengthPenalty: 0,
      breakdown: { clarity: 15, persuasiveness: 15, trustworthiness: 15, actionability: 15 },
    });
    const mockFullJudge = vi.fn();

    const variants: VariantContent[] = [
      { id: 'v1', title: 'Variant 1' },
      { id: 'v2', title: 'Variant 2' },
    ];

    await scoreGeneration(1, variants, {
      estimator: mockEstimator,
      fullJudge: mockFullJudge,
      original: { id: 'orig', title: 'Original' },
    });

    expect(mockEstimator).toHaveBeenCalled();
    expect(mockFullJudge).not.toHaveBeenCalled();
  });

  it('uses full Human Judge for Gen 4-5 top 5 only', async () => {
    const mockFullJudge = vi.fn().mockResolvedValue({
      total: 75,
      breakdown: { clarity: 20, persuasiveness: 18, trustworthiness: 19, actionability: 18 },
      feedback: 'Good content',
    });

    // Create 10 variants
    const variants: VariantContent[] = Array(10).fill(null).map((_, i) => ({
      id: `v${i}`,
      title: `Variant ${i}`,
    }));

    await scoreGeneration(4, variants, {
      fullJudge: mockFullJudge,
      original: { id: 'orig', title: 'Original' },
    });

    expect(mockFullJudge).toHaveBeenCalledTimes(5); // Only top 5
  });

  it('sorts variants by fitness after scoring', async () => {
    const variants: VariantContent[] = [
      { id: 'low', title: 'X', description: 'Y' },
      { id: 'high', title: 'Premium Widget Pro - Buy Now', description: 'Amazing warranty and guarantee included', features: ['5 year warranty', 'Free shipping', 'Trusted by thousands'] },
      { id: 'mid', title: 'Widget Product', features: ['Feature 1', 'Feature 2'] },
    ];

    const scored = await scoreGeneration(1, variants);

    // Higher fitness should be first
    expect(scored[0].penalizedFitness).toBeGreaterThanOrEqual(scored[1].penalizedFitness);
    expect(scored[1].penalizedFitness).toBeGreaterThanOrEqual(scored[2].penalizedFitness);
  });

  it('marks disqualified variants', async () => {
    const variants: VariantContent[] = [
      { id: 'v1', title: 'A'.repeat(100), description: 'B'.repeat(300) }, // Should trigger hard fails
      { id: 'v2', title: 'Good Title', description: 'Good description' },
    ];

    const scored = await scoreGeneration(1, variants);

    // The variant with very long title should potentially be disqualified
    const longTitleVariant = scored.find(v => v.id === 'v1');
    expect(longTitleVariant?.seoBreakdown?.hardFails.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Elite and Parent Selection Tests
// ============================================================================

describe('Elite Preservation', () => {
  const createMockVariants = (): ScoredVariant[] => [
    { id: 'elite1', title: 'Elite 1', scores: { ai: 90, seo: 85, human: 88 }, fitness: 88, penalizedFitness: 88, disqualified: false, generation: 1 },
    { id: 'elite2', title: 'Elite 2', scores: { ai: 85, seo: 82, human: 84 }, fitness: 84, penalizedFitness: 84, disqualified: false, generation: 1 },
    { id: 'other1', title: 'Other 1', scores: { ai: 60, seo: 55, human: 58 }, fitness: 58, penalizedFitness: 58, disqualified: false, generation: 1 },
    { id: 'other2', title: 'Other 2', scores: { ai: 50, seo: 45, human: 48 }, fitness: 48, penalizedFitness: 48, disqualified: false, generation: 1 },
  ];

  it('preserves top N variants as elites', () => {
    const variants = createMockVariants();
    const elites = selectElites(variants, 2);

    expect(elites).toHaveLength(2);
    expect(elites[0].id).toBe('elite1');
    expect(elites[1].id).toBe('elite2');
  });

  it('marks elite variants with isElite flag', () => {
    const variants = createMockVariants();
    const elites = selectElites(variants, 2);

    expect(elites[0].isElite).toBe(true);
    expect(elites[1].isElite).toBe(true);
  });

  it('uses default elitism count from config', () => {
    const variants = createMockVariants();
    const elites = selectElites(variants);

    expect(elites.length).toBe(EVOLUTION_CONFIG_V3.elitism);
  });
});

describe('Parent Selection', () => {
  it('selects top K non-disqualified variants', () => {
    const variants: ScoredVariant[] = [
      { id: 'v1', title: 'V1', scores: { ai: 90, seo: 90, human: 90 }, fitness: 90, penalizedFitness: 90, disqualified: false, generation: 1 },
      { id: 'v2', title: 'V2', scores: { ai: 80, seo: 80, human: 80 }, fitness: 80, penalizedFitness: 80, disqualified: false, generation: 1 },
      { id: 'v3', title: 'V3', scores: { ai: 85, seo: 85, human: 85 }, fitness: 85, penalizedFitness: 8.5, disqualified: true, generation: 1 }, // Disqualified
      { id: 'v4', title: 'V4', scores: { ai: 70, seo: 70, human: 70 }, fitness: 70, penalizedFitness: 70, disqualified: false, generation: 1 },
    ];

    const parents = selectParents(variants, 3);

    expect(parents).toHaveLength(3);
    expect(parents.map(p => p.id)).not.toContain('v3'); // Disqualified excluded
    expect(parents[0].id).toBe('v1'); // Highest fitness first
  });

  it('excludes disqualified variants', () => {
    const variants: ScoredVariant[] = [
      { id: 'disq', title: 'DQ', scores: { ai: 95, seo: 95, human: 95 }, fitness: 95, penalizedFitness: 9.5, disqualified: true, generation: 1 },
      { id: 'qual', title: 'OK', scores: { ai: 60, seo: 60, human: 60 }, fitness: 60, penalizedFitness: 60, disqualified: false, generation: 1 },
    ];

    const parents = selectParents(variants, 2);

    expect(parents).toHaveLength(1);
    expect(parents[0].id).toBe('qual');
  });
});

// ============================================================================
// Generation Running Tests
// ============================================================================

describe('Run Generation', () => {
  const createMockMutator = (): MutatorFunction => {
    return vi.fn().mockImplementation(async ({ count }) => {
      return Array(count).fill(null).map((_, i) => ({
        id: `new_${i}`,
        title: `New Variant ${i}`,
        features: ['Feature A', 'Feature B'],
      }));
    });
  };

  const createInitialVariants = (): ScoredVariant[] => [
    { id: 'v1', title: 'Variant 1', scores: { ai: 80, seo: 75, human: 78 }, fitness: 78, penalizedFitness: 78, disqualified: false, generation: 0 },
    { id: 'v2', title: 'Variant 2', scores: { ai: 70, seo: 65, human: 68 }, fitness: 68, penalizedFitness: 68, disqualified: false, generation: 0 },
    { id: 'v3', title: 'Variant 3', scores: { ai: 60, seo: 55, human: 58 }, fitness: 58, penalizedFitness: 58, disqualified: false, generation: 0 },
  ];

  it('runs a generation successfully', async () => {
    const mockMutator = createMockMutator();
    const initialVariants = createInitialVariants();

    const result = await runGeneration(initialVariants, 1, {
      mutator: mockMutator,
    });

    expect(result.generation).toBe(1);
    expect(result.variants.length).toBeGreaterThan(0);
    expect(result.modelUsed).toBe('claude-sonnet');
  });

  it('preserves elite variants', async () => {
    const mockMutator = createMockMutator();
    const initialVariants = createInitialVariants();

    const result = await runGeneration(initialVariants, 1, {
      mutator: mockMutator,
    });

    // Top 2 should be preserved as elites
    const eliteIds = result.variants.filter(v => v.isElite).map(v => v.id);
    expect(eliteIds).toContain('v1');
    expect(eliteIds).toContain('v2');
  });

  it('calls mutator with correct model', async () => {
    const mockMutator = createMockMutator();
    const initialVariants = createInitialVariants();

    await runGeneration(initialVariants, 1, { mutator: mockMutator });
    expect(mockMutator).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet' })
    );

    await runGeneration(initialVariants, 5, { mutator: mockMutator });
    expect(mockMutator).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus' })
    );
  });

  it('includes user feedback in generation result', async () => {
    const mockMutator = createMockMutator();
    const initialVariants = createInitialVariants();

    const result = await runGeneration(initialVariants, 6, {
      mutator: mockMutator,
      userFeedback: 'Add more urgency',
    });

    expect(result.userFeedback).toBe('Add more urgency');
    expect(result.modelUsed).toBe('claude-opus'); // User-guided uses Opus
  });

  it('calculates best and average fitness', async () => {
    const mockMutator = createMockMutator();
    const initialVariants = createInitialVariants();

    const result = await runGeneration(initialVariants, 1, {
      mutator: mockMutator,
    });

    expect(result.bestFitness).toBeGreaterThan(0);
    expect(result.avgFitness).toBeGreaterThan(0);
    // Use tolerance for floating point comparison
    expect(result.bestFitness + 0.01).toBeGreaterThanOrEqual(result.avgFitness);
  });
});

// ============================================================================
// Full Optimization Tests
// ============================================================================

describe('Full Optimization', () => {
  const createMockMutator = (): MutatorFunction => {
    return vi.fn().mockImplementation(async ({ count }) => {
      return Array(count).fill(null).map((_, i) => ({
        id: `new_${Math.random().toString(36).substring(7)}`,
        title: `New Variant ${i}`,
        description: 'Test description with warranty guarantee',
        features: ['Feature A', 'Feature B', 'Feature C'],
      }));
    });
  };

  it('completes 5 generations successfully', async () => {
    const mockMutator = createMockMutator();
    const initialVariants: VariantContent[] = [
      { id: 'init1', title: 'Initial 1', features: ['A', 'B', 'C'] },
      { id: 'init2', title: 'Initial 2', features: ['A', 'B', 'C'] },
      { id: 'init3', title: 'Initial 3', features: ['A', 'B', 'C'] },
    ];

    const result = await runFullOptimization({
      initialVariants,
      mutator: mockMutator,
      maxGenerations: 5,
    });

    expect(result.generations).toHaveLength(5);
    expect(result.status).toBe('completed');
  });

  it('returns best variant', async () => {
    const mockMutator = createMockMutator();
    const initialVariants: VariantContent[] = [
      { id: 'init1', title: 'Initial', features: ['A', 'B'] },
    ];

    const result = await runFullOptimization({
      initialVariants,
      mutator: mockMutator,
      maxGenerations: 2,
    });

    expect(result.bestVariant).toBeDefined();
    expect(result.bestVariant.penalizedFitness).toBeGreaterThan(0);
  });

  it('runs user-guided generation when feedback provided', async () => {
    const mockMutator = createMockMutator();
    const initialVariants: VariantContent[] = [
      { id: 'init1', title: 'Initial', features: ['A'] },
    ];

    const result = await runFullOptimization({
      initialVariants,
      mutator: mockMutator,
      maxGenerations: 2,
      userFeedback: 'Add urgency messaging',
    });

    expect(result.generations).toHaveLength(3); // 2 standard + 1 user-guided
    expect(result.generations[2].userFeedback).toBe('Add urgency messaging');
  });

  it('uses Opus for user-guided generation', async () => {
    const mockMutator = createMockMutator();
    const initialVariants: VariantContent[] = [
      { id: 'init1', title: 'Initial' },
    ];

    const result = await runFullOptimization({
      initialVariants,
      mutator: mockMutator,
      maxGenerations: 1,
      userFeedback: 'Test feedback',
    });

    expect(result.generations[1].modelUsed).toBe('claude-opus');
  });
});

// ============================================================================
// Human Judge Call Limits Tests
// ============================================================================

describe('Human Judge Call Limits', () => {
  it('only calls Human Judge in generations 4 and 5', async () => {
    const humanJudgeCalls: number[] = [];
    const mockHumanJudge: HumanJudgeFunction = vi.fn().mockImplementation(async (v, ctx) => {
      humanJudgeCalls.push(ctx.generation);
      return {
        total: 75,
        breakdown: { clarity: 20, persuasiveness: 18, trustworthiness: 19, actionability: 18 },
      };
    });

    const variants: VariantContent[] = Array(10).fill(null).map((_, i) => ({
      id: `v${i}`,
      title: `Variant ${i}`,
    }));

    // Test Gen 1-3 (should NOT call Human Judge)
    await scoreGeneration(1, variants, {
      fullJudge: mockHumanJudge,
      original: { id: 'orig', title: 'Original' },
    });
    await scoreGeneration(2, variants, {
      fullJudge: mockHumanJudge,
      original: { id: 'orig', title: 'Original' },
    });
    await scoreGeneration(3, variants, {
      fullJudge: mockHumanJudge,
      original: { id: 'orig', title: 'Original' },
    });

    expect(humanJudgeCalls.filter(g => g < 4)).toHaveLength(0);

    // Test Gen 4-5 (SHOULD call Human Judge)
    await scoreGeneration(4, variants, {
      fullJudge: mockHumanJudge,
      original: { id: 'orig', title: 'Original' },
    });
    await scoreGeneration(5, variants, {
      fullJudge: mockHumanJudge,
      original: { id: 'orig', title: 'Original' },
    });

    expect(humanJudgeCalls.filter(g => g >= 4)).toHaveLength(10); // 5 per generation
  });

  it('limits Human Judge to top 5 variants per generation', async () => {
    const judgedVariantIds: string[] = [];
    const mockHumanJudge: HumanJudgeFunction = vi.fn().mockImplementation(async (v) => {
      judgedVariantIds.push(v.id);
      return {
        total: 75,
        breakdown: { clarity: 20, persuasiveness: 18, trustworthiness: 19, actionability: 18 },
      };
    });

    const variants: VariantContent[] = Array(15).fill(null).map((_, i) => ({
      id: `v${i}`,
      title: `Variant ${i}`,
    }));

    await scoreGeneration(4, variants, {
      fullJudge: mockHumanJudge,
      original: { id: 'orig', title: 'Original' },
    });

    expect(judgedVariantIds).toHaveLength(5); // Only top 5
  });
});
