// src/lib/human-judge.ts — Full LLM-based human appeal evaluation
// Only used for Gen 4-5 top 5 variants to control costs

import { checkFidelity, FidelityResult, OriginalContent } from './fidelity-checker';

export interface HumanScoreBreakdown {
  clarity: number;         // 0-25: Is the message clear and easy to understand?
  persuasiveness: number;  // 0-25: Does it motivate action?
  trustworthiness: number; // 0-25: Does it feel credible and reliable?
  actionability: number;   // 0-25: Is it clear what to do next?
}

export interface HumanScore {
  total: number;           // 0-100
  breakdown: HumanScoreBreakdown;
  feedback: string;        // Qualitative feedback from LLM
  fidelityCheck: FidelityResult;
  fidelityViolations?: string[];
}

export interface VariantContent {
  title?: string;
  description?: string;
  features?: string[];
  content?: string;
}

export interface LLMClient {
  (options: { model: string; prompt: string; maxTokens?: number }): Promise<{
    score?: number;
    breakdown?: HumanScoreBreakdown;
    feedback?: string;
    text?: string;
  }>;
}

export interface EvaluateOptions {
  llmClient?: LLMClient;
  skipFidelityCheck?: boolean;
}

// Default mock LLM client for testing
const mockLLMClient: LLMClient = async () => ({
  score: 75,
  breakdown: {
    clarity: 20,
    persuasiveness: 18,
    trustworthiness: 19,
    actionability: 18,
  },
  feedback: 'Good overall appeal with clear messaging.',
});

/**
 * Build the evaluation prompt for the LLM
 */
