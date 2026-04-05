// src/lib/pareto-explainer.ts — Plain-English explanations for Pareto trade-offs
// Generates human-readable descriptions of what each variant offers

import { ParetoScores, NicknameType, getDominantDimension, calculateDistance } from './pareto';

export interface BaselineScores {
  ai?: number;
  seo?: number;
  human?: number;
}

export interface ExplainableVariant extends ParetoScores {
  id: string;
  nickname?: NicknameType;
  recommended?: boolean;
}

export interface TradeoffExplanation {
  summary: string;           // One-sentence summary
  strengths: string[];       // What this variant excels at
  tradeoffs: string[];       // What you give up compared to alternatives
  vsBaseline?: string;       // Improvement over baseline
  recommendation?: string;   // Why or why not to choose this variant
}

/**
 * Format a score delta for display
 */
function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

/**
 * Get a descriptive word for a score level
 */
function scoreLevel(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'strong';
  if (score >= 70) return 'good';
  if (score >= 60) return 'moderate';
  if (score >= 50) return 'fair';
  return 'weak';
}

/**
 * Get dimension display name
 */
function dimensionName(dim: 'ai' | 'seo' | 'human'): string {
  switch (dim) {
    case 'ai': return 'AI recommendation';
    case 'seo': return 'SEO';
    case 'human': return 'human appeal';
  }
}

/**
 * Generate a trade-off explanation for a variant
 */
export function explainTradeoff(
  variant: ExplainableVariant,
  alternatives: ExplainableVariant[],
  baseline: BaselineScores
): string {
  const parts: string[] = [];

  // Describe the variant's strengths
  const dominant = getDominantDimension(variant);
  const dominantScore = variant[dominant];

  if (variant.nickname === 'AI Champion') {
    parts.push(`This variant has the strongest AI recommendation score (${variant.ai}).`);
  } else if (variant.nickname === 'SEO Specialist') {
    parts.push(`This variant scores highest for SEO performance (${variant.seo}).`);
  } else if (variant.nickname === 'Human Touch') {
    parts.push(`This variant has the best human appeal score (${variant.human}).`);
  } else if (variant.nickname === 'Balanced Winner') {
    parts.push(`This variant offers the best balance across all three dimensions.`);
  } else {
    parts.push(`This variant has ${scoreLevel(dominantScore)} ${dimensionName(dominant)} (${dominantScore}).`);
  }

  // Compare to alternatives
  if (alternatives.length > 0) {
    const tradeoffs: string[] = [];

    for (const alt of alternatives) {
      // Find where alternative is better
      const altBetterIn: string[] = [];
      if (alt.ai > variant.ai + 5) {
        altBetterIn.push(`AI (+${alt.ai - variant.ai})`);
      }
      if (alt.seo > variant.seo + 5) {
        altBetterIn.push(`SEO (+${alt.seo - variant.seo})`);
      }
      if (alt.human > variant.human + 5) {
        altBetterIn.push(`human appeal (+${alt.human - variant.human})`);
      }

      if (altBetterIn.length > 0) {
        const altName = alt.nickname || `Variant ${alt.id}`;
        tradeoffs.push(`${altName} offers better ${altBetterIn.join(' and ')}`);
      }
    }

    if (tradeoffs.length > 0) {
      parts.push(`Trade-off: ${tradeoffs.slice(0, 2).join('; ')}.`);
    }
  }

  // Compare to baseline
  if (baseline.ai !== undefined || baseline.seo !== undefined || baseline.human !== undefined) {
    const improvements: string[] = [];

    if (baseline.ai !== undefined) {
      const aiDelta = variant.ai - baseline.ai;
      if (aiDelta !== 0) {
        improvements.push(`AI ${formatDelta(aiDelta)}`);
      }
    }
    if (baseline.seo !== undefined) {
      const seoDelta = variant.seo - baseline.seo;
      if (seoDelta !== 0) {
        improvements.push(`SEO ${formatDelta(seoDelta)}`);
      }
    }
    if (baseline.human !== undefined) {
      const humanDelta = variant.human - baseline.human;
      if (humanDelta !== 0) {
        improvements.push(`human ${formatDelta(humanDelta)}`);
      }
    }

    if (improvements.length > 0) {
      parts.push(`Compared to baseline: ${improvements.join(', ')}.`);
    }
  }

  return parts.join(' ');
}

/**
 * Generate a detailed trade-off explanation
 */
