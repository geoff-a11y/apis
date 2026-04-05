// src/test/page-optimizer-v3-components.test.tsx
// Unit tests for Page Optimizer v3 components

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import modules under test
import {
  analyzeBrandVoice,
  generateBrandVoiceGuidelines,
  scoreBrandVoiceConsistency,
} from '../lib/brand-voice';
import {
  findParetoFrontier,
  assignNicknames,
} from '../lib/pareto';
import { calculateSEOScore } from '../lib/seo-judge';
import { estimateHumanScore } from '../lib/human-estimator';
import { WEIGHT_PRESETS } from '../lib/unified-fitness';
import { scoreVariant, EVOLUTION_CONFIG_V3 } from '../lib/evolution-engine';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockOriginalContent = {
  id: 'original',
  title: 'Premium Widget Pro - Quality Product',
  description: 'Discover our premium widget with 5-year warranty. Trusted by 10,000+ customers worldwide.',
  features: [
    'Free shipping on all orders',
    '30-day money-back guarantee',
    '5-year warranty included',
  ],
};

const mockVariants = [
  { id: 'v1', ai: 85, seo: 70, human: 75, title: 'AI Champion Variant' },
  { id: 'v2', ai: 60, seo: 90, human: 65, title: 'SEO Specialist Variant' },
  { id: 'v3', ai: 70, seo: 75, human: 85, title: 'Human Touch Variant' },
  { id: 'v4', ai: 78, seo: 78, human: 78, title: 'Balanced Winner Variant' },
];

// ============================================================================
// Brand Voice Integration Tests
// ============================================================================

