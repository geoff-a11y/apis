// src/test/user-guided-mutation.test.ts — Unit tests for User-Guided Mutation
import { describe, it, expect, vi } from 'vitest';
import {
  generateUserGuidedMutations,
  canRunUserGuidedGeneration,
  getRemainingUserGuidedGenerations,
  validateUserFeedback,
  extractFeedbackInsights,
  MutationContext,
  LLMClient,
  GeneratedVariant,
} from '../lib/user-guided-mutation';
import { ScoredVariant } from '../lib/evolution-engine';
import { EVOLUTION_CONFIG_V3 } from '../lib/evolution-engine';

// ============================================================================
// Helper Functions
// ============================================================================

const createMockParents = (): ScoredVariant[] => [
  {
    id: 'parent1',
    title: 'Widget Pro - Premium Quality',
    description: 'The best widget for your needs',
    features: ['5 year warranty', 'Free shipping', 'Top rated'],
    scores: { ai: 85, seo: 80, human: 82 },
    fitness: 82,
    penalizedFitness: 82,
    disqualified: false,
    generation: 5,
  },
  {
    id: 'parent2',
    title: 'Professional Widget Solution',
    description: 'Trusted by thousands of customers',
    features: ['Award winning', '24/7 support', 'Money back guarantee'],
    scores: { ai: 80, seo: 78, human: 85 },
    fitness: 81,
    penalizedFitness: 81,
    disqualified: false,
    generation: 5,
  },
];

// ============================================================================
// User Feedback Injection Tests
// ============================================================================

describe('User-Guided Mutation', () => {
  it('injects user feedback into prompt', async () => {
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      variants: [{ id: 'v1', title: 'Test', description: 'Test', features: [] }],
    });
    const feedback = 'Make the headline more urgent';

    await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        userFeedback: feedback,
        generation: 6,
      },
      3,
      { llmClient: mockLLM }
    );

    expect(mockLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Make the headline more urgent'),
      })
    );
  });

  it('uses Opus model for user-guided mutations', async () => {
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      variants: [{ id: 'v1', title: 'Test', features: [] }],
    });

    await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        userFeedback: 'test feedback',
        generation: 6,
      },
      3,
      { llmClient: mockLLM }
    );

    expect(mockLLM).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus' })
    );
  });

  it('preserves parent variant strengths in prompt', async () => {
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      variants: [{ id: 'v1', title: 'Test', features: [] }],
    });
    const parents = createMockParents();

    await generateUserGuidedMutations(
      {
        parents,
        userFeedback: 'Add urgency',
        generation: 6,
      },
      3,
      { llmClient: mockLLM }
    );

    // Prompt should include parent content
    expect(mockLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Widget Pro'),
      })
    );
  });

  it('includes baseline content when provided', async () => {
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      variants: [{ id: 'v1', title: 'Test', features: [] }],
    });
    const baseline = {
      id: 'baseline',
      title: 'Original Product Title',
      description: 'Original description',
    };

    await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        baseline,
        userFeedback: 'test',
        generation: 6,
      },
      3,
      { llmClient: mockLLM }
    );

    expect(mockLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Original Product Title'),
      })
    );
  });
});

// ============================================================================
// Variant Generation Tests
// ============================================================================

describe('Variant Generation', () => {
  it('generates requested number of variants', async () => {
    const mockVariants = [
      { id: 'v1', title: 'Variant 1', description: 'Desc 1', features: [] },
      { id: 'v2', title: 'Variant 2', description: 'Desc 2', features: [] },
      { id: 'v3', title: 'Variant 3', description: 'Desc 3', features: [] },
    ];
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({ variants: mockVariants });

    const result = await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        userFeedback: 'test',
        generation: 6,
      },
      3,
      { llmClient: mockLLM }
    );

    expect(result).toHaveLength(3);
  });

  it('marks variants as user-guided generation', async () => {
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      variants: [{ id: 'v1', title: 'V1', features: [] }],
    });

    const result = await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        userFeedback: 'test',
        generation: 6,
      },
      1,
      { llmClient: mockLLM }
    );

    expect(result[0].generationType).toBe('user-guided');
    expect(result[0].generation).toBe(6);
  });

  it('includes feedback in variant metadata', async () => {
    const feedback = 'Focus on sustainability messaging';
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      variants: [{ id: 'v1', title: 'V1', features: [] }],
    });

    const result = await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        userFeedback: feedback,
        generation: 6,
      },
      1,
      { llmClient: mockLLM }
    );

    expect(result[0].metadata.userFeedback).toBe(feedback);
    expect(result[0].metadata.model).toBe('claude-opus');
    expect(result[0].metadata.timestamp).toBeDefined();
  });

  it('assigns parent IDs to generated variants', async () => {
    const parents = createMockParents();
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      variants: [
        { id: 'v1', title: 'V1', features: [] },
        { id: 'v2', title: 'V2', features: [] },
      ],
    });

    const result = await generateUserGuidedMutations(
      {
        parents,
        userFeedback: 'test',
        generation: 6,
      },
      2,
      { llmClient: mockLLM }
    );

    expect(result[0].parentId).toBe(parents[0].id);
    expect(result[1].parentId).toBe(parents[1].id);
  });
});

// ============================================================================
// Generation Limit Tests
// ============================================================================

