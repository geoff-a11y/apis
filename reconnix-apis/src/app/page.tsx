'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getGlobalStats, getStrongestEffect, getExtremeModelPairs, getDimension, getEffectSizes } from '@/lib/data';
import { ClusterBreakdown } from '@/components/charts/ClusterBreakdown';
import { ContextSwitcher, ContextBadge, type Context } from '@/components/ui/ContextSwitcher';

export default function DashboardPage() {
  const [selectedContext, setSelectedContext] = useState<Context>('pooled');

  const stats = getGlobalStats();
  const strongestEffect = getStrongestEffect();
  const { mostSimilar, leastSimilar } = getExtremeModelPairs();

  const contextEffects = getEffectSizes(selectedContext);
  const contextStrongestEffect = contextEffects.length > 0
    ? contextEffects.reduce((max, e) =>
        Math.abs(e.cohen_h) > Math.abs(max.cohen_h) ? e : max
      )
    : null;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-8">
        <h1 className="section-title text-4xl mb-4">
          Machine Likeability Intelligence
        </h1>
        <p className="section-subtitle mx-auto text-center">
          Empirical measurement of how AI agents evaluate content for purchase recommendations.
          {stats.dimensions} dimensions measured across {stats.models} frontier models.
        </p>
      </section>

      {/* Key Metrics - DSS Style */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="metric-xl">{stats.dimensions}</div>
          <div className="metric-label mt-2">Dimensions</div>
        </div>
        <div className="text-center">
          <div className="metric-xl">{stats.models}</div>
          <div className="metric-label mt-2">AI Models</div>
        </div>
        <div className="text-center">
          <div className="metric-xl">{(stats.trials / 1000).toFixed(0)}K</div>
          <div className="metric-label mt-2">Trials</div>
        </div>
        <div className="text-center">
          <div className="metric-xl" style={{ color: 'var(--color-score-high)' }}>
            {strongestEffect ? strongestEffect.cohen_h.toFixed(2) : '---'}
          </div>
          <div className="metric-label mt-2">Peak Effect (h)</div>
        </div>
      </section>

      {/* Context Switcher */}
      <section className="flex justify-center">
        <div
          className="inline-flex items-center gap-4 px-6 py-3 rounded-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)'
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>
            Filter by context:
          </span>
          <ContextSwitcher
            value={selectedContext}
            onChange={setSelectedContext}
            showPooled={true}
          />
        </div>
      </section>

      {/* Stats Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="metric-label">Total Trials</span>
            <ContextBadge context={selectedContext} className="text-xs" />
          </div>
          <div className="metric-large" style={{ color: 'var(--color-text)' }}>
            {selectedContext === 'pooled'
              ? stats.trials.toLocaleString()
              : contextEffects.length > 0
              ? Math.round(contextEffects[0].n_trials * contextEffects.length / 26).toLocaleString()
              : stats.trials.toLocaleString()}
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-soft)' }}>
            A/B preference comparisons
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="metric-label">Strongest Effect</span>
            {selectedContext !== 'pooled' && (
              <ContextBadge context={selectedContext} className="text-xs" />
            )}
          </div>
          {contextStrongestEffect ? (
            <>
              <div className="metric-large" style={{ color: 'var(--color-score-high)' }}>
                h = {contextStrongestEffect.cohen_h.toFixed(2)}
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-soft)' }}>
                {getDimension(contextStrongestEffect.dimension_id)?.display_name ?? contextStrongestEffect.dimension_id}
              </p>
            </>
          ) : (
            <div className="metric-large" style={{ color: 'var(--color-text-soft)' }}>---</div>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-3">
            <span className="metric-label">Model Similarity</span>
          </div>
          {mostSimilar && leastSimilar ? (
            <>
              <div className="metric-large">
                {(leastSimilar.similarity * 100).toFixed(0)}–{(mostSimilar.similarity * 100).toFixed(0)}%
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-soft)' }}>
                Fingerprint cosine similarity range
              </p>
            </>
          ) : (
            <div className="metric-large" style={{ color: 'var(--color-text-soft)' }}>---</div>
          )}
        </div>
      </section>

      {/* What is APIS */}
      <section
        className="p-8 rounded-xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)'
        }}
      >
        <h2 className="section-title text-2xl mb-4">What is APIS?</h2>
        <div className="space-y-4 max-w-3xl">
          <p style={{ color: 'var(--color-text-mid)' }}>
            The AI Purchase Intelligence System (APIS) is a pre-registered research study measuring
            how frontier AI models respond to different content signals when making purchase recommendations.
            Using a forced-choice A/B methodology, we quantify the causal effect of {stats.dimensions} distinct
            content dimensions on AI preference.
          </p>
          <p style={{ color: 'var(--color-text-mid)' }}>
            This research provides empirical guidance for businesses optimizing content for AI-mediated
            commerce. As AI agents increasingly influence purchase decisions, understanding what makes
            content "machine likeable" becomes critical for digital success.
          </p>
        </div>
        <div className="mt-6 flex gap-4">
          <Link href="/methodology" className="btn-primary">
            Read Methodology
          </Link>
          <a
            href={stats.osf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            View Pre-Registration
          </a>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/score"
          className="card p-6 hover:border-[var(--color-accent)] transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent-soft)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>Machine Likeability Score Calculator</h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
            Score any product URL against all {stats.dimensions} dimensions and get optimization recommendations.
          </p>
        </Link>

        <Link
          href="/fingerprints"
          className="card p-6 hover:border-[var(--color-accent)] transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent-soft)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>Model Fingerprints</h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
            Explore unique behavioral profiles for each AI model across all dimensions.
          </p>
        </Link>

        <Link
          href="/dimensions"
          className="card p-6 hover:border-[var(--color-accent)] transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent-soft)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>26 Dimensions</h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
            Deep dive into each psychological dimension and its effect on AI recommendations.
          </p>
        </Link>
      </section>

      {/* Cluster Breakdown */}
      <section>
        <ClusterBreakdown />
      </section>
    </div>
  );
}