function buildEvaluationPrompt(original: OriginalContent, variant: VariantContent): string {
  const originalText = [
    original.title ? `Title: ${original.title}` : '',
    original.description ? `Description: ${original.description}` : '',
    original.features?.length ? `Features:\n${original.features.map(f => `- ${f}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');

  const variantText = [
    variant.title ? `Title: ${variant.title}` : '',
    variant.description ? `Description: ${variant.description}` : '',
    variant.features?.length ? `Features:\n${variant.features.map(f => `- ${f}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');

  return `You are evaluating product page content from a human perspective. Rate how appealing and effective this content would be to a typical consumer or business buyer.

## Original Content (for reference):
${originalText || 'Not provided'}

## Optimized Variant to Evaluate:
${variantText}

## Evaluation Criteria (score each 0-25):

1. **Clarity** (0-25): Is the message clear and easy to understand?
   - Can users quickly grasp what the product does?
   - Is the language free of jargon and confusing terms?
   - Is the structure logical and well-organized?

2. **Persuasiveness** (0-25): Does it motivate action?
   - Are benefits clearly articulated?
   - Does it create desire or urgency?
   - Is there emotional resonance?

3. **Trustworthiness** (0-25): Does it feel credible and reliable?
   - Are claims believable and not exaggerated?
   - Is there evidence or social proof?
   - Does the tone feel professional?

4. **Actionability** (0-25): Is it clear what to do next?
   - Is there a clear call-to-action?
   - Are next steps obvious?
   - Is the path to purchase clear?

## Response Format:
Provide your response as JSON:
{
  "clarity": <number 0-25>,
  "persuasiveness": <number 0-25>,
  "trustworthiness": <number 0-25>,
  "actionability": <number 0-25>,
  "feedback": "<1-2 sentences of qualitative feedback>"
}

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Parse LLM response to extract scores
 */
function parseResponse(response: {
  score?: number;
  breakdown?: HumanScoreBreakdown;
  feedback?: string;
  text?: string;
}): { breakdown: HumanScoreBreakdown; feedback: string } {
  // If response already has breakdown, use it
  if (response.breakdown) {
    return {
      breakdown: response.breakdown,
      feedback: response.feedback || 'No feedback provided.',
    };
  }

  // Try to parse from text response
  if (response.text) {
    try {
      // Extract JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          breakdown: {
            clarity: Math.min(25, Math.max(0, parsed.clarity || 15)),
            persuasiveness: Math.min(25, Math.max(0, parsed.persuasiveness || 15)),
            trustworthiness: Math.min(25, Math.max(0, parsed.trustworthiness || 15)),
            actionability: Math.min(25, Math.max(0, parsed.actionability || 15)),
          },
          feedback: parsed.feedback || 'Evaluation complete.',
        };
      }
    } catch {
      // Fall through to default
    }
  }

  // Default fallback
  return {
    breakdown: {
      clarity: 15,
      persuasiveness: 15,
      trustworthiness: 15,
      actionability: 15,
    },
    feedback: 'Unable to parse detailed evaluation. Using default scores.',
  };
}

/**
 * Evaluate human appeal using LLM
 * This is the full evaluation used only for Gen 4-5 top 5 variants
 */
export async function evaluateHumanAppeal(
  original: OriginalContent,
  variant: VariantContent,
  options: EvaluateOptions = {}
): Promise<HumanScore> {
  const llmClient = options.llmClient || mockLLMClient;

  // First, run fidelity check
  let fidelityCheck: FidelityResult;
  if (options.skipFidelityCheck) {
    fidelityCheck = {
      passes: true,
      violations: [],
      warnings: [],
      score: 100,
    };
  } else {
    fidelityCheck = checkFidelity(
      original as OriginalContent,
      variant as OriginalContent
    );
  }

  // Build and send prompt to LLM
  const prompt = buildEvaluationPrompt(original, variant);

  const response = await llmClient({
    model: 'claude-sonnet',
    prompt,
    maxTokens: 500,
  });

  // Parse the response
  const { breakdown, feedback } = parseResponse(response);

  // Calculate total
  const total = breakdown.clarity + breakdown.persuasiveness + breakdown.trustworthiness + breakdown.actionability;

  // Extract fidelity violation messages
  const fidelityViolations = fidelityCheck.violations.map(v => v.message);

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown,
    feedback,
    fidelityCheck,
    fidelityViolations: fidelityViolations.length > 0 ? fidelityViolations : undefined,
  };
}

/**
 * Batch evaluate multiple variants
 * Used to evaluate top 5 variants in a generation
 */
export async function batchEvaluateHumanAppeal(
  original: OriginalContent,
  variants: VariantContent[],
  options: EvaluateOptions = {}
): Promise<HumanScore[]> {
  // Run evaluations in parallel for efficiency
  const results = await Promise.all(
    variants.map(variant => evaluateHumanAppeal(original, variant, options))
  );

  return results;
}

/**
 * Get a quick human appeal indicator without full LLM evaluation
 * Useful for filtering before expensive LLM calls
 */
export function quickHumanAppealCheck(variant: VariantContent): {
  likelyAppeal: 'low' | 'medium' | 'high';
  flags: string[];
} {
  const flags: string[] = [];
  let score = 50; // Start at medium

  const allText = [
    variant.title || '',
    variant.description || '',
    ...(variant.features || []),
  ].join(' ').toLowerCase();

  // Positive indicators
  if (/\byou\b|\byour\b/.test(allText)) score += 10; // Personal language
  if (/save|free|discount|deal/.test(allText)) score += 5; // Value prop
  if (/\d+\s*%/.test(allText)) score += 3; // Specific numbers
  if (variant.features && variant.features.length >= 3) score += 5; // Good features

  // Negative indicators
  if (allText.length < 50) {
    score -= 15;
    flags.push('Content too short');
  }
  if (/\b(synergy|leverage|paradigm|holistic)\b/.test(allText)) {
    score -= 5;
    flags.push('Corporate jargon detected');
  }
  if (!variant.title) {
    score -= 10;
    flags.push('Missing title');
  }

  // Determine appeal level
  let likelyAppeal: 'low' | 'medium' | 'high';
  if (score >= 60) likelyAppeal = 'high';
  else if (score >= 40) likelyAppeal = 'medium';
  else likelyAppeal = 'low';

  return { likelyAppeal, flags };
}
