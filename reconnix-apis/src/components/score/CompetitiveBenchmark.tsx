'use client';

import { ProductCategory } from '@/lib/types';
import { CATEGORY_DATA, getPercentileRank } from '@/lib/category-data';

interface CompetitiveBenchmarkProps {
  universalScore: number;
  category: ProductCategory;
}

// Helper for ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function CompetitiveBenchmark({ universalScore, category }: CompetitiveBenchmarkProps) {
  const categoryData = CATEGORY_DATA[category];
  const percentileRank = getPercentileRank(universalScore, category);

  const getPercentileLabel = (percentile: number): string => {
    if (percentile >= 90) return 'Top 10%';
    if (percentile >= 75) return 'Top 25%';
    if (percentile >= 50) return 'Above Average';
    if (percentile >= 25) return 'Below Average';
    return 'Bottom 25%';
  };

  const getPercentileColor = (percentile: number): string => {
    if (percentile >= 75) return 'text-score-high';
    if (percentile >= 50) return 'text-score-mid';
    return 'text-score-low';
  };

  const gapToAverage = categoryData.benchmarks.average - universalScore;
  const gapToTop = categoryData.benchmarks.top_performer - universalScore;

  return (
    <section className="card p-8">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          How You Compare
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
          Your score vs. other {categoryData.display_name.toLowerCase()} products
        </p>
      </div>

      {/* Main comparison bars */}
      <div className="space-y-4 mb-8">
        {/* Your score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Your Score</span>
            <span className="font-mono font-bold text-lg" style={{ color: 'var(--color-accent)' }}>
              {Math.round(universalScore)}/100
            </span>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${universalScore}%`,
                backgroundColor: 'var(--color-accent)',
              }}
            />
          </div>
        </div>

        {/* Category average */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Category Average</span>
            <span className="font-mono" style={{ color: 'var(--color-text-mid)' }}>
              {categoryData.benchmarks.average}/100
            </span>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all opacity-50"
              style={{
                width: `${categoryData.benchmarks.average}%`,
                backgroundColor: 'var(--color-text-mid)',
              }}
            />
          </div>
        </div>

        {/* Top performer */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Top Performers</span>
            <span className="font-mono" style={{ color: 'var(--color-score-high)' }}>
              {categoryData.benchmarks.top_performer}/100
            </span>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all opacity-50"
              style={{
                width: `${categoryData.benchmarks.top_performer}%`,
                backgroundColor: 'var(--color-score-high)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Percentile and gap summary */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Percentile rank */}
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-mid)' }}>Your Ranking</p>
          <p className={`text-2xl font-bold ${getPercentileColor(percentileRank)}`}>
            {getPercentileLabel(percentileRank)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
            {getOrdinal(percentileRank)} percentile
          </p>
        </div>

        {/* Gap to average */}
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-mid)' }}>Gap to Average</p>
          <p className={`text-2xl font-bold ${gapToAverage > 0 ? 'text-score-low' : 'text-score-high'}`}>
            {gapToAverage > 0 ? `+${Math.round(gapToAverage)} needed` : 'Above average'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
            {gapToAverage > 0 ? `${Math.ceil(gapToAverage / 3)} changes` : 'Keep it up!'}
          </p>
        </div>

        {/* Gap to top */}
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-mid)' }}>Gap to Top</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {gapToTop > 0 ? `+${Math.round(gapToTop)} possible` : 'Top tier!'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
            {gapToTop > 0 ? 'room to grow' : 'Excellent work'}
          </p>
        </div>
      </div>

      {/* Competitors mention */}
      {categoryData.competitors.length > 0 && (
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
            <span className="font-medium">Competing with:</span>{' '}
            {categoryData.competitors.join(', ')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
            Benchmarks based on analysis of top {categoryData.display_name.toLowerCase()} product pages
          </p>
        </div>
      )}
    </section>
  );
}
