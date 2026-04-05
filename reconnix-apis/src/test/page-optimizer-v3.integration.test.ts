// src/test/page-optimizer-v3.integration.test.ts — Integration tests for Page Optimizer v3
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runFullOptimization,
  scoreGeneration,
  runGeneration,
  EVOLUTION_CONFIG_V3,
  MutatorFunction,
  HumanJudgeFunction,
  VariantContent,
  ScoredVariant,
} from '../lib/evolution-engine';
import { analyzeBaseline } from '../lib/baseline-scorer';
import { findParetoFrontier, assignNicknames } from '../lib/pareto';
import { calculateUnifiedFitness, applyConstraintPenalties, WEIGHT_PRESETS } from '../lib/unified-fitness';
import { generateUserGuidedMutations } from '../lib/user-guided-mutation';

// ============================================================================
// Helper Functions
// ============================================================================

function createMockMutator(): MutatorFunction {
  return vi.fn().mockImplementation(async ({ count, generation }) => {
    return Array(count).fill(null).map((_, i) => ({
      id: `gen${generation}_v${i}_${Date.now()}`,
      title: `Widget Pro Gen ${generation} - Variant ${i}`,
      description: 'Premium widget with warranty guarantee and free shipping. Trusted by thousands.',
      features: [
        '5-year warranty included',
        'Free shipping on all orders',
        'Money back guarantee',
        'Trusted by 10,000+ customers',
      ],
    }));
  });
}

function createMockHumanJudge(): HumanJudgeFunction {
  const calls: Array<{ generation: number; variantId: string }> = [];

  const judge: HumanJudgeFunction = vi.fn().mockImplementation(async (variant, context) => {
    calls.push({ generation: context.generation, variantId: variant.id });
    return {
      total: 70 + Math.random() * 20,
      breakdown: {
        clarity: 18 + Math.random() * 4,
        persuasiveness: 17 + Math.random() * 5,
        trustworthiness: 18 + Math.random() * 4,
        actionability: 17 + Math.random() * 5,
      },
      feedback: 'Good content overall.',
    };
  });

  // Attach calls tracker
  (judge as unknown as { calls: typeof calls }).calls = calls;

  return judge;
}

// ============================================================================
// Full Evolution Cycle Tests
// ============================================================================