export function explainTradeoffDetailed(
  variant: ExplainableVariant,
  alternatives: ExplainableVariant[],
  baseline: BaselineScores
): TradeoffExplanation {
  const strengths: string[] = [];
  const tradeoffs: string[] = [];

  // Identify strengths
  if (variant.ai >= 80) {
    strengths.push(`Excellent AI recommendation score (${variant.ai})`);
  } else if (variant.ai >= 70) {
    strengths.push(`Good AI recommendation score (${variant.ai})`);
  }

  if (variant.seo >= 80) {
    strengths.push(`Excellent SEO performance (${variant.seo})`);
  } else if (variant.seo >= 70) {
    strengths.push(`Good SEO performance (${variant.seo})`);
  }

  if (variant.human >= 80) {
    strengths.push(`Excellent human appeal (${variant.human})`);
  } else if (variant.human >= 70) {
    strengths.push(`Good human appeal (${variant.human})`);
  }

  // If no clear strengths, mention the dominant dimension
  if (strengths.length === 0) {
    const dominant = getDominantDimension(variant);
    strengths.push(`Strongest in ${dimensionName(dominant)} (${variant[dominant]})`);
  }

  // Identify trade-offs compared to alternatives
  for (const alt of alternatives) {
    if (alt.ai > variant.ai + 10) {
      tradeoffs.push(`Lower AI score than ${alt.nickname || 'another variant'} (${variant.ai} vs ${alt.ai})`);
    }
    if (alt.seo > variant.seo + 10) {
      tradeoffs.push(`Lower SEO score than ${alt.nickname || 'another variant'} (${variant.seo} vs ${alt.seo})`);
    }
    if (alt.human > variant.human + 10) {
      tradeoffs.push(`Lower human appeal than ${alt.nickname || 'another variant'} (${variant.human} vs ${alt.human})`);
    }
  }

  // Baseline comparison
  let vsBaseline: string | undefined;
  if (baseline.ai !== undefined && baseline.seo !== undefined && baseline.human !== undefined) {
    const totalImprovement =
      (variant.ai - baseline.ai) +
      (variant.seo - baseline.seo) +
      (variant.human - baseline.human);

    if (totalImprovement > 0) {
      vsBaseline = `Overall improvement of ${formatDelta(totalImprovement)} points over baseline`;
    } else if (totalImprovement < 0) {
      vsBaseline = `Regression of ${totalImprovement} points from baseline`;
    } else {
      vsBaseline = 'No change from baseline';
    }
  }

  // Summary based on nickname
  let summary: string;
  if (variant.nickname === 'AI Champion') {
    summary = 'Best choice for AI-assisted discovery and recommendations';
  } else if (variant.nickname === 'SEO Specialist') {
    summary = 'Best choice for search engine visibility and rankings';
  } else if (variant.nickname === 'Human Touch') {
    summary = 'Best choice for direct human visitors and conversion';
  } else if (variant.nickname === 'Balanced Winner') {
    summary = 'Recommended: Best overall balance across all dimensions';
  } else {
    const dominant = getDominantDimension(variant);
    summary = `Variant with ${scoreLevel(variant[dominant])} ${dimensionName(dominant)}`;
  }

  // Recommendation
  let recommendation: string | undefined;
  if (variant.recommended) {
    recommendation = 'RECOMMENDED: This variant offers the best overall balance without sacrificing too much in any dimension.';
  } else if (variant.nickname === 'AI Champion') {
    recommendation = 'Choose this if AI-assisted shopping and chatbot recommendations are your priority.';
  } else if (variant.nickname === 'SEO Specialist') {
    recommendation = 'Choose this if search engine rankings and organic traffic are your priority.';
  } else if (variant.nickname === 'Human Touch') {
    recommendation = 'Choose this if direct website conversion and user experience are your priority.';
  }

  return {
    summary,
    strengths,
    tradeoffs: tradeoffs.slice(0, 3), // Limit to top 3 trade-offs
    vsBaseline,
    recommendation,
  };
}

/**
 * Generate a comparison table as text
 */
export function generateComparisonSummary(
  variants: ExplainableVariant[],
  baseline?: BaselineScores
): string {
  const lines: string[] = [];

  lines.push('=== Pareto Frontier Variants ===');
  lines.push('');

  for (const variant of variants) {
    const marker = variant.recommended ? '★ ' : '  ';
    const nick = variant.nickname ? `[${variant.nickname}]` : '';
    lines.push(`${marker}${nick}`);
    lines.push(`   AI: ${variant.ai}  SEO: ${variant.seo}  Human: ${variant.human}`);

    if (baseline) {
      const deltas: string[] = [];
      if (baseline.ai !== undefined) {
        deltas.push(`AI ${formatDelta(variant.ai - baseline.ai)}`);
      }
      if (baseline.seo !== undefined) {
        deltas.push(`SEO ${formatDelta(variant.seo - baseline.seo)}`);
      }
      if (baseline.human !== undefined) {
        deltas.push(`Human ${formatDelta(variant.human - baseline.human)}`);
      }
      if (deltas.length > 0) {
        lines.push(`   vs baseline: ${deltas.join(', ')}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get a short one-line description of a variant
 */
export function getShortDescription(variant: ExplainableVariant): string {
  if (variant.nickname) {
    switch (variant.nickname) {
      case 'AI Champion':
        return `Best for AI (${variant.ai})`;
      case 'SEO Specialist':
        return `Best for SEO (${variant.seo})`;
      case 'Human Touch':
        return `Best for humans (${variant.human})`;
      case 'Balanced Winner':
        return `Most balanced (AI ${variant.ai}, SEO ${variant.seo}, Human ${variant.human})`;
    }
  }

  const total = variant.ai + variant.seo + variant.human;
  return `Total: ${total} (AI ${variant.ai}, SEO ${variant.seo}, Human ${variant.human})`;
}

/**
 * Explain why a variant is on the Pareto frontier
 */
export function explainFrontierMembership(
  variant: ExplainableVariant,
  frontier: ExplainableVariant[]
): string {
  // Find what this variant is best at
  const isMaxAi = variant.ai === Math.max(...frontier.map(v => v.ai));
  const isMaxSeo = variant.seo === Math.max(...frontier.map(v => v.seo));
  const isMaxHuman = variant.human === Math.max(...frontier.map(v => v.human));

  const bests: string[] = [];
  if (isMaxAi) bests.push('AI recommendation');
  if (isMaxSeo) bests.push('SEO');
  if (isMaxHuman) bests.push('human appeal');

  if (bests.length > 0) {
    return `This variant is on the frontier because it has the highest ${bests.join(' and ')} score.`;
  }

  // If not max in any single dimension, explain the trade-off
  return `This variant is on the frontier because no other variant is better in ALL three dimensions simultaneously.`;
}
