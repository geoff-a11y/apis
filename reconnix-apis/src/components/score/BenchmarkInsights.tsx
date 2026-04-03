'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignalPresence } from '@/lib/types';
import {
  getBenchmarkSummary,
  getDimensionAnalysis,
} from '@/lib/benchmark-data';

interface BenchmarkInsightsProps {
  universalScore: number;
  signals: SignalPresence[];
  category?: string;
}

// Selection rate impacts from APIS research (56,640 purchase decisions)
// Positive = helps selection when present, Negative = hurts selection when present
const SELECTION_IMPACTS: Record<string, { impact: number; text: string }> = {
  dim_01: { impact: 42, text: 'Third-party endorsements boost selection by 42%' },
  dim_02: { impact: 38, text: 'Social proof increases selection by 38%' },
  dim_03: { impact: 25, text: 'Platform badges boost selection by 25%' },
  dim_04: { impact: -13, text: 'Scarcity tactics reduce selection by 13%' },
  dim_05: { impact: 18, text: 'Price anchoring increases selection by 18%' },
  dim_06: { impact: 28, text: 'Brand heritage boosts selection by 28%' },
  dim_07: { impact: 35, text: 'Risk-free trials boost selection by 35%' },
  dim_08: { impact: 15, text: 'Bundle value increases selection by 15%' },
  dim_09: { impact: 22, text: 'Sustainability signals boost selection by 22%' },
  dim_10: { impact: 19, text: 'Privacy protection increases selection by 19%' },
  dim_11: { impact: 16, text: 'Local sourcing boosts selection by 16%' },
  dim_12: { impact: 24, text: 'Innovation signals boost selection by 24%' },
  dim_13: { impact: 31, text: 'Track record increases selection by 31%' },
  dim_14: { impact: 20, text: 'Warranty visibility boosts selection by 20%' },
  dim_15: { impact: 18, text: 'Clear returns policy increases selection by 18%' },
  dim_16: { impact: 12, text: 'Addressing negative reviews helps by 12%' },
  dim_17: { impact: 21, text: 'Recency signals boost selection by 21%' },
  dim_18: { impact: 27, text: 'Specific claims increase selection by 27%' },
  dim_19: { impact: 15, text: 'Comparison framing boosts selection by 15%' },
  dim_20: { impact: 14, text: 'Information depth increases selection by 14%' },
  dim_21: { impact: 8, text: 'Appropriate caveats add credibility (+8%)' },
  dim_22: { impact: 11, text: 'Tradeoff clarity increases selection by 11%' },
  dim_23: { impact: 9, text: 'Honest limitations build trust (+9%)' },
  dim_24: { impact: 17, text: 'Ethical practices boost selection by 17%' },
  dim_25: { impact: 10, text: 'Good default options help by 10%' },
  dim_26: { impact: 13, text: 'Loss framing increases selection by 13%' },
};

