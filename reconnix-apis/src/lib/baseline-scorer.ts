// src/lib/baseline-scorer.ts — Analyze original page content and calculate baseline scores
// Used to show improvement deltas throughout the optimization process

import { calculateSEOScore, SEOScore, VariantContent as SEOVariantContent } from './seo-judge';
import { estimateHumanScore, EstimatedHumanScore } from './human-estimator';

export interface BaselineIssue {
  category: 'ai' | 'seo' | 'human';
  severity: 'critical' | 'major' | 'minor';
  message: string;
  field?: string;
}

export interface ImprovementPotential {
  ai: number;      // Estimated room for improvement (0-100)
  seo: number;
  human: number;
  total: number;
}

export interface BaselineScore {
  aiScore: number;      // 0-100
  seoScore: number;     // 0-100
  humanScore: number;   // 0-100
  totalScore: number;   // Weighted average
  issues: BaselineIssue[];
  improvementPotential: ImprovementPotential;
  seoBreakdown: SEOScore;
  humanBreakdown: EstimatedHumanScore;
  keyword: string;
  analyzedAt: string;
}

export interface DeltaColors {
  ai: 'green' | 'red' | 'neutral';
  seo: 'green' | 'red' | 'neutral';
  human: 'green' | 'red' | 'neutral';
  total: 'green' | 'red' | 'neutral';
}

export interface FormattedDelta {
  ai: string;       // e.g., "+20" or "-5"
  seo: string;
  human: string;
  total: string;
}

export interface DeltaScore {
  ai: number;
  seo: number;
  human: number;
  total: number;
  isRegression: boolean;
  formatted: FormattedDelta;
  colors: DeltaColors;
}

export interface VariantScores {
  aiScore: number;
  seoScore: number;
  humanScore: number;
}

export interface OriginalContent {
  title?: string;
  description?: string;
  features?: string[];
  content?: string;
  schema?: Record<string, unknown>;
  headings?: Array<{ level: number; text: string }>;
}

/**
 * Calculate AI score based on behavioral genome signals
 * This is a simplified version - full implementation would use model-weights.ts
 */
