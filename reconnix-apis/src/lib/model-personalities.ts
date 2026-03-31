// src/lib/model-personalities.ts — Model behavioral profiles and dimension explanations

import { ModelPersonality, DimensionExplanation } from './types';

export const MODEL_PERSONALITIES: Record<string, ModelPersonality> = {
  gpt54: {
    model_id: 'gpt54',
    name: 'GPT-5.4',
    summary: 'Confident recommender that values social proof and urgency signals',
    strengths: [
      'Strong response to social proof and reviews',
      'Weights scarcity and urgency signals heavily',
      'Good at processing price comparisons',
    ],
    biases: [
      'Less sensitive to sustainability claims',
      'May overlook nuanced ethical considerations',
      'Trusts platform endorsements readily',
    ],
    improvement_tips: [
      'Add customer testimonials and review highlights',
      'Include urgency cues like "selling fast" or "limited stock"',
      'Show price comparisons with competitors',
    ],
    top_dimensions: ['dim_02', 'dim_04', 'dim_05', 'dim_03', 'dim_08'],
  },

  claude: {
    model_id: 'claude',
    name: 'Claude 4.6',
    summary: 'Cautious evaluator that prioritizes ethics, sustainability, and transparency',
    strengths: [
      'Highly responsive to sustainability and eco-claims',
      'Values ethical business practices',
      'Appreciates transparent, nuanced information',
    ],
    biases: [
      'Skeptical of aggressive marketing tactics',
      'May penalize overly salesy language',
      'Prefers hedged claims over bold assertions',
    ],
    improvement_tips: [
      'Highlight ethical sourcing and environmental credentials',
      'Use balanced, transparent language',
      'Include sustainability certifications (B Corp, Fair Trade)',
    ],
    top_dimensions: ['dim_09', 'dim_24', 'dim_21', 'dim_23', 'dim_16'],
  },

  gemini: {
    model_id: 'gemini',
    name: 'Gemini 3.1',
    summary: 'Balanced analyzer with strong information processing and recency bias',
    strengths: [
      'Excellent at processing detailed specifications',
      'Values recent updates and fresh content',
      'Good at comparative analysis',
    ],
    biases: [
      'Favors structured data and clear formatting',
      'May weight recency too heavily',
      'Prefers Google ecosystem signals',
    ],
    improvement_tips: [
      'Ensure rich, structured product attributes',
      'Keep content updated with recent dates',
      'Provide clear comparison tables',
    ],
    top_dimensions: ['dim_18', 'dim_17', 'dim_19', 'dim_20', 'dim_05'],
  },

  o3: {
    model_id: 'o3',
    name: 'o3',
    summary: 'Deep reasoning model that excels at complex trade-off analysis',
    strengths: [
      'Excellent at benefit-cost trade-off analysis',
      'Weights warranty and guarantee signals heavily',
      'Good at processing complex information',
    ],
    biases: [
      'May overthink simple purchasing decisions',
      'Less swayed by emotional appeals',
      'Prefers quantitative over qualitative claims',
    ],
    improvement_tips: [
      'Clearly articulate value proposition and ROI',
      'Highlight warranties and money-back guarantees',
      'Provide detailed cost-benefit comparisons',
    ],
    top_dimensions: ['dim_22', 'dim_14', 'dim_18', 'dim_07', 'dim_05'],
  },

  llama: {
    model_id: 'llama',
    name: 'Llama 4',
    summary: 'Pragmatic assistant focused on value and social validation',
    strengths: [
      'Strong response to social proof',
      'Values clear, direct product information',
      'Good at price sensitivity analysis',
    ],
    biases: [
      'Less nuanced on sustainability topics',
      'May favor popular/mainstream options',
      'Simpler decision frameworks',
    ],
    improvement_tips: [
      'Emphasize popularity and customer count',
      'Keep messaging simple and direct',
      'Highlight value propositions clearly',
    ],
    top_dimensions: ['dim_02', 'dim_05', 'dim_13', 'dim_04', 'dim_08'],
  },

  sonar: {
    model_id: 'sonar',
    name: 'Sonar Pro',
    summary: 'Research-oriented model that values comprehensive, up-to-date information',
    strengths: [
      'Excellent at finding and weighing multiple sources',
      'Strong recency preference',
      'Good at comparative shopping analysis',
    ],
    biases: [
      'Heavily weights recent information',
      'May surface conflicting viewpoints',
      'Prefers products with rich online presence',
    ],
    improvement_tips: [
      'Ensure product has recent reviews and mentions',
      'Build presence across multiple review sites',
      'Keep product information current',
    ],
    top_dimensions: ['dim_17', 'dim_01', 'dim_19', 'dim_20', 'dim_02'],
  },
};

