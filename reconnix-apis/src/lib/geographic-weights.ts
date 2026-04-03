// src/lib/geographic-weights.ts — Geographic market weightings for unified optimization

import { GeographicMarket, GeographicWeights, UnifiedScoreResult, ModelBreakdownItem } from './types';

/**
 * Geographic market weights based on estimated AI adoption patterns.
 *
 * Sources for estimates:
 * - SimilarWeb traffic data for ChatGPT, Claude, Bard by region
 * - Anthropic/OpenAI enterprise partnership announcements
 * - Google Workspace AI rollout regions
 * - Meta AI availability by country
 *
 * B2B vs B2C splits estimated from:
 * - API vs consumer product usage ratios
 * - Enterprise partnership disclosures
 * - Regional tech stack preferences
 */
export const GEOGRAPHIC_WEIGHTS: Record<GeographicMarket, GeographicWeights> = {
  us_b2b: {
    id: 'us_b2b',
    name: 'United States - B2B',
    description: 'US enterprise and business buyers',
    model_weights: {
      gpt54: 0.30,   // Strong enterprise ChatGPT/API adoption
      claude: 0.30,  // Anthropic has strong US enterprise presence
      gemini: 0.15,  // Google Workspace integration
      o3: 0.12,      // Power users for complex procurement
      sonar: 0.08,   // Research-focused queries
      llama: 0.05,   // Internal enterprise deployments
    },
  },

  us_b2c: {
    id: 'us_b2c',
    name: 'United States - B2C',
    description: 'US consumer shoppers',
    model_weights: {
      gpt54: 0.40,   // ChatGPT dominates US consumer AI
      claude: 0.18,  // Growing Claude.ai consumer usage
      gemini: 0.18,  // Google Assistant / Bard
      sonar: 0.12,   // Perplexity shopping searches growing
      llama: 0.07,   // Meta AI in WhatsApp/Instagram
      o3: 0.05,      // Minimal consumer usage
    },
  },

  eu_b2b: {
    id: 'eu_b2b',
    name: 'Europe - B2B',
    description: 'European enterprise and business buyers',
    model_weights: {
      claude: 0.32,  // Strong EU enterprise adoption (GDPR compliance)
      gpt54: 0.28,   // OpenAI EU presence
      gemini: 0.20,  // Google Workspace strong in EU
      o3: 0.10,      // Technical buyers
      sonar: 0.06,   // Research queries
      llama: 0.04,   // Open source preference in some markets
    },
  },

  eu_b2c: {
    id: 'eu_b2c',
    name: 'Europe - B2C',
    description: 'European consumer shoppers',
    model_weights: {
      gemini: 0.30,  // Google dominant in EU consumer
      gpt54: 0.28,   // ChatGPT popular but less than US
      claude: 0.18,  // Growing presence
      sonar: 0.12,   // Perplexity growing in EU
      llama: 0.08,   // Meta platforms significant
      o3: 0.04,      // Minimal consumer
    },
  },

  apac_b2b: {
    id: 'apac_b2b',
    name: 'Asia Pacific - B2B',
    description: 'APAC enterprise and business buyers',
    model_weights: {
      gpt54: 0.32,   // Strong in Japan, Australia, Singapore
      gemini: 0.25,  // Google strong presence in APAC
      claude: 0.20,  // Growing enterprise adoption
      llama: 0.12,   // Open source popular in some markets
      o3: 0.07,      // Technical buyers
      sonar: 0.04,   // Limited APAC presence
    },
  },

  apac_b2c: {
    id: 'apac_b2c',
    name: 'Asia Pacific - B2C',
    description: 'APAC consumer shoppers',
    model_weights: {
      gemini: 0.32,  // Google dominant (Android market share)
      gpt54: 0.28,   // ChatGPT popular
      llama: 0.18,   // Meta platforms huge in APAC
      claude: 0.12,  // Growing
      sonar: 0.06,   // Limited presence
      o3: 0.04,      // Minimal
    },
  },

  global_balanced: {
    id: 'global_balanced',
    name: 'Global Balanced',
    description: 'Weighted average across all markets',
    model_weights: {
      gpt54: 0.28,   // Globally dominant
      gemini: 0.22,  // Strong Google presence worldwide
      claude: 0.22,  // Growing enterprise and consumer
      sonar: 0.12,   // Research-focused users
      llama: 0.10,   // Meta platforms + open source
      o3: 0.06,      // Niche power users
    },
  },
};

/**
 * Use case context weights for B2B vs B2C optimization.
 * These blend with geographic weights.
 */
export const USE_CASE_CONTEXT_WEIGHTS: Record<'b2b' | 'b2c', GeographicWeights> = {
  b2b: {
    id: 'b2b_context',
    name: 'B2B Context',
    description: 'Business-to-business purchase decisions',
    model_weights: {
      claude: 0.30,  // Enterprise focus, detailed analysis
      gpt54: 0.28,   // Business ChatGPT adoption
      gemini: 0.18,  // Workspace integration
      o3: 0.12,      // Complex procurement reasoning
      sonar: 0.08,   // Research and comparison
      llama: 0.04,   // Internal tools
    },
  },
  b2c: {
    id: 'b2c_context',
    name: 'B2C Context',
    description: 'Business-to-consumer shopping',
    model_weights: {
      gpt54: 0.35,   // Consumer ChatGPT dominance
      gemini: 0.25,  // Google shopping assistant
      claude: 0.15,  // Claude.ai shoppers
      sonar: 0.12,   // Perplexity shopping
      llama: 0.08,   // Meta shopping
      o3: 0.05,      // Power users only
    },
  },
};

