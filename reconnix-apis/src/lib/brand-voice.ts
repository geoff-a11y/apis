// src/lib/brand-voice.ts — Brand voice extraction and analysis
// Analyzes baseline content to extract voice characteristics for consistent mutations

export interface BrandVoiceProfile {
  // Tone characteristics (0-100)
  formality: number;        // 0=casual, 100=formal
  enthusiasm: number;       // 0=reserved, 100=enthusiastic
  confidence: number;       // 0=tentative, 100=authoritative
  warmth: number;           // 0=distant, 100=friendly

  // Style markers
  usesContractions: boolean;
  usesEmojis: boolean;
  usesExclamations: boolean;
  usesQuestions: boolean;
  usesFirstPerson: boolean;  // "we", "our"
  usesSecondPerson: boolean; // "you", "your"

  // Vocabulary patterns
  avgSentenceLength: number;
  avgWordLength: number;
  vocabularyLevel: 'simple' | 'moderate' | 'technical' | 'sophisticated';

  // Content patterns
  benefitFocused: boolean;   // Emphasizes benefits over features
  socialProofStyle: 'none' | 'subtle' | 'prominent';
  ctaStyle: 'soft' | 'moderate' | 'aggressive';

  // Extracted examples
  samplePhrases: string[];   // Key phrases that capture the voice
  keyTerms: string[];        // Important brand terms to preserve
  avoidTerms: string[];      // Terms that don't fit the voice

  // Raw metrics
  totalWords: number;
  totalSentences: number;
}

export interface BrandVoiceGuidelines {
  summary: string;           // One-paragraph description of the voice
  doList: string[];          // Things to do
  dontList: string[];        // Things to avoid
  examplePhrases: string[];  // Example phrases to emulate
  keyTerms: string[];        // Terms to use
}

export interface VariantContent {
  title?: string;
  description?: string;
  features?: string[];
  content?: string;
}

// ============================================================================
// Voice Analysis Functions
// ============================================================================

/**
 * Count sentences in text
 */
function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return Math.max(1, sentences.length);
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate average word length
 */
function avgWordLength(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  const totalChars = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0);
  return Math.round((totalChars / words.length) * 10) / 10;
}

/**
 * Detect formality level (0-100)
 */
function detectFormality(text: string): number {
  const lower = text.toLowerCase();
  let score = 50;

  // Contractions reduce formality
  const contractions = (lower.match(/\b(won't|can't|don't|isn't|aren't|we're|you're|it's|that's|there's|here's|what's|who's|let's)\b/g) || []).length;
  score -= contractions * 5;

  // Formal words increase formality
  const formalWords = (lower.match(/\b(therefore|consequently|furthermore|moreover|hereby|pursuant|regarding|concerning|respectively)\b/g) || []).length;
  score += formalWords * 10;

  // Casual words reduce formality
  const casualWords = (lower.match(/\b(awesome|cool|great|amazing|super|totally|really|pretty|kinda|gonna|wanna)\b/g) || []).length;
  score -= casualWords * 5;

  // Exclamations reduce formality
  const exclamations = (text.match(/!/g) || []).length;
  score -= exclamations * 3;

  return Math.max(0, Math.min(100, score));
}

/**
 * Detect enthusiasm level (0-100)
 */
function detectEnthusiasm(text: string): number {
  const lower = text.toLowerCase();
  let score = 50;

  // Enthusiastic words
  const enthusiasticWords = (lower.match(/\b(amazing|incredible|fantastic|wonderful|excellent|outstanding|exceptional|remarkable|extraordinary|love|excited|thrilled)\b/g) || []).length;
  score += enthusiasticWords * 8;

  // Exclamation marks
  const exclamations = (text.match(/!/g) || []).length;
  score += exclamations * 5;

  // Superlatives
  const superlatives = (lower.match(/\b(best|greatest|finest|ultimate|perfect|unbeatable|unmatched)\b/g) || []).length;
  score += superlatives * 6;

  // Reserved/neutral language
  const reservedWords = (lower.match(/\b(adequate|satisfactory|sufficient|acceptable|reasonable|standard)\b/g) || []).length;
  score -= reservedWords * 8;

  return Math.max(0, Math.min(100, score));
}

