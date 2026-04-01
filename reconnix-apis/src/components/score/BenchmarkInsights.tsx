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
            return (
              <div
                key={signal.dimension_id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {formatDimensionName(signal.dimension_name)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                    Present on {presencePercent}% of pages
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-mono font-bold" style={{ color: getScoreColor(signal.yourScore * 100) }}>
                      {(signal.yourScore * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>You</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono" style={{ color: 'var(--color-text-mid)' }}>
                      {(signal.benchmarkAvg * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>Avg</p>
                  </div>
                  <div
                    className="w-16 text-center text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: signal.isAboveAverage
                        ? 'var(--color-score-high)'
                        : signal.isBelowAverage
                          ? 'var(--color-score-low)'
                          : 'var(--color-text-mid)',
                      color: 'white'
                    }}
                  >
                    {signal.isAboveAverage ? 'Above' : signal.isBelowAverage ? 'Below' : 'Average'}
                  </div>
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
            <div
              key={performer.url}
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg)' }}
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
            </div>
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
