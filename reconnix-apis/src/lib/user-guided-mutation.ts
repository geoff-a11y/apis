// src/lib/user-guided-mutation.ts — User-guided mutation for Generation 6+
// Injects user feedback into mutation prompts

import { ScoredVariant, VariantContent, EVOLUTION_CONFIG_V3 } from './evolution-engine';

// ============================================================================
// Types
// ============================================================================

export interface MutationContext {
  parents: ScoredVariant[];
  baseline?: VariantContent;
  userFeedback: string;
  generation: number;
  previousUserGuidedCount?: number;
}

export interface GeneratedVariant extends VariantContent {
  generationType: 'user-guided';
  generation: number;
  parentId?: string;
  metadata: {
    userFeedback: string;
    model: string;
    timestamp: string;
  };
}

export interface LLMClientOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
}

export interface LLMResponse {
  variants?: VariantContent[];
  text?: string;
}

export type LLMClient = (options: LLMClientOptions) => Promise<LLMResponse>;

export interface UserGuidedMutationOptions {
  llmClient?: LLMClient;
  model?: string;
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Build a prompt for user-guided mutation
 */
function buildUserGuidedPrompt(
  parents: ScoredVariant[],
  userFeedback: string,
  baseline?: VariantContent
): string {
  // Format parent variants for the prompt
  const parentSummaries = parents.slice(0, 3).map((parent, i) => {
    const scoresSummary = `AI: ${parent.scores.ai}, SEO: ${parent.scores.seo}, Human: ${parent.scores.human}`;
    return `
### Parent Variant ${i + 1} (Fitness: ${parent.penalizedFitness.toFixed(1)}, ${scoresSummary})
${parent.title ? `Title: ${parent.title}` : ''}
${parent.description ? `Description: ${parent.description}` : ''}
${parent.features?.length ? `Features:\n${parent.features.map(f => `- ${f}`).join('\n')}` : ''}
`.trim();
  }).join('\n\n');

  // Format baseline if provided
  const baselineSummary = baseline ? `
## Original Content (for reference)
${baseline.title ? `Title: ${baseline.title}` : ''}
${baseline.description ? `Description: ${baseline.description}` : ''}
${baseline.features?.length ? `Features:\n${baseline.features.map(f => `- ${f}`).join('\n')}` : ''}
` : '';

  return `You are an expert content optimizer creating new variants based on user feedback.

${baselineSummary}

## Top Performing Parent Variants
These variants performed well in previous generations. Preserve their strengths while incorporating the user's feedback.

${parentSummaries}

## USER FEEDBACK FOR THIS GENERATION
"${userFeedback}"

## Instructions
Create 3 new variants that:
1. Address the user's specific feedback above
2. Preserve what made the parent variants successful (high scores)
3. Maintain factual accuracy - do not fabricate claims
4. Keep SEO best practices (title 50-60 chars, description 150-160 chars)
5. Include clear calls-to-action for human appeal

## Response Format
Respond with a JSON array of 3 variant objects:
[
  {
    "title": "string",
    "description": "string",
    "features": ["string", "string", "string"]
  }
]

Only respond with the JSON array, no additional text.`;
}

/**
 * Parse LLM response to extract variants
 */
function parseVariantResponse(response: LLMResponse): VariantContent[] {
  // If response has variants array, use it
  if (response.variants && Array.isArray(response.variants)) {
    return response.variants;
  }

  // Try to parse from text
  if (response.text) {
    try {
      // Find JSON array in response
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((v, i) => ({
            id: `ug_${Date.now()}_${i}`,
            title: v.title || '',
            description: v.description || '',
            features: v.features || [],
          }));
        }
      }
    } catch (error) {
      console.error('Failed to parse variant response:', error);
    }
  }

  // Return empty array if parsing fails
  return [];
}

// ============================================================================
// Mock LLM Client
// ============================================================================

/**
 * Mock LLM client for testing
 */
const mockLLMClient: LLMClient = async (options) => {
  // Generate mock variants based on the prompt
  const hasUrgency = options.prompt.toLowerCase().includes('urgency');
  const hasScarcity = options.prompt.toLowerCase().includes('scarcity');

  const variants: VariantContent[] = [
    {
      id: `mock_1_${Date.now()}`,
      title: hasUrgency ? 'Limited Time Offer - Premium Widget Pro' : 'Premium Widget Pro - Best in Class',
      description: hasUrgency
        ? 'Act now! Save 30% on our top-rated widget. Offer ends soon.'
        : 'Discover the premium widget that thousands of customers love.',
      features: [
        hasScarcity ? 'Only 50 left in stock!' : 'In stock and ready to ship',
        '5-year warranty included',
        'Free 30-day returns',
      ],
    },
    {
      id: `mock_2_${Date.now()}`,
      title: 'Widget Pro Elite - Premium Quality',
      description: 'Experience the difference with our professional-grade widget.',
      features: [
        'Award-winning design',
        'Trusted by 10,000+ customers',
        '24/7 customer support',
      ],
    },
    {
      id: `mock_3_${Date.now()}`,
      title: 'The Professional Choice - Widget Pro',
      description: 'Join thousands of satisfied customers. Order yours today.',
      features: [
        'Industry-leading performance',
        '5-star average rating',
        'Fast and free shipping',
      ],
    },
  ];

  return { variants };
};

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generate user-guided mutations based on feedback
 */