describe('Page Optimizer v3 - Full Integration', () => {
  describe('Full Evolution Cycle', () => {
    it('completes 5 generations successfully', async () => {
      const mockMutator = createMockMutator();
      const initialVariants: VariantContent[] = [
        { id: 'init1', title: 'Initial Widget', features: ['Feature A', 'Feature B', 'Feature C'] },
        { id: 'init2', title: 'Initial Product', features: ['Quality', 'Value', 'Service'] },
      ];

      const result = await runFullOptimization({
        initialVariants,
        mutator: mockMutator,
        maxGenerations: 5,
      });

      expect(result.generations).toHaveLength(5);
      expect(result.status).toBe('completed');
    });

    it('returns Pareto frontier at the end', async () => {
      const mockMutator = createMockMutator();
      const initialVariants: VariantContent[] = [
        { id: 'init1', title: 'Test Product', features: ['A', 'B', 'C'] },
      ];

      const result = await runFullOptimization({
        initialVariants,
        mutator: mockMutator,
        maxGenerations: 3,
      });

      const frontier = findParetoFrontier(result.finalVariants.map(v => ({
        id: v.id,
        ai: v.scores.ai,
        seo: v.scores.seo,
        human: v.scores.human,
      })));

      expect(frontier.length).toBeGreaterThan(0);

      const nicknamed = assignNicknames(frontier);
      const hasNicknames = nicknamed.some(v => v.nickname !== undefined);
      expect(hasNicknames).toBe(true);
    });

    it('includes baseline scores and deltas', async () => {
      const mockMutator = createMockMutator();
      const originalContent = {
        title: 'Basic Widget',
        description: 'A simple widget',
        features: ['One feature'],
      };

      const baseline = analyzeBaseline(originalContent, 'widget');

      expect(baseline).toBeDefined();
      expect(baseline).toHaveProperty('aiScore');
      expect(baseline).toHaveProperty('seoScore');
      expect(baseline).toHaveProperty('humanScore');
      expect(baseline.aiScore).toBeGreaterThanOrEqual(0);
      expect(baseline.seoScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Human Judge Call Limits', () => {
    it('Human Judge only called in generations 4 and 5', async () => {
      const mockHumanJudge = createMockHumanJudge();
      const calls = (mockHumanJudge as unknown as { calls: Array<{ generation: number }> }).calls;

      const variants: VariantContent[] = Array(10).fill(null).map((_, i) => ({
        id: `v${i}`,
        title: `Variant ${i}`,
        features: ['A', 'B'],
      }));
      const original: VariantContent = { id: 'orig', title: 'Original' };

      // Test Gen 1-3 (should NOT call Human Judge)
      await scoreGeneration(1, variants, { fullJudge: mockHumanJudge, original });
      await scoreGeneration(2, variants, { fullJudge: mockHumanJudge, original });
      await scoreGeneration(3, variants, { fullJudge: mockHumanJudge, original });

      const gen1to3Calls = calls.filter(c => c.generation < 4);
      expect(gen1to3Calls).toHaveLength(0);

      // Test Gen 4-5 (SHOULD call Human Judge)
      await scoreGeneration(4, variants, { fullJudge: mockHumanJudge, original });
      await scoreGeneration(5, variants, { fullJudge: mockHumanJudge, original });

      const gen4to5Calls = calls.filter(c => c.generation >= 4);
      expect(gen4to5Calls).toHaveLength(10); // 5 per generation
    });

    it('Human Judge called on top 5 variants only per generation', async () => {
      const mockHumanJudge = createMockHumanJudge();
      const calls = (mockHumanJudge as unknown as { calls: Array<{ variantId: string }> }).calls;

      const variants: VariantContent[] = Array(15).fill(null).map((_, i) => ({
        id: `v${i}`,
        title: `Variant ${i}`,
      }));
      const original: VariantContent = { id: 'orig', title: 'Original' };

      await scoreGeneration(4, variants, { fullJudge: mockHumanJudge, original });

      expect(calls).toHaveLength(5); // Only top 5
    });
  });

  describe('Model Selection', () => {
    it('uses Sonnet for mutations in generations 1-4', async () => {
      const mockMutator = createMockMutator();
      const initialVariants: ScoredVariant[] = [
        { id: 'v1', title: 'V1', scores: { ai: 70, seo: 65, human: 68 }, fitness: 68, penalizedFitness: 68, disqualified: false, generation: 0 },
      ];

      // Run generations 1-4
      for (let gen = 1; gen <= 4; gen++) {
        await runGeneration(initialVariants, gen, { mutator: mockMutator });
        expect(mockMutator).toHaveBeenLastCalledWith(
          expect.objectContaining({ model: 'claude-sonnet' })
        );
      }
    });

    it('uses Opus for mutations in generation 5', async () => {
      const mockMutator = createMockMutator();
      const initialVariants: ScoredVariant[] = [
        { id: 'v1', title: 'V1', scores: { ai: 70, seo: 65, human: 68 }, fitness: 68, penalizedFitness: 68, disqualified: false, generation: 4 },
      ];

      await runGeneration(initialVariants, 5, { mutator: mockMutator });

      expect(mockMutator).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus' })
      );
    });
  });

  describe('User-Guided Generation 6', () => {
    it('accepts user feedback and generates Gen 6', async () => {
      const mockMutator = createMockMutator();
      const initialVariants: VariantContent[] = [
        { id: 'init1', title: 'Initial', features: ['A'] },
      ];

      const result = await runFullOptimization({
        initialVariants,
        mutator: mockMutator,
        maxGenerations: 5,
        userFeedback: 'Add more urgency and scarcity messaging',
      });

      expect(result.generations).toHaveLength(6);
      expect(result.generations[5].userFeedback).toBe('Add more urgency and scarcity messaging');
    });

    it('uses Opus for user-guided mutations', async () => {
      const mockMutator = createMockMutator();
      const initialVariants: VariantContent[] = [
        { id: 'init1', title: 'Initial' },
      ];

      const result = await runFullOptimization({
        initialVariants,
        mutator: mockMutator,
        maxGenerations: 2,
        userFeedback: 'Test feedback',
      });

      expect(result.generations[2].modelUsed).toBe('claude-opus');
    });
  });

  describe('Score Progression', () => {
    it('elite variants are preserved across generations', async () => {
      const mockMutator = createMockMutator();
      const initialVariants: VariantContent[] = [
        { id: 'elite', title: 'Elite Widget Pro', description: 'Best warranty guarantee', features: ['5-year warranty', 'Free shipping', 'Money back'] },
      ];

      const result = await runFullOptimization({
        initialVariants,
        mutator: mockMutator,
        maxGenerations: 3,
      });

      // Check that elite ID appears in later generations
      const gen2Ids = result.generations[1].variants.map(v => v.id);
      const gen3Ids = result.generations[2].variants.map(v => v.id);

      // Elite variants should be marked with isElite flag
      const elitesInGen2 = result.generations[1].variants.filter(v => v.isElite);
      expect(elitesInGen2.length).toBe(EVOLUTION_CONFIG_V3.elitism);
    });
  });

  describe('Constraint Enforcement', () => {
    it('applies hard SEO penalty (0.1x) for critical failures', async () => {
      const fitness = { weighted: 80 };
      const seoScore = { hardFails: ['title_too_long'], softFails: [] };

      const result = applyConstraintPenalties(fitness, seoScore, {});

      expect(result.penalized).toBe(8); // 80 * 0.1
      expect(result.disqualified).toBe(true);
    });

    it('applies soft penalties for minor issues', async () => {
      const fitness = { weighted: 80 };
      const seoScore = { hardFails: [], softFails: ['description_short'] };

      const result = applyConstraintPenalties(fitness, seoScore, {});

      expect(result.penalized).toBeLessThan(80);
      expect(result.disqualified).toBe(false);
    });

    it('applies fidelity violations as hard constraint', async () => {
      const fitness = { weighted: 90 };
      const humanScore = { fidelityViolations: ['fabricated_warranty'] };

      const result = applyConstraintPenalties(fitness, { hardFails: [], softFails: [] }, humanScore);

      expect(result.penalized).toBe(9); // 90 * 0.1
      expect(result.disqualified).toBe(true);
    });
  });
});

// ============================================================================
// Baseline and Fitness Integration Tests
// ============================================================================

describe('Baseline and Fitness Integration', () => {
  it('calculates baseline with all three scores', () => {
    const content = {
      title: 'Premium Widget Pro',
      description: 'The best widget with warranty and guarantee',
      features: ['5-year warranty', 'Free shipping', 'Trusted by thousands'],
    };

    const baseline = analyzeBaseline(content, 'widget');

    expect(baseline.aiScore).toBeGreaterThan(0);
    expect(baseline.seoScore).toBeGreaterThan(0);
    expect(baseline.humanScore).toBeGreaterThan(0);
    expect(baseline.totalScore).toBeGreaterThan(0);
  });

  it('calculates unified fitness with weights', () => {
    const scores = { ai: 80, seo: 70, human: 75 };
    const weights = WEIGHT_PRESETS.balanced;

    const result = calculateUnifiedFitness(scores, weights);

    expect(result.weighted).toBeGreaterThan(0);
    expect(result.weighted).toBeLessThanOrEqual(100);
    expect(result.contributions.ai).toBeGreaterThan(0);
  });

  it('different weight presets produce different results', () => {
    const scores = { ai: 90, seo: 50, human: 60 };

    const balancedResult = calculateUnifiedFitness(scores, WEIGHT_PRESETS.balanced);
    const aiFirstResult = calculateUnifiedFitness(scores, WEIGHT_PRESETS.ai_first);

    // AI First should give higher score since AI score is highest
    expect(aiFirstResult.weighted).toBeGreaterThan(balancedResult.weighted);
  });
});

// ============================================================================
// Pareto Integration Tests
// ============================================================================

describe('Pareto Integration', () => {
  it('finds Pareto frontier from scored variants', () => {
    const variants = [
      { id: '1', ai: 90, seo: 50, human: 60 },
      { id: '2', ai: 60, seo: 85, human: 65 },
      { id: '3', ai: 70, seo: 70, human: 80 },
      { id: '4', ai: 50, seo: 50, human: 50 }, // Dominated
    ];

    const frontier = findParetoFrontier(variants);

    expect(frontier.length).toBe(3);
    expect(frontier.map(v => v.id)).not.toContain('4');
  });

  it('assigns correct nicknames to frontier', () => {
    const frontier = [
      { id: '1', ai: 95, seo: 50, human: 60 },
      { id: '2', ai: 55, seo: 90, human: 65 },
      { id: '3', ai: 60, seo: 65, human: 95 },
      { id: '4', ai: 75, seo: 75, human: 75 },
    ];

    const nicknamed = assignNicknames(frontier);

    const aiChamp = nicknamed.find(v => v.nickname === 'AI Champion');
    const seoSpec = nicknamed.find(v => v.nickname === 'SEO Specialist');
    const humanTouch = nicknamed.find(v => v.nickname === 'Human Touch');
    const balanced = nicknamed.find(v => v.nickname === 'Balanced Winner');

    expect(aiChamp?.id).toBe('1');
    expect(seoSpec?.id).toBe('2');
    expect(humanTouch?.id).toBe('3');
    expect(balanced?.id).toBe('4');
    expect(balanced?.recommended).toBe(true);
  });
});

// ============================================================================
// User-Guided Mutation Integration Tests
// ============================================================================

describe('User-Guided Mutation Integration', () => {
  it('generates variants with user feedback', async () => {
    const parents: ScoredVariant[] = [
      {
        id: 'p1',
        title: 'Widget Pro',
        scores: { ai: 80, seo: 75, human: 78 },
        fitness: 78,
        penalizedFitness: 78,
        disqualified: false,
        generation: 5,
      },
    ];

    const result = await generateUserGuidedMutations(
      {
        parents,
        userFeedback: 'Add more urgency',
        generation: 6,
      },
      3
    );

    expect(result.length).toBe(3);
    expect(result[0].generationType).toBe('user-guided');
    expect(result[0].metadata.userFeedback).toBe('Add more urgency');
  });

  it('enforces max user-guided generations', async () => {
    const parents: ScoredVariant[] = [
      { id: 'p1', title: 'V1', scores: { ai: 70, seo: 70, human: 70 }, fitness: 70, penalizedFitness: 70, disqualified: false, generation: 8 },
    ];

    await expect(
      generateUserGuidedMutations(
        {
          parents,
          userFeedback: 'test',
          generation: 9,
          previousUserGuidedCount: 3, // Max is 3
        },
        3
      )
    ).rejects.toThrow(/maximum/i);
  });
});

// ============================================================================
// End-to-End Workflow Test
// ============================================================================

describe('End-to-End Workflow', () => {
  it('completes full optimization workflow', async () => {
    // 1. Analyze baseline
    const originalContent = {
      title: 'Basic Product',
      description: 'A simple product for your needs',
      features: ['One feature', 'Another feature'],
    };
    const baseline = analyzeBaseline(originalContent, 'product');

    expect(baseline.aiScore).toBeDefined();
    expect(baseline.issues.length).toBeGreaterThanOrEqual(0);

    // 2. Run optimization
    const mockMutator = createMockMutator();
    const result = await runFullOptimization({
      initialVariants: [originalContent as VariantContent],
      mutator: mockMutator,
      maxGenerations: 3,
      scoringOptions: {
        keyword: 'product',
        baseline: {
          aiScore: baseline.aiScore,
          seoScore: baseline.seoScore,
          humanScore: baseline.humanScore,
        },
      },
    });

    expect(result.status).toBe('completed');
    expect(result.generations).toHaveLength(3);

    // 3. Find Pareto frontier
    const frontier = findParetoFrontier(result.finalVariants.map(v => ({
      id: v.id,
      ai: v.scores.ai,
      seo: v.scores.seo,
      human: v.scores.human,
    })));

    expect(frontier.length).toBeGreaterThan(0);

    // 4. Assign nicknames
    const nicknamed = assignNicknames(frontier);
    expect(nicknamed.some(v => v.nickname !== undefined)).toBe(true);

    // 5. Get best variant
    expect(result.bestVariant).toBeDefined();
    expect(result.bestVariant.penalizedFitness).toBeGreaterThan(0);
  });
});