describe('Generation Limits', () => {
  it('throws error when max user-guided generations reached', async () => {
    const context: MutationContext = {
      parents: createMockParents(),
      userFeedback: 'test',
      generation: 9,
      previousUserGuidedCount: 3, // Already ran 3 (max is 3)
    };

    await expect(
      generateUserGuidedMutations(context, 3)
    ).rejects.toThrow(/maximum.*generations/i);
  });

  it('allows generation when under limit', async () => {
    const context: MutationContext = {
      parents: createMockParents(),
      userFeedback: 'test',
      generation: 7,
      previousUserGuidedCount: 1,
    };

    // Should not throw
    const result = await generateUserGuidedMutations(context, 3);
    expect(result.length).toBeGreaterThan(0);
  });

  it('canRunUserGuidedGeneration returns correct value', () => {
    expect(canRunUserGuidedGeneration(0)).toBe(true);
    expect(canRunUserGuidedGeneration(1)).toBe(true);
    expect(canRunUserGuidedGeneration(2)).toBe(true);
    expect(canRunUserGuidedGeneration(3)).toBe(false);
    expect(canRunUserGuidedGeneration(4)).toBe(false);
  });

  it('getRemainingUserGuidedGenerations returns correct count', () => {
    expect(getRemainingUserGuidedGenerations(0)).toBe(3);
    expect(getRemainingUserGuidedGenerations(1)).toBe(2);
    expect(getRemainingUserGuidedGenerations(2)).toBe(1);
    expect(getRemainingUserGuidedGenerations(3)).toBe(0);
    expect(getRemainingUserGuidedGenerations(5)).toBe(0);
  });
});

// ============================================================================
// Feedback Validation Tests
// ============================================================================

describe('Feedback Validation', () => {
  it('validates non-empty feedback', () => {
    const result = validateUserFeedback('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Feedback cannot be empty');
  });

  it('validates minimum length', () => {
    const result = validateUserFeedback('short');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Feedback should be at least 10 characters');
  });

  it('validates maximum length', () => {
    const result = validateUserFeedback('a'.repeat(1001));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Feedback should be less than 1000 characters');
  });

  it('passes valid feedback', () => {
    const result = validateUserFeedback('Add more urgency to the headline');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ============================================================================
// Feedback Insights Tests
// ============================================================================

describe('Feedback Insights Extraction', () => {
  it('detects urgency keywords', () => {
    const insights = extractFeedbackInsights('Add urgency and make it time-limited');
    expect(insights.wantsUrgency).toBe(true);
  });

  it('detects scarcity keywords', () => {
    const insights = extractFeedbackInsights('Add limited availability, only 50 left');
    expect(insights.wantsScarcity).toBe(true);
  });

  it('detects social proof keywords', () => {
    const insights = extractFeedbackInsights('Include customer reviews and ratings');
    expect(insights.wantsSocialProof).toBe(true);
  });

  it('detects trust keywords', () => {
    const insights = extractFeedbackInsights('Add warranty and guarantee information');
    expect(insights.wantsTrust).toBe(true);
  });

  it('detects simplicity keywords', () => {
    const insights = extractFeedbackInsights('Make the description shorter and simpler');
    expect(insights.wantsSimplicity).toBe(true);
  });

  it('extracts keywords from feedback', () => {
    const insights = extractFeedbackInsights('Focus on sustainability and eco-friendly messaging');
    expect(insights.keywords).toContain('focus');
    expect(insights.keywords).toContain('sustainability');
  });

  it('handles feedback with no specific keywords', () => {
    const insights = extractFeedbackInsights('improve the content');
    expect(insights.wantsUrgency).toBe(false);
    expect(insights.wantsScarcity).toBe(false);
    expect(insights.wantsSocialProof).toBe(false);
  });
});

// ============================================================================
// Response Parsing Tests
// ============================================================================

describe('Response Parsing', () => {
  it('parses variants from direct array', async () => {
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      variants: [
        { title: 'Title 1', description: 'Desc 1', features: ['F1'] },
        { title: 'Title 2', description: 'Desc 2', features: ['F2'] },
      ],
    });

    const result = await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        userFeedback: 'test',
        generation: 6,
      },
      2,
      { llmClient: mockLLM }
    );

    expect(result[0].title).toBe('Title 1');
    expect(result[1].title).toBe('Title 2');
  });

  it('parses variants from JSON text', async () => {
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      text: `[
        {"title": "From Text 1", "description": "D1", "features": []},
        {"title": "From Text 2", "description": "D2", "features": []}
      ]`,
    });

    const result = await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        userFeedback: 'test',
        generation: 6,
      },
      2,
      { llmClient: mockLLM }
    );

    expect(result[0].title).toBe('From Text 1');
  });

  it('handles empty response gracefully', async () => {
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({ variants: [] });

    const result = await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        userFeedback: 'test',
        generation: 6,
      },
      2,
      { llmClient: mockLLM }
    );

    // Should handle gracefully (may be empty or use default)
    expect(Array.isArray(result)).toBe(true);
  });
});

// ============================================================================
// Custom Model Tests
// ============================================================================

describe('Custom Model Selection', () => {
  it('allows overriding the model', async () => {
    const mockLLM: LLMClient = vi.fn().mockResolvedValue({
      variants: [{ id: 'v1', title: 'Test', features: [] }],
    });

    await generateUserGuidedMutations(
      {
        parents: createMockParents(),
        userFeedback: 'test',
        generation: 6,
      },
      1,
      { llmClient: mockLLM, model: 'custom-model' }
    );

    expect(mockLLM).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'custom-model' })
    );
  });
});
