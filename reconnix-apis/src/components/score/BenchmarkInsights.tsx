'use client';

import Link from 'next/link';
import { SignalPresence } from '@/lib/types';
import {
  getBenchmarkSummary,
  getDimensionAnalysis,
  getTopPerformers,
} from '@/lib/benchmark-data';

interface BenchmarkInsightsProps {
  universalScore: number;
  signals: SignalPresence[];
  category?: string;
}

// Selection rate impacts from APIS research (56,640 purchase decisions)
const SELECTION_IMPACTS: Record<string, { impact: number; text: string }> = {
  dim_01: { impact: 42, text: '+42% selection rate when present' },
  dim_02: { impact: 38, text: '+38% selection rate when present' },
  dim_03: { impact: 25, text: '+25% selection rate when present' },
  dim_04: { impact: -13, text: '-13% selection rate (scarcity penalty)' },
  dim_05: { impact: 18, text: '+18% selection rate when present' },
  dim_06: { impact: 28, text: '+28% selection rate when present' },
  dim_07: { impact: 35, text: '+35% selection rate when present' },
  dim_08: { impact: 15, text: '+15% selection rate when present' },
  dim_09: { impact: 22, text: '+22% selection rate when present' },
  dim_10: { impact: 19, text: '+19% selection rate when present' },
  dim_11: { impact: 16, text: '+16% selection rate when present' },
  dim_12: { impact: 24, text: '+24% selection rate when present' },
  dim_13: { impact: 31, text: '+31% selection rate when present' },
  dim_14: { impact: 20, text: '+20% selection rate when present' },
  dim_15: { impact: 18, text: '+18% selection rate when present' },
  dim_16: { impact: 12, text: '+12% selection rate when present' },
  dim_17: { impact: 21, text: '+21% selection rate when present' },
  dim_18: { impact: 27, text: '+27% selection rate when present' },
  dim_19: { impact: 15, text: '+15% selection rate when present' },
  dim_20: { impact: 14, text: '+14% selection rate when present' },
  dim_21: { impact: 8, text: '+8% selection rate when present' },
  dim_22: { impact: 11, text: '+11% selection rate when present' },
  dim_23: { impact: 9, text: '+9% selection rate when present' },
  dim_24: { impact: 17, text: '+17% selection rate when present' },
  dim_25: { impact: 10, text: '+10% selection rate when present' },
  dim_26: { impact: 13, text: '+13% selection rate when present' },
};

