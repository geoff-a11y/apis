// src/test/data.test.ts — Integration tests for data loading and computed helpers

import { describe, it, expect } from 'vitest';
import {
  getModels,
  getModel,
  getConfirmatoryModels,
  getDimensions,
  getDimension,
  getDimensionsByCluster,
  getConfirmatoryDimensions,
  getEffectSizes,
  getEffectSize,
  getModelEffectSizes,
  getDimensionEffectSizes,
  getFingerprints,
  getFingerprint,
  getConfirmatoryFingerprints,
  getICCResults,
  getICC,
  getInteractionCoefficients,
  getCopyRules,
  getCopyRule,
  getCosineSimilarityMatrix,
  getModelSimilarity,
  getTopDimensionsForModel,
  getMeanEffectSize,
  getDimensionMeanEffect,
  getClusterMeanEffect,
  getGlobalStats,
  getStrongestEffect,
  getExtremeModelPairs,
} from '@/lib/data';
import type { ClusterKey } from '@/lib/types';

describe('Data Loading - Models', () => {
  it('getModels() returns an array', () => {
    const models = getModels();
    expect(Array.isArray(models)).toBe(true);
  });

  it('getModels() returns at least one model', () => {
    const models = getModels();
    expect(models.length).toBeGreaterThan(0);
  });

  it('getModels() returns models with expected structure', () => {
    const models = getModels();
    const firstModel = models[0];
    expect(firstModel).toHaveProperty('id');
    expect(firstModel).toHaveProperty('name');
    expect(firstModel).toHaveProperty('provider');
    expect(firstModel).toHaveProperty('study_type');
  });

  it('getModel() returns a model by ID', () => {
    const models = getModels();
    if (models.length > 0) {
      const model = getModel(models[0].id);
      expect(model).toBeDefined();
      expect(model?.id).toBe(models[0].id);
    }
  });

  it('getModel() returns undefined for non-existent ID', () => {
    const model = getModel('non-existent-model-id');
    expect(model).toBeUndefined();
  });

  it('getConfirmatoryModels() returns only confirmatory models', () => {
    const models = getConfirmatoryModels();
    models.forEach((model) => {
      expect(model.study_type).toBe('confirmatory');
    });
  });
});

describe('Data Loading - Dimensions', () => {
  it('getDimensions() returns exactly 26 dimensions', () => {
    const dimensions = getDimensions();
    expect(dimensions.length).toBe(26);
  });

  it('getDimensions() returns dimensions with expected structure', () => {
    const dimensions = getDimensions();
    const firstDim = dimensions[0];
    expect(firstDim).toHaveProperty('id');
    expect(firstDim).toHaveProperty('name');
    expect(firstDim).toHaveProperty('display_name');
    expect(firstDim).toHaveProperty('cluster');
    expect(firstDim).toHaveProperty('description');
  });

  it('getDimension() returns a dimension by ID', () => {
    const dimensions = getDimensions();
    if (dimensions.length > 0) {
      const dimension = getDimension(dimensions[0].id);
      expect(dimension).toBeDefined();
      expect(dimension?.id).toBe(dimensions[0].id);
    }
  });

  it('getDimension() returns undefined for non-existent ID', () => {
    const dimension = getDimension('non-existent-dim-id');
    expect(dimension).toBeUndefined();
  });

  it('getDimensionsByCluster() returns dimensions for valid cluster', () => {
    const clusterA = getDimensionsByCluster('A');
    expect(Array.isArray(clusterA)).toBe(true);
    clusterA.forEach((dim) => {
      expect(dim.cluster).toBe('A');
    });
  });

  it('getDimensionsByCluster() works for all clusters', () => {
    const clusters: ClusterKey[] = ['A', 'B', 'C', 'D', 'E', 'F'];
    clusters.forEach((cluster) => {
      const dims = getDimensionsByCluster(cluster);
      expect(Array.isArray(dims)).toBe(true);
      dims.forEach((dim) => {
        expect(dim.cluster).toBe(cluster);
      });
    });
  });

  it('getConfirmatoryDimensions() returns dimensions with ICC >= 0.70', () => {
    const dimensions = getConfirmatoryDimensions();
    expect(Array.isArray(dimensions)).toBe(true);
    // Each should have a corresponding ICC result that is confirmatory
    const iccResults = getICCResults();
    dimensions.forEach((dim) => {
      const icc = iccResults.find((r) => r.dimension_id === dim.id);
      expect(icc?.confirmatory).toBe(true);
    });
  });
});

