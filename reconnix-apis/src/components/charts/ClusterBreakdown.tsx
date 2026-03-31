'use client';

import { useState, useMemo } from 'react';
import {
  getDimensionsByCluster,
  getEffectSizes,
  getConfirmatoryModels,
  getDimension,
} from '@/lib/data';
import {
  CLUSTER_NAMES,
  CLUSTER_COLORS,
  type ClusterKey,
} from '@/lib/types';

interface ClusterStats {
  cluster: ClusterKey;
  name: string;
  dimensionCount: number;
  meanEffect: number;
  effectDistribution: number[];
  dimensions: string[];
}

function getClusterStats(): ClusterStats[] {
  const clusters: ClusterKey[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  const models = getConfirmatoryModels();
  const allEffects = getEffectSizes('pooled');

  return clusters.map((cluster) => {
    const dimensions = getDimensionsByCluster(cluster);
    const dimensionIds = dimensions.map((d) => d.id);

    // Get all effects for this cluster across all models
    const clusterEffects = allEffects.filter((e) =>
      dimensionIds.includes(e.dimension_id)
    );

    // Calculate mean effect across all model-dimension pairs
    const meanEffect =
      clusterEffects.length > 0
        ? clusterEffects.reduce((sum, e) => sum + e.cohen_h, 0) /
          clusterEffects.length
        : 0;

    // Get effect distribution for sparkline (mean per model)
    const effectDistribution = models.map((model) => {
      const modelEffects = clusterEffects.filter(
        (e) => e.model_id === model.id
      );
      return modelEffects.length > 0
        ? modelEffects.reduce((sum, e) => sum + e.cohen_h, 0) /
            modelEffects.length
        : 0;
    });

    return {
      cluster,
      name: CLUSTER_NAMES[cluster],
      dimensionCount: dimensions.length,
      meanEffect,
      effectDistribution,
      dimensions: dimensionIds,
    };
  });
}

interface ClusterCardProps {
  stats: ClusterStats;
  isSelected: boolean;
  onClick: () => void;
}

function ClusterCard({ stats, isSelected, onClick }: ClusterCardProps) {
  const colorClass = CLUSTER_COLORS[stats.cluster];
  const maxEffect = Math.max(...stats.effectDistribution.map(Math.abs));

  return (
    <button
      onClick={onClick}
      className={`card p-6 text-left w-full transition-all ${
        isSelected ? 'ring-2 ring-offset-2' : 'hover:scale-[1.02]'
      }`}
      style={{
        ...(isSelected && {
          '--tw-ring-color': `var(--${colorClass})`,
        } as React.CSSProperties),
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span
              className={`text-2xl font-bold ${colorClass}`}
              style={{ color: `var(--${colorClass})` }}
            >
              {stats.cluster}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>
              {stats.dimensionCount} dimensions
            </span>
          </div>
          <h3 className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
            {stats.name}
          </h3>
        </div>
        {isSelected && (
          <div className="flex-shrink-0">
            <svg
              className={`w-5 h-5 ${colorClass}`}
              style={{ color: `var(--${colorClass})` }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Mean Effect */}
      <div className="mb-4">
        <div className="text-xs mb-1" style={{ color: 'var(--color-text-soft)' }}>Mean Effect Size</div>
        <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          h = {stats.meanEffect.toFixed(3)}
        </div>
      </div>

      {/* Sparkline */}
      <div className="space-y-2">
        <div className="text-xs" style={{ color: 'var(--color-text-soft)' }}>Distribution Across Models</div>
        <div className="flex items-end gap-1 h-12">
          {stats.effectDistribution.map((effect, idx) => {
            const height = maxEffect > 0 ? (Math.abs(effect) / maxEffect) * 100 : 0;
            const isPositive = effect >= 0;

            return (
              <div
                key={`${stats.cluster}-model-${idx}`}
                className="flex-1 flex flex-col justify-end"
                title={`Model ${idx + 1}: h = ${effect.toFixed(3)}`}
              >
                <div
                  className={`w-full rounded-sm transition-all ${
                    isPositive ? 'bg-opacity-70' : 'bg-opacity-40'
                  }`}
                  style={{
                    height: `${height}%`,
                    backgroundColor: `var(--${colorClass})`,
                    minHeight: height > 0 ? '2px' : '0',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover hint */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <span className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
          {isSelected ? 'Click to clear filter' : 'Click to filter dimensions'}
        </span>
      </div>
    </button>
  );
}

interface ClusterBreakdownProps {
  onClusterSelect?: (cluster: ClusterKey | null) => void;
}

export function ClusterBreakdown({ onClusterSelect }: ClusterBreakdownProps) {
  const [selectedCluster, setSelectedCluster] = useState<ClusterKey | null>(
    null
  );
  const clusterStats = useMemo(() => getClusterStats(), []);

  const handleClusterClick = (cluster: ClusterKey) => {
    const newSelection = selectedCluster === cluster ? null : cluster;
    setSelectedCluster(newSelection);
    onClusterSelect?.(newSelection);
  };

  // Calculate summary stats
  const totalDimensions = clusterStats.reduce(
    (sum, c) => sum + c.dimensionCount,
    0
  );
  const overallMeanEffect =
    clusterStats.reduce((sum, c) => sum + c.meanEffect * c.dimensionCount, 0) /
    totalDimensions;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="section-title text-2xl mb-2">
          Cluster Breakdown
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
          Six thematic clusters organizing {totalDimensions} dimensions. Mean
          effect size across all clusters: <span className="font-mono font-semibold">h = {overallMeanEffect.toFixed(3)}</span>
        </p>
      </div>

      {/* Selected cluster details */}
      {selectedCluster && (
        <div className="card p-4" style={{ backgroundColor: 'var(--color-accent-soft)', borderColor: 'var(--color-accent)' }}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Showing dimensions in Cluster {selectedCluster}
              </span>
              <span className="text-sm ml-2" style={{ color: 'var(--color-text-mid)' }}>
                ({clusterStats.find((c) => c.cluster === selectedCluster)?.dimensionCount} dimensions)
              </span>
            </div>
            <button
              onClick={() => handleClusterClick(selectedCluster)}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--color-accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
            >
              Clear filter
            </button>
          </div>
        </div>
      )}

      {/* Cluster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clusterStats.map((stats) => (
          <ClusterCard
            key={stats.cluster}
            stats={stats}
            isSelected={selectedCluster === stats.cluster}
            onClick={() => handleClusterClick(stats.cluster)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: 'var(--color-text-soft)' }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--cluster-a)' }} />
            <span>A: Evidence-Based</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--cluster-b)' }} />
            <span>B: Value-Based</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--cluster-c)' }} />
            <span>C: Risk & Assurance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--cluster-d)' }} />
            <span>D: Information Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--cluster-e)' }} />
            <span>E: Choice Architecture</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--cluster-f)' }} />
            <span>F: Agentic Behaviors</span>
          </div>
        </div>
      </div>
    </div>
  );
}