// Dimension display names and descriptions
const DIMENSION_INFO: Record<string, { name: string; description: string }> = {
  dim_01: { name: 'Third-Party Authority', description: 'Expert endorsements, certifications, and awards from recognized authorities' },
  dim_02: { name: 'Social Proof', description: 'Customer reviews, ratings, and testimonials that demonstrate popularity' },
  dim_03: { name: 'Platform Endorsement', description: 'Platform badges like "Best Seller" or "Editor\'s Choice" that signal quality' },
  dim_04: { name: 'Scarcity Signaling', description: 'Limited availability or urgency messaging (can negatively impact AI selection)' },
  dim_05: { name: 'Price Anchoring', description: 'Showing savings, discounts, or "compare at" pricing to demonstrate value' },
  dim_06: { name: 'Brand Heritage', description: 'Brand history, heritage statements, and "established since" messaging' },
  dim_07: { name: 'Risk-Free Trial', description: 'Free trials, samples, or money-back guarantee offers' },
  dim_08: { name: 'Bundle Value', description: 'Product bundles, accessories, and "frequently bought together" suggestions' },
  dim_09: { name: 'Sustainability', description: 'Environmental certifications, sustainable materials, and eco-friendly claims' },
  dim_10: { name: 'Privacy Protection', description: 'Data protection statements, security badges, and privacy policies' },
  dim_11: { name: 'Local Sourcing', description: 'Local manufacturing, national sourcing, or "Made in [Country]" claims' },
  dim_12: { name: 'Innovation', description: 'New technology, patents, innovative features, and "first-of-its-kind" claims' },
  dim_13: { name: 'Established Track Record', description: 'Reliability track record, longevity claims, and "trusted for years" messaging' },
  dim_14: { name: 'Warranty', description: 'Warranty terms, guarantees, and protection plan availability' },
  dim_15: { name: 'Returns Policy', description: 'Return policy clarity, free returns, and hassle-free refund messaging' },
  dim_16: { name: 'Negative Review Handling', description: 'How negative reviews are addressed or acknowledged on the page' },
  dim_17: { name: 'Recency', description: 'Recent updates, new versions, or "updated for [year]" messaging' },
  dim_18: { name: 'Specificity', description: 'Precise specifications, exact measurements, and detailed technical data' },
  dim_19: { name: 'Comparison Framing', description: 'Direct comparisons to competitors or alternative products' },
  dim_20: { name: 'Information Depth', description: 'Easy access to full specs, documentation, and detailed information' },
  dim_21: { name: 'Appropriate Caveats', description: 'Appropriate caveats like "results may vary" that add credibility' },
  dim_22: { name: 'Tradeoff Clarity', description: 'Clear explanations of pros/cons and value-for-money tradeoffs' },
  dim_23: { name: 'Honest Limitations', description: 'Honest limitations and "not suitable for" disclaimers' },
  dim_24: { name: 'Ethical Practices', description: 'Ethical sourcing, fair trade, and responsible business practices' },
  dim_25: { name: 'Default Options', description: 'How default options and pre-selected choices are presented' },
  dim_26: { name: 'Loss Framing', description: 'Messaging about what customers might miss without the product' },
};