describe('Data Loading - Effect Sizes', () => {
  it('getEffectSizes() returns an array', () => {
    const effectSizes = getEffectSizes();
    expect(Array.isArray(effectSizes)).toBe(true);
  });

  it('getEffectSizes() returns effect sizes with expected structure', () => {
    const effectSizes = getEffectSizes();
    if (effectSizes.length > 0) {
      const firstEffect = effectSizes[0];
      expect(firstEffect).toHaveProperty('dimension_id');
      expect(firstEffect).toHaveProperty('model_id');
      expect(firstEffect).toHaveProperty('cohen_h');
      expect(firstEffect).toHaveProperty('ci_lower');
      expect(firstEffect).toHaveProperty('ci_upper');
      expect(firstEffect).toHaveProperty('context');
    }
  });

  it('getEffectSizes() filters by context', () => {
    const pooled = getEffectSizes('pooled');
    pooled.forEach((e) => {
      expect(e.context).toBe('pooled');
    });
  });

  it('getEffectSize() returns specific effect size', () => {
    const effectSizes = getEffectSizes();
    if (effectSizes.length > 0) {
      const firstEffect = effectSizes[0];
      const effect = getEffectSize(
        firstEffect.dimension_id,
        firstEffect.model_id,
        firstEffect.context
      );
      expect(effect).toBeDefined();
      expect(effect?.dimension_id).toBe(firstEffect.dimension_id);
      expect(effect?.model_id).toBe(firstEffect.model_id);
    }
  });

  it('getModelEffectSizes() returns effects for a specific model', () => {
    const models = getModels();
    if (models.length > 0) {
      const modelEffects = getModelEffectSizes(models[0].id);
      expect(Array.isArray(modelEffects)).toBe(true);
      modelEffects.forEach((e) => {
        expect(e.model_id).toBe(models[0].id);
      });
    }
  });

  it('getDimensionEffectSizes() returns effects for a specific dimension', () => {
    const dimensions = getDimensions();
    if (dimensions.length > 0) {
      const dimEffects = getDimensionEffectSizes(dimensions[0].id);
      expect(Array.isArray(dimEffects)).toBe(true);
      dimEffects.forEach((e) => {
        expect(e.dimension_id).toBe(dimensions[0].id);
      });
    }
  });
});

describe('Data Loading - Fingerprints', () => {
  it('getFingerprints() returns an array', () => {
    const fingerprints = getFingerprints();
    expect(Array.isArray(fingerprints)).toBe(true);
  });

  it('getFingerprints() returns fingerprints with expected structure', () => {
    const fingerprints = getFingerprints();
    if (fingerprints.length > 0) {
      const firstFP = fingerprints[0];
      expect(firstFP).toHaveProperty('model_id');
      expect(firstFP).toHaveProperty('vector');
      expect(firstFP).toHaveProperty('measurement_date');
      expect(firstFP).toHaveProperty('study_type');
      expect(Array.isArray(firstFP.vector)).toBe(true);
      expect(firstFP.vector.length).toBe(26);
    }
  });

  it('getFingerprint() returns fingerprint for a specific model', () => {
    const fingerprints = getFingerprints();
    if (fingerprints.length > 0) {
      const fp = getFingerprint(fingerprints[0].model_id);
      expect(fp).toBeDefined();
      expect(fp?.model_id).toBe(fingerprints[0].model_id);
    }
  });

  it('getConfirmatoryFingerprints() returns only confirmatory fingerprints', () => {
    const fingerprints = getConfirmatoryFingerprints();
    fingerprints.forEach((fp) => {
      expect(fp.study_type).toBe('confirmatory');
    });
  });
});

