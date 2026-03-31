'use client';

import React, { useMemo } from 'react';
import {
  getDimensions,
  getEffectSizes,
  getDimension,
} from '@/lib/data';
import { CLUSTER_COLORS, type ClusterKey } from '@/lib/types';

interface DimensionContextComparison {
  dimension_id: string;
  dimension_name: string;
  cluster: ClusterKey;
  b2c_effect: number;
  b2b_effect: number;
  difference: number;
  percent_difference: number;
}

interface B2CvsB2BComparisonProps {
  modelId?: string;
  topN?: number;
  clusterFilter?: ClusterKey | null;
}

export function B2CvsB2BComparison({
  modelId,
  topN = 10,
  clusterFilter = null,
}: B2CvsB2BComparisonProps) {
  const comparisons = useMemo(() => {
    const dimensions = getDimensions();
    const b2cEffects = getEffectSizes('b2c');
    const b2bEffects = getEffectSizes('b2b');

    const results: DimensionContextComparison[] = dimensions
      .map((dim) => {
        // Filter by model if specified
        const b2cData = b2cEffects
          .filter((e) => e.dimension_id === dim.id)
          .filter((e) => !modelId || e.model_id === modelId);

        const b2bData = b2bEffects
          .filter((e) => e.dimension_id === dim.id)
          .filter((e) => !modelId || e.model_id === modelId);

        if (b2cData.length === 0 || b2bData.length === 0) {
          return null;
        }

        // Calculate mean effects across models (or single model if filtered)
        const b2cMean =
          b2cData.reduce((sum, e) => sum + e.cohen_h, 0) / b2cData.length;
        const b2bMean =
          b2bData.reduce((sum, e) => sum + e.cohen_h, 0) / b2bData.length;

        const difference = Math.abs(b2cMean - b2bMean);
        const avgEffect = (Math.abs(b2cMean) + Math.abs(b2bMean)) / 2;
        const percentDifference = avgEffect > 0 ? (difference / avgEffect) * 100 : 0;

        return {
          dimension_id: dim.id,
          dimension_name: dim.display_name,
          cluster: dim.cluster,
          b2c_effect: b2cMean,
          b2b_effect: b2bMean,
          difference,
          percent_difference: percentDifference,
        };
      })
      .filter((r): r is DimensionContextComparison => r !== null);

    // Filter by cluster if specified
    const filtered = clusterFilter
      ? results.filter((r) => r.cluster === clusterFilter)
      : results;

    // Sort by absolute difference and take top N
    return filtered
      .sort((a, b) => b.difference - a.difference)
      .slice(0, topN);
  }, [modelId, topN, clusterFilter]);

  if (comparisons.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-soft">
          No context comparison data available for the selected filters.
        </p>
      </div>
    );
  }

  // Find max difference for scaling bars
  const maxDifference = Math.max(...comparisons.map((c) => c.difference));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-navy mb-2">
          B2C vs B2B Effect Size Comparison
        </h2>
        <p className="text-text-mid text-sm">
          Dimensions with the largest effect size differences between consumer and
          business purchase contexts. {clusterFilter && `Filtered to Cluster ${clusterFilter}.`}
        </p>
      </div>

      {/* Comparison bars */}
      <div className="card p-6">
        <div className="space-y-4">
          {comparisons.map((comp) => {
            const clusterColor = CLUSTER_COLORS[comp.cluster];
            const b2cStronger = Math.abs(comp.b2c_effect) > Math.abs(comp.b2b_effect);
            const maxEffect = Math.max(
              Math.abs(comp.b2c_effect),
              Math.abs(comp.b2b_effect)
            );

            return (
              <div key={comp.dimension_id} className="space-y-2">
                {/* Dimension header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full`}
                      style={{ backgroundColor: `var(--${clusterColor})` }}
                    />
                    <span className="font-medium text-navy text-sm">
                      {comp.dimension_name}
                    </span>
                  </div>
                  <span className="text-xs text-text-soft">
                    {comp.percent_difference.toFixed(0)}% difference
                  </span>
                </div>

                {/* Effect size bars */}
                <div className="space-y-1.5">
                  {/* B2C bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-soft w-8 text-right">
                      B2C
                    </span>
                    <div className="flex-1 relative h-6 bg-blue-light rounded overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full transition-all ${
                          b2cStronger ? 'bg-score-high' : 'bg-blue'
                        }`}
                        style={{
                          width: `${(Math.abs(comp.b2c_effect) / maxEffect) * 100}%`,
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-mono font-medium text-navy">
                        h = {comp.b2c_effect.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  {/* B2B bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-soft w-8 text-right">
                      B2B
                    </span>
                    <div className="flex-1 relative h-6 bg-blue-light rounded overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full transition-all ${
                          !b2cStronger ? 'bg-score-high' : 'bg-blue'
                        }`}
                        style={{
                          width: `${(Math.abs(comp.b2b_effect) / maxEffect) * 100}%`,
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-mono font-medium text-navy">
                        h = {comp.b2b_effect.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="card p-4 bg-bg">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-soft">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-score-high" />
            <span>Stronger effect in this context</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue" />
            <span>Weaker effect in this context</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContextDifferenceTableProps {
  showAll?: boolean;
}

export function ContextDifferenceTable({
  showAll = false,
}: ContextDifferenceTableProps) {
  const comparisons = useMemo(() => {
    const dimensions = getDimensions();
    const b2cEffects = getEffectSizes('b2c');
    const b2bEffects = getEffectSizes('b2b');

    const results: DimensionContextComparison[] = dimensions
      .map((dim) => {
        const b2cData = b2cEffects.filter((e) => e.dimension_id === dim.id);
        const b2bData = b2bEffects.filter((e) => e.dimension_id === dim.id);

        if (b2cData.length === 0 || b2bData.length === 0) {
          return null;
        }

        const b2cMean =
          b2cData.reduce((sum, e) => sum + e.cohen_h, 0) / b2cData.length;
        const b2bMean =
          b2bData.reduce((sum, e) => sum + e.cohen_h, 0) / b2bData.length;

        const difference = Math.abs(b2cMean - b2bMean);
        const avgEffect = (Math.abs(b2cMean) + Math.abs(b2bMean)) / 2;
        const percentDifference = avgEffect > 0 ? (difference / avgEffect) * 100 : 0;

        return {
          dimension_id: dim.id,
          dimension_name: dim.display_name,
          cluster: dim.cluster,
          b2c_effect: b2cMean,
          b2b_effect: b2bMean,
          difference,
          percent_difference: percentDifference,
        };
      })
      .filter((r): r is DimensionContextComparison => r !== null);

    return results.sort((a, b) => b.difference - a.difference);
  }, []);

  const displayComparisons = showAll ? comparisons : comparisons.slice(0, 10);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg border-b border-border">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-text-soft">
                Dimension
              </th>
              <th className="text-center py-3 px-4 font-medium text-text-soft">
                Cluster
              </th>
              <th className="text-right py-3 px-4 font-medium text-text-soft">
                B2C Effect
              </th>
              <th className="text-right py-3 px-4 font-medium text-text-soft">
                B2B Effect
              </th>
              <th className="text-right py-3 px-4 font-medium text-text-soft">
                Difference
              </th>
            </tr>
          </thead>
          <tbody>
            {displayComparisons.map((comp) => {
              const clusterColor = CLUSTER_COLORS[comp.cluster];
              return (
                <tr key={comp.dimension_id} className="border-b border-border">
                  <td className="py-3 px-4 text-navy font-medium">
                    {comp.dimension_name}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium`}
                      style={{ color: `var(--${clusterColor})` }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: `var(--${clusterColor})` }}
                      />
                      {comp.cluster}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-navy">
                    {comp.b2c_effect.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-navy">
                    {comp.b2b_effect.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono font-semibold text-navy">
                      {comp.difference.toFixed(3)}
                    </span>
                    <span className="text-xs text-text-soft ml-2">
                      ({comp.percent_difference.toFixed(0)}%)
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
