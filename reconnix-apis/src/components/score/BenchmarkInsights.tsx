'use client';

import Link from 'next/link';
import { SignalPresence } from '@/lib/types';
import {
  getBenchmarkSummary,
  getBenchmarkCategories,
  getDimensionAnalysis,
  getTopPerformers,
  formatDimensionName,
} from '@/lib/benchmark-data';

interface BenchmarkInsightsProps {
  universalScore: number;
  signals: SignalPresence[];
  category?: string;
}

// One-sentence explanations for each dimension
const DIMENSION_EXPLANATIONS: Record<string, string> = {
  dim_01: 'Expert endorsements, certifications, and awards from recognized authorities.',
  dim_02: 'Customer reviews, ratings, and testimonials that demonstrate popularity.',
  dim_03: 'Platform badges like "Best Seller" or "Amazon\'s Choice" that signal quality.',
  dim_04: 'Limited availability, countdown timers, or "while supplies last" messaging.',
  dim_05: 'Showing savings, discounts, or "compare at" pricing to demonstrate value.',
  dim_06: 'Brand history, heritage statements, and "established since" messaging.',
  dim_07: 'Free trials, samples, or money-back guarantee offers.',
  dim_08: 'Product bundles, accessories, and "frequently bought together" suggestions.',
  dim_09: 'Environmental certifications, sustainable materials, and eco-friendly claims.',
  dim_10: 'Data protection statements, security badges, and privacy policies.',
  dim_11: 'Local manufacturing, national sourcing, or "Made in [Country]" claims.',
  dim_12: 'New technology, patents, innovative features, and "first-of-its-kind" claims.',
  dim_13: 'Reliability track record, longevity claims, and "trusted for years" messaging.',
  dim_14: 'Warranty terms, guarantees, and protection plan availability.',
  dim_15: 'Return policy clarity, free returns, and hassle-free refund messaging.',
  dim_16: 'How negative reviews are addressed or acknowledged on the page.',
  dim_17: 'Recent updates, new versions, or "updated for [year]" messaging.',
  dim_18: 'Precise specifications, exact measurements, and detailed technical data.',
  dim_19: 'Direct comparisons to competitors or alternative products.',
  dim_20: 'Easy access to full specs, documentation, and detailed information.',
  dim_21: 'Appropriate caveats like "results may vary" that add credibility.',
  dim_22: 'Clear explanations of pros/cons and value-for-money tradeoffs.',
  dim_23: 'Honest limitations and "not suitable for" disclaimers.',
  dim_24: 'Ethical sourcing, fair trade, and responsible business practices.',
  dim_25: 'How default options and pre-selected choices are presented.',
  dim_26: 'Messaging about what customers might miss without the product.',
};

