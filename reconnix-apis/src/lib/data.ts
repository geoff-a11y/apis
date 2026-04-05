// src/lib/data.ts — Data loading helpers for APIS webapp

import modelsData from '../../data/models.json';
import dimensionsData from '../../data/dimensions.json';
import effectSizesData from '../../data/effect_sizes.json';
import fingerprintsData from '../../data/behavioral_fingerprints.json';
import iccData from '../../data/icc_results.json';
import interactionData from '../../data/interaction_coefficients.json';
import copyruleData from '../../data/copy_rulebook.json';
import insightsData from '../../data/model_dimension_insights.json';

import type {
  Model,
  Dimension,
  EffectSize,
  BehavioralFingerprint,
  ICCResult,
  InteractionCoefficient,
  CopyRule,
  CosineSimilarity,
  GlobalStats,
  ClusterKey,
} from './types';

// Models
export const getModels = (): Model[] => modelsData as Model[];

export const getModel = (id: string): Model | undefined =>
  getModels().find((m) => m.id === id);

export const getConfirmatoryModels = (): Model[] =>
  getModels().filter((m) => m.study_type === 'confirmatory');

// Dimensions
export const getDimensions = (): Dimension[] => dimensionsData as Dimension[];

export const getDimension = (id: string): Dimension | undefined =>
  getDimensions().find((d) => d.id === id);

export const getDimensionsByCluster = (cluster: ClusterKey): Dimension[] =>
  getDimensions().filter((d) => d.cluster === cluster);

export const getConfirmatoryDimensions = (): Dimension[] => {
  const iccResults = getICCResults();
  const confirmatoryIds = new Set(
    iccResults.filter((r) => r.confirmatory).map((r) => r.dimension_id)
  );
  return getDimensions().filter((d) => confirmatoryIds.has(d.id));
};

// Effect Sizes
// Note: Using unknown to handle data structure mismatch
export const getEffectSizes = (context = 'pooled'): EffectSize[] =>
  (effectSizesData as unknown as EffectSize[]).filter((e) => e.context === context);

export const getEffectSize = (
  dim_id: string,
  model_id: string,
  context = 'pooled'
): EffectSize | undefined =>
  getEffectSizes(context).find(
    (e) => e.dimension_id === dim_id && e.model_id === model_id
  );

export const getModelEffectSizes = (
  model_id: string,
  context = 'pooled'
): EffectSize[] =>
  getEffectSizes(context).filter((e) => e.model_id === model_id);

export const getDimensionEffectSizes = (
  dim_id: string,
  context = 'pooled'
): EffectSize[] =>
  getEffectSizes(context).filter((e) => e.dimension_id === dim_id);

// Fingerprints
export const getFingerprints = (): BehavioralFingerprint[] =>
  fingerprintsData as BehavioralFingerprint[];

export const getFingerprint = (model_id: string): BehavioralFingerprint | undefined =>
  getFingerprints().find((f) => f.model_id === model_id);

export const getConfirmatoryFingerprints = (): BehavioralFingerprint[] =>
  getFingerprints().filter((f) => f.study_type === 'confirmatory');

// ICC Results
export const getICCResults = (): ICCResult[] => iccData as ICCResult[];

export const getICC = (dim_id: string): ICCResult | undefined =>
  getICCResults().find((r) => r.dimension_id === dim_id);

// Interaction Coefficients
export const getInteractionCoefficients = (): InteractionCoefficient[] => {
  const data = interactionData as unknown as { coefficients?: InteractionCoefficient[] };
  return data.coefficients || [];
};

// Raw interaction data with baselines and combination analyses
export const getInteractionData = () => interactionData as unknown as {
  analysis_date: string;
  n_interaction_scores: number;
  baselines: Record<string, number>;
  combination_analyses: Record<string, {
    combination_type: string;
    n_conditions: number;
    status: string;
    observed_mean_effect?: number;
    winning_model?: string;
    model_fits?: Record<string, { aic: number; r_squared: number }>;
  }>;
};

/**
 * Get baseline effect size for a dimension from interaction study
 */
export const getInteractionBaseline = (dim_id: string): number => {
  const data = getInteractionData();
  return data.baselines?.[dim_id] ?? 0;
};

/**
 * Get combination analysis for a specific type
 */
export const getCombinationAnalysis = (combinationType: string) => {
  const data = getInteractionData();
  return data.combination_analyses?.[combinationType];
};

/**
 * Get winning combination model (multiplicative, additive, etc.)
 */
export const getWinningCombinationModel = (combinationType: string): string => {
  const analysis = getCombinationAnalysis(combinationType);
  return analysis?.winning_model ?? 'multiplicative'; // Default from research findings
};

