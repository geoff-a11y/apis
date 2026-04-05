// src/lib/human-estimator.ts — Fast rule-based Human score estimation
// Used for Gen 1-3 to avoid LLM costs. NO LLM calls.

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface EstimatedHumanScore {
  score: number;           // 0-100
  confidence: ConfidenceLevel;
  ctaBonus: number;
  benefitBonus: number;
  socialProofBonus: number;
  clarityScore: number;
  lengthPenalty: number;
  breakdown: {
    clarity: number;
    persuasiveness: number;
    trustworthiness: number;
    actionability: number;
  };
}

export interface VariantContent {
  title?: string;
  description?: string;
  features?: string[];
  content?: string;
}

// CTA patterns that indicate strong calls-to-action
const CTA_PATTERNS = [
  /\b(buy|shop|order|get|try|start)\s+(now|today|here)/i,
  /\b(limited|exclusive|special)\s+(time|offer|deal)/i,
  /\b(free|save|discount)\b/i,
  /\b(don't miss|act now|hurry)/i,
  /\b(sign up|subscribe|join|register)/i,
  /\b(learn more|discover|explore)/i,
];

// Benefit-focused language patterns (vs. feature specs)
const BENEFIT_PATTERNS = [
  /\b(save[sd]?\s+(?:you\s+)?(?:\d+|time|money|hours))/i,
  /\b(reduce[sd]?\s+(?:costs?|time|effort))/i,
  /\b(improve[sd]?\s+(?:your|productivity|efficiency))/i,
  /\b(make[sd]?\s+(?:it|life|work)\s+easier)/i,
  /\b(help[sd]?\s+(?:you|your))/i,
  /\b(transform|revolutionize|elevate)/i,
  /\b(\d+%\s+(?:more|better|faster))/i,
  /\b(guaranteed|proven|trusted)/i,
];

// Social proof indicators
const SOCIAL_PROOF_PATTERNS = [
  /\b(\d+[,\d]*\+?\s*(?:customers?|users?|reviews?|ratings?))/i,
  /\b(\d+\.?\d*\s*(?:\/5|out of 5|star))/i,
  /\b(trusted by|used by|loved by)/i,
  /\b(best[-\s]?seller|top[-\s]?rated|award[-\s]?winning)/i,
  /\b(as seen (?:in|on))/i,
  /\b(featured in|recommended by)/i,
  /\b(verified|certified)/i,
];

// Spec-heavy patterns (less human-appealing)
const SPEC_PATTERNS = [
  /\b\d+\s*(GB|MB|TB|GHz|MHz|mAh|mm|cm|kg|lb)/i,
  /\b(model|serial|SKU|part)\s*#?\s*[A-Z0-9-]+/i,
  /\b(dimensions?|specifications?|tech\s*specs?)/i,
];

/**
 * Detect CTA presence and strength
 */
function detectCTA(text: string): { present: boolean; strength: number } {
  const matches = CTA_PATTERNS.filter(pattern => pattern.test(text));
  return {
    present: matches.length > 0,
    strength: Math.min(matches.length * 5, 15), // Max 15 points
  };
}

/**
 * Detect benefit-focused language
 */
function detectBenefits(text: string, features: string[]): { score: number; count: number } {
  const allText = [text, ...features].join(' ');
  const matches = BENEFIT_PATTERNS.filter(pattern => pattern.test(allText));
  return {
    score: Math.min(matches.length * 4, 20), // Max 20 points
    count: matches.length,
  };
}

/**
 * Detect social proof indicators
 */
function detectSocialProof(text: string, features: string[]): { score: number; count: number } {
  const allText = [text, ...features].join(' ');
  const matches = SOCIAL_PROOF_PATTERNS.filter(pattern => pattern.test(allText));
  return {
    score: Math.min(matches.length * 5, 15), // Max 15 points
    count: matches.length,
  };
}

/**
 * Calculate clarity score based on sentence structure
 */
function calculateClarity(text: string): number {
  if (!text || text.length === 0) return 0;

  let score = 15; // Start with base score

  // Penalize very long sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(sentences.length, 1);

  if (avgSentenceLength > 25) score -= 5;
  else if (avgSentenceLength > 20) score -= 2;

  // Penalize jargon-heavy content
  const jargonPatterns = [
    /\b(leverage|synergy|paradigm|holistic|optimize|scalable|robust)\b/gi,
  ];
  const jargonMatches = jargonPatterns.reduce((count, pattern) => {
    const matches = text.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
  score -= Math.min(jargonMatches * 2, 8);

  // Reward simple, direct language
  const simplePatterns = [/\byou\b/gi, /\byour\b/gi, /\bwe\b/gi, /\bour\b/gi];
  const simpleMatches = simplePatterns.reduce((count, pattern) => {
    const matches = text.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
  score += Math.min(simpleMatches, 5);

  return Math.max(0, Math.min(20, score));
}

/**
 * Calculate length penalty for overly verbose content
 */
function calculateLengthPenalty(text: string, features: string[]): number {
  const allContent = [text, ...features].join(' ');
  const wordCount = allContent.split(/\s+/).length;

  // Optimal range: 50-300 words
  if (wordCount < 30) return -5;  // Too short
  if (wordCount > 500) return -10; // Way too long
  if (wordCount > 300) return -5;  // A bit long
  return 0; // Good length
}

/**
 * Estimate human appeal score without LLM
 * Fast, rule-based scoring for generations 1-3
 */
export function estimateHumanScore(variant: VariantContent): EstimatedHumanScore {
  const allText = [
    variant.title || '',
    variant.description || '',
    variant.content || '',
  ].join(' ');

  const features = variant.features || [];

  // Calculate component scores
  const ctaResult = detectCTA(allText);
  const benefitResult = detectBenefits(allText, features);
  const socialProofResult = detectSocialProof(allText, features);
  const clarityScore = calculateClarity(allText);
  const lengthPenalty = calculateLengthPenalty(allText, features);

  // Check for spec-heavy content (reduces appeal)
  const specMatches = SPEC_PATTERNS.filter(pattern => pattern.test(allText));
  const specPenalty = specMatches.length * 3;

  // Calculate breakdown scores (each 0-25)
  const breakdown = {
    clarity: Math.min(25, clarityScore + 5),
    persuasiveness: Math.min(25, ctaResult.strength + benefitResult.score / 2),
    trustworthiness: Math.min(25, socialProofResult.score + 10),
    actionability: Math.min(25, ctaResult.present ? 20 : 10),
  };

  // Calculate total score
  let score = (
    breakdown.clarity +
    breakdown.persuasiveness +
    breakdown.trustworthiness +
    breakdown.actionability
  );

  // Apply penalties
  score += lengthPenalty;
  score -= specPenalty;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Calculate confidence based on content richness
  let confidence: ConfidenceLevel = 'medium';
  if (allText.length < 50 || features.length === 0) {
    confidence = 'low';
  } else if (allText.length > 200 && features.length >= 3) {
    confidence = 'high';
  }

  return {
    score: Math.round(score),
    confidence,
    ctaBonus: ctaResult.strength,
    benefitBonus: benefitResult.score,
    socialProofBonus: socialProofResult.score,
    clarityScore,
    lengthPenalty,
    breakdown,
  };
}