function calculateAIScore(content: OriginalContent): number {
  let score = 50; // Base score

  const allText = [
    content.title || '',
    content.description || '',
    ...(content.features || []),
    content.content || '',
  ].join(' ').toLowerCase();

  // Positive signals (simplified - full version uses 26 dimensions)
  if (/warranty|guarantee/.test(allText)) score += 8;
  if (/return|refund/.test(allText)) score += 6;
  if (/\d+\s*year|\d+\s*month/.test(allText)) score += 4;
  if (/free shipping|fast delivery/.test(allText)) score += 5;
  if (/review|rating|star/.test(allText)) score += 6;
  if (/award|certified|verified/.test(allText)) score += 5;
  if (/sustainable|eco|green/.test(allText)) score += 3;
  if (/trusted|reliable|proven/.test(allText)) score += 4;
  if (/save|discount|deal/.test(allText)) score += 3;
  if (content.schema && Object.keys(content.schema).length > 0) score += 5;

  // Negative signals
  if (allText.length < 100) score -= 10;
  if (!(content.features && content.features.length >= 3)) score -= 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Extract issues from SEO analysis
 */
function extractSEOIssues(seoResult: SEOScore): BaselineIssue[] {
  const issues: BaselineIssue[] = [];

  // Hard fails are critical
  for (const fail of seoResult.hardFails) {
    issues.push({
      category: 'seo',
      severity: 'critical',
      message: `SEO hard fail: ${fail.replace(/_/g, ' ')}`,
      field: fail,
    });
  }

  // Soft fails are major
  for (const fail of seoResult.softFails) {
    issues.push({
      category: 'seo',
      severity: 'major',
      message: `SEO issue: ${fail.replace(/_/g, ' ')}`,
      field: fail,
    });
  }

  // Low component scores
  if (seoResult.breakdown.title.score < 6) {
    issues.push({
      category: 'seo',
      severity: 'major',
      message: 'Title needs optimization',
      field: 'title',
    });
  }

  if (seoResult.breakdown.description.score < 5) {
    issues.push({
      category: 'seo',
      severity: 'major',
      message: 'Description needs improvement',
      field: 'description',
    });
  }

  if (seoResult.breakdown.readability.gradeLevel > 10) {
    issues.push({
      category: 'seo',
      severity: 'minor',
      message: 'Content readability could be improved',
      field: 'readability',
    });
  }

  return issues;
}

/**
 * Extract issues from Human score analysis
 */
function extractHumanIssues(humanResult: EstimatedHumanScore): BaselineIssue[] {
  const issues: BaselineIssue[] = [];

  if (humanResult.ctaBonus === 0) {
    issues.push({
      category: 'human',
      severity: 'major',
      message: 'No clear call-to-action detected',
      field: 'cta',
    });
  }

  if (humanResult.socialProofBonus === 0) {
    issues.push({
      category: 'human',
      severity: 'minor',
      message: 'No social proof indicators found',
      field: 'social_proof',
    });
  }

  if (humanResult.benefitBonus < 5) {
    issues.push({
      category: 'human',
      severity: 'minor',
      message: 'Content is feature-focused rather than benefit-focused',
      field: 'benefits',
    });
  }

  if (humanResult.lengthPenalty < 0) {
    issues.push({
      category: 'human',
      severity: 'minor',
      message: 'Content length not optimal',
      field: 'length',
    });
  }

  return issues;
}

/**
 * Extract AI-related issues
 */
function extractAIIssues(content: OriginalContent, aiScore: number): BaselineIssue[] {
  const issues: BaselineIssue[] = [];

  const allText = [
    content.title || '',
    content.description || '',
    ...(content.features || []),
  ].join(' ').toLowerCase();

  if (aiScore < 40) {
    issues.push({
      category: 'ai',
      severity: 'major',
      message: 'Low AI recommendation potential - missing key signals',
    });
  }

  if (!content.schema || Object.keys(content.schema).length === 0) {
    issues.push({
      category: 'ai',
      severity: 'minor',
      message: 'No structured data (Schema.org) detected',
      field: 'schema',
    });
  }

  if (!/warranty|guarantee/.test(allText)) {
    issues.push({
      category: 'ai',
      severity: 'minor',
      message: 'No warranty/guarantee information found',
      field: 'warranty',
    });
  }

  return issues;
}

/**
 * Calculate improvement potential based on current scores
 */
function calculateImprovementPotential(
  aiScore: number,
  seoScore: number,
  humanScore: number
): ImprovementPotential {
  return {
    ai: 100 - aiScore,
    seo: 100 - seoScore,
    human: 100 - humanScore,
    total: Math.round(((100 - aiScore) + (100 - seoScore) + (100 - humanScore)) / 3),
  };
}

/**
 * Analyze baseline content and return comprehensive scores
 */
export function analyzeBaseline(
  content: OriginalContent,
  keyword: string = 'product'
): BaselineScore {
  // Calculate SEO score using the SEO Judge
  const seoResult = calculateSEOScore(content as SEOVariantContent, keyword);

  // Calculate Human appeal score using the estimator
  const humanResult = estimateHumanScore(content);

  // Calculate AI recommendation score
  const aiScore = calculateAIScore(content);

  // Extract issues from all analyses
  const issues: BaselineIssue[] = [
    ...extractAIIssues(content, aiScore),
    ...extractSEOIssues(seoResult),
    ...extractHumanIssues(humanResult),
  ];

  // Calculate improvement potential
  const improvementPotential = calculateImprovementPotential(
    aiScore,
    seoResult.total,
    humanResult.score
  );

  // Calculate weighted total (equal weights for now)
  const totalScore = Math.round((aiScore + seoResult.total + humanResult.score) / 3);

  return {
    aiScore,
    seoScore: seoResult.total,
    humanScore: humanResult.score,
    totalScore,
    issues,
    improvementPotential,
    seoBreakdown: seoResult,
    humanBreakdown: humanResult,
    keyword,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Format a delta value for display
 */
function formatDeltaValue(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

/**
 * Get color for a delta value
 */
function getDeltaColor(delta: number): 'green' | 'red' | 'neutral' {
  if (delta > 0) return 'green';
  if (delta < 0) return 'red';
  return 'neutral';
}

/**
 * Calculate delta between variant and baseline scores
 */
export function calculateDelta(
  variant: VariantScores,
  baseline: VariantScores
): DeltaScore {
  const aiDelta = Math.round(variant.aiScore - baseline.aiScore);
  const seoDelta = Math.round(variant.seoScore - baseline.seoScore);
  const humanDelta = Math.round(variant.humanScore - baseline.humanScore);
  const totalDelta = aiDelta + seoDelta + humanDelta;

  const isRegression = aiDelta < 0 || seoDelta < 0 || humanDelta < 0;

  return {
    ai: aiDelta,
    seo: seoDelta,
    human: humanDelta,
    total: totalDelta,
    isRegression,
    formatted: {
      ai: formatDeltaValue(aiDelta),
      seo: formatDeltaValue(seoDelta),
      human: formatDeltaValue(humanDelta),
      total: formatDeltaValue(totalDelta),
    },
    colors: {
      ai: getDeltaColor(aiDelta),
      seo: getDeltaColor(seoDelta),
      human: getDeltaColor(humanDelta),
      total: getDeltaColor(totalDelta),
    },
  };
}

/**
 * Create a display-friendly baseline summary
 */
export function getBaselineSummary(baseline: BaselineScore): string {
  const criticalCount = baseline.issues.filter(i => i.severity === 'critical').length;
  const majorCount = baseline.issues.filter(i => i.severity === 'major').length;

  let summary = `Current scores: AI ${baseline.aiScore}, SEO ${baseline.seoScore}, Human ${baseline.humanScore}. `;

  if (criticalCount > 0) {
    summary += `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} found. `;
  }
  if (majorCount > 0) {
    summary += `${majorCount} major improvement${majorCount > 1 ? 's' : ''} possible. `;
  }

  summary += `Total improvement potential: ${baseline.improvementPotential.total} points.`;

  return summary;
}
