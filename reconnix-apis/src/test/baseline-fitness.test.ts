// src/test/baseline-fitness.test.ts — Unit tests for Baseline Scorer and Unified Fitness
import { describe, it, expect } from 'vitest';
import {
  analyzeBaseline,
  calculateDelta,
  getBaselineSummary,
  type BaselineScore,
} from '../lib/baseline-scorer';
import {
  WEIGHT_PRESETS,
  validateWeights,
  normalizeWeights,
  calculateUnifiedFitness,
  applyConstraintPenalties,
  calculateFullFitness,
  sortByFitness,
  getTopVariants,
  calculateFitnessStats,
} from '../lib/unified-fitness';

// ============================================================================
// Baseline Scorer Tests
// ============================================================================

describe('Baseline Scorer', () => {
  it('extracts scores from original page content', () => {
    const mockContent = {
      title: 'Widget Pro - Best Widget for Your Home',
      description: 'Buy the best widget today. Fast shipping and easy returns.',
      features: ['Fast', 'Reliable', 'Trusted by thousands'],
    };
    const result = analyzeBaseline(mockContent, 'widget');

    expect(result.aiScore).toBeGreaterThanOrEqual(0);
    expect(result.aiScore).toBeLessThanOrEqual(100);
    expect(result.seoScore).toBeGreaterThanOrEqual(0);
    expect(result.seoScore).toBeLessThanOrEqual(100);
    expect(result.humanScore).toBeGreaterThanOrEqual(0);
    expect(result.humanScore).toBeLessThanOrEqual(100);
  });

  it('identifies baseline issues', () => {
    const poorContent = { title: 'A', description: 'B', features: [] };
    const result = analyzeBaseline(poorContent, 'widget');

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ category: expect.stringMatching(/seo|ai|human/) })
    );
  });

  it('calculates improvement potential', () => {
    const result = analyzeBaseline(
      { title: 'Test Product', description: 'Test description here' },
      'test'
    );

    expect(result.improvementPotential).toBeDefined();
    expect(result.improvementPotential.ai).toBeGreaterThanOrEqual(0);
    expect(result.improvementPotential.seo).toBeGreaterThanOrEqual(0);
    expect(result.improvementPotential.human).toBeGreaterThanOrEqual(0);
  });

  it('includes SEO breakdown', () => {
    const result = analyzeBaseline(
      { title: 'Test', description: 'Test' },
      'test'
    );

    expect(result.seoBreakdown).toBeDefined();
    expect(result.seoBreakdown).toHaveProperty('total');
    expect(result.seoBreakdown).toHaveProperty('breakdown');
  });

  it('includes Human breakdown', () => {
    const result = analyzeBaseline(
      { title: 'Test', description: 'Test' },
      'test'
    );

    expect(result.humanBreakdown).toBeDefined();
    expect(result.humanBreakdown).toHaveProperty('score');
    expect(result.humanBreakdown).toHaveProperty('breakdown');
  });

  it('stores keyword and timestamp', () => {
    const result = analyzeBaseline({ title: 'Test' }, 'widget');

    expect(result.keyword).toBe('widget');
    expect(result.analyzedAt).toBeDefined();
    expect(new Date(result.analyzedAt).getTime()).toBeGreaterThan(0);
  });

  it('detects schema presence as positive for AI', () => {
    const withSchema = analyzeBaseline({
      title: 'Product',
      schema: { '@type': 'Product', name: 'Widget' },
    }, 'widget');
    const withoutSchema = analyzeBaseline({
      title: 'Product',
    }, 'widget');

    expect(withSchema.aiScore).toBeGreaterThan(withoutSchema.aiScore);
  });
});

