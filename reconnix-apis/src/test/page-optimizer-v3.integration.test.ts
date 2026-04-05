// src/test/page-optimizer-v3.integration.test.ts
// Integration tests for Page Optimizer v3 full flow

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeBrandVoice,
  generateBrandVoiceGuidelines,
  formatBrandVoiceForPrompt,
  scoreBrandVoiceConsistency,
  BrandVoiceProfile,
} from '../lib/brand-voice';
import {
  findParetoFrontier,
  assignNicknames,
  isDominated,
  ParetoScores,
} from '../lib/pareto';
import { calculateSEOScore } from '../lib/seo-judge';
import { estimateHumanScore } from '../lib/human-estimator';
import { calculateUnifiedFitness, applyConstraintPenalties, WEIGHT_PRESETS } from '../lib/unified-fitness';
import {
  scoreVariant,
  scoreGeneration,
  EVOLUTION_CONFIG_V3,
  getModelForGeneration,
  shouldUseHumanJudge,
  VariantContent,
  ScoredVariant,
} from '../lib/evolution-engine';

// ============================================================================
// Test Fixtures
// ============================================================================

const originalContent: VariantContent = {
  id: 'original',
  title: 'Premium Widget Pro - Quality Guaranteed',
  description: 'Discover our premium widget with 5-year warranty. Trusted by 10,000+ customers worldwide. Free shipping on all orders.',
  features: [
    'Free shipping on all orders',
    '30-day money-back guarantee',
    '5-year warranty included',
    '24/7 customer support',
  ],
};

const optimizedVariant: VariantContent = {
  id: 'optimized_1',
  title: 'Premium Widget Pro - Save 20% Today',
  description: 'Join 10,000+ happy customers. Premium quality with 5-year warranty. Order now for free shipping.',
  features: [
    'Free shipping - order today',
    '30-day money-back guarantee',
    '5-year warranty included',
    'Trusted by 10,000+ customers',
  ],
};

const poorVariant: VariantContent = {
  id: 'poor_1',
  title: 'A'.repeat(100), // Way too long
  description: 'Bad', // Too short
  features: [], // Missing features
};

// ============================================================================
// Full Pipeline Integration Tests
// ============================================================================

