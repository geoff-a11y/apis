'use client';

import { Recommendation, ProductCategory } from '@/lib/types';
import { CATEGORY_DATA } from '@/lib/category-data';

interface ExecutiveSummaryProps {
  recommendations: Recommendation[];
  category: ProductCategory;
  universalScore: number;
  productName?: string;
}

// Re-export DIMENSION_NAMES for use here
const DIMS: Record<string, string> = {
  dim_01: 'Third Party Authority',
  dim_02: 'Social Proof Sensitivity',
  dim_03: 'Platform Endorsement',
  dim_04: 'Scarcity Signaling',
  dim_05: 'Price Comparison Framing',
  dim_06: 'Heritage & Brand Legacy',
  dim_07: 'Risk-Free Trial Offer',
  dim_08: 'Bundling & Add-Ons',
  dim_09: 'Sustainability & Environment',
  dim_10: 'Privacy & Data Protection',
  dim_11: 'Local & National Preference',
  dim_12: 'Novelty & Innovation',
  dim_13: 'Established Reliability',
  dim_14: 'Warranty & Guarantees',
  dim_15: 'Easy Returns & Refunds',
  dim_16: 'Negative Review Transparency',
  dim_17: 'Recency & Updates',
  dim_18: 'Precision & Specificity',
  dim_19: 'Comparative Claims',
  dim_20: 'Information Availability',
  dim_21: 'Hedging & Uncertainty',
  dim_22: 'Benefit-Cost Tradeoffs',
  dim_23: 'Epistemic Humility',
  dim_24: 'Ethical Business Practices',
  dim_25: 'Default Selection',
  dim_26: 'Loss Framing',
};

// Short action phrases for executive summary
const ACTION_PHRASES: Record<string, string> = {
  dim_01: 'Add third-party certifications or expert endorsements',
  dim_02: 'Highlight customer reviews and ratings',
  dim_03: 'Showcase platform badges (Best Seller, etc.)',
  dim_04: 'Add scarcity/urgency messaging',
  dim_05: 'Show price comparisons or savings',
  dim_06: 'Emphasize brand heritage and history',
  dim_07: 'Offer a risk-free trial or sample',
  dim_08: 'Create value bundles with accessories',
  dim_09: 'Highlight sustainability credentials',
  dim_10: 'Address privacy and data protection',
  dim_11: 'Mention local sourcing or manufacturing',
  dim_12: 'Emphasize innovation and new features',
  dim_13: 'Showcase reliability track record',
  dim_14: 'Prominently display warranty information',
  dim_15: 'Clarify easy return/refund policy',
  dim_16: 'Address negative reviews transparently',
  dim_17: 'Update content with recent information',
  dim_18: 'Add precise specifications and details',
  dim_19: 'Include competitive comparisons',
  dim_20: 'Improve information availability',
  dim_21: 'Balance confidence with appropriate hedging',
  dim_22: 'Clarify benefit-cost tradeoffs',
  dim_23: 'Show appropriate epistemic humility',
  dim_24: 'Highlight ethical business practices',
  dim_25: 'Optimize default selection presentation',
  dim_26: 'Use loss framing where appropriate',
};

export default function ExecutiveSummary({
  recommendations,
  category,
  universalScore,
  productName,
}: ExecutiveSummaryProps) {
  const categoryData = CATEGORY_DATA[category];

  // Get top 5 recommendations sorted by predicted_delta
  const topRecommendations = [...recommendations]
    .sort((a, b) => (b.predicted_delta ?? 0) - (a.predicted_delta ?? 0))
    .slice(0, 5);

  const totalPotentialImpact = topRecommendations.reduce(
    (sum, rec) => sum + (rec.predicted_delta ?? 0),
    0
  );

  // Estimate % improvement in AI mentions (rough heuristic)
  const estimatedMentionBoost = Math.round(totalPotentialImpact * 1.2);

  // Count by priority
  const criticalCount = topRecommendations.filter((r) => r.priority === 'high').length;
  const importantCount = topRecommendations.filter((r) => r.priority === 'medium').length;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      default:
        return '🟢';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Critical';
      case 'medium':
        return 'Important';
      default:
        return 'Nice-to-have';
    }
  };

  if (recommendations.length === 0) {
    return (
      <section className="card p-8 border-l-4" style={{ borderLeftColor: 'var(--color-score-high)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-score-high rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Great Job!
            </h2>
            <p style={{ color: 'var(--color-text-mid)' }}>
              Your page has strong signal coverage across all dimensions. You're well-positioned for AI recommendations.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-8 border-l-4" style={{ borderLeftColor: 'var(--color-accent)' }}>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Quick Wins{productName ? ` for ${productName}` : ''}
        </h2>
        <p style={{ color: 'var(--color-text-mid)' }}>
          Your page is missing {topRecommendations.length} key signal{topRecommendations.length !== 1 ? 's' : ''} that AI shopping assistants look for when recommending{' '}
          <span className="font-medium">{categoryData.display_name.toLowerCase()}</span> products.
        </p>
      </div>

      {/* Priority actions list */}
      <div className="space-y-3 mb-6">
        {topRecommendations.map((rec, index) => (
          <div
            key={`${rec.dimension_id}-${index}`}
            className="flex items-start gap-3 p-3 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            <span className="text-lg flex-shrink-0">{getPriorityIcon(rec.priority || 'medium')}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded" style={{
                  backgroundColor: (rec.priority || 'medium') === 'high' ? 'rgba(239, 68, 68, 0.1)' :
                    (rec.priority || 'medium') === 'medium' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  color: (rec.priority || 'medium') === 'high' ? '#dc2626' :
                    (rec.priority || 'medium') === 'medium' ? '#ca8a04' : '#16a34a'
                }}>
                  {getPriorityLabel(rec.priority || 'medium')}
                </span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {ACTION_PHRASES[rec.dimension_id] || DIMS[rec.dimension_id]}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="font-mono font-medium" style={{ color: 'var(--color-accent)' }}>
                +{(rec.predicted_delta ?? 0).toFixed(1)}
              </span>
              <span className="text-xs block" style={{ color: 'var(--color-text-soft)' }}>points</span>
            </div>
          </div>
        ))}
      </div>

      {/* Impact summary */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Total potential improvement</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              +{totalPotentialImpact.toFixed(1)} points
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Estimated impact</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              ~{estimatedMentionBoost}% more AI mentions
            </p>
          </div>
        </div>
      </div>

      {/* Category benchmark context */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
          Current score: <span className="font-medium">{Math.round(universalScore)}/100</span>
          {' • '}
          {categoryData.display_name} average: <span className="font-medium">{categoryData.benchmarks.average}/100</span>
          {' • '}
          Top performers: <span className="font-medium">{categoryData.benchmarks.top_performer}/100</span>
        </p>
      </div>
    </section>
  );
}
