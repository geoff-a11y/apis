// src/app/dimensions/page.tsx — Dimensions explorer (Phase 1)
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getDimensions, getICCResults, getEffectSizes, getDimensionMeanEffect, getConfirmatoryModels } from '@/lib/data';
import { CLUSTER_NAMES, type ClusterKey } from '@/lib/types';
import { ContextSwitcher, ContextBadge, type Context } from '@/components/ui/ContextSwitcher';
import DimensionSpectrum, { DIMENSION_POLES } from '@/components/charts/DimensionSpectrum';

// Model colors for legend
const MODEL_COLORS: Record<string, string> = {
  gpt54: '#10A37F',
  o3: '#374151',
  gemini: '#4285F4',
  claude: '#D4A853',
  llama: '#0064E0',
  sonar: '#20808D',
  perplexity: '#20808D',
};

// Cluster descriptions explaining what each cluster measures
const CLUSTER_DESCRIPTIONS: Record<ClusterKey, string> = {
  A: 'Classic persuasion signals derived from human psychology research. These dimensions replicate findings from Filandrianos et al. (2025) to test whether AI agents respond to the same influence tactics that work on humans.',
  B: 'Values-driven purchasing factors that reflect ethical and social preferences. These dimensions measure how AI agents weight sustainability, privacy, and local origin claims when making recommendations.',
  C: 'Risk perception and mitigation signals that affect purchase confidence. These dimensions capture how AI agents respond to uncertainty reducers like warranties, return policies, and novelty framing.',
  D: 'Information gathering and evaluation patterns. These dimensions reveal how AI agents process review sentiment, recency cues, specificity levels, and comparative framing when assessing products.',
  E: 'Decision architecture elements that shape choice contexts. These dimensions test whether AI agents are susceptible to ethical framing, default options, and loss/gain presentation.',
  F: 'Multi-turn interaction behaviors in extended conversations. These dimensions measure how AI agents gather information, revise opinions, and calibrate confidence across multiple exchanges.',
};

// Short explanations for each dimension
const DIMENSION_EXPLANATIONS: Record<string, string> = {
  dim_01: 'Measures responsiveness to expert endorsements and professional credentials. High values indicate the model weighs authority claims heavily in recommendations.',
  dim_02: 'Tests sensitivity to popularity signals like bestseller badges and "most purchased" claims. Models scoring high prioritize social proof in decisions.',
  dim_03: 'Evaluates trust in platform-provided badges such as "Amazon\'s Choice" or "Top Rated". High scores suggest deference to marketplace curation.',
  dim_04: 'Assesses reaction to time pressure tactics like "limited stock" and countdown timers. Models scoring high may be influenced by artificial urgency.',
  dim_05: 'Measures susceptibility to price anchoring, where a high "original" price makes the current price seem like a deal. High values indicate anchor influence.',
  dim_06: 'Tests preference for established brands over generic alternatives. High scores suggest brand familiarity influences recommendations.',
  dim_07: 'Evaluates how free trials, samples, or money-back guarantees affect recommendations. High values indicate trial offers increase selection likelihood.',
  dim_08: 'Measures preference for product bundles over individual items. Models scoring high tend to recommend bundled offerings.',
  dim_09: 'Tests weight given to environmental and sustainability claims. High scores indicate eco-friendly messaging increases recommendation likelihood.',
  dim_10: 'Assesses importance of data privacy claims in product descriptions. Models scoring high prioritize privacy-focused products.',
  dim_11: 'Measures preference for locally-made or domestically-sourced products. High values indicate origin claims influence recommendations.',
  dim_12: 'Tests willingness to recommend new or innovative products versus established alternatives. High scores indicate openness to novel options.',
  dim_13: 'Evaluates tendency to recommend safer, lower-risk options. Models scoring high may avoid products with any uncertainty signals.',
  dim_14: 'Measures how warranty coverage affects recommendations. High values indicate strong preference for warranted products.',
  dim_15: 'Tests sensitivity to return policy generosity. Models scoring high favor products with flexible return options.',
  dim_16: 'Evaluates how negative reviews affect recommendations. High scores indicate negative information is weighted heavily.',
  dim_17: 'Measures preference for recent reviews over older ones. Models scoring high may discount historical feedback.',
  dim_18: 'Tests preference for detailed specifications over vague descriptions. High values indicate specific claims are more persuasive.',
  dim_19: 'Evaluates how side-by-side comparisons influence recommendations. Models scoring high may be swayed by favorable comparative framing.',
  dim_20: 'Measures thoroughness in exploring product information before recommending. High scores indicate deep analysis behavior.',
  dim_21: 'Tests tendency to ask clarifying questions versus making assumptions. Models scoring high seek more information before deciding.',
  dim_22: 'Evaluates willingness to change recommendations when presented with new information. High values indicate opinion flexibility.',
  dim_23: 'Measures alignment between stated confidence and actual recommendation accuracy. High scores indicate well-calibrated uncertainty.',
  dim_24: 'Tests influence of ethical claims on recommendations. Models scoring high prioritize products with ethical positioning.',
  dim_25: 'Evaluates tendency to recommend default or pre-selected options. High values indicate susceptibility to default bias.',
  dim_26: 'Measures asymmetric response to gain vs. loss framing. Models scoring high react more strongly to potential losses.',
};

type ViewMode = 'list' | 'spectrum';