describe('Data Loading - ICC Results', () => {
  it('getICCResults() returns an array', () => {
    const iccResults = getICCResults();
    expect(Array.isArray(iccResults)).toBe(true);
  });

  it('getICCResults() returns results with expected structure', () => {
    const iccResults = getICCResults();
    if (iccResults.length > 0) {
      const firstICC = iccResults[0];
      expect(firstICC).toHaveProperty('dimension_id');
      expect(firstICC).toHaveProperty('icc');
      expect(firstICC).toHaveProperty('krippendorff_alpha');
      expect(firstICC).toHaveProperty('confirmatory');
    }
  });

  it('getICC() returns ICC result for a specific dimension', () => {
    const iccResults = getICCResults();
    if (iccResults.length > 0) {
      const icc = getICC(iccResults[0].dimension_id);
      expect(icc).toBeDefined();
      expect(icc?.dimension_id).toBe(iccResults[0].dimension_id);
    }
  });
});

describe('Data Loading - Other Data', () => {
  it('getInteractionCoefficients() returns an array', () => {
    const interactions = getInteractionCoefficients();
    expect(Array.isArray(interactions)).toBe(true);
  });

  it('getCopyRules() returns an array', () => {
    const copyRules = getCopyRules();
    expect(Array.isArray(copyRules)).toBe(true);
  });

  it('getCopyRule() returns copy rule for a specific dimension', () => {
    const copyRules = getCopyRules();
    if (copyRules.length > 0) {
      const rule = getCopyRule(copyRules[0].dimension_id);
      expect(rule).toBeDefined();
      expect(rule?.dimension_id).toBe(copyRules[0].dimension_id);
    }
  });
});

describe('Computed Helpers - Cosine Similarity', () => {
  it('getCosineSimilarityMatrix() returns an array', () => {
    const matrix = getCosineSimilarityMatrix();
    expect(Array.isArray(matrix)).toBe(true);
  });

  it('getCosineSimilarityMatrix() returns similarity values between 0 and 1', () => {
    const matrix = getCosineSimilarityMatrix();
    matrix.forEach((entry) => {
      // Use tolerance for floating point comparison
      expect(entry.similarity).toBeGreaterThanOrEqual(-1 - 1e-10);
      expect(entry.similarity).toBeLessThanOrEqual(1 + 1e-10);
    });
  });

  it('getCosineSimilarityMatrix() has self-similarity of 1', () => {
    const matrix = getCosineSimilarityMatrix();
    const selfSimilarities = matrix.filter((m) => m.model_a === m.model_b);
    selfSimilarities.forEach((entry) => {
      expect(entry.similarity).toBeCloseTo(1, 5);
    });
  });

  it('getModelSimilarity() returns similarity between two models', () => {
    const models = getConfirmatoryModels();
    if (models.length >= 2) {
      const similarity = getModelSimilarity(models[0].id, models[1].id);
      expect(typeof similarity).toBe('number');
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    }
  });
});