export default function BenchmarkInsights({ universalScore, signals, category }: BenchmarkInsightsProps) {
  const summary = getBenchmarkSummary();
  const categories = getBenchmarkCategories();
  const dimensions = getDimensionAnalysis();
  const topPerformers = getTopPerformers();

  // Find matching category from benchmark data
  const matchedCategory = categories.find(c =>
    category?.toLowerCase().includes(c.category) ||
    c.category.includes(category?.toLowerCase() || '')
  );

  // Calculate percentile rank against benchmark
  const pagesBelow = Math.round((universalScore / summary.score_range.max) * 100);
  const percentile = Math.min(99, Math.max(1, pagesBelow));

  // Calculate signal gaps compared to benchmark averages
  const signalComparisons = signals.map(signal => {
    const benchmarkDim = dimensions.find(d => d.dimension_id === signal.dimension_id);
    if (!benchmarkDim) return null;

    const yourScore = signal.score ?? 0;
    const benchmarkAvg = benchmarkDim.avg_score ?? 0;
    const difference = yourScore - benchmarkAvg;
    const presenceRate = benchmarkDim.presence_rate ?? 0;

    return {
      dimension_id: signal.dimension_id,
      dimension_name: benchmarkDim.dimension_name,
      yourScore,
      benchmarkAvg,
      difference,
      presenceRate,
      isAboveAverage: difference > 0.05,
      isBelowAverage: difference < -0.05,
    };
  }).filter(Boolean);

  // Signals where you beat the benchmark
  const aboveAverage = signalComparisons.filter(s => s?.isAboveAverage);
  const belowAverage = signalComparisons.filter(s => s?.isBelowAverage);

  // Top performer to beat
  const topPerformer = topPerformers[0];
  const gapToTop = topPerformer ? topPerformer.universal_score - universalScore : 0;

  // Score color
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'var(--color-score-high)';
    if (score >= 50) return 'var(--color-score-mid)';
    return 'var(--color-score-low)';
  };

  return (
    <section className="card p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Benchmark Comparison
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-mid)' }}>
            How your page compares to {summary.total_pages} analyzed product pages
          </p>
        </div>
        <Link
          href="/apis/benchmarks"
          className="btn-secondary text-sm"
        >
          Full Benchmarks →
        </Link>
      </div>

      {/* Score Position */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Your Rank */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>
            Your Percentile
          </p>
          <p className="text-3xl font-bold" style={{ color: getScoreColor(universalScore) }}>
            {percentile}th
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-mid)' }}>
            Better than {percentile}% of benchmarked pages
          </p>
        </div>

        {/* Benchmark Average */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>
            Benchmark Average
          </p>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-text-mid)' }}>
            {summary.avg_score}
          </p>
          <p className="text-sm mt-1" style={{ color: universalScore > summary.avg_score ? 'var(--color-score-high)' : 'var(--color-score-low)' }}>
            {universalScore > summary.avg_score
              ? `You're +${(universalScore - summary.avg_score).toFixed(1)} above average`
              : `You're ${(summary.avg_score - universalScore).toFixed(1)} below average`
            }
          </p>
        </div>

        {/* Gap to Top */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>
            Top Performer
          </p>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-score-high)' }}>
            {summary.score_range.max}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-mid)' }}>
            {gapToTop > 0 ? `${gapToTop.toFixed(1)} points to reach the top` : 'You are the benchmark!'}
          </p>
        </div>
      </div>

      {/* Key Insight */}
      <div
        className="p-4 rounded-lg mb-6"
        style={{
          backgroundColor: 'var(--color-accent-soft)',
          border: '1px solid var(--color-accent)'
        }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text)' }}>
          <strong>Key Insight:</strong>{' '}
          {universalScore >= summary.avg_score ? (
            <>
              Your page outperforms the benchmark average of {summary.avg_score}.
              {aboveAverage.length > 0 && (
                <> You excel in {aboveAverage.slice(0, 2).map(s => formatDimensionName(s!.dimension_name)).join(' and ')}.</>
              )}
              {gapToTop > 10 && (
                <> To reach the top performer ({topPerformer?.domain}, score {topPerformer?.universal_score}), focus on {belowAverage.slice(0, 2).map(s => formatDimensionName(s!.dimension_name)).join(' and ')}.</>
              )}
            </>
          ) : (
            <>
              Your page scores below the benchmark average of {summary.avg_score}.
              The biggest opportunities are in {belowAverage.slice(0, 3).map(s => formatDimensionName(s!.dimension_name)).join(', ')}.
              {matchedCategory && (
                <> In your category ({matchedCategory.category}), top performers average {matchedCategory.avg_score}.</>
              )}
            </>
          )}
        </p>
      </div>

      {/* Signal Comparison Table */}
      <div className="mb-6">
        <h3 className="font-medium mb-3" style={{ color: 'var(--color-text)' }}>
          Your Signals vs. Benchmark
        </h3>
        <div className="space-y-2">
          {signalComparisons.slice(0, 8).map(signal => {
            if (!signal) return null;
            const presencePercent = Math.round(signal.presenceRate * 100);
            // Convert score (0-1) to signal strength indicator
            const yourStrength = signal.yourScore >= 0.7 ? 'Strong' : signal.yourScore >= 0.3 ? 'Weak' : 'Missing';
            const avgStrength = signal.benchmarkAvg >= 0.7 ? 'Strong' : signal.benchmarkAvg >= 0.3 ? 'Weak' : 'Missing';
            return (
              <div
                key={signal.dimension_id}
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {formatDimensionName(signal.dimension_name)}
                  </p>
                  <div
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: signal.isAboveAverage
                        ? 'var(--color-score-high)'
                        : signal.isBelowAverage
                          ? 'var(--color-score-low)'
                          : 'var(--color-text-mid)',
                      color: 'white'
                    }}
                  >
                    {signal.isAboveAverage ? 'Above Avg' : signal.isBelowAverage ? 'Below Avg' : 'On Par'}
                  </div>
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-soft)' }}>
                  {DIMENSION_EXPLANATIONS[signal.dimension_id] || `Signal present on ${presencePercent}% of pages`}
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span style={{ color: 'var(--color-text-soft)' }}>Your page:</span>
                    <span
                      className="font-medium"
                      style={{ color: getScoreColor(signal.yourScore * 100) }}
                    >
                      {yourStrength}
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-border)' }}>•</span>
                  <div className="flex items-center gap-1">
                    <span style={{ color: 'var(--color-text-soft)' }}>Benchmark avg:</span>
                    <span style={{ color: 'var(--color-text-mid)' }}>
                      {avgStrength}
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-border)' }}>•</span>
                  <span style={{ color: 'var(--color-text-soft)' }}>
                    {presencePercent}% of pages have this
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performers Reference */}
      <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <h3 className="font-medium mb-3" style={{ color: 'var(--color-text)' }}>
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
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-soft)' }}>
                {performer.category}
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-score-high)' }}>
                {performer.universal_score}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-mid)' }}>
                Strong: {performer.top_signals.slice(0, 2).map(s => {
                  const dimId = s.split(':')[0];
                  const dim = dimensions.find(d => d.dimension_id === dimId);
                  return dim ? formatDimensionName(dim.dimension_name) : dimId;
                }).join(', ')}
              </p>
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                View report <span>→</span>
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/apis/benchmarks"
            className="text-sm hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            View full benchmark analysis with 213 pages →
          </Link>
        </div>
      </div>
    </section>
  );
}