// Dimension display names and descriptions
const DIMENSION_INFO: Record<string, { name: string; description: string }> = {
  dim_01: { name: 'Third-Party Authority', description: 'Expert endorsements, certifications, and awards' },
  dim_02: { name: 'Social Proof', description: 'Customer reviews, ratings, and testimonials' },
  dim_03: { name: 'Platform Endorsement', description: 'Platform badges like "Best Seller" or "Editor\'s Choice"' },
  dim_04: { name: 'Scarcity Signaling', description: 'Limited availability or urgency messaging' },
  dim_05: { name: 'Price Anchoring', description: 'Showing savings, discounts, or "compare at" pricing' },
  dim_06: { name: 'Brand Heritage', description: 'Brand history and "established since" messaging' },
  dim_07: { name: 'Risk-Free Trial', description: 'Free trials, samples, or money-back guarantees' },
  dim_08: { name: 'Bundle Value', description: 'Product bundles and included accessories' },
  dim_09: { name: 'Sustainability', description: 'Environmental certifications and eco-friendly claims' },
  dim_10: { name: 'Privacy Protection', description: 'Data protection and security assurances' },
  dim_11: { name: 'Local Sourcing', description: 'Local manufacturing or "Made in [Country]"' },
  dim_12: { name: 'Innovation', description: 'Patents, new technology, cutting-edge features' },
  dim_13: { name: 'Established Track Record', description: 'Reliability history and longevity claims' },
  dim_14: { name: 'Warranty', description: 'Warranty terms and protection plans' },
  dim_15: { name: 'Returns Policy', description: 'Clear return and refund processes' },
  dim_16: { name: 'Negative Review Handling', description: 'How negative feedback is addressed' },
  dim_17: { name: 'Recency', description: 'Recent updates or "new for [year]" messaging' },
  dim_18: { name: 'Specificity', description: 'Precise specifications and quantified claims' },
  dim_19: { name: 'Comparison Framing', description: 'Direct comparisons to alternatives' },
  dim_20: { name: 'Information Depth', description: 'Access to detailed specs and documentation' },
  dim_21: { name: 'Appropriate Caveats', description: 'Credibility-building disclaimers' },
  dim_22: { name: 'Tradeoff Clarity', description: 'Clear pros/cons explanations' },
  dim_23: { name: 'Honest Limitations', description: 'Transparent "not suitable for" disclaimers' },
  dim_24: { name: 'Ethical Practices', description: 'Fair trade and responsible sourcing' },
  dim_25: { name: 'Default Options', description: 'How pre-selected options are presented' },
  dim_26: { name: 'Loss Framing', description: 'What customers miss without the product' },
};

