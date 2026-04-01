'use client';

import { MLScore, ProductCategory, Recommendation, SignalPresence } from '@/lib/types';
import { CATEGORY_DATA, getPercentileRank } from '@/lib/category-data';

interface ScoreHeroDashboardProps {
  score: MLScore;
  category: ProductCategory;
  recommendations: Recommendation[];
}

// Model display names for CMO-friendly labels
const MODEL_LABELS: Record<string, string> = {
  gpt54: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  o3: 'OpenAI o3',
  llama: 'Llama',
};

// Selection rate impacts from APIS research (56,640 purchase decisions)
const SELECTION_IMPACTS: Record<string, { impact: number; text: string }> = {
  dim_01: { impact: 42, text: '42% more likely to be selected' },
  dim_02: { impact: 38, text: '38% more likely to be selected' },
  dim_03: { impact: 25, text: '25% more likely to be selected' },
  dim_04: { impact: -13, text: '13% less likely (scarcity penalty)' },
  dim_05: { impact: 18, text: '18% more likely to be selected' },
  dim_06: { impact: 28, text: '28% more likely to be selected' },
  dim_07: { impact: 35, text: '35% more likely to be selected' },
  dim_08: { impact: 15, text: '15% more likely to be selected' },
  dim_09: { impact: 22, text: '22% more likely to be selected' },
  dim_10: { impact: 19, text: '19% more likely to be selected' },
  dim_11: { impact: 16, text: '16% more likely to be selected' },
  dim_12: { impact: 24, text: '24% more likely to be selected' },
  dim_13: { impact: 31, text: '31% more likely to be selected' },
  dim_14: { impact: 20, text: '20% more likely to be selected' },
  dim_15: { impact: 18, text: '18% more likely to be selected' },
  dim_17: { impact: 21, text: '21% more likely to be selected' },
  dim_18: { impact: 27, text: '27% more likely to be selected' },
};

// Calculate aggregate selection rate impact from missing signals
function calculateSelectionRateImpact(signals: SignalPresence[]): {
  totalLost: number;
  topMissing: Array<{ dimId: string; impact: number; name: string }>;
} {
  const missing: Array<{ dimId: string; impact: number; name: string }> = [];

  for (const signal of signals) {
    const impactData = SELECTION_IMPACTS[signal.dimension_id];
    if (impactData && signal.score < 0.3 && impactData.impact > 0) {
      missing.push({
        dimId: signal.dimension_id,
        impact: impactData.impact,
        name: signal.dimension_id, // Will be mapped to display name
      });
    }
  }

  // Sort by impact, get top 3
  missing.sort((a, b) => b.impact - a.impact);

  // Calculate total (not simply additive - use diminishing returns)
  // Each missing signal contributes less than its full impact
  let totalLost = 0;
  for (let i = 0; i < missing.length; i++) {
    const diminishingFactor = 1 / (1 + i * 0.3); // First full, then 77%, 63%, etc.
    totalLost += missing[i].impact * diminishingFactor;
  }

  return {
    totalLost: Math.round(totalLost),
    topMissing: missing.slice(0, 3),
  };
}

// Calculate competitive displacement probability
function calculateDisplacementProbability(yourScore: number, categoryAvg: number, categoryStd: number = 15): number {
  // Using normal distribution approximation
  const zScore = (yourScore - categoryAvg) / categoryStd;
  // Approximate CDF
  const probability = 0.5 * (1 + Math.tanh(zScore * 0.8));
  return Math.round(probability * 100);
}

// Short action phrases
const ACTION_PHRASES: Record<string, string> = {
  dim_01: 'Add third-party certifications',
  dim_02: 'Highlight customer reviews',
  dim_03: 'Showcase platform badges',
  dim_04: 'Add urgency messaging',
  dim_05: 'Show price comparisons',
  dim_06: 'Emphasize brand heritage',
  dim_07: 'Offer risk-free trial',
  dim_08: 'Create value bundles',
  dim_09: 'Highlight sustainability',
  dim_10: 'Address privacy concerns',
  dim_11: 'Mention local sourcing',
  dim_12: 'Emphasize innovation',
  dim_13: 'Showcase reliability',
  dim_14: 'Display warranty info',
  dim_15: 'Clarify return policy',
  dim_16: 'Address negative reviews',
  dim_17: 'Update recent info',
  dim_18: 'Add precise specs',
  dim_19: 'Include comparisons',
  dim_20: 'Improve info access',
  dim_21: 'Balance confidence',
  dim_22: 'Clarify tradeoffs',
  dim_23: 'Show humility',
  dim_24: 'Highlight ethics',
  dim_25: 'Optimize defaults',
  dim_26: 'Use loss framing',
};