export async function generateUserGuidedMutations(
  context: MutationContext,
  count: number,
  options: UserGuidedMutationOptions = {}
): Promise<GeneratedVariant[]> {
  const config = EVOLUTION_CONFIG_V3;
  const llmClient = options.llmClient || mockLLMClient;
  const model = options.model || config.mutationModel.userGuided;

  // Check max user-guided generations
  const previousCount = context.previousUserGuidedCount || 0;
  if (previousCount >= config.maxUserGuidedGenerations) {
    throw new Error(
      `Maximum user-guided generations (${config.maxUserGuidedGenerations}) reached. ` +
      `Cannot create more user-guided variants.`
    );
  }

  // Build the prompt
  const prompt = buildUserGuidedPrompt(
    context.parents,
    context.userFeedback,
    context.baseline
  );

  // Call the LLM
  const response = await llmClient({
    model,
    prompt,
    maxTokens: 2000,
  });

  // Parse the response
  const rawVariants = parseVariantResponse(response);

  // Add metadata and limit to requested count
  const timestamp = new Date().toISOString();
  const generatedVariants: GeneratedVariant[] = rawVariants.slice(0, count).map((v, i) => ({
    ...v,
    id: v.id || `ug_${context.generation}_${i}_${Date.now()}`,
    generationType: 'user-guided' as const,
    generation: context.generation,
    parentId: context.parents[i % context.parents.length]?.id,
    metadata: {
      userFeedback: context.userFeedback,
      model,
      timestamp,
    },
  }));

  // If we didn't get enough variants, fill with more calls
  while (generatedVariants.length < count && generatedVariants.length < 10) {
    const additionalResponse = await llmClient({
      model,
      prompt,
      maxTokens: 2000,
    });
    const additionalVariants = parseVariantResponse(additionalResponse);

    for (const v of additionalVariants) {
      if (generatedVariants.length >= count) break;

      const idx = generatedVariants.length;
      generatedVariants.push({
        ...v,
        id: v.id || `ug_${context.generation}_${idx}_${Date.now()}`,
        generationType: 'user-guided' as const,
        generation: context.generation,
        parentId: context.parents[idx % context.parents.length]?.id,
        metadata: {
          userFeedback: context.userFeedback,
          model,
          timestamp,
        },
      });
    }

    // Prevent infinite loop
    if (additionalVariants.length === 0) break;
  }

  return generatedVariants;
}

/**
 * Check if more user-guided generations are allowed
 */
export function canRunUserGuidedGeneration(currentUserGuidedCount: number): boolean {
  return currentUserGuidedCount < EVOLUTION_CONFIG_V3.maxUserGuidedGenerations;
}

/**
 * Get remaining user-guided generations available
 */
export function getRemainingUserGuidedGenerations(currentUserGuidedCount: number): number {
  return Math.max(0, EVOLUTION_CONFIG_V3.maxUserGuidedGenerations - currentUserGuidedCount);
}

/**
 * Validate user feedback
 */
export function validateUserFeedback(feedback: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!feedback || feedback.trim().length === 0) {
    errors.push('Feedback cannot be empty');
  }

  if (feedback.length < 10) {
    errors.push('Feedback should be at least 10 characters');
  }

  if (feedback.length > 1000) {
    errors.push('Feedback should be less than 1000 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract actionable insights from user feedback
 */
export function extractFeedbackInsights(feedback: string): {
  wantsUrgency: boolean;
  wantsScarcity: boolean;
  wantsSocialProof: boolean;
  wantsTrust: boolean;
  wantsSimplicity: boolean;
  keywords: string[];
} {
  const lowerFeedback = feedback.toLowerCase();

  return {
    wantsUrgency: /urgency|urgent|hurry|quick|fast|now|today|limited time/i.test(feedback),
    wantsScarcity: /scarc|limited|only \d+|running out|last chance|exclusive/i.test(feedback),
    wantsSocialProof: /social proof|review|rating|customer|testimonial|trusted by/i.test(feedback),
    wantsTrust: /trust|reliable|guarante|warranty|secure|safe|proven/i.test(feedback),
    wantsSimplicity: /simple|simpler|short|shorter|concise|brief|less/i.test(feedback),
    keywords: lowerFeedback.match(/\b\w{4,}\b/g)?.filter(w =>
      !['make', 'more', 'less', 'this', 'that', 'with', 'from', 'have', 'want'].includes(w)
    ) || [],
  };
}