describe('Delta Calculator', () => {
  it('calculates positive deltas correctly', () => {
    const baseline = { aiScore: 50, seoScore: 40, humanScore: 60 };
    const variant = { aiScore: 70, seoScore: 55, humanScore: 75 };
    const delta = calculateDelta(variant, baseline);

    expect(delta.ai).toBe(20);
    expect(delta.seo).toBe(15);
    expect(delta.human).toBe(15);
    expect(delta.total).toBe(50); // sum of deltas
  });

  it('handles negative deltas (regression)', () => {
    const baseline = { aiScore: 80, seoScore: 70, humanScore: 75 };
    const variant = { aiScore: 60, seoScore: 65, humanScore: 70 };
    const delta = calculateDelta(variant, baseline);

    expect(delta.ai).toBe(-20);
    expect(delta.seo).toBe(-5);
    expect(delta.isRegression).toBe(true);
  });

  it('formats delta for display', () => {
    const delta = calculateDelta(
      { aiScore: 80, seoScore: 60, humanScore: 70 },
      { aiScore: 60, seoScore: 60, humanScore: 60 }
    );
    expect(delta.formatted.ai).toBe('+20');
    expect(delta.formatted.seo).toBe('0');
    expect(delta.formatted.human).toBe('+10');
  });

  it('uses green/red colors for positive/negative', () => {
    const positive = calculateDelta(
      { aiScore: 80, seoScore: 60, humanScore: 70 },
      { aiScore: 60, seoScore: 60, humanScore: 60 }
    );
    const negative = calculateDelta(
      { aiScore: 60, seoScore: 60, humanScore: 60 },
      { aiScore: 80, seoScore: 60, humanScore: 70 }
    );

    expect(positive.colors.ai).toBe('green');
    expect(positive.colors.seo).toBe('neutral');
    expect(negative.colors.ai).toBe('red');
  });
});

describe('Baseline Summary', () => {
  it('generates human-readable summary', () => {
    const baseline: BaselineScore = {
      aiScore: 50,
      seoScore: 40,
      humanScore: 60,
      totalScore: 50,
      issues: [
        { category: 'seo', severity: 'critical', message: 'Critical issue' },
        { category: 'human', severity: 'major', message: 'Major issue' },
      ],
      improvementPotential: { ai: 50, seo: 60, human: 40, total: 50 },
      seoBreakdown: {} as any,
      humanBreakdown: {} as any,
      keyword: 'test',
      analyzedAt: new Date().toISOString(),
    };

    const summary = getBaselineSummary(baseline);

    expect(summary).toContain('AI 50');
    expect(summary).toContain('SEO 40');
    expect(summary).toContain('Human 60');
    expect(summary).toContain('critical');
    expect(summary).toContain('major');
    expect(summary).toContain('improvement');
  });
});

// ============================================================================
// Weight Presets Tests
// ============================================================================