describe('Page Optimizer v3 - Full Pipeline', () => {
  describe('Content Analysis Pipeline', () => {
    it('analyzes original content and produces baseline scores', () => {
      // Step 1: Analyze SEO
      const seoResult = calculateSEOScore(originalContent, 'widget');
      expect(seoResult.total).toBeGreaterThan(0);
      expect(seoResult.total).toBeLessThanOrEqual(100);

      // Step 2: Estimate human appeal
      const humanResult = estimateHumanScore(originalContent);
      expect(humanResult.score).toBeGreaterThan(0);
      expect(humanResult.confidence).toBeDefined();

      // Step 3: Analyze brand voice
      const brandVoice = analyzeBrandVoice(originalContent);
      expect(brandVoice.formality).toBeDefined();
      expect(brandVoice.enthusiasm).toBeDefined();
    });

    it('generates actionable brand voice guidelines', () => {
      const profile = analyzeBrandVoice(originalContent);
      const guidelines = generateBrandVoiceGuidelines(profile);

      expect(guidelines.summary.length).toBeGreaterThan(20);
      expect(guidelines.doList.length).toBeGreaterThan(0);

      // Format for prompt
      const promptSection = formatBrandVoiceForPrompt(guidelines);
      expect(promptSection).toContain('BRAND VOICE GUIDELINES');
      expect(promptSection).toContain('DO:');
    });
  });

  describe('Variant Scoring Pipeline', () => {
    it('scores variants with triple-judge system', () => {
      const result = scoreVariant(optimizedVariant, {
        keyword: 'widget',
        estimator: estimateHumanScore,
      });

      expect(result.scores.ai).toBeDefined();
      expect(result.scores.seo).toBeDefined();
      expect(result.scores.human).toBeDefined();
      expect(result.fitness).toBeGreaterThan(0);
      expect(result.penalizedFitness).toBeDefined();
      expect(result.disqualified).toBe(false);
    });

    it('penalizes variants with hard SEO failures', () => {
      const result = scoreVariant(poorVariant, {
        keyword: 'test',
        estimator: estimateHumanScore,
      });

      expect(result.seoBreakdown?.hardFails?.length).toBeGreaterThan(0);
      expect(result.penalizedFitness).toBeLessThan(result.fitness);
    });

    it('applies weight presets correctly', () => {
      const scores = { ai: 80, seo: 60, human: 70 };

      const balanced = calculateUnifiedFitness(scores, WEIGHT_PRESETS.balanced);
      const aiFirst = calculateUnifiedFitness(scores, WEIGHT_PRESETS.ai_first);

      // AI-first should weight AI score higher
      expect(aiFirst.contributions.ai).toBeGreaterThan(balanced.contributions.ai);
    });
  });

  describe('Generation Scoring Pipeline', () => {
    it('scores a full generation of variants', async () => {
      const variants: VariantContent[] = [
        originalContent,
        optimizedVariant,
        {
          id: 'variant_2',
          title: 'Widget Pro - Best Choice',
          description: 'Quality widget with warranty. Join thousands of happy customers.',
          features: ['Free shipping', 'Money-back guarantee'],
        },
      ];

      const scored = await scoreGeneration(1, variants, {
        keyword: 'widget',
        estimator: estimateHumanScore,
      });

      expect(scored.length).toBe(variants.length);
      expect(scored[0].penalizedFitness).toBeDefined();
      // Should be sorted by fitness
      expect(scored[0].penalizedFitness).toBeGreaterThanOrEqual(scored[1].penalizedFitness);
    });
  });

  describe('Pareto Frontier Pipeline', () => {
    it('finds optimal trade-off variants', () => {
      const variants: (ParetoScores & { id: string })[] = [
        { id: 'v1', ai: 90, seo: 50, human: 60 }, // Best AI
        { id: 'v2', ai: 60, seo: 85, human: 65 }, // Best SEO
        { id: 'v3', ai: 65, seo: 65, human: 90 }, // Best Human
        { id: 'v4', ai: 75, seo: 75, human: 75 }, // Balanced
        { id: 'v5', ai: 50, seo: 50, human: 50 }, // Dominated
      ];

      const frontier = findParetoFrontier(variants);

      // Should include optimal variants, exclude dominated
      expect(frontier.length).toBeLessThan(variants.length);
      expect(frontier.find(v => v.id === 'v5')).toBeUndefined();
    });

    it('assigns meaningful nicknames', () => {
      const variants: (ParetoScores & { id: string })[] = [
        { id: 'v1', ai: 95, seo: 50, human: 60 },
        { id: 'v2', ai: 55, seo: 90, human: 65 },
        { id: 'v3', ai: 60, seo: 60, human: 95 },
        { id: 'v4', ai: 75, seo: 76, human: 74 },
      ];

      const frontier = findParetoFrontier(variants);
      const named = assignNicknames(frontier);

      const aiChampion = named.find(v => v.nickname === 'AI Champion');
      const seoSpec = named.find(v => v.nickname === 'SEO Specialist');
      const humanTouch = named.find(v => v.nickname === 'Human Touch');

      if (frontier.length >= 3) {
        expect(aiChampion).toBeDefined();
        expect(seoSpec).toBeDefined();
        expect(humanTouch).toBeDefined();
      }
    });

    it('marks balanced variant as recommended', () => {
      const variants: (ParetoScores & { id: string })[] = [
        { id: 'v1', ai: 90, seo: 40, human: 50 }, // Best AI
        { id: 'v2', ai: 75, seo: 75, human: 74 }, // Most balanced - should get Balanced Winner
        { id: 'v3', ai: 50, seo: 85, human: 45 }, // Best SEO
        { id: 'v4', ai: 55, seo: 55, human: 80 }, // Best Human
      ];

      const frontier = findParetoFrontier(variants);
      const named = assignNicknames(frontier);

      const recommended = named.find(v => v.recommended);
      if (named.length > 1) {
        expect(recommended).toBeDefined();
        expect(recommended?.nickname).toBe('Balanced Winner');
      }
    });
  });

  describe('Brand Voice Consistency Pipeline', () => {
    it('scores voice consistency throughout generations', () => {
      const baselineProfile = analyzeBrandVoice(originalContent);

      // Simulate Gen 1 variant
      const gen1Variant = {
        title: 'Premium Widget Pro - Quality Choice',
        description: 'Trusted by thousands of customers. Quality guaranteed with warranty.',
        features: ['Free shipping', '30-day returns'],
      };

      const gen1Score = scoreBrandVoiceConsistency(gen1Variant, baselineProfile);
      expect(gen1Score.score).toBeGreaterThan(50);

      // Simulate drifted variant
      const driftedVariant = {
        title: 'ENTERPRISE SOLUTION - LEVERAGE NOW!!!',
        description: 'Optimize organizational efficiency!!! Synergy guaranteed!!!',
        features: ['Scalable', 'Enterprise-grade'],
      };

      const driftedScore = scoreBrandVoiceConsistency(driftedVariant, baselineProfile);
      expect(driftedScore.score).toBeLessThan(gen1Score.score);
      expect(driftedScore.issues.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Model Selection Tests
// ============================================================================

describe('Model Selection', () => {
  it('selects Sonnet for generations 1-4', () => {
    expect(getModelForGeneration(1)).toBe('claude-sonnet');
    expect(getModelForGeneration(2)).toBe('claude-sonnet');
    expect(getModelForGeneration(3)).toBe('claude-sonnet');
    expect(getModelForGeneration(4)).toBe('claude-sonnet');
  });

  it('selects Opus for generation 5', () => {
    expect(getModelForGeneration(5)).toBe('claude-opus');
  });

  it('selects Opus for user-guided generations', () => {
    expect(getModelForGeneration(6, { userGuided: true })).toBe('claude-opus');
    expect(getModelForGeneration(7, { userGuided: true })).toBe('claude-opus');
  });
});

// ============================================================================
// Human Judge Selection Tests
// ============================================================================

describe('Human Judge Selection', () => {
  it('skips Human Judge for generations 1-3', () => {
    expect(shouldUseHumanJudge(1)).toBe(false);
    expect(shouldUseHumanJudge(2)).toBe(false);
    expect(shouldUseHumanJudge(3)).toBe(false);
  });

  it('uses Human Judge for generations 4-5', () => {
    expect(shouldUseHumanJudge(4)).toBe(true);
    expect(shouldUseHumanJudge(5)).toBe(true);
  });
});

// ============================================================================
// Constraint Penalty Tests
// ============================================================================

describe('Constraint Penalties', () => {
  it('applies hard constraint penalty', () => {
    const fitness = { weighted: 80 };
    const seoScore = { hardFails: ['title_too_long'], softFails: [] };

    const result = applyConstraintPenalties(fitness, seoScore, {});

    expect(result.penalized).toBeLessThan(fitness.weighted);
    expect(result.penalties.length).toBeGreaterThan(0);
  });

  it('applies soft constraint penalty', () => {
    const fitness = { weighted: 80 };
    const seoScore = { hardFails: [], softFails: ['description_short'] };

    const result = applyConstraintPenalties(fitness, seoScore, {});

    expect(result.penalized).toBeLessThan(fitness.weighted);
  });

  it('disqualifies for fidelity violations', () => {
    const fitness = { weighted: 90 };
    const humanScore = { fidelityViolations: ['fabricated_claim'] };

    const result = applyConstraintPenalties(fitness, { hardFails: [], softFails: [] }, humanScore);

    expect(result.disqualified).toBe(true);
    expect(result.penalized).toBeLessThan(fitness.weighted * 0.2);
  });

  it('never goes below zero', () => {
    const fitness = { weighted: 5 };
    const seoScore = { hardFails: ['a', 'b', 'c'], softFails: ['d', 'e', 'f', 'g', 'h'] };

    const result = applyConstraintPenalties(fitness, seoScore, {});

    expect(result.penalized).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Pareto Domination Tests
// ============================================================================

describe('Pareto Domination', () => {
  it('correctly identifies domination', () => {
    const a = { ai: 80, seo: 70, human: 60 };
    const b = { ai: 70, seo: 60, human: 50 };

    expect(isDominated(b, a)).toBe(true);
    expect(isDominated(a, b)).toBe(false);
  });

  it('returns false for trade-offs', () => {
    const a = { ai: 90, seo: 50, human: 60 };
    const b = { ai: 60, seo: 80, human: 70 };

    expect(isDominated(a, b)).toBe(false);
    expect(isDominated(b, a)).toBe(false);
  });

  it('handles equal scores correctly', () => {
    const a = { ai: 70, seo: 70, human: 70 };
    const b = { ai: 70, seo: 70, human: 70 };

    expect(isDominated(a, b)).toBe(false);
    expect(isDominated(b, a)).toBe(false);
  });
});

// ============================================================================
// End-to-End Simulation Tests
// ============================================================================

describe('End-to-End Simulation', () => {
  it('simulates full 5-generation optimization', async () => {
    const keyword = 'widget';
    let currentVariants: ScoredVariant[] = [];

    // Initial population
    const initialVariants: VariantContent[] = Array.from({ length: 5 }, (_, i) => ({
      id: `init_${i}`,
      title: `Widget Variant ${i}`,
      description: `Quality widget description ${i}`,
      features: ['Feature 1', 'Feature 2'],
    }));

    // Score initial
    currentVariants = await scoreGeneration(0, initialVariants, {
      keyword,
      estimator: estimateHumanScore,
    });

    expect(currentVariants.length).toBe(5);

    // Run 5 generations
    for (let gen = 1; gen <= 5; gen++) {
      const model = getModelForGeneration(gen);
      const useHumanJudge = shouldUseHumanJudge(gen);

      // Verify model selection
      if (gen < 5) {
        expect(model).toBe('claude-sonnet');
      } else {
        expect(model).toBe('claude-opus');
      }

      // Verify Human Judge selection
      if (gen >= 4) {
        expect(useHumanJudge).toBe(true);
      } else {
        expect(useHumanJudge).toBe(false);
      }

      // Generate new variants (mock)
      const newVariants: VariantContent[] = Array.from({ length: 3 }, (_, i) => ({
        id: `gen${gen}_${i}`,
        title: `Widget Gen ${gen} Variant ${i}`,
        description: `Optimized for gen ${gen}`,
        features: ['Improved feature'],
      }));

      // Keep elites
      const elites = currentVariants.slice(0, 2);

      // Score new generation
      const allVariants = [...elites, ...newVariants];
      currentVariants = await scoreGeneration(gen, allVariants, {
        keyword,
        estimator: estimateHumanScore,
      });
    }

    // Final checks
    expect(currentVariants.length).toBeGreaterThan(0);

    // Find Pareto frontier
    const paretoInput = currentVariants.map(v => ({
      id: v.id,
      ai: v.scores.ai,
      seo: v.scores.seo,
      human: v.scores.human,
    }));
    const frontier = findParetoFrontier(paretoInput);
    const named = assignNicknames(frontier);

    expect(frontier.length).toBeGreaterThan(0);
    expect(named.some(v => v.nickname)).toBe(true);
  });
});
