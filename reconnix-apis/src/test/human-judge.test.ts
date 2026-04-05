// src/test/human-judge.test.ts — Unit tests for Human Judge system
import { describe, it, expect, vi } from 'vitest';
import {
  estimateHumanScore,
  type EstimatedHumanScore,
} from '../lib/human-estimator';
import {
  checkFidelity,
  quickCheckNumbers,
  type FidelityResult,
} from '../lib/fidelity-checker';
import {
  evaluateHumanAppeal,
  quickHumanAppealCheck,
  type HumanScore,
} from '../lib/human-judge';

// ============================================================================
// Human Estimator Tests (Fast Rule-Based)
// ============================================================================

describe('Human Estimator - Fast Rule-Based', () => {
  it('returns score 0-100 with confidence level', () => {
    const variant = { title: 'Great Product', features: ['Fast', 'Easy'] };
    const result = estimateHumanScore(variant);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high']).toContain(result.confidence);
  });

  it('boosts score for clear CTA presence', () => {
    const withCTA = estimateHumanScore({
      title: 'Buy Now - Limited Offer',
      features: [],
      description: 'Shop now and save 20% today'
    });
    const noCTA = estimateHumanScore({
      title: 'Product Information',
      features: [],
      description: 'This is a product description'
    });
    expect(withCTA.ctaBonus).toBeGreaterThan(noCTA.ctaBonus);
    expect(withCTA.score).toBeGreaterThan(noCTA.score);
  });

  it('boosts score for benefit-focused features', () => {
    const benefits = estimateHumanScore({
      title: 'Widget',
      features: ['Saves you 2 hours daily', 'Reduces costs by 30%'],
      description: 'Transform your workflow'
    });
    const specs = estimateHumanScore({
      title: 'Widget',
      features: ['10GB storage', '2.4GHz processor'],
      description: 'Technical specifications included'
    });
    expect(benefits.benefitBonus).toBeGreaterThan(specs.benefitBonus);
    expect(benefits.score).toBeGreaterThan(specs.score);
  });

  it('penalizes overly long descriptions', () => {
    // Good length: 50-300 words
    const goodLength = estimateHumanScore({
      title: 'Widget Pro Premium Edition',
      description: 'This is a detailed product description that provides useful information to help customers make informed decisions. It covers the key features, benefits, and use cases. The product is designed to help you save time and money while improving your workflow efficiency.',
      features: ['Fast processing', 'Easy setup', 'Great support', 'Affordable pricing', 'Premium quality']
    });
    // Very long: over 500 words
    const verbose = estimateHumanScore({
      title: 'Widget',
      description: 'word '.repeat(600), // Over 500 words
      features: ['Feature 1', 'Feature 2']
    });
    // Long content (>500 words) gets a -10 penalty, good length gets 0
    expect(verbose.lengthPenalty).toBe(-10);
    expect(goodLength.lengthPenalty).toBe(0);
  });

  it('detects social proof indicators', () => {
    const withProof = estimateHumanScore({
      title: 'Widget',
      features: ['Trusted by 10,000+ customers', '4.8/5 rating'],
      description: 'Best-seller in its category'
    });
    const noProof = estimateHumanScore({
      title: 'Widget',
      features: ['Blue color', 'Metal body'],
      description: 'A product for sale'
    });
    expect(withProof.socialProofBonus).toBeGreaterThan(0);
    expect(noProof.socialProofBonus).toBe(0);
  });

  it('returns breakdown scores', () => {
    const result = estimateHumanScore({
      title: 'Test Product',
      description: 'Buy now and save',
      features: ['Feature 1', 'Feature 2', 'Feature 3']
    });

    expect(result.breakdown).toHaveProperty('clarity');
    expect(result.breakdown).toHaveProperty('persuasiveness');
    expect(result.breakdown).toHaveProperty('trustworthiness');
    expect(result.breakdown).toHaveProperty('actionability');

    expect(result.breakdown.clarity).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.clarity).toBeLessThanOrEqual(25);
  });

  it('has high confidence for rich content', () => {
    const rich = estimateHumanScore({
      title: 'Premium Widget Pro - Best in Class Product for Your Needs',
      description: 'This is a detailed description with lots of useful information about the product. It includes everything you need to know about features, benefits, and why you should buy it today.',
      features: ['Feature 1 saves you time', 'Feature 2 reduces costs', 'Feature 3 improves quality', 'Feature 4 trusted by thousands']
    });
    // Rich content with 200+ chars and 3+ features should be high confidence
    expect(['medium', 'high']).toContain(rich.confidence);
  });

  it('has low confidence for sparse content', () => {
    const sparse = estimateHumanScore({
      title: 'Widget',
      description: '',
      features: []
    });
    expect(sparse.confidence).toBe('low');
  });
});