describe('Weight Presets', () => {
  it('all presets sum to 1.0', () => {
    for (const [name, weights] of Object.entries(WEIGHT_PRESETS)) {
      const sum = weights.ai + weights.seo + weights.human;
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it('balanced preset has roughly equal weights', () => {
    const { balanced } = WEIGHT_PRESETS;
    expect(Math.abs(balanced.ai - balanced.seo)).toBeLessThan(0.05);
    expect(Math.abs(balanced.seo - balanced.human)).toBeLessThan(0.05);
  });

  it('ai_first preset prioritizes AI score', () => {
    const { ai_first } = WEIGHT_PRESETS;
    expect(ai_first.ai).toBeGreaterThan(ai_first.seo);
    expect(ai_first.ai).toBeGreaterThan(ai_first.human);
  });

  it('seo_first preset prioritizes SEO score', () => {
    const { seo_first } = WEIGHT_PRESETS;
    expect(seo_first.seo).toBeGreaterThan(seo_first.ai);
    expect(seo_first.seo).toBeGreaterThan(seo_first.human);
  });

  it('conversion preset prioritizes Human score', () => {
    const { conversion } = WEIGHT_PRESETS;
    expect(conversion.human).toBeGreaterThan(conversion.ai);
    expect(conversion.human).toBeGreaterThan(conversion.seo);
  });
});

describe('Weight Validation and Normalization', () => {
  it('validateWeights returns true for valid weights', () => {
    expect(validateWeights({ ai: 0.33, seo: 0.34, human: 0.33 })).toBe(true);
    expect(validateWeights({ ai: 0.5, seo: 0.25, human: 0.25 })).toBe(true);
  });

  it('validateWeights returns false for invalid weights', () => {
    expect(validateWeights({ ai: 0.5, seo: 0.5, human: 0.5 })).toBe(false);
    expect(validateWeights({ ai: 0.1, seo: 0.1, human: 0.1 })).toBe(false);
  });

  it('normalizeWeights fixes weights that do not sum to 1.0', () => {
    const normalized = normalizeWeights({ ai: 1, seo: 1, human: 1 });
    const sum = normalized.ai + normalized.seo + normalized.human;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('normalizeWeights handles zero weights', () => {
    const normalized = normalizeWeights({ ai: 0, seo: 0, human: 0 });
    expect(validateWeights(normalized)).toBe(true);
  });
});

// ============================================================================
// Unified Fitness Calculation Tests
// ============================================================================

describe('Unified Fitness Calculation', () => {
  it('calculates weighted average correctly', () => {
    const scores = { ai: 80, seo: 60, human: 70 };
    const weights = { ai: 0.5, seo: 0.25, human: 0.25 };
    const result = calculateUnifiedFitness(scores, weights);

    // 80*0.5 + 60*0.25 + 70*0.25 = 40 + 15 + 17.5 = 72.5
    expect(result.weighted).toBeCloseTo(72.5, 1);
  });

  it('returns individual contributions', () => {
    const scores = { ai: 100, seo: 50, human: 50 };
    const weights = { ai: 0.5, seo: 0.25, human: 0.25 };
    const result = calculateUnifiedFitness(scores, weights);

    expect(result.contributions.ai).toBe(50);      // 100 * 0.5
    expect(result.contributions.seo).toBe(12.5);   // 50 * 0.25
    expect(result.contributions.human).toBe(12.5); // 50 * 0.25
  });

  it('includes delta from baseline when provided', () => {
    const scores = { ai: 80, seo: 60, human: 70 };
    const baseline = { aiScore: 50, seoScore: 50, humanScore: 50 };
    const result = calculateUnifiedFitness(scores, WEIGHT_PRESETS.balanced, baseline);

    expect(result.delta).toBeDefined();
    expect(result.delta!.ai).toBe(30);
    expect(result.delta!.seo).toBe(10);
    expect(result.delta!.human).toBe(20);
  });

  it('returns normalized weights', () => {
    const scores = { ai: 70, seo: 70, human: 70 };
    const weights = { ai: 1, seo: 1, human: 1 }; // Not normalized
    const result = calculateUnifiedFitness(scores, weights);

    const sum = result.weights.ai + result.weights.seo + result.weights.human;
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

// ============================================================================
// Constraint Penalties Tests
// ============================================================================

describe('Constraint Penalties', () => {
  it('applies 0.1 multiplier for hard SEO failures', () => {
    const fitness = { weighted: 80 };
    const seoScore = { hardFails: ['title_too_long'] };
    const result = applyConstraintPenalties(fitness, seoScore, {});

    expect(result.penalized).toBe(8); // 80 * 0.1
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ type: 'hard_constraint', multiplier: 0.1 })
    );
    expect(result.disqualified).toBe(true);
  });

  it('subtracts points for soft constraint violations', () => {
    const fitness = { weighted: 80 };
    const seoScore = { softFails: ['description_short'] }; // -5 points
    const result = applyConstraintPenalties(fitness, seoScore, {});

    expect(result.penalized).toBe(75); // 80 - 5
    expect(result.disqualified).toBe(false);
  });

  it('applies fidelity failure as hard constraint', () => {
    const fitness = { weighted: 90 };
    const humanScore = { fidelityViolations: ['fabricated_claim'] };
    const result = applyConstraintPenalties(fitness, {}, humanScore);

    expect(result.penalized).toBe(9); // 90 * 0.1
    expect(result.disqualified).toBe(true);
  });

  it('stacks multiple soft penalties', () => {
    const fitness = { weighted: 80 };
    const seoScore = { softFails: ['description_short', 'no_h1', 'missing_schema'] }; // -15 total
    const result = applyConstraintPenalties(fitness, seoScore, {});

    expect(result.penalized).toBe(65); // 80 - 15
  });

  it('never goes below zero', () => {
    const fitness = { weighted: 10 };
    const seoScore = { softFails: Array(10).fill('minor_issue') }; // -50 points
    const result = applyConstraintPenalties(fitness, seoScore, {});

    expect(result.penalized).toBeGreaterThanOrEqual(0);
  });

  it('returns original score when no penalties', () => {
    const fitness = { weighted: 75 };
    const result = applyConstraintPenalties(fitness, {}, {});

    expect(result.penalized).toBe(75);
    expect(result.penalties).toHaveLength(0);
    expect(result.disqualified).toBe(false);
  });
});

// ============================================================================
// Full Fitness Calculation Tests
// ============================================================================

describe('Full Fitness Calculation', () => {
  it('calculates fitness with penalties', () => {
    const scores = { ai: 80, seo: 70, human: 75 };
    const weights = WEIGHT_PRESETS.balanced;
    const seoScore = { softFails: ['description_short'] };
    const humanScore = {};

    const result = calculateFullFitness(scores, weights, seoScore, humanScore);

    expect(result.fitness).toBeDefined();
    expect(result.penalized).toBeDefined();
    expect(result.final).toBeDefined();
    expect(result.final).toBeLessThan(result.fitness.weighted);
  });

  it('returns same score when no penalties', () => {
    const scores = { ai: 80, seo: 70, human: 75 };
    const weights = WEIGHT_PRESETS.balanced;

    const result = calculateFullFitness(scores, weights, {}, {});

    expect(result.final).toBe(result.fitness.weighted);
  });
});

// ============================================================================
// Fitness Sorting and Selection Tests
// ============================================================================

describe('Fitness Sorting and Selection', () => {
  it('sorts variants by fitness (highest first)', () => {
    const variants = [
      { final: 50, disqualified: false },
      { final: 80, disqualified: false },
      { final: 65, disqualified: false },
    ];
    const sorted = sortByFitness(variants);

    expect(sorted[0].final).toBe(80);
    expect(sorted[1].final).toBe(65);
    expect(sorted[2].final).toBe(50);
  });

  it('puts disqualified variants last', () => {
    const variants = [
      { final: 90, disqualified: true },
      { final: 50, disqualified: false },
      { final: 60, disqualified: false },
    ];
    const sorted = sortByFitness(variants);

    expect(sorted[0].final).toBe(60);
    expect(sorted[1].final).toBe(50);
    expect(sorted[2].final).toBe(90);
    expect(sorted[2].disqualified).toBe(true);
  });

  it('gets top N variants', () => {
    const variants = [
      { final: 50, disqualified: false },
      { final: 80, disqualified: false },
      { final: 65, disqualified: false },
      { final: 70, disqualified: false },
    ];
    const top2 = getTopVariants(variants, 2);

    expect(top2).toHaveLength(2);
    expect(top2[0].final).toBe(80);
    expect(top2[1].final).toBe(70);
  });
});

describe('Fitness Statistics', () => {
  it('calculates min, max, mean, median', () => {
    const variants = [
      { final: 50, disqualified: false },
      { final: 60, disqualified: false },
      { final: 70, disqualified: false },
      { final: 80, disqualified: false },
    ];
    const stats = calculateFitnessStats(variants);

    expect(stats.min).toBe(50);
    expect(stats.max).toBe(80);
    expect(stats.mean).toBe(65);
    expect(stats.median).toBe(65); // (60+70)/2
    expect(stats.disqualifiedCount).toBe(0);
  });

  it('counts disqualified variants', () => {
    const variants = [
      { final: 50, disqualified: false },
      { final: 90, disqualified: true },
      { final: 60, disqualified: false },
    ];
    const stats = calculateFitnessStats(variants);

    expect(stats.disqualifiedCount).toBe(1);
    expect(stats.mean).toBe(55); // Only qualified variants
  });

  it('handles empty array', () => {
    const stats = calculateFitnessStats([]);
    expect(stats.mean).toBe(0);
    expect(stats.disqualifiedCount).toBe(0);
  });

  it('handles all disqualified', () => {
    const variants = [
      { final: 90, disqualified: true },
      { final: 80, disqualified: true },
    ];
    const stats = calculateFitnessStats(variants);

    expect(stats.mean).toBe(0);
    expect(stats.disqualifiedCount).toBe(2);
  });
});