// Copy Rules
export const getCopyRules = (): CopyRule[] => copyruleData as CopyRule[];

export const getCopyRule = (dim_id: string): CopyRule | undefined =>
  getCopyRules().find((r) => r.dimension_id === dim_id);

// Computed helpers

/**
 * Compute cosine similarity matrix between all model fingerprints
 */
export const getCosineSimilarityMatrix = (): CosineSimilarity[] => {
  const fingerprints = getFingerprints().filter(
    (f) => f.study_type === 'confirmatory'
  );
  const result: CosineSimilarity[] = [];

  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = 0; j < fingerprints.length; j++) {
      const a = fingerprints[i].vector;
      const b = fingerprints[j].vector;

      // Compute cosine similarity
      const dot = a.reduce((sum, v, k) => sum + v * b[k], 0);
      const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
      const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));

      result.push({
        model_a: fingerprints[i].model_id,
        model_b: fingerprints[j].model_id,
        similarity: magA && magB ? dot / (magA * magB) : 0,
      });
    }
  }
  return result;
};

/**
 * Get similarity between two specific models
 */
export const getModelSimilarity = (
  model_a: string,
  model_b: string
): number => {
  const matrix = getCosineSimilarityMatrix();
  const entry = matrix.find(
    (m) => m.model_a === model_a && m.model_b === model_b
  );
  return entry?.similarity ?? 0;
};

/**
 * Get top N dimensions for a model by absolute effect size
 */
export const getTopDimensionsForModel = (
  model_id: string,
  n = 5
): string[] =>
  getModelEffectSizes(model_id)
    .sort((a, b) => Math.abs(b.cohen_h) - Math.abs(a.cohen_h))
    .slice(0, n)
    .map((e) => e.dimension_id);

/**
 * Get mean effect size for a model across all dimensions
 */
export const getMeanEffectSize = (model_id: string): number => {
  const effects = getModelEffectSizes(model_id);
  if (effects.length === 0) return 0;
  return effects.reduce((sum, e) => sum + e.cohen_h, 0) / effects.length;
};

/**
 * Get mean effect size for a dimension across all models
 */
export const getDimensionMeanEffect = (dim_id: string): number => {
  const effects = getDimensionEffectSizes(dim_id);
  if (effects.length === 0) return 0;
  return effects.reduce((sum, e) => sum + e.cohen_h, 0) / effects.length;
};

/**
 * Get cluster mean effect size for a model
 */
export const getClusterMeanEffect = (
  model_id: string,
  cluster: ClusterKey
): number => {
  const clusterDims = getDimensionsByCluster(cluster).map((d) => d.id);
  const effects = getModelEffectSizes(model_id).filter((e) =>
    clusterDims.includes(e.dimension_id)
  );
  if (effects.length === 0) return 0;
  return effects.reduce((sum, e) => sum + e.cohen_h, 0) / effects.length;
};

/**
 * Global statistics for the dashboard
 */
export const getGlobalStats = (): GlobalStats => ({
  models: getConfirmatoryModels().length,
  dimensions: getDimensions().length,
  trials: 56640,
  last_updated: getFingerprints()[0]?.measurement_date ?? '2026-03-27',
  osf_id: 'et4nf',
  osf_url: 'https://osf.io/et4nf',
});

/**
 * Get strongest effect (by absolute value) across all model-dimension pairs
 */
export const getStrongestEffect = (): EffectSize | null => {
  const effects = getEffectSizes();
  if (effects.length === 0) return null;
  return effects.reduce((max, e) =>
    Math.abs(e.cohen_h) > Math.abs(max.cohen_h) ? e : max
  );
};

/**
 * Get the most and least similar model pairs
 */
export const getExtremeModelPairs = (): {
  mostSimilar: CosineSimilarity | null;
  leastSimilar: CosineSimilarity | null;
} => {
  const matrix = getCosineSimilarityMatrix().filter(
    (m) => m.model_a !== m.model_b
  );

  if (matrix.length === 0) return { mostSimilar: null, leastSimilar: null };

  const mostSimilar = matrix.reduce((max, m) =>
    m.similarity > max.similarity ? m : max
  );
  const leastSimilar = matrix.reduce((min, m) =>
    m.similarity < min.similarity ? m : min
  );

  return { mostSimilar, leastSimilar };
};

// Model-Dimension Insights
type InsightsData = {
  insights: Record<string, Record<string, string>>;
};

/**
 * Get LLM-generated insight for a specific model-dimension combination
 */
export const getModelDimensionInsight = (
  model_id: string,
  dim_id: string
): string => {
  const data = insightsData as InsightsData;
  return data.insights?.[model_id]?.[dim_id] ?? '';
};