/**
 * Model display names for UI
 */
export const MODEL_NAMES: Record<string, string> = {
  gpt54: 'GPT-5.4',
  gpt52: 'GPT-5.2',
  gpt53: 'GPT-5.3',
  o3: 'o3',
  gemini: 'Gemini 3.1',
  claude: 'Claude 4.6',
  llama: 'Llama 4',
  sonar: 'Sonar Pro',
};

/**
 * Blend two weight sets together.
 *
 * @param weights1 First weight set
 * @param weights2 Second weight set
 * @param ratio Blend ratio (0 = all weights1, 1 = all weights2)
 * @returns Blended weights that sum to 1.0
 */
export function blendWeights(
  weights1: Record<string, number>,
  weights2: Record<string, number>,
  ratio: number
): Record<string, number> {
  const blended: Record<string, number> = {};
  const allModels = new Set([...Object.keys(weights1), ...Object.keys(weights2)]);

  for (const modelId of allModels) {
    const w1 = weights1[modelId] || 0;
    const w2 = weights2[modelId] || 0;
    blended[modelId] = w1 * (1 - ratio) + w2 * ratio;
  }

  // Normalize to ensure sum = 1.0
  const sum = Object.values(blended).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const modelId of Object.keys(blended)) {
      blended[modelId] = blended[modelId] / sum;
    }
  }

  return blended;
}

/**
 * Calculate unified score across all models using geographic and context weights.
 *
 * Blends:
 * - 60% geographic market weights
 * - 40% use case (B2B/B2C) context weights
 *
 * @param modelScores Per-model scores (0-100)
 * @param geographicMarket Target geographic market
 * @param contextType B2B or B2C context
 * @returns Unified score result with breakdown
 */
export function calculateUnifiedScore(
  modelScores: Record<string, number>,
  geographicMarket: GeographicMarket,
  contextType: 'b2b' | 'b2c'
): UnifiedScoreResult {
  // Get base weights
  const geoWeights = GEOGRAPHIC_WEIGHTS[geographicMarket].model_weights;
  const contextWeights = USE_CASE_CONTEXT_WEIGHTS[contextType].model_weights;

  // Blend: 60% geographic, 40% context
  const blendedWeights = blendWeights(geoWeights, contextWeights, 0.4);

  // Calculate weighted score
  let weightedScore = 0;
  const modelBreakdown: ModelBreakdownItem[] = [];

  for (const [modelId, score] of Object.entries(modelScores)) {
    const weight = blendedWeights[modelId] || 0;
    const contribution = score * weight;
    weightedScore += contribution;

    modelBreakdown.push({
      modelId,
      modelName: MODEL_NAMES[modelId] || modelId,
      score: Math.round(score),
      weight: Math.round(weight * 100), // As percentage
      contribution: Math.round(contribution * 10) / 10,
    });
  }

  // Sort by contribution (highest first)
  modelBreakdown.sort((a, b) => b.contribution - a.contribution);

  return {
    weightedScore: Math.round(weightedScore * 10) / 10,
    modelBreakdown,
    geographicMarket,
    contextType,
    weightsUsed: blendedWeights,
  };
}

/**
 * Get the dominant model for a given market + context combination.
 */
export function getDominantModel(
  geographicMarket: GeographicMarket,
  contextType: 'b2b' | 'b2c'
): { modelId: string; modelName: string; weight: number } {
  const geoWeights = GEOGRAPHIC_WEIGHTS[geographicMarket].model_weights;
  const contextWeights = USE_CASE_CONTEXT_WEIGHTS[contextType].model_weights;
  const blendedWeights = blendWeights(geoWeights, contextWeights, 0.4);

  let maxWeight = 0;
  let dominantModel = '';

  for (const [modelId, weight] of Object.entries(blendedWeights)) {
    if (weight > maxWeight) {
      maxWeight = weight;
      dominantModel = modelId;
    }
  }

  return {
    modelId: dominantModel,
    modelName: MODEL_NAMES[dominantModel] || dominantModel,
    weight: Math.round(maxWeight * 100),
  };
}

/**
 * Get all available geographic markets for UI dropdown.
 */
export function getGeographicMarkets(): Array<{ id: GeographicMarket; name: string; description: string }> {
  return Object.entries(GEOGRAPHIC_WEIGHTS).map(([id, weights]) => ({
    id: id as GeographicMarket,
    name: weights.name,
    description: weights.description,
  }));
}

/**
 * Validate that weights sum to approximately 1.0 (for testing).
 */
export function validateWeights(weights: Record<string, number>): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.01;
}