/**
 * Detect confidence level (0-100)
 */
function detectConfidence(text: string): number {
  const lower = text.toLowerCase();
  let score = 50;

  // Confident language
  const confidentWords = (lower.match(/\b(proven|guaranteed|trusted|reliable|established|leading|#1|best-in-class|industry-leading|certified)\b/g) || []).length;
  score += confidentWords * 8;

  // Hedging language reduces confidence
  const hedgingWords = (lower.match(/\b(might|maybe|perhaps|possibly|could|may|sometimes|often|usually|typically|generally)\b/g) || []).length;
  score -= hedgingWords * 6;

  // Definitive statements
  const definitiveWords = (lower.match(/\b(always|never|definitely|certainly|absolutely|guaranteed|ensures|delivers)\b/g) || []).length;
  score += definitiveWords * 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Detect warmth level (0-100)
 */
function detectWarmth(text: string): number {
  const lower = text.toLowerCase();
  let score = 50;

  // Warm/friendly language
  const warmWords = (lower.match(/\b(you|your|we|our|together|help|support|care|family|community|friend|welcome|thank|appreciate)\b/g) || []).length;
  score += warmWords * 3;

  // Personal pronouns indicate warmth
  const personalPronouns = (lower.match(/\b(you|your|yours|we|us|our|ours)\b/g) || []).length;
  score += personalPronouns * 2;

  // Corporate/impersonal language reduces warmth
  const corporateWords = (lower.match(/\b(enterprise|solution|leverage|optimize|utilize|facilitate|implement|stakeholder|synergy)\b/g) || []).length;
  score -= corporateWords * 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine vocabulary level
 */
function detectVocabularyLevel(text: string): 'simple' | 'moderate' | 'technical' | 'sophisticated' {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const avgLen = words.reduce((sum, w) => sum + w.length, 0) / Math.max(1, words.length);

  // Check for technical terms
  const technicalTerms = (text.toLowerCase().match(/\b(algorithm|integration|API|infrastructure|scalable|modular|enterprise|SaaS|ROI|KPI|analytics|optimization)\b/gi) || []).length;

  // Check for sophisticated vocabulary
  const sophisticatedTerms = (text.toLowerCase().match(/\b(meticulous|comprehensive|innovative|revolutionary|transformative|unprecedented|paradigm|bespoke|curated)\b/gi) || []).length;

  if (technicalTerms > 2) return 'technical';
  if (sophisticatedTerms > 2 || avgLen > 6) return 'sophisticated';
  if (avgLen > 5) return 'moderate';
  return 'simple';
}

/**
 * Detect social proof style
 */
function detectSocialProofStyle(text: string): 'none' | 'subtle' | 'prominent' {
  const lower = text.toLowerCase();

  // Prominent social proof
  const prominentPatterns = (lower.match(/\b(\d+[\+,]?\s*(customers|users|companies|businesses|people)|#1|top-rated|best-selling|award-winning|trusted by)\b/gi) || []).length;
  if (prominentPatterns >= 2) return 'prominent';

  // Subtle social proof
  const subtlePatterns = (lower.match(/\b(trusted|reliable|proven|established|respected|recommended)\b/gi) || []).length;
  if (subtlePatterns >= 1 || prominentPatterns >= 1) return 'subtle';

  return 'none';
}

/**
 * Detect CTA style
 */
function detectCTAStyle(text: string): 'soft' | 'moderate' | 'aggressive' {
  const lower = text.toLowerCase();

  // Aggressive CTAs
  const aggressivePatterns = (lower.match(/\b(buy now|order now|act now|don't wait|limited time|hurry|last chance|expires|today only)\b/gi) || []).length;
  if (aggressivePatterns >= 2) return 'aggressive';

  // Moderate CTAs
  const moderatePatterns = (lower.match(/\b(get started|try|learn more|discover|explore|find out|see how|start)\b/gi) || []).length;
  if (moderatePatterns >= 1 || aggressivePatterns >= 1) return 'moderate';

  // Soft CTAs
  const softPatterns = (lower.match(/\b(contact us|reach out|available|inquire)\b/gi) || []).length;
  if (softPatterns >= 1) return 'soft';

  return 'soft';
}

/**
 * Extract key phrases that capture the brand voice
 */
function extractSamplePhrases(content: VariantContent): string[] {
  const allText = [
    content.title || '',
    content.description || '',
    ...(content.features || []),
  ].join(' ');

  const phrases: string[] = [];

  // Extract phrases with strong voice indicators
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 10);

  for (const sentence of sentences.slice(0, 5)) {
    const trimmed = sentence.trim();
    if (trimmed.length > 20 && trimmed.length < 150) {
      phrases.push(trimmed);
    }
  }

  return phrases.slice(0, 5);
}

/**
 * Extract key terms to preserve
 */
function extractKeyTerms(content: VariantContent): string[] {
  const allText = [
    content.title || '',
    content.description || '',
    ...(content.features || []),
  ].join(' ').toLowerCase();

  const terms: string[] = [];

  // Look for capitalized terms (brand names, product names)
  const capitalizedMatches = [
    content.title || '',
    content.description || '',
  ].join(' ').match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  terms.push(...capitalizedMatches.slice(0, 5));

  // Look for specific numerical claims
  const numericalClaims = allText.match(/\d+[\+%]?\s*(?:year|month|day|hour|customer|user|star|rating)/gi) || [];
  terms.push(...numericalClaims.slice(0, 3));

  return [...new Set(terms)].slice(0, 8);
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze baseline content to extract brand voice profile
 */
export function analyzeBrandVoice(content: VariantContent): BrandVoiceProfile {
  const allText = [
    content.title || '',
    content.description || '',
    ...(content.features || []),
    content.content || '',
  ].join(' ');

  const lower = allText.toLowerCase();
  const totalWords = countWords(allText);
  const totalSentences = countSentences(allText);

  return {
    // Tone characteristics
    formality: detectFormality(allText),
    enthusiasm: detectEnthusiasm(allText),
    confidence: detectConfidence(allText),
    warmth: detectWarmth(allText),

    // Style markers
    usesContractions: /\b(won't|can't|don't|isn't|aren't|we're|you're|it's)\b/i.test(allText),
    usesEmojis: /[\u{1F300}-\u{1F9FF}]/u.test(allText),
    usesExclamations: allText.includes('!'),
    usesQuestions: allText.includes('?'),
    usesFirstPerson: /\b(we|our|us)\b/i.test(allText),
    usesSecondPerson: /\b(you|your|yours)\b/i.test(allText),

    // Vocabulary patterns
    avgSentenceLength: Math.round(totalWords / totalSentences),
    avgWordLength: avgWordLength(allText),
    vocabularyLevel: detectVocabularyLevel(allText),

    // Content patterns
    benefitFocused: /\b(save|improve|increase|reduce|help|benefit|gain|achieve)\b/i.test(lower),
    socialProofStyle: detectSocialProofStyle(allText),
    ctaStyle: detectCTAStyle(allText),

    // Extracted examples
    samplePhrases: extractSamplePhrases(content),
    keyTerms: extractKeyTerms(content),
    avoidTerms: [], // Populated if analyzing multiple versions

    // Raw metrics
    totalWords,
    totalSentences,
  };
}

/**
 * Generate human-readable brand voice guidelines from profile
 */
export function generateBrandVoiceGuidelines(profile: BrandVoiceProfile): BrandVoiceGuidelines {
  const doList: string[] = [];
  const dontList: string[] = [];

  // Formality guidelines
  if (profile.formality >= 70) {
    doList.push('Use formal, professional language');
    dontList.push('Avoid slang, contractions, or casual expressions');
  } else if (profile.formality <= 30) {
    doList.push('Keep the tone conversational and approachable');
    doList.push('Use contractions naturally (e.g., "you\'ll", "we\'re")');
    dontList.push('Avoid stiff, corporate jargon');
  } else {
    doList.push('Balance professional tone with approachability');
  }

  // Enthusiasm guidelines
  if (profile.enthusiasm >= 70) {
    doList.push('Express genuine enthusiasm and excitement');
    doList.push('Use energetic language and exclamation points');
  } else if (profile.enthusiasm <= 30) {
    doList.push('Maintain a measured, understated tone');
    dontList.push('Avoid excessive superlatives or exclamation marks');
  }

  // Confidence guidelines
  if (profile.confidence >= 70) {
    doList.push('Make bold, confident claims (backed by facts)');
    doList.push('Use definitive language ("delivers", "guarantees")');
    dontList.push('Avoid hedging words like "might", "possibly", "maybe"');
  } else if (profile.confidence <= 30) {
    doList.push('Use measured, honest language');
    dontList.push('Avoid overclaiming or absolute statements');
  }

  // Warmth guidelines
  if (profile.warmth >= 70) {
    doList.push('Address readers directly using "you" and "your"');
    doList.push('Include "we" and "our" to build connection');
  } else if (profile.warmth <= 30) {
    doList.push('Maintain professional distance');
    dontList.push('Avoid overly familiar language');
  }

  // Person usage
  if (profile.usesSecondPerson) {
    doList.push('Address the reader directly ("you", "your")');
  }
  if (profile.usesFirstPerson) {
    doList.push('Use inclusive language ("we", "our")');
  }

  // Vocabulary level
  if (profile.vocabularyLevel === 'simple') {
    doList.push('Use simple, clear language everyone can understand');
    dontList.push('Avoid technical jargon or complex vocabulary');
  } else if (profile.vocabularyLevel === 'technical') {
    doList.push('Include appropriate technical terminology');
    doList.push('Speak to an informed audience');
  }

  // Sentence length
  if (profile.avgSentenceLength <= 12) {
    doList.push('Keep sentences short and punchy');
  } else if (profile.avgSentenceLength >= 20) {
    doList.push('Use detailed, comprehensive sentences');
  }

  // CTA style
  if (profile.ctaStyle === 'aggressive') {
    doList.push('Include strong, urgent calls-to-action');
  } else if (profile.ctaStyle === 'soft') {
    doList.push('Use gentle, inviting calls-to-action');
    dontList.push('Avoid pushy or urgent language');
  }

  // Social proof
  if (profile.socialProofStyle === 'prominent') {
    doList.push('Highlight customer numbers, ratings, and testimonials');
  } else if (profile.socialProofStyle === 'none') {
    dontList.push('Don\'t add social proof claims not in the original');
  }

  // Key terms
  if (profile.keyTerms.length > 0) {
    doList.push(`Preserve key terms: ${profile.keyTerms.slice(0, 5).join(', ')}`);
  }

  // Generate summary
  const toneWords: string[] = [];
  if (profile.formality >= 60) toneWords.push('professional');
  else if (profile.formality <= 40) toneWords.push('casual');
  if (profile.enthusiasm >= 60) toneWords.push('enthusiastic');
  if (profile.confidence >= 60) toneWords.push('confident');
  if (profile.warmth >= 60) toneWords.push('warm');

  const summary = `The brand voice is ${toneWords.join(', ') || 'balanced'} with ${profile.vocabularyLevel} vocabulary. ` +
    `Sentences average ${profile.avgSentenceLength} words. ` +
    (profile.usesSecondPerson ? 'Addresses readers directly. ' : '') +
    (profile.benefitFocused ? 'Emphasizes benefits over features. ' : '') +
    `CTA style is ${profile.ctaStyle}.`;

  return {
    summary,
    doList: doList.slice(0, 8),
    dontList: dontList.slice(0, 6),
    examplePhrases: profile.samplePhrases,
    keyTerms: profile.keyTerms,
  };
}

/**
 * Format brand voice guidelines for inclusion in LLM prompts
 */
export function formatBrandVoiceForPrompt(guidelines: BrandVoiceGuidelines): string {
  let prompt = `## BRAND VOICE GUIDELINES (CRITICAL - MUST FOLLOW)\n\n`;
  prompt += `${guidelines.summary}\n\n`;

  if (guidelines.doList.length > 0) {
    prompt += `**DO:**\n`;
    for (const item of guidelines.doList) {
      prompt += `- ${item}\n`;
    }
    prompt += '\n';
  }

  if (guidelines.dontList.length > 0) {
    prompt += `**DON'T:**\n`;
    for (const item of guidelines.dontList) {
      prompt += `- ${item}\n`;
    }
    prompt += '\n';
  }

  if (guidelines.examplePhrases.length > 0) {
    prompt += `**EXAMPLE PHRASES TO EMULATE:**\n`;
    for (const phrase of guidelines.examplePhrases.slice(0, 3)) {
      prompt += `- "${phrase}"\n`;
    }
    prompt += '\n';
  }

  if (guidelines.keyTerms.length > 0) {
    prompt += `**KEY TERMS TO PRESERVE:** ${guidelines.keyTerms.join(', ')}\n\n`;
  }

  prompt += `IMPORTANT: The optimized content MUST maintain this exact brand voice. Do not shift to a different tone or style.\n`;

  return prompt;
}

/**
 * Score how well a variant matches the brand voice profile
 */
export function scoreBrandVoiceConsistency(
  variant: VariantContent,
  baseline: BrandVoiceProfile
): { score: number; issues: string[] } {
  const variantProfile = analyzeBrandVoice(variant);
  const issues: string[] = [];
  let score = 100;

  // Compare tone characteristics (each can deduct up to 15 points)
  const formalityDiff = Math.abs(variantProfile.formality - baseline.formality);
  if (formalityDiff > 30) {
    score -= Math.min(15, formalityDiff / 3);
    issues.push(`Formality mismatch (${formalityDiff > 40 ? 'significantly ' : ''}different tone)`);
  }

  const enthusiasmDiff = Math.abs(variantProfile.enthusiasm - baseline.enthusiasm);
  if (enthusiasmDiff > 30) {
    score -= Math.min(15, enthusiasmDiff / 3);
    issues.push(`Enthusiasm level mismatch`);
  }

  const confidenceDiff = Math.abs(variantProfile.confidence - baseline.confidence);
  if (confidenceDiff > 30) {
    score -= Math.min(15, confidenceDiff / 3);
    issues.push(`Confidence level mismatch`);
  }

  const warmthDiff = Math.abs(variantProfile.warmth - baseline.warmth);
  if (warmthDiff > 30) {
    score -= Math.min(15, warmthDiff / 3);
    issues.push(`Warmth level mismatch`);
  }

  // Compare style markers
  if (baseline.usesSecondPerson && !variantProfile.usesSecondPerson) {
    score -= 5;
    issues.push('Missing direct "you/your" address');
  }

  if (baseline.usesFirstPerson && !variantProfile.usesFirstPerson) {
    score -= 5;
    issues.push('Missing "we/our" inclusive language');
  }

  if (!baseline.usesExclamations && variantProfile.usesExclamations) {
    score -= 3;
    issues.push('Added exclamation marks not in original');
  }

  // Vocabulary level mismatch
  if (variantProfile.vocabularyLevel !== baseline.vocabularyLevel) {
    score -= 10;
    issues.push(`Vocabulary shifted from ${baseline.vocabularyLevel} to ${variantProfile.vocabularyLevel}`);
  }

  // CTA style mismatch
  if (baseline.ctaStyle !== variantProfile.ctaStyle) {
    score -= 8;
    issues.push(`CTA style changed from ${baseline.ctaStyle} to ${variantProfile.ctaStyle}`);
  }

  // Social proof style mismatch
  if (baseline.socialProofStyle === 'none' && variantProfile.socialProofStyle !== 'none') {
    score -= 5;
    issues.push('Added social proof not in original');
  }

  return {
    score: Math.max(0, Math.round(score)),
    issues,
  };
}

/**
 * Quick brand voice check for fast scoring
 */
export function quickBrandVoiceCheck(
  variant: VariantContent,
  baseline: VariantContent
): { consistent: boolean; majorIssues: string[] } {
  const baselineProfile = analyzeBrandVoice(baseline);
  const result = scoreBrandVoiceConsistency(variant, baselineProfile);

  return {
    consistent: result.score >= 70,
    majorIssues: result.issues.slice(0, 3),
  };
}