export const DIMENSION_EXPLANATIONS: Record<string, DimensionExplanation> = {
  dim_01: {
    dimension_id: 'dim_01',
    plain_language: 'Third-party endorsements and expert validation',
    why_it_matters: 'AI assistants trust independent verification. Products with certifications, awards, or expert recommendations are 2.1x more likely to be suggested.',
    effect_magnitude: '2.1x more likely to recommend',
    best_for_models: ['sonar', 'claude', 'gemini'],
  },
  dim_02: {
    dimension_id: 'dim_02',
    plain_language: 'Customer reviews and social proof',
    why_it_matters: 'High ratings and review volume signal product quality. AI models use this as a primary trust signal.',
    effect_magnitude: '1.8x boost from strong reviews',
    best_for_models: ['gpt54', 'llama', 'sonar'],
  },
  dim_03: {
    dimension_id: 'dim_03',
    plain_language: 'Platform badges and endorsements',
    why_it_matters: 'Amazon\'s Choice, Best Seller badges, and retailer endorsements increase AI confidence.',
    effect_magnitude: '1.5x more recommendations',
    best_for_models: ['gpt54', 'gemini', 'llama'],
  },
  dim_04: {
    dimension_id: 'dim_04',
    plain_language: 'Scarcity and urgency signals',
    why_it_matters: 'AI assistants prioritize products that seem popular and in-demand. "Only X left" and "selling fast" signals increase recommendation likelihood.',
    effect_magnitude: '1.9x recommendation rate',
    best_for_models: ['gpt54', 'llama', 'o3'],
  },
  dim_05: {
    dimension_id: 'dim_05',
    plain_language: 'Price positioning and comparisons',
    why_it_matters: 'Clear value framing helps AI justify recommendations. Showing savings vs. competitors or regular price increases selection.',
    effect_magnitude: '1.6x when value is clear',
    best_for_models: ['o3', 'gemini', 'gpt54'],
  },
  dim_06: {
    dimension_id: 'dim_06',
    plain_language: 'Brand heritage and legacy',
    why_it_matters: 'Established brands with history get a trust premium from AI models evaluating long-term reliability.',
    effect_magnitude: '1.4x for established brands',
    best_for_models: ['claude', 'o3', 'gemini'],
  },
  dim_07: {
    dimension_id: 'dim_07',
    plain_language: 'Risk-free trial offers',
    why_it_matters: 'Trial offers reduce perceived risk. AI models recommend products with try-before-you-buy options more often.',
    effect_magnitude: '1.7x with trial offers',
    best_for_models: ['o3', 'claude', 'gpt54'],
  },
  dim_08: {
    dimension_id: 'dim_08',
    plain_language: 'Bundling and add-on value',
    why_it_matters: 'Bundles that offer clear value (accessories included, starter kits) increase perceived value.',
    effect_magnitude: '1.3x for smart bundles',
    best_for_models: ['gpt54', 'llama', 'gemini'],
  },
  dim_09: {
    dimension_id: 'dim_09',
    plain_language: 'Sustainability and environmental claims',
    why_it_matters: 'Eco-conscious messaging resonates strongly with certain AI models, especially Claude. B Corp, organic, and recycled claims matter.',
    effect_magnitude: '2.3x for Claude specifically',
    best_for_models: ['claude', 'gemini', 'sonar'],
  },
  dim_13: {
    dimension_id: 'dim_13',
    plain_language: 'Established reliability and track record',
    why_it_matters: 'Products with proven track records and longevity signals get recommended more for important purchases.',
    effect_magnitude: '1.5x for proven products',
    best_for_models: ['o3', 'claude', 'gemini'],
  },
  dim_14: {
    dimension_id: 'dim_14',
    plain_language: 'Warranty and guarantee coverage',
    why_it_matters: 'Strong warranties reduce risk perception. AI models factor guarantee length into recommendations.',
    effect_magnitude: '1.6x with strong warranty',
    best_for_models: ['o3', 'claude', 'gpt54'],
  },
  dim_15: {
    dimension_id: 'dim_15',
    plain_language: 'Easy returns and refund policy',
    why_it_matters: 'Generous return policies make AI models more confident recommending products, especially for first-time purchases.',
    effect_magnitude: '1.8x with easy returns',
    best_for_models: ['claude', 'o3', 'gpt54'],
  },
  dim_17: {
    dimension_id: 'dim_17',
    plain_language: 'Recency and freshness of information',
    why_it_matters: 'AI models prefer products with recent updates, reviews, and activity. Stale pages get deprioritized.',
    effect_magnitude: '1.4x for recent content',
    best_for_models: ['sonar', 'gemini', 'gpt54'],
  },
  dim_18: {
    dimension_id: 'dim_18',
    plain_language: 'Precise specifications and details',
    why_it_matters: 'Detailed specs help AI models match products to specific user needs. Vague descriptions hurt recommendations.',
    effect_magnitude: '1.5x with detailed specs',
    best_for_models: ['gemini', 'o3', 'sonar'],
  },
  dim_19: {
    dimension_id: 'dim_19',
    plain_language: 'Comparative claims against alternatives',
    why_it_matters: 'Clear comparisons help AI models position your product. "30% faster than X" type claims are powerful.',
    effect_magnitude: '1.6x with clear comparisons',
    best_for_models: ['gemini', 'sonar', 'o3'],
  },
  dim_24: {
    dimension_id: 'dim_24',
    plain_language: 'Ethical business practices',
    why_it_matters: 'AI models (especially Claude) evaluate ethical signals. Fair trade, transparency, and honest marketing boost scores.',
    effect_magnitude: '2.0x for Claude',
    best_for_models: ['claude', 'o3', 'gemini'],
  },
};