// Helper for ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function BenchmarkInsights({ universalScore, signals, category }: BenchmarkInsightsProps) {
  const summary = getBenchmarkSummary();
  const dimensions = getDimensionAnalysis();
  const topPerformers = getTopPerformers();

  // Calculate percentile rank
  const percentile = Math.min(99, Math.max(1, Math.round((universalScore / summary.score_range.max) * 100)));

  // Enrich signals with benchmark data and sort by impact
  const enrichedSignals = signals
    .map(signal => {
      const benchmarkDim = dimensions.find(d => d.dimension_id === signal.dimension_id);
      const impactData = SELECTION_IMPACTS[signal.dimension_id];
      const dimInfo = DIMENSION_INFO[signal.dimension_id];
      const benchmarkAvg = benchmarkDim?.avg_score ?? 0.5;

      return {
        dimension_id: signal.dimension_id,
        dimension_name: dimInfo?.name || benchmarkDim?.dimension_name || signal.dimension_id,
        description: dimInfo?.description || '',
        score: signal.score ?? 0,
        scorePercent: Math.round((signal.score ?? 0) * 100),
        impact: impactData?.impact ?? 0,
        impactText: impactData?.text ?? '',
        benchmarkAvg,
        benchmarkPercent: Math.round(benchmarkAvg * 100),
        vsAvg: ((signal.score ?? 0) - benchmarkAvg) * 100,
      };
    })
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)); // Sort by impact magnitude

  // Split into detected vs missing signals (binary)
  // A signal is "detected" if score > 0, "missing" if score = 0
  const detectedSignals = enrichedSignals.filter(s => s.score > 0);
  const missingSignals = enrichedSignals.filter(s => s.score === 0);

  // Calculate total potential impact from missing high-value signals
  const potentialImpact = missingSignals
    .filter(s => s.impact > 0)
    .reduce((sum, s) => sum + s.impact, 0);

  const getScoreColor = (score: number) => {
    if (score >= 0.4) return 'var(--color-score-high)';
    if (score >= 0.05) return 'var(--color-score-mid)';
    return 'var(--color-score-low)';
  };

  const getImpactColor = (impact: number) => {
    if (impact >= 25) return 'var(--color-score-high)';
    if (impact >= 10) return 'var(--color-score-mid)';
    if (impact < 0) return 'var(--color-score-low)';
    return 'var(--color-text-mid)';
  };

  return (
    <section className="card p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Signal Analysis
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-mid)' }}>
            What AI detected on your page and its impact on selection likelihood
          </p>
        </div>
        <Link href="/apis/benchmarks" className="btn-secondary text-sm">
          Full Benchmarks →
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--color-score-high)', color: 'white' }}>
          <p className="text-2xl font-bold">{detectedSignals.length}</p>
          <p className="text-xs opacity-90">Signals Detected</p>
        </div>
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--color-score-low)', color: 'white' }}>
          <p className="text-2xl font-bold">{missingSignals.length}</p>
          <p className="text-xs opacity-90">Signals Missing</p>
        </div>
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
          <p className="text-2xl font-bold">+{potentialImpact}%</p>
          <p className="text-xs opacity-90">Potential Impact</p>
        </div>
      </div>

      {/* Signal Details */}
      <div className="space-y-3">
        {enrichedSignals.slice(0, 10).map(signal => (
          <div
            key={signal.dimension_id}
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {signal.dimension_name}
                </span>
                {signal.impact !== 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${getImpactColor(signal.impact)}20`,
                      color: getImpactColor(signal.impact)
                    }}
                  >
                    {signal.impact > 0 ? '+' : ''}{signal.impact}% impact
                  </span>
                )}
              </div>
              <span
                className="text-lg font-bold font-mono"
                style={{ color: getScoreColor(signal.score) }}
              >
                {signal.scorePercent}%
              </span>
            </div>

            {/* Score bar */}
            <div className="relative h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--color-border)' }}>
              <div
                className="absolute left-0 top-0 bottom-0 rounded-full transition-all"
                style={{
                  width: `${signal.scorePercent}%`,
                  backgroundColor: getScoreColor(signal.score)
                }}
              />
              {/* Benchmark marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5"
                style={{
                  left: `${signal.benchmarkPercent}%`,
                  backgroundColor: 'var(--color-text-soft)'
                }}
                title={`Benchmark avg: ${signal.benchmarkPercent}%`}
              />
            </div>

            {/* Description and benchmark */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                  {signal.description}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                  Benchmark: {signal.benchmarkPercent}%
                  <span style={{ color: signal.vsAvg >= 0 ? 'var(--color-score-high)' : 'var(--color-score-low)' }}>
                    {' '}({signal.vsAvg >= 0 ? '+' : ''}{Math.round(signal.vsAvg)}%)
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {enrichedSignals.length > 10 && (
        <p className="text-center text-sm mt-4" style={{ color: 'var(--color-text-soft)' }}>
          Showing top 10 of {enrichedSignals.length} signals by impact
        </p>
      )}

      {/* Benchmark Context */}
      <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
          How You Compare
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-soft)' }}>
              Your Percentile
            </p>
            <p className="text-xl font-bold" style={{ color: getScoreColor(universalScore / 100) }}>
              {getOrdinal(percentile)}
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

      {/* Top Performers */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
          Learn From Top Performers
        </h3>
        <div className="grid md:grid-cols-3 gap-3">
          {topPerformers.slice(0, 3).map((performer, idx) => (
            <Link
              key={performer.url}
              href={`/score?url=${encodeURIComponent(performer.url)}`}
              className="p-3 rounded-lg transition-all hover:ring-2 hover:ring-offset-2"
              style={{
                backgroundColor: 'var(--color-bg)',
                ['--tw-ring-color' as string]: 'var(--color-accent)',
                ['--tw-ring-offset-color' as string]: 'var(--color-surface)'
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: 'var(--color-score-high)', color: 'white' }}
                >
                  {idx + 1}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {performer.domain}
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--color-score-high)' }}>
                {performer.universal_score}
              </p>
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                View report <span>→</span>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
