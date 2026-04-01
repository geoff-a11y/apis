'use client';

import { SignalPresence, ClusterKey, CLUSTER_COLORS, CLUSTER_NAMES, ProductCategory } from '@/lib/types';
import { useState } from 'react';
import { CATEGORY_DATA } from '@/lib/category-data';

interface SignalInventoryProps {
  signals: SignalPresence[];
  category?: ProductCategory;
}

// Import dimensions data for display names and clusters
const DIMENSION_INFO: Record<string, { name: string; cluster: ClusterKey }> = {
  dim_01: { name: 'Third Party Authority', cluster: 'A' },
  dim_02: { name: 'Social Proof Sensitivity', cluster: 'A' },
  dim_03: { name: 'Platform Endorsement', cluster: 'A' },
  dim_04: { name: 'Scarcity Signaling', cluster: 'A' },
  dim_05: { name: 'Price Comparison Framing', cluster: 'A' },
  dim_06: { name: 'Heritage & Brand Legacy', cluster: 'A' },
  dim_07: { name: 'Risk-Free Trial Offer', cluster: 'A' },
  dim_08: { name: 'Bundling & Add-Ons', cluster: 'A' },
  dim_09: { name: 'Sustainability & Environment', cluster: 'B' },
  dim_10: { name: 'Privacy & Data Protection', cluster: 'B' },
  dim_11: { name: 'Local & National Preference', cluster: 'B' },
  dim_12: { name: 'Novelty & Innovation', cluster: 'C' },
  dim_13: { name: 'Established Reliability', cluster: 'C' },
  dim_14: { name: 'Warranty & Guarantees', cluster: 'C' },
  dim_15: { name: 'Easy Returns & Refunds', cluster: 'C' },
  dim_16: { name: 'Negative Review Transparency', cluster: 'D' },
  dim_17: { name: 'Recency & Updates', cluster: 'D' },
  dim_18: { name: 'Precision & Specificity', cluster: 'D' },
  dim_19: { name: 'Comparative Claims', cluster: 'D' },
  dim_20: { name: 'Information Availability', cluster: 'F' },
  dim_21: { name: 'Hedging & Uncertainty', cluster: 'F' },
  dim_22: { name: 'Benefit-Cost Tradeoffs', cluster: 'F' },
  dim_23: { name: 'Epistemic Humility', cluster: 'F' },
  dim_24: { name: 'Ethical Business Practices', cluster: 'E' },
  dim_25: { name: 'Default Selection', cluster: 'E' },
  dim_26: { name: 'Loss Framing', cluster: 'E' },
};

// Optimal signal levels (target values from research)
const OPTIMAL_SIGNALS: Record<string, number> = {
  dim_01: 0.9, dim_02: 0.85, dim_03: 0.8, dim_04: 0.7, dim_05: 0.75,
  dim_06: 0.7, dim_07: 0.8, dim_08: 0.65, dim_09: 0.7, dim_10: 0.85,
  dim_11: 0.6, dim_12: 0.75, dim_13: 0.8, dim_14: 0.85, dim_15: 0.9,
  dim_16: 0.5, dim_17: 0.75, dim_18: 0.8, dim_19: 0.7, dim_20: 0.6,
  dim_21: 0.55, dim_22: 0.65, dim_23: 0.5, dim_24: 0.75, dim_25: 0.7,
  dim_26: 0.6,
};