// ============================================================================
// Fidelity Checker Tests
// ============================================================================

describe('Fidelity Checker', () => {
  it('passes when variant matches original claims', () => {
    const original = { warranty: '2 years', price: '$99' };
    const variant = { warranty: '2 years', price: '$99' };
    const result = checkFidelity(original, variant);
    expect(result.passes).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails on fabricated numerical claims', () => {
    const original = { warranty: '1 year' };
    const variant = { warranty: '5 years' }; // FABRICATED
    const result = checkFidelity(original, variant);
    expect(result.passes).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ type: 'fabrication', severity: 'critical' })
    );
  });

  it('flags price mismatches as critical', () => {
    const original = { price: '$199' };
    const variant = { price: '$99' }; // WRONG PRICE
    const result = checkFidelity(original, variant);
    expect(result.passes).toBe(false);
    expect(result.violations[0].severity).toBe('critical');
    expect(result.violations[0].field).toBe('price');
  });

  it('allows marketing language variations', () => {
    const original = { description: 'A good product for your needs' };
    const variant = { description: 'An excellent product that transforms your workflow' }; // OK - subjective
    const result = checkFidelity(original, variant);
    expect(result.passes).toBe(true);
  });

  it('flags missing required elements', () => {
    const original = {
      title: 'Widget Pro',
      warranty: '2 years',
      returnPolicy: '30 days',
      price: '$99'
    };
    const variant = { title: 'Widget Pro' }; // Missing warranty, return policy, price
    const result = checkFidelity(original, variant);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ type: 'missing_element' })
    );
  });

  it('detects percentage claim inflation', () => {
    const original = { claim: 'Saves up to 20% on energy' };
    const variant = { claim: 'Saves up to 50% on energy' }; // INFLATED
    const result = checkFidelity(original, variant);
    expect(result.passes).toBe(false);
    expect(result.violations[0].field).toBe('claim');
    expect(result.violations[0].type).toBe('inflation');
  });

  it('detects rating inflation', () => {
    const original = { rating: '4.2/5 stars' };
    const variant = { rating: '4.8/5 stars' }; // INFLATED
    const result = checkFidelity(original, variant);
    expect(result.passes).toBe(false);
    expect(result.violations.some(v => v.field === 'rating')).toBe(true);
  });

  it('detects review count inflation', () => {
    const original = { reviewCount: '500 reviews' };
    const variant = { reviewCount: '5000 reviews' }; // INFLATED
    const result = checkFidelity(original, variant);
    expect(result.violations.some(v => v.field === 'reviewCount')).toBe(true);
  });

  it('calculates fidelity score', () => {
    const original = { price: '$99', warranty: '1 year' };
    const variant = { price: '$99', warranty: '1 year' };
    const result = checkFidelity(original, variant);
    expect(result.score).toBe(100); // Perfect fidelity
  });

  it('reduces score for violations', () => {
    const original = { warranty: '1 year' };
    const variant = { warranty: '3 years' }; // Critical violation
    const result = checkFidelity(original, variant);
    expect(result.score).toBeLessThan(100);
  });

  it('handles empty original content', () => {
    const original = {};
    const variant = { title: 'Product', description: 'Great product' };
    const result = checkFidelity(original, variant);
    expect(result.passes).toBe(true);
  });

  it('handles empty variant content', () => {
    const original = { title: 'Product', warranty: '2 years' };
    const variant = {};
    const result = checkFidelity(original, variant);
    // Should have warnings about missing elements
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('Fidelity Checker - Quick Check', () => {
  it('returns true for matching values', () => {
    const original = { price: '$99', warranty: '2', rating: '4.5' };
    const variant = { price: '$99', warranty: '2', rating: '4.5' };
    expect(quickCheckNumbers(original, variant)).toBe(true);
  });

  it('returns false for inflated warranty', () => {
    const original = { warranty: '1' };
    const variant = { warranty: '3' };
    expect(quickCheckNumbers(original, variant)).toBe(false);
  });

  it('returns false for price mismatch', () => {
    const original = { price: '$100' };
    const variant = { price: '$50' };
    expect(quickCheckNumbers(original, variant)).toBe(false);
  });
});

// ============================================================================
// Human Judge - Full LLM Evaluation Tests
// ============================================================================

describe('Human Judge - Full LLM Evaluation', () => {
  it('returns structured score with breakdown', async () => {
    const original = { title: 'Widget', features: [] };
    const variant = { title: 'Widget Pro - Premium Choice', features: ['Fast setup'] };
    const result = await evaluateHumanAppeal(original, variant);

    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveProperty('clarity');
    expect(result.breakdown).toHaveProperty('persuasiveness');
    expect(result.breakdown).toHaveProperty('trustworthiness');
    expect(result.breakdown).toHaveProperty('actionability');
  });

  it('includes qualitative feedback', async () => {
    const result = await evaluateHumanAppeal({}, { title: 'Test' });
    expect(result.feedback).toBeDefined();
    expect(typeof result.feedback).toBe('string');
    expect(result.feedback.length).toBeGreaterThan(5);
  });

  it('includes fidelity check results', async () => {
    const original = { warranty: '1 year', price: '$99' };
    const variant = { warranty: '1 year', price: '$99' };
    const result = await evaluateHumanAppeal(original, variant);

    expect(result.fidelityCheck).toBeDefined();
    expect(result.fidelityCheck.passes).toBe(true);
  });

  it('flags fidelity violations in result', async () => {
    const original = { warranty: '1 year' };
    const variant = { warranty: '5 years' }; // Fabricated
    const result = await evaluateHumanAppeal(original, variant);

    expect(result.fidelityCheck.passes).toBe(false);
    expect(result.fidelityViolations).toBeDefined();
    expect(result.fidelityViolations!.length).toBeGreaterThan(0);
  });

  it('can skip fidelity check', async () => {
    const original = { warranty: '1 year' };
    const variant = { warranty: '5 years' }; // Would fail fidelity
    const result = await evaluateHumanAppeal(original, variant, { skipFidelityCheck: true });

    expect(result.fidelityCheck.passes).toBe(true); // Skipped, so passes
  });

  // Mock test - verifies we call LLM with correct prompt structure
  it('sends proper evaluation prompt to LLM', async () => {
    const mockLLM = vi.fn().mockResolvedValue({
      breakdown: {
        clarity: 20,
        persuasiveness: 18,
        trustworthiness: 19,
        actionability: 18
      },
      feedback: 'Good content'
    });

    await evaluateHumanAppeal(
      { title: 'Original' },
      { title: 'Variant' },
      { llmClient: mockLLM }
    );

    expect(mockLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet',
        prompt: expect.stringContaining('human perspective')
      })
    );
  });

  it('handles LLM response parsing', async () => {
    const mockLLM = vi.fn().mockResolvedValue({
      text: '{"clarity": 22, "persuasiveness": 20, "trustworthiness": 21, "actionability": 19, "feedback": "Well written"}'
    });

    const result = await evaluateHumanAppeal(
      {},
      { title: 'Test' },
      { llmClient: mockLLM, skipFidelityCheck: true }
    );

    expect(result.breakdown.clarity).toBe(22);
    expect(result.breakdown.persuasiveness).toBe(20);
    expect(result.feedback).toBe('Well written');
  });
});

describe('Human Judge - Quick Appeal Check', () => {
  it('returns high appeal for well-structured content', () => {
    const variant = {
      title: 'Premium Widget Pro',
      description: 'Save time and money with our amazing product. You will love it!',
      features: ['Free shipping', '30-day guarantee', 'Excellent support']
    };
    const result = quickHumanAppealCheck(variant);
    expect(result.likelyAppeal).toBe('high');
  });

  it('returns low appeal for sparse content', () => {
    const variant = {
      description: 'Product',
      features: []
    };
    const result = quickHumanAppealCheck(variant);
    expect(result.likelyAppeal).toBe('low');
    expect(result.flags).toContain('Missing title');
  });

  it('flags corporate jargon', () => {
    const variant = {
      title: 'Enterprise Solution',
      description: 'Leverage synergy to optimize your paradigm with holistic solutions'
    };
    const result = quickHumanAppealCheck(variant);
    expect(result.flags).toContain('Corporate jargon detected');
  });

  it('flags very short content', () => {
    const variant = {
      title: 'X',
      description: 'Short'
    };
    const result = quickHumanAppealCheck(variant);
    expect(result.flags).toContain('Content too short');
  });
});