export default function ScoreHeroDashboard({ score, category, recommendations }: ScoreHeroDashboardProps) {
  const categoryData = CATEGORY_DATA[category];
  const percentileRank = getPercentileRank(score.universal_score, category);

  // Get top 3 recommendations
  const top3 = [...recommendations]
    .sort((a, b) => b.predicted_delta - a.predicted_delta)
    .slice(0, 3);

  // Calculate actionable metrics
  const selectionImpact = calculateSelectionRateImpact(score.signal_inventory);

  // Models that would never recommend (score < 40)
  const invisibleModels = score.model_distribution
    ? Object.entries(score.model_distribution)
        .filter(([, modelScore]) => modelScore < 40)
        .map(([key]) => MODEL_LABELS[key] || key)
    : [];

  // Expected uplift if all recommendations implemented
  const expectedUplift = Math.min(
    100,
    score.universal_score + recommendations.reduce((sum, r) => sum + r.predicted_delta, 0)
  );

  // Score verdict in plain English
  const getVerdict = (s: number): { label: string; description: string } => {
    if (s >= 80) return {
      label: 'Excellent',
      description: 'AI assistants will strongly favor your product'
    };
    if (s >= 65) return {
      label: 'Good',
      description: 'AI assistants will likely recommend your product'
    };
    if (s >= 50) return {
      label: 'Fair',
      description: 'AI assistants may recommend your product sometimes'
    };
    if (s >= 35) return {
      label: 'Needs Work',
      description: 'AI assistants are unlikely to recommend your product'
    };
    return {
      label: 'Critical',
      description: 'AI assistants will rarely recommend your product'
    };
  };

  const verdict = getVerdict(score.universal_score);

  const getScoreColor = (value: number): string => {
    if (value >= 70) return 'var(--color-score-high)';
    if (value >= 50) return 'var(--color-score-mid)';
    return 'var(--color-score-low)';
  };

  // Model scores sorted by market share
  const modelOrder = ['gpt54', 'claude', 'gemini', 'perplexity', 'o3', 'llama'];
  const modelScores = modelOrder
    .filter(key => score.model_distribution && score.model_distribution[key])
    .map(key => ({
      key,
      label: MODEL_LABELS[key] || key,
      score: score.model_distribution![key],
    }));

  // Difficulty labels
  const getDifficulty = (delta: number): { label: string; color: string } => {
    if (delta < 5) return { label: 'Quick fix', color: 'var(--color-score-high)' };
    if (delta < 15) return { label: 'Some effort', color: 'var(--color-score-mid)' };
    return { label: 'Major change', color: 'var(--color-score-low)' };
  };

  // Truncate URL for display
  const displayUrl = (() => {
    try {
      const url = new URL(score.url);
      const path = url.pathname.length > 30
        ? url.pathname.slice(0, 30) + '...'
        : url.pathname;
      return url.hostname + path;
    } catch {
      return score.url.slice(0, 50) + '...';
    }
  })();

  return (
    <section className="card p-0 overflow-hidden">
      {/* Hero Score Section */}
      <div className="p-8 pb-6" style={{
        background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg) 100%)',
        borderBottom: '1px solid var(--color-border)'
      }}>
        {/* URL and share */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-soft)' }}>
              AI Visibility Score
            </p>
            <a
              href={score.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
              style={{ color: 'var(--color-accent)' }}
              title={score.url}
            >
              {displayUrl}
            </a>
          </div>
          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}/score/results/${score.id}`;
              navigator.clipboard.writeText(shareUrl);
              alert('Share link copied!');
            }}
            className="btn-secondary text-sm"
          >
            Share
          </button>
        </div>

        {/* Main score display */}
        <div className="flex items-center gap-8 mb-6">
          {/* Big score number */}
          <div className="flex-shrink-0">
            <div
              className="text-7xl font-display font-bold"
              style={{ color: getScoreColor(score.universal_score) }}
            >
              {Math.round(score.universal_score)}
            </div>
            <div className="text-sm text-center" style={{ color: 'var(--color-text-soft)' }}>
              out of 100
            </div>
          </div>

          {/* Verdict */}
          <div className="flex-1">
            <div
              className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-2"
              style={{
                backgroundColor: getScoreColor(score.universal_score) + '20',
                color: getScoreColor(score.universal_score)
              }}
            >
              {verdict.label}
            </div>
            <p className="text-lg" style={{ color: 'var(--color-text)' }}>
              {verdict.description}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-mid)' }}>
              Better than {percentileRank}% of {categoryData.display_name.toLowerCase()} products
            </p>
          </div>
        </div>

        {/* Model scores - compact horizontal */}
        <div>
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-soft)' }}>
            Score by AI Assistant
          </p>
          <div className="flex flex-wrap gap-3">
            {modelScores.map(({ key, label, score: modelScore }) => (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>{label}</span>
                <span
                  className="font-mono font-bold"
                  style={{ color: getScoreColor(modelScore) }}
                >
                  {Math.round(modelScore)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics - Only show meaningful data */}
      <div className="flex flex-wrap gap-4 p-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {/* Current vs Potential - always meaningful */}
        <div className="flex-1 min-w-[200px] p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>
            Score Opportunity
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: getScoreColor(score.universal_score) }}>
              {Math.round(score.universal_score)}
            </span>
            <span style={{ color: 'var(--color-text-soft)' }}>→</span>
            <span className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {Math.round(expectedUplift)}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-mid)' }}>
            +{Math.round(expectedUplift - score.universal_score)} pts potential with fixes
          </p>
        </div>

        {/* Models with weak scores - only show if there are issues */}
        {invisibleModels.length > 0 && (
          <div className="flex-1 min-w-[200px] p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>
              Weak Visibility
            </p>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-score-low)' }}>
              {invisibleModels.length} model{invisibleModels.length > 1 ? 's' : ''}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-mid)' }}>
              {invisibleModels.slice(0, 3).join(', ')} score below 40
            </p>
          </div>
        )}

        {/* Missing high-impact signals - only show if there are gaps */}
        {selectionImpact.topMissing.length > 0 && (
          <div className="flex-1 min-w-[200px] p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>
              Key Gaps
            </p>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-score-mid)' }}>
              {selectionImpact.topMissing.length} signal{selectionImpact.topMissing.length > 1 ? 's' : ''}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-mid)' }}>
              high-impact signals missing
            </p>
          </div>
        )}
      </div>

      {/* Competitive Position - Simple slider */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Your Position in {categoryData.display_name}
          </span>
          <span className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
            vs. {categoryData.competitors.slice(0, 3).join(', ')}
          </span>
        </div>

        {/* Position slider */}
        <div className="relative h-8 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
          {/* Average marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: `${categoryData.benchmarks.average}%`,
              backgroundColor: 'var(--color-text-soft)'
            }}
          />
          {/* Top performer marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: `${categoryData.benchmarks.top_performer}%`,
              backgroundColor: 'var(--color-score-high)'
            }}
          />
          {/* Your position */}
          <div
            className="absolute top-1 bottom-1 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
            style={{
              left: `calc(${score.universal_score}% - 12px)`,
              backgroundColor: getScoreColor(score.universal_score)
            }}
          >
            <span className="text-xs font-bold text-white">{Math.round(score.universal_score)}</span>
          </div>
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--color-text-soft)' }}>
          <span>0</span>
          <span style={{ marginLeft: `${categoryData.benchmarks.average - 10}%` }}>
            Avg: {categoryData.benchmarks.average}
          </span>
          <span style={{ marginLeft: `${categoryData.benchmarks.top_performer - categoryData.benchmarks.average - 20}%` }}>
            Top: {categoryData.benchmarks.top_performer}
          </span>
          <span>100</span>
        </div>
      </div>

      {/* Top 3 Priorities */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            Your Top 3 Priorities
          </h3>
          {recommendations.length > 3 && (
            <a href="#recommendations" className="text-sm hover:underline" style={{ color: 'var(--color-accent)' }}>
              See all {recommendations.length} →
            </a>
          )}
        </div>

        {top3.length === 0 ? (
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
            <span className="text-2xl mb-2 block">🎉</span>
            <p style={{ color: 'var(--color-text)' }}>Great job! No critical improvements needed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {top3.map((rec, idx) => {
              const difficulty = getDifficulty(rec.predicted_delta);
              return (
                <div
                  key={rec.dimension_id}
                  className="flex items-center gap-4 p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-bg)' }}
                >
                  {/* Priority number */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: 'white'
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Action */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {ACTION_PHRASES[rec.dimension_id] || rec.dimension_id}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
                      {rec.copy_suggestion?.slice(0, 60) || 'Improve this signal to boost your score'}
                      {rec.copy_suggestion && rec.copy_suggestion.length > 60 ? '...' : ''}
                    </p>
                  </div>

                  {/* Impact */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold" style={{ color: 'var(--color-accent)' }}>
                      +{(rec.predicted_delta ?? 0).toFixed(0)} pts
                    </div>
                    <div className="text-xs" style={{ color: difficulty.color }}>
                      {difficulty.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Total potential */}
        {top3.length > 0 && (
          <div className="mt-4 p-4 rounded-lg text-center" style={{
            backgroundColor: 'var(--color-accent-soft)',
            border: '1px solid var(--color-accent)'
          }}>
            <p className="text-sm mb-1" style={{ color: 'var(--color-text-mid)' }}>
              Complete all 3 priorities to potentially reach
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {Math.min(100, Math.round(score.universal_score + top3.reduce((sum, r) => sum + r.predicted_delta, 0)))} / 100
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