export default function SignalInventory({ signals, category = 'other' }: SignalInventoryProps) {
  const [sortBy, setSortBy] = useState<'gap' | 'cluster' | 'score'>('gap');
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryData = CATEGORY_DATA[category];

  // Calculate gaps and enrich signal data
  const enrichedSignals = signals.map(signal => {
    const info = DIMENSION_INFO[signal.dimension_id] || { name: signal.dimension_id, cluster: 'A' as ClusterKey };
    const optimal = OPTIMAL_SIGNALS[signal.dimension_id] || 0.7;
    const gap = Math.abs(optimal - signal.score);

    return {
      ...signal,
      name: info.name,
      cluster: info.cluster,
      clusterName: CLUSTER_NAMES[info.cluster],
      optimal,
      gap,
    };
  });

  // Sort signals
  const sortedSignals = [...enrichedSignals].sort((a, b) => {
    if (sortBy === 'gap') return b.gap - a.gap;
    if (sortBy === 'cluster') {
      if (a.cluster !== b.cluster) return a.cluster.localeCompare(b.cluster);
      return b.gap - a.gap;
    }
    return b.score - a.score;
  });

  const getSignalColor = (score: number): string => {
    if (score >= 0.7) return 'bg-score-high';
    if (score >= 0.4) return 'bg-score-mid';
    return 'bg-score-low';
  };

  const getSignalTextColor = (score: number): string => {
    if (score >= 0.7) return 'text-score-high';
    if (score >= 0.4) return 'text-score-mid';
    return 'text-score-low';
  };

  const getClusterColor = (cluster: ClusterKey): string => {
    return `bg-cluster-${cluster.toLowerCase()}`;
  };

  const getClusterTextColor = (cluster: ClusterKey): string => {
    return `text-cluster-${cluster.toLowerCase()}`;
  };

  return (
    <section className="card p-8">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Signal Inventory
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
            Signal strength for all 26 content dimensions (0 = absent, 100 = strong presence)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
            {isExpanded ? 'Hide details' : 'Show all signals'}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--color-text-soft)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Sort controls */}
          <div className="flex justify-end gap-2 mt-6 mb-4">
            <button
              onClick={(e) => { e.stopPropagation(); setSortBy('gap'); }}
              className="px-3 py-1.5 text-sm rounded transition-colors"
              style={
                sortBy === 'gap'
                  ? { backgroundColor: 'var(--color-accent)', color: 'white' }
                  : { backgroundColor: 'var(--color-bg)', color: 'var(--color-text-mid)' }
              }
            >
              By Gap
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSortBy('cluster'); }}
              className="px-3 py-1.5 text-sm rounded transition-colors"
              style={
                sortBy === 'cluster'
                  ? { backgroundColor: 'var(--color-accent)', color: 'white' }
                  : { backgroundColor: 'var(--color-bg)', color: 'var(--color-text-mid)' }
              }
            >
              By Cluster
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSortBy('score'); }}
              className="px-3 py-1.5 text-sm rounded transition-colors"
              style={
                sortBy === 'score'
                  ? { backgroundColor: 'var(--color-accent)', color: 'white' }
                  : { backgroundColor: 'var(--color-bg)', color: 'var(--color-text-mid)' }
              }
            >
              By Score
            </button>
          </div>

      {/* Signal bars */}
      <div className="space-y-3">
        {sortedSignals.map(signal => (
          <div key={signal.dimension_id}>
            <div
              className="flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-bg)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
              onClick={() => setExpandedSignal(
                expandedSignal === signal.dimension_id ? null : signal.dimension_id
              )}
            >
              {/* Cluster badge */}
              <div className={`w-8 h-8 rounded flex items-center justify-center ${getClusterColor(signal.cluster)} bg-opacity-20`}>
                <span className={`font-semibold text-xs ${getClusterTextColor(signal.cluster)}`}>
                  {signal.cluster}
                </span>
              </div>

              {/* Signal name */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                  {signal.name}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                  {signal.clusterName}
                </div>
              </div>

              {/* Signal bar */}
              <div className="flex-1 max-w-xs">
                <div className="h-6 rounded-full overflow-hidden relative" style={{ backgroundColor: 'var(--color-border)' }}>
                  {/* Current signal */}
                  <div
                    className={`h-full ${getSignalColor(signal.score)} transition-all`}
                    style={{ width: `${signal.score * 100}%` }}
                  />
                  {/* Optimal target marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 opacity-50"
                    style={{ left: `${signal.optimal * 100}%`, backgroundColor: 'var(--color-text)' }}
                  />
                </div>
              </div>

              {/* Score display */}
              <div className="w-24 text-right">
                <div className={`font-mono text-sm font-medium ${getSignalTextColor(signal.score)}`}>
                  {Math.round(signal.score * 100)}/100
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                  {signal.gap > 0.1 ? `+${Math.round(signal.gap * 100)} to target` : 'On target'}
                </div>
              </div>

              {/* Expand icon */}
              <div style={{ color: 'var(--color-text-soft)' }}>
                <svg
                  className={`w-5 h-5 transition-transform ${expandedSignal === signal.dimension_id ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expanded details */}
            {expandedSignal === signal.dimension_id && signal.zone_contributions.length > 0 && (
              <div className="ml-12 mt-2 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <h4 className="font-medium text-sm mb-3" style={{ color: 'var(--color-text)' }}>Zone Contributions</h4>
                <div className="space-y-2">
                  {signal.zone_contributions.map((contrib) => (
                    <div key={`${signal.dimension_id}-${contrib.zone}`} className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize" style={{ color: 'var(--color-text-mid)' }}>{contrib.zone}</span>
                        <span className="font-mono" style={{ color: 'var(--color-text)' }}>{(contrib.score ?? 0).toFixed(2)}</span>
                      </div>
                      {contrib.evidence && (
                        <div className="text-xs pl-3" style={{ color: 'var(--color-text-soft)', borderLeft: '2px solid var(--color-border)' }}>
                          "{contrib.evidence}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

          {/* Legend */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--color-text-soft)' }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 opacity-50" style={{ backgroundColor: 'var(--color-text)' }}></div>
                <span>Target level</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-score-high"></div>
                <span>Strong (70-100)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-score-mid"></div>
                <span>Moderate (40-70)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-score-low"></div>
                <span>Weak (0-40)</span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