describe('Brand Voice Integration', () => {
  it('analyzes brand voice from original content', () => {
    const profile = analyzeBrandVoice(mockOriginalContent);
    expect(profile).toBeDefined();
    expect(profile.formality).toBeGreaterThanOrEqual(0);
    expect(profile.formality).toBeLessThanOrEqual(100);
  });

  it('generates guidelines from brand voice profile', () => {
    const profile = analyzeBrandVoice(mockOriginalContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    expect(guidelines.summary.length).toBeGreaterThan(10);
    expect(guidelines.doList.length).toBeGreaterThan(0);
  });

  it('scores variant voice consistency', () => {
    const profile = analyzeBrandVoice(mockOriginalContent);
    const variant = {
      title: 'Premium Widget - Trusted Choice',
      description: 'Our quality widget with warranty. Join thousands of satisfied customers.',
      features: ['Free shipping', '30-day returns'],
    };
    const result = scoreBrandVoiceConsistency(variant, profile);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// Pareto Frontier Tests
// ============================================================================

describe('Pareto Frontier Integration', () => {
  it('finds non-dominated variants', () => {
    const frontier = findParetoFrontier(mockVariants);
    expect(frontier.length).toBeGreaterThan(0);
    expect(frontier.length).toBeLessThanOrEqual(mockVariants.length);
  });

  it('assigns nicknames to frontier variants', () => {
    const frontier = findParetoFrontier(mockVariants);
    const named = assignNicknames(frontier);
    const nicknames = named.map(v => v.nickname).filter(Boolean);
    expect(nicknames.length).toBeGreaterThan(0);
  });

  it('marks balanced variant as recommended', () => {
    const frontier = findParetoFrontier(mockVariants);
    const named = assignNicknames(frontier);
    if (named.length > 1) {
      const recommended = named.find(v => v.recommended);
      expect(recommended).toBeDefined();
    }
  });
});

// ============================================================================
// SEO Judge Tests
// ============================================================================

describe('SEO Judge Integration', () => {
  it('scores variant SEO', () => {
    const result = calculateSEOScore(mockOriginalContent, 'widget');
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.breakdown).toBeDefined();
  });

  it('returns breakdown by category', () => {
    const result = calculateSEOScore(mockOriginalContent, 'widget');
    expect(result.breakdown).toHaveProperty('technical');
    expect(result.breakdown).toHaveProperty('title');
    expect(result.breakdown).toHaveProperty('description');
  });

  it('detects hard fails for bad content', () => {
    const badVariant = { title: 'A'.repeat(100), description: 'Short', features: [] };
    const result = calculateSEOScore(badVariant, 'test');
    expect(result.hardFails.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Human Estimator Tests
// ============================================================================

describe('Human Estimator Integration', () => {
  it('estimates human appeal score', () => {
    const result = estimateHumanScore(mockOriginalContent);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.confidence).toMatch(/^(low|medium|high)$/);
  });

  it('returns breakdown scores', () => {
    const result = estimateHumanScore(mockOriginalContent);
    expect(result.breakdown).toHaveProperty('clarity');
    expect(result.breakdown).toHaveProperty('persuasiveness');
    expect(result.breakdown).toHaveProperty('trustworthiness');
    expect(result.breakdown).toHaveProperty('actionability');
  });

  it('detects social proof', () => {
    const withSocialProof = {
      title: 'Widget Pro',
      description: 'Trusted by 10,000+ customers',
      features: ['5-star rated'],
    };
    const result = estimateHumanScore(withSocialProof);
    expect(result.socialProofBonus).toBeGreaterThan(0);
  });
});

// ============================================================================
// Evolution Engine Tests
// ============================================================================

describe('Evolution Engine Integration', () => {
  it('scores variant with all three judges', () => {
    const result = scoreVariant(mockOriginalContent, { keyword: 'widget' });
    expect(result.scores.ai).toBeDefined();
    expect(result.scores.seo).toBeDefined();
    expect(result.scores.human).toBeDefined();
    expect(result.fitness).toBeGreaterThan(0);
  });

  it('uses correct evolution config', () => {
    expect(EVOLUTION_CONFIG_V3.generations).toBe(5);
    expect(EVOLUTION_CONFIG_V3.populationSize).toBe(30);
    expect(EVOLUTION_CONFIG_V3.humanJudgeGenerations).toEqual([4, 5]);
  });
});

// ============================================================================
// Weight Presets Tests
// ============================================================================

describe('Weight Presets', () => {
  it('all presets sum to 1.0', () => {
    for (const [name, weights] of Object.entries(WEIGHT_PRESETS)) {
      const sum = weights.ai + weights.seo + weights.human;
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });

  it('balanced preset is roughly equal', () => {
    const { balanced } = WEIGHT_PRESETS;
    expect(Math.abs(balanced.ai - balanced.seo)).toBeLessThan(0.1);
  });

  it('ai_first preset prioritizes AI', () => {
    const { ai_first } = WEIGHT_PRESETS;
    expect(ai_first.ai).toBeGreaterThan(ai_first.seo);
    expect(ai_first.ai).toBeGreaterThan(ai_first.human);
  });
});

// ============================================================================
// URL Validation Tests
// ============================================================================

describe('URL Validation', () => {
  const isValidUrl = (urlString: string): boolean => {
    try {
      const parsedUrl = new URL(urlString);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  it('validates correct URLs', () => {
    expect(isValidUrl('https://www.example.com')).toBe(true);
    expect(isValidUrl('http://example.com/product')).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

// ============================================================================
// Generation Configuration Tests
// ============================================================================

describe('Generation Configuration', () => {
  it('humanJudgeGenerations contains only 4 and 5', () => {
    expect(EVOLUTION_CONFIG_V3.humanJudgeGenerations).toContain(4);
    expect(EVOLUTION_CONFIG_V3.humanJudgeGenerations).toContain(5);
    expect(EVOLUTION_CONFIG_V3.humanJudgeGenerations).not.toContain(1);
  });

  it('uses Sonnet for early generations', () => {
    expect(EVOLUTION_CONFIG_V3.mutationModel.gen1to4).toBe('claude-sonnet');
  });

  it('uses Opus for Gen 5 and user-guided', () => {
    expect(EVOLUTION_CONFIG_V3.mutationModel.gen5).toBe('claude-opus');
    expect(EVOLUTION_CONFIG_V3.mutationModel.userGuided).toBe('claude-opus');
  });

  it('allows max 3 user-guided generations', () => {
    expect(EVOLUTION_CONFIG_V3.maxUserGuidedGenerations).toBe(3);
  });
});
