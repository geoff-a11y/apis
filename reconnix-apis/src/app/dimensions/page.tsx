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
      {(Object.keys(clusters) as ClusterKey[]).sort().map((cluster) => (
        <section key={cluster} className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-4 h-4 rounded-full bg-cluster-${cluster.toLowerCase()}`} />
            <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
              Cluster {cluster}: {CLUSTER_NAMES[cluster]}
            </h2>
            <span className="badge text-xs" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-mid)' }}>
              {clusters[cluster].length} dimensions
            </span>
          </div>

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
            <div className="space-y-6">
              {clusters[cluster].map((dim) => {
                const poles = DIMENSION_POLES[dim.id] || { low: 'Low', high: 'High' };
                return (
                  <div key={dim.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/dimensions/${dim.id}`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {dim.display_name}
                      </Link>
                      <div className="flex items-center gap-2">
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
      ))}
    </div>
  );
}