/**
 * Get personality for a model
 */
export function getModelPersonality(modelId: string): ModelPersonality | undefined {
  return MODEL_PERSONALITIES[modelId];
}

/**
 * Get explanation for a dimension
 */
export function getDimensionExplanation(dimensionId: string): DimensionExplanation | undefined {
  return DIMENSION_EXPLANATIONS[dimensionId];
}

/**
 * Analyze why two models score differently based on signal inventory
 */
export function analyzeDivergence(
  signalInventory: Array<{ dimension_id: string; score: number }>,
  modelAId: string,
  modelBId: string
): Array<{
  dimensionId: string;
  dimensionName: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}> {
  const modelA = MODEL_PERSONALITIES[modelAId];
  const modelB = MODEL_PERSONALITIES[modelBId];

  if (!modelA || !modelB) return [];

  const divergences: Array<{
    dimensionId: string;
    dimensionName: string;
    reason: string;
    impact: 'high' | 'medium' | 'low';
  }> = [];

  // Find dimensions where models differ in importance
  const modelATopDims = new Set(modelA.top_dimensions);
  const modelBTopDims = new Set(modelB.top_dimensions);

  for (const signal of signalInventory) {
    const aWeightsHighly = modelATopDims.has(signal.dimension_id);
    const bWeightsHighly = modelBTopDims.has(signal.dimension_id);

    if (aWeightsHighly !== bWeightsHighly) {
      const explanation = DIMENSION_EXPLANATIONS[signal.dimension_id];
      const dimName = explanation?.plain_language || signal.dimension_id;

      if (aWeightsHighly && signal.score > 0.5) {
        divergences.push({
          dimensionId: signal.dimension_id,
          dimensionName: dimName,
          reason: `${modelA.name} weights this heavily and your page scores well here`,
          impact: signal.score > 0.7 ? 'high' : 'medium',
        });
      } else if (bWeightsHighly && signal.score < 0.4) {
        divergences.push({
          dimensionId: signal.dimension_id,
          dimensionName: dimName,
          reason: `${modelB.name} looks for this signal but your page is weak here`,
          impact: signal.score < 0.2 ? 'high' : 'medium',
        });
      }
    }
  }

  return divergences.slice(0, 5); // Top 5 divergence factors
}