export default function DimensionsPage() {
  const [selectedContext, setSelectedContext] = useState<Context>('pooled');
  const [viewMode, setViewMode] = useState<ViewMode>('spectrum');

  const dimensions = getDimensions();
  const iccResults = getICCResults();
  const models = getConfirmatoryModels();

  // Group dimensions by cluster
  const clusters = dimensions.reduce((acc, dim) => {
    if (!acc[dim.cluster]) acc[dim.cluster] = [];
    acc[dim.cluster].push(dim);
    return acc;
  }, {} as Record<ClusterKey, typeof dimensions>);

  const getICC = (dimId: string) =>
    iccResults.find((r) => r.dimension_id === dimId)?.icc ?? null;

  // Get context-specific mean effect for each dimension
  const getMeanEffect = (dimId: string) => {
    const effects = getEffectSizes(selectedContext).filter(e => e.dimension_id === dimId);
    if (effects.length === 0) return null;
    return effects.reduce((sum, e) => sum + e.cohen_h, 0) / effects.length;
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Dimensions
        </h1>
        <p className="max-w-2xl" style={{ color: 'var(--color-text-mid)' }}>
          {dimensions.length} content dimensions organized into 6 clusters.
          Each dimension represents a distinct signal that can be manipulated
          in product content to influence AI purchase recommendations.
        </p>
      </section>

      {/* Controls */}
      <section className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>View effects for:</span>
            <ContextSwitcher
              value={selectedContext}
              onChange={setSelectedContext}
              showPooled={true}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--color-text-soft)' }}>View:</span>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 text-sm rounded-md transition-colors"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: viewMode === 'list' ? 'white' : 'var(--color-text-soft)',
              }}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('spectrum')}
              className="px-3 py-1.5 text-sm rounded-md transition-colors"
              style={{
                backgroundColor: viewMode === 'spectrum' ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: viewMode === 'spectrum' ? 'white' : 'var(--color-text-soft)',
              }}
            >
              Spectrum
            </button>
          </div>
        </div>

        {/* Model legend for spectrum view */}
        {viewMode === 'spectrum' && (
          <div className="flex flex-wrap items-center gap-4 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>Models:</span>
            {models.map((model) => (
              <div key={model.id} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: MODEL_COLORS[model.id] || '#6b7280' }}
                />
                <span className="text-xs" style={{ color: 'var(--color-text-mid)' }}>{model.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cluster sections */}
      {(Object.keys(clusters) as ClusterKey[]).sort().map((cluster) => {
        // Calculate cluster average effect size
        const clusterEffects = clusters[cluster].map(dim => getMeanEffect(dim.id)).filter((e): e is number => e !== null);
        const clusterAvgEffect = clusterEffects.length > 0
          ? clusterEffects.reduce((sum, e) => sum + e, 0) / clusterEffects.length
          : null;

        return (
        <section key={cluster} className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className={`w-4 h-4 rounded-full bg-cluster-${cluster.toLowerCase()}`} />
            <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
              Cluster {cluster}: {CLUSTER_NAMES[cluster]}
            </h2>
            <span className="badge text-xs" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-mid)' }}>
              {clusters[cluster].length} dimensions
            </span>
            {clusterAvgEffect !== null && (
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  backgroundColor: clusterAvgEffect >= 0.2 ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-surface-2)',
                  color: clusterAvgEffect >= 0.2 ? '#22c55e' : 'var(--color-text-soft)',
                }}
              >
                avg h = {clusterAvgEffect.toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-soft)' }}>
            {CLUSTER_DESCRIPTIONS[cluster]}
          </p>

          {viewMode === 'list' ? (
            /* List view */
            <div className="grid gap-3">
              {clusters[cluster].map((dim) => {
                const icc = getICC(dim.id);
                const meanEffect = getMeanEffect(dim.id);
                return (
                  <Link
                    key={dim.id}
                    href={`/dimensions/${dim.id}`}
                    className="flex items-center justify-between p-4 rounded-lg transition-colors"
                    style={{
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-accent)';
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>{dim.display_name}</h3>
                      <p className="text-sm mt-1 line-clamp-1" style={{ color: 'var(--color-text-soft)' }}>
                        {dim.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm flex-shrink-0 ml-4">
                      {meanEffect !== null && (
                        <span className="font-mono" style={{ color: 'var(--color-text)' }}>
                          h = {meanEffect.toFixed(3)}
                        </span>
                      )}
                      {icc !== null && (
                        <span className="font-mono" style={{ color: icc >= 0.7 ? 'var(--color-score-high)' : 'var(--color-score-mid)' }}>
                          ICC: {icc.toFixed(2)}
                        </span>
                      )}
                      <span className={`badge ${dim.evidence_tier === 'a' ? 'badge-green' : dim.evidence_tier === 'b' ? 'badge-amber' : 'badge-red'}`}>
                        Tier {dim.evidence_tier.toUpperCase()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Spectrum view */
            <div className="space-y-8">
              {clusters[cluster].map((dim) => {
                const poles = DIMENSION_POLES[dim.id] || { low: 'Low', high: 'High' };
                const meanEffect = getMeanEffect(dim.id);
                return (
                  <div key={dim.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dimensions/${dim.id}`}
                            className="font-medium hover:underline"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {dim.display_name}
                          </Link>
                          {meanEffect !== null && (
                            <span
                              className="text-xs font-mono px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: meanEffect >= 0.2 ? 'rgba(34, 197, 94, 0.1)' : meanEffect <= -0.2 ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-surface-2)',
                                color: meanEffect >= 0.2 ? '#22c55e' : meanEffect <= -0.2 ? '#ef4444' : 'var(--color-text-soft)',
                              }}
                            >
                              h={meanEffect > 0 ? '+' : ''}{meanEffect.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
                          {DIMENSION_EXPLANATIONS[dim.id]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-soft)' }}>
                          {poles.low}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>→</span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-soft)' }}>
                          {poles.high}
                        </span>
                      </div>
                    </div>
                    <DimensionSpectrum dimension={dim} showLabels={false} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
        );
      })}
    </div>
  );
}
