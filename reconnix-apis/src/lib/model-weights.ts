// src/lib/model-weights.ts — Use case weightings for different business contexts

import { UseCase, UseCaseWeights } from './types';

export const USE_CASE_WEIGHTS: Record<UseCase, UseCaseWeights> = {
  b2c_consumer: {
    id: 'b2c_consumer',
    name: 'B2C Consumer',
    description: 'Consumers using AI assistants for shopping advice (ChatGPT, Claude, Google Assistant)',
    model_weights: {
      gpt54: 0.35,   // ChatGPT dominates consumer usage
      claude: 0.20,  // Growing consumer adoption via Claude.ai
      gemini: 0.20,  // Google Assistant / Bard integration
      sonar: 0.15,   // Perplexity shopping searches
      llama: 0.05,   // Meta AI in WhatsApp/Instagram
      o3: 0.05,      // Power users with reasoning needs
    },
  },

  b2b_enterprise: {
    id: 'b2b_enterprise',
    name: 'B2B Enterprise',
    description: 'Business buyers using AI for procurement decisions and vendor evaluation',
    model_weights: {
      claude: 0.35,  // Enterprise Claude adoption (Anthropic partnerships)
      gpt54: 0.30,   // Enterprise ChatGPT / API integrations
      gemini: 0.20,  // Google Workspace AI integration
      o3: 0.10,      // Complex procurement analysis
      sonar: 0.03,   // Research queries
      llama: 0.02,   // Internal deployments
    },
  },

  ecommerce_search: {
    id: 'ecommerce_search',
    name: 'E-commerce Search',
    description: 'AI-powered product search and discovery on shopping platforms',
    model_weights: {
      sonar: 0.30,   // Perplexity shopping is growing fast
      gemini: 0.25,  // Google Shopping AI
      gpt54: 0.25,   // ChatGPT plugins / shopping features
      claude: 0.15,  // Claude shopping queries
      llama: 0.03,   // Meta shopping integration
      o3: 0.02,      // Minimal shopping use
    },
  },
};

/**
 * Calculate weighted score for a use case
 */