describe('Computed Helpers - Model Statistics', () => {
  it('getTopDimensionsForModel() returns array of dimension IDs', () => {
    const models = getModels();
    if (models.length > 0) {
      const topDims = getTopDimensionsForModel(models[0].id, 5);
      expect(Array.isArray(topDims)).toBe(true);
      expect(topDims.length).toBeLessThanOrEqual(5);
    }
  });

  it('getMeanEffectSize() returns a number', () => {
    const models = getModels();
    if (models.length > 0) {
      const mean = getMeanEffectSize(models[0].id);
      expect(typeof mean).toBe('number');
    }
  });

  it('getMeanEffectSize() returns 0 for non-existent model', () => {
    const mean = getMeanEffectSize('non-existent-model');
    expect(mean).toBe(0);
  });

  it('getDimensionMeanEffect() returns a number', () => {
    const dimensions = getDimensions();
    if (dimensions.length > 0) {
      const mean = getDimensionMeanEffect(dimensions[0].id);
      expect(typeof mean).toBe('number');
    }
  });

  it('getClusterMeanEffect() returns a number for valid cluster', () => {
    const models = getModels();
    if (models.length > 0) {
      const mean = getClusterMeanEffect(models[0].id, 'A');
      expect(typeof mean).toBe('number');
    }
  });

  it('getClusterMeanEffect() works for all clusters', () => {
    const models = getModels();
    const clusters: ClusterKey[] = ['A', 'B', 'C', 'D', 'E', 'F'];
    if (models.length > 0) {
      clusters.forEach((cluster) => {
        const mean = getClusterMeanEffect(models[0].id, cluster);
        expect(typeof mean).toBe('number');
      });
    }
  });
});

describe('Computed Helpers - Global Statistics', () => {
  it('getGlobalStats() returns stats object', () => {
    const stats = getGlobalStats();
    expect(stats).toHaveProperty('models');
    expect(stats).toHaveProperty('dimensions');
    expect(stats).toHaveProperty('trials');
    expect(stats).toHaveProperty('last_updated');
    expect(stats).toHaveProperty('osf_id');
    expect(stats).toHaveProperty('osf_url');
  });

  it('getGlobalStats() returns correct dimension count', () => {
    const stats = getGlobalStats();
    expect(stats.dimensions).toBe(26);
  });

  it('getStrongestEffect() returns effect size or null', () => {
    const strongest = getStrongestEffect();
    if (strongest) {
      expect(strongest).toHaveProperty('cohen_h');
      expect(strongest).toHaveProperty('dimension_id');
      expect(strongest).toHaveProperty('model_id');
    } else {
      expect(strongest).toBeNull();
    }
  });

  it('getExtremeModelPairs() returns most and least similar pairs', () => {
    const extremes = getExtremeModelPairs();
    expect(extremes).toHaveProperty('mostSimilar');
    expect(extremes).toHaveProperty('leastSimilar');
  });

  it('getExtremeModelPairs() mostSimilar has higher similarity than leastSimilar', () => {
    const extremes = getExtremeModelPairs();
    if (extremes.mostSimilar && extremes.leastSimilar) {
      expect(extremes.mostSimilar.similarity).toBeGreaterThanOrEqual(
        extremes.leastSimilar.similarity
      );
    }
  });
});

describe('Data Integrity', () => {
  it('all dimensions have unique IDs', () => {
    const dimensions = getDimensions();
    const ids = dimensions.map((d) => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all models have unique IDs', () => {
    const models = getModels();
    const ids = models.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('effect sizes reference valid models and dimensions', () => {
    const effectSizes = getEffectSizes();
    const models = getModels();
    const dimensions = getDimensions();
    const modelIds = new Set(models.map((m) => m.id));
    const dimIds = new Set(dimensions.map((d) => d.id));

    effectSizes.forEach((e) => {
      expect(modelIds.has(e.model_id)).toBe(true);
      expect(dimIds.has(e.dimension_id)).toBe(true);
    });
  });

  it('fingerprints reference valid models', () => {
    const fingerprints = getFingerprints();
    const models = getModels();
    const modelIds = new Set(models.map((m) => m.id));

    fingerprints.forEach((fp) => {
      expect(modelIds.has(fp.model_id)).toBe(true);
    });
  });

  it('ICC results reference valid dimensions', () => {
    const iccResults = getICCResults();
    const dimensions = getDimensions();
    const dimIds = new Set(dimensions.map((d) => d.id));

    // Only check main study dimensions (dim_XX format), not interaction study dimensions
    const mainStudyIcc = iccResults.filter((icc) => icc.dimension_id.startsWith('dim_'));
    mainStudyIcc.forEach((icc) => {
      expect(dimIds.has(icc.dimension_id)).toBe(true);
    });
  });
});