export default function BenchmarkInsights({ universalScore, signals, category }: BenchmarkInsightsProps) {
  const [showAllSignals, setShowAllSignals] = useState(false);
  // Use combined benchmark summary (544 pages) for comparison
  const summary = getBenchmarkSummary('combined');
  const dimensions = getDimensionAnalysis();

  // Enrich signals with impact data
  const enrichedSignals = signals.map(signal => {
    const benchmarkDim = dimensions.find(d => d.dimension_id === signal.dimension_id);
    const impactData = SELECTION_IMPACTS[signal.dimension_id];
    const dimInfo = DIMENSION_INFO[signal.dimension_id];

    // Extract evidence from zone_contributions
    const evidence = signal.zone_contributions
      ?.filter(z => z.evidence && z.evidence.trim())
      .map(z => z.evidence)
      .join(' | ') || '';

    return {
      dimension_id: signal.dimension_id,
      name: dimInfo?.name || benchmarkDim?.dimension_name || signal.dimension_id,
      description: dimInfo?.description || '',
      score: signal.score ?? 0,
      impact: impactData?.impact ?? 0,
      impactText: impactData?.text ?? '',
      evidence: evidence.slice(0, 150),
      isDetected: (signal.score ?? 0) > 0.1,
    };
  });

  // Categorize signals:
  // HELPING: detected (score > 0.1) AND positive impact
  // HURTING: detected with negative impact OR missing high-impact signals (impact >= 20)
  // NEUTRAL: not detected with low impact
  const helpingSignals = enrichedSignals
    .filter(s => s.isDetected && s.impact > 0)
    .sort((a, b) => b.impact - a.impact);

  const hurtingSignals = enrichedSignals
    .filter(s =>
      (s.isDetected && s.impact < 0) || // Detected negative signals (like scarcity)
      (!s.isDetected && s.impact >= 20)  // Missing high-impact positive signals
    )
    .sort((a, b) => {
      // Sort: detected negative first, then missing high-impact by impact
      if (a.isDetected && a.impact < 0) return -1;
      if (b.isDetected && b.impact < 0) return 1;
      return b.impact - a.impact;
    });

  const neutralSignals = enrichedSignals
    .filter(s => !s.isDetected && s.impact < 20 && s.impact >= 0)
    .sort((a, b) => b.impact - a.impact);

  return (
    <section className="card p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Signal Analysis
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-mid)' }}>
            What&apos;s helping and hurting your AI recommendation likelihood
          </p>
        </div>
        <Link href="/apis/benchmarks" className="btn-secondary text-sm">
          Full Benchmarks →
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-score-high)' }}>
            {helpingSignals.length}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-score-high)' }}>Helping</p>
        </div>
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-score-low)' }}>
            {hurtingSignals.length}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-score-low)' }}>Hurting</p>
        </div>
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-text-mid)' }}>
            {neutralSignals.length}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Neutral</p>
        </div>
      </div>

      {/* Top Helpers */}
      {helpingSignals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-score-high)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-score-high)' }} />
            Signals Helping Your Score
          </h3>
          <div className="space-y-2">
            {helpingSignals.slice(0, 5).map(signal => (
              <div
                key={signal.dimension_id}
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {signal.name}
                  </span>
                  <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-score-high)' }}>
                    +{signal.impact}%
                  </span>
                </div>
                {signal.evidence && (
                  <p className="text-xs italic" style={{ color: 'var(--color-text-soft)' }}>
                    &quot;{signal.evidence}&quot;
                  </p>
                )}
                {!signal.evidence && (
                  <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                    {signal.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hurting Signals */}
      {hurtingSignals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-score-low)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-score-low)' }} />
            Signals Hurting Your Score
          </h3>
          <div className="space-y-2">
            {hurtingSignals.slice(0, 5).map(signal => (
              <div
                key={signal.dimension_id}
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {signal.name}
                  </span>
                  <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-score-low)' }}>
                    {signal.isDetected && signal.impact < 0
                      ? `${signal.impact}%`
                      : `Missing (+${signal.impact}%)`
                    }
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                  {signal.isDetected && signal.impact < 0
                    ? `This signal is detected and hurts AI selection by ${Math.abs(signal.impact)}%`
                    : `Missing this high-impact signal costs you ${signal.impact}% in selection likelihood`
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Signals Toggle */}
      <button
        onClick={() => setShowAllSignals(!showAllSignals)}
        className="w-full py-2 text-sm font-medium rounded-lg transition-colors"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-accent)'
        }}
      >
        {showAllSignals ? '▼ Hide' : '▶ Show'} All {enrichedSignals.length} Signals
      </button>

      {/* Full Signal Inventory */}
      {showAllSignals && (
        <div className="mt-4 space-y-2">
          {enrichedSignals
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
            .map(signal => (
            <div
              key={signal.dimension_id}
              className="p-3 rounded-lg flex items-center gap-4"
              style={{ backgroundColor: 'var(--color-bg)' }}
            >
              {/* Status indicator */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{
                  backgroundColor: signal.isDetected
                    ? (signal.impact < 0 ? 'var(--color-score-low)' : 'var(--color-score-high)')
                    : 'var(--color-border)',
                  color: signal.isDetected ? 'white' : 'var(--color-text-soft)'
                }}
              >
                {signal.isDetected ? '✓' : '✗'}
              </div>

              {/* Signal info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {signal.name}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: signal.impact < 0
                        ? 'rgba(239, 68, 68, 0.15)'
                        : signal.impact >= 20
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'var(--color-bg)',
                      color: signal.impact < 0
                        ? 'var(--color-score-low)'
                        : signal.impact >= 20
                          ? 'var(--color-score-high)'
                          : 'var(--color-text-mid)'
                    }}
                  >
                    {signal.impact > 0 ? '+' : ''}{signal.impact}%
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-soft)' }}>
                  {signal.description}
                </p>
              </div>

              {/* Score */}
              <div className="flex-shrink-0 text-right">
                <span
                  className="text-sm font-mono font-bold"
                  style={{
                    color: signal.isDetected
                      ? (signal.impact < 0 ? 'var(--color-score-low)' : 'var(--color-score-high)')
                      : 'var(--color-text-soft)'
                  }}
                >
                  {Math.round(signal.score * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Benchmark Context */}
      <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-soft)' }}>
              Your Score
            </p>
            <p className="text-xl font-bold" style={{
              color: universalScore >= 65 ? 'var(--color-score-high)'
                : universalScore >= 45 ? 'var(--color-score-mid)'
                : 'var(--color-score-low)'
            }}>
              {Math.round(universalScore)}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-soft)' }}>
              Benchmark Avg
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--color-text-mid)' }}>
              {summary.avg_score}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-soft)' }}>
              Top Performer
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--color-score-high)' }}>
              {summary.score_range.max}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