export function calculateWeightedScore(
  modelDistribution: Record<string, number>,
  useCase: UseCase
): number {
  const weights = USE_CASE_WEIGHTS[useCase].model_weights;
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [modelId, score] of Object.entries(modelDistribution)) {
    const weight = weights[modelId] || 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Get model contribution breakdown for display
 */
export function getModelContributions(
  modelDistribution: Record<string, number>,
  useCase: UseCase
): Array<{
  modelId: string;
  modelName: string;
  score: number;
  weight: number;
  contribution: number;
}> {
  const weights = USE_CASE_WEIGHTS[useCase].model_weights;

  const MODEL_NAMES: Record<string, string> = {
    gpt54: 'GPT-5.4',
    gpt52: 'GPT-5.2',
    gpt53: 'GPT-5.3',
    o3: 'o3',
    gemini: 'Gemini 3.1',
    claude: 'Claude 4.6',
    llama: 'Llama 4',
    sonar: 'Sonar Pro',
  };

  const contributions = Object.entries(modelDistribution).map(([modelId, score]) => {
    const weight = weights[modelId] || 0;
    return {
      modelId,
      modelName: MODEL_NAMES[modelId] || modelId,
      score: Math.round(score),
      weight: weight * 100, // Convert to percentage
      contribution: score * weight,
    };
  });

  // Sort by weight (highest first)
  return contributions.sort((a, b) => b.weight - a.weight);
}

/**
 * Find the models with highest and lowest scores
 */
export function getScoreExtremes(
  modelDistribution: Record<string, number>
): { highest: { modelId: string; score: number }; lowest: { modelId: string; score: number }; range: number } {
  const entries = Object.entries(modelDistribution);

  let highest = { modelId: '', score: -Infinity };
  let lowest = { modelId: '', score: Infinity };

  for (const [modelId, score] of entries) {
    if (score > highest.score) {
      highest = { modelId, score };
    }
    if (score < lowest.score) {
      lowest = { modelId, score };
    }
  }

  return {
    highest,
    lowest,
    range: highest.score - lowest.score,
  };
}

/**
 * Generate model distribution from signal inventory using empirical effect sizes
 * This provides estimated per-model scores based on our research findings
 */
export function generateModelDistribution(
  signalInventory: Array<{ dimension_id: string; score: number }>,
  universalScore: number
): Record<string, number> {
  // Model-specific effect size multipliers based on our research
  // These reflect how much each model deviates from average on key dimensions
  const MODEL_SENSITIVITIES: Record<string, Record<string, number>> = {
    gpt54: {
      dim_01: 1.15, // Third party authority - more sensitive
      dim_02: 1.10, // Social proof - slightly more
      dim_09: 0.95, // Sustainability - slightly less
      dim_14: 1.20, // Warranty - much more sensitive
      dim_18: 1.25, // Precision - highly values specificity
      dim_19: 1.30, // Comparative claims - very responsive
      dim_25: 1.15, // Default selection - more sensitive
    },
    gpt52: {
      // GPT-5.2 - earlier version, less refined sensitivities
      dim_01: 1.10, // Third party authority - moderately sensitive
      dim_02: 1.15, // Social proof - slightly more than 5.4
      dim_09: 0.90, // Sustainability - less sensitive
      dim_14: 1.15, // Warranty - moderately sensitive
      dim_18: 1.15, // Precision - values specificity
      dim_19: 1.20, // Comparative claims - responsive
      dim_25: 1.20, // Default selection - more sensitive than 5.4
    },
    gpt53: {
      // GPT-5.3 - transitional, temperature=1.0 leads to more variance
      dim_01: 1.12, // Third party authority - moderately sensitive
      dim_02: 1.08, // Social proof - slightly less than 5.2
      dim_09: 0.92, // Sustainability - moderately less
      dim_14: 1.18, // Warranty - growing sensitivity
      dim_18: 1.22, // Precision - increasing specificity focus
      dim_19: 1.28, // Comparative claims - high responsiveness
      dim_25: 1.18, // Default selection - moderate sensitivity
    },
    claude: {
      dim_01: 1.10, // Third party authority
      dim_09: 1.25, // Sustainability - much more sensitive
      dim_10: 1.20, // Privacy - more sensitive
      dim_16: 1.15, // Negative reviews - values transparency
      dim_21: 0.90, // Hedging - less bothered by uncertainty
      dim_23: 1.20, // Epistemic humility - values this
      dim_24: 1.30, // Ethical practices - highly values
    },
    gemini: {
      dim_02: 1.15, // Social proof - more sensitive
      dim_05: 1.20, // Price comparison - highly values
      dim_12: 1.10, // Novelty - slightly more
      dim_17: 1.25, // Recency - much more sensitive to updates
      dim_18: 1.15, // Precision - values detail
      dim_20: 1.20, // Information availability - highly values
    },
    sonar: {
      dim_01: 1.20, // Third party authority - citation-focused
      dim_17: 1.30, // Recency - very sensitive to freshness
      dim_18: 1.20, // Precision - values specificity
      dim_19: 1.25, // Comparative claims - likes comparisons
      dim_20: 1.35, // Information availability - highly values
    },
    llama: {
      dim_02: 1.10, // Social proof
      dim_04: 1.15, // Scarcity - slightly more sensitive
      dim_06: 1.05, // Heritage
      dim_13: 1.15, // Reliability
      dim_14: 1.10, // Warranty
    },
    o3: {
      dim_18: 1.40, // Precision - extremely values detail
      dim_19: 1.35, // Comparative claims - loves analysis
      dim_21: 0.80, // Hedging - less tolerant
      dim_22: 1.30, // Benefit-cost tradeoffs - highly values
      dim_23: 1.25, // Epistemic humility
    },
  };

  const distribution: Record<string, number> = {};

  // Calculate per-model scores based on signal inventory and sensitivities
  for (const modelId of Object.keys(MODEL_SENSITIVITIES)) {
    const sensitivities = MODEL_SENSITIVITIES[modelId];
    let totalAdjustment = 0;
    let adjustmentCount = 0;

    for (const signal of signalInventory) {
      const sensitivity = sensitivities[signal.dimension_id] || 1.0;
      // Calculate deviation from neutral sensitivity (1.0)
      const deviation = sensitivity - 1.0;
      // Weighted by signal score (stronger signals have more impact)
      totalAdjustment += deviation * signal.score * 100;
      adjustmentCount++;
    }

    // Apply adjustment to universal score
    const avgAdjustment = adjustmentCount > 0 ? totalAdjustment / adjustmentCount : 0;
    let modelScore = universalScore + avgAdjustment;

    // Add some natural variance between models (±5-10 points)
    const modelVariance: Record<string, number> = {
      gpt54: 3,
      gpt52: 1,   // Slightly lower than 5.4
      gpt53: 2,   // Between 5.2 and 5.4
      claude: -2,
      gemini: 1,
      sonar: -4,
      llama: 5,
      o3: -3,
    };
    modelScore += modelVariance[modelId] || 0;

    // Clamp to 0-100 range
    distribution[modelId] = Math.max(0, Math.min(100, Math.round(modelScore)));
  }

  return distribution;
}
