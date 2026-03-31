'use client';

import { Recommendation, ProductCategory } from '@/lib/types';
import { useState } from 'react';
import { CATEGORY_DATA, getCopyExamples } from '@/lib/category-data';
import { DIMENSION_EXPLANATIONS } from '@/lib/model-personalities';

interface RecommendationsProps {
  recommendations: Recommendation[];
  category?: ProductCategory;
}

const DIMENSION_NAMES: Record<string, string> = {
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

export default function Recommendations({ recommendations, category = 'other' }: RecommendationsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedExplanation, setExpandedExplanation] = useState<number | null>(null);

  const categoryData = CATEGORY_DATA[category];

  // Sort by priority (high -> medium -> low) and then by predicted delta
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.predicted_delta - a.predicted_delta;
  });

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'bg-score-low text-white';
      case 'medium': return 'bg-score-mid text-white';
      case 'low': return '';
      default: return 'bg-bg text-text-mid';
    }
  };

  const getPriorityIcon = (priority: string): string => {
    switch (priority) {
      case 'high': return 'HIGH';
      case 'medium': return 'MED';
      case 'low': return 'LOW';
      default: return '-';
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section className="card p-8">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Recommendations
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
          Prioritized actions to improve your Machine Likeability Score, with predicted impact estimates
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-12 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="w-12 h-12 bg-score-high rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>Great job!</p>
          <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
            Your page already has strong signal coverage across all dimensions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRecommendations.map((rec, index) => (
            <div
              key={`${rec.dimension_id}-${index}`}
              className="rounded-lg p-5 transition-colors"
              style={{ border: '1px solid var(--color-border)' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(rec.priority)}`}
                    style={rec.priority === 'low' ? { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-mid)' } : undefined}
                  >
                    {rec.priority.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                      {DIMENSION_NAMES[rec.dimension_id] || rec.dimension_id}
                    </h3>
                    <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-mid)' }}>
                      <span>Score: {Math.round(rec.current_signal * 100)}/100</span>
                      <span>→</span>
                      <span>Target: {Math.round(rec.target_signal * 100)}/100</span>
                      <span className="font-medium" style={{ color: 'var(--color-accent)' }}>
                        +{rec.predicted_delta.toFixed(1)} points
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy suggestion - prioritize category-specific examples */}
              <div className="rounded-lg p-4 mb-3" style={{ backgroundColor: 'var(--color-bg)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm mb-1 font-medium" style={{ color: 'var(--color-text-mid)' }}>Suggested Copy:</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                      {/* Use category-specific example if available, otherwise fall back to backend suggestion */}
                      {getCopyExamples(category, rec.dimension_id)[0] || rec.copy_suggestion}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(getCopyExamples(category, rec.dimension_id)[0] || rec.copy_suggestion, index)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs rounded transition-colors"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {copiedIndex === index ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Zone placement with enhanced guidance */}
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--color-surface)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-mid)' }}>Recommended placement:</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-score-high"></span>
                    <span style={{ color: 'var(--color-text)' }}>
                      Primary: {rec.zone === 'title' ? 'Product title' : rec.zone === 'bullets' ? 'First bullet point' : rec.zone === 'description' ? 'Opening paragraph' : 'Key features section'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-score-mid"></span>
                    <span style={{ color: 'var(--color-text-mid)' }}>
                      Secondary: {rec.zone === 'title' ? 'First bullet' : rec.zone === 'bullets' ? 'Description paragraph 1' : rec.zone === 'description' ? 'Second/third paragraph' : 'Bullet points'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-score-low"></span>
                    <span style={{ color: 'var(--color-text-soft)' }}>
                      Avoid: Below the fold, footer content
                    </span>
                  </div>
                </div>
              </div>

              {/* Gap visualization */}
              <div className="mt-4">
                <div className="h-2 rounded-full overflow-hidden relative" style={{ backgroundColor: 'var(--color-border)' }}>
                  {/* Current signal */}
                  <div
                    className="absolute top-0 bottom-0 bg-score-mid"
                    style={{ width: `${rec.current_signal * 100}%` }}
                  />
                  {/* Target signal overlay */}
                  <div
                    className="absolute top-0 bottom-0 bg-score-high opacity-30"
                    style={{ width: `${rec.target_signal * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--color-text-soft)' }}>
                  <span>0</span>
                  <span>Room to improve: {Math.round(rec.gap * 100)} points</span>
                  <span>100</span>
                </div>
              </div>

              {/* Why this matters - expandable */}
              {DIMENSION_EXPLANATIONS[rec.dimension_id] && (
                <button
                  onClick={() => setExpandedExplanation(expandedExplanation === index ? null : index)}
                  className="mt-3 text-xs flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--color-accent)' }}
                >
                  <span>{expandedExplanation === index ? '▼' : '▶'}</span>
                  <span>Why this matters</span>
                </button>
              )}

              {expandedExplanation === index && DIMENSION_EXPLANATIONS[rec.dimension_id] && (
                <div className="mt-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-mid)' }}>
                  <p className="mb-2">{DIMENSION_EXPLANATIONS[rec.dimension_id].why_it_matters}</p>
                  <p className="font-medium" style={{ color: 'var(--color-accent)' }}>
                    Impact: {DIMENSION_EXPLANATIONS[rec.dimension_id].effect_magnitude}
                  </p>
                </div>
              )}

              {/* Category-specific examples */}
              {getCopyExamples(category, rec.dimension_id).length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>
                    Examples for {categoryData.display_name}:
                  </p>
                  <ul className="space-y-1">
                    {getCopyExamples(category, rec.dimension_id).slice(0, 2).map((example, i) => (
                      <li key={i} className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                        • "{example}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      {recommendations.length > 0 && (
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                {recommendations.filter(r => r.priority === 'high').length}
              </div>
              <div className="text-sm" style={{ color: 'var(--color-text-mid)' }}>High Priority</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                {recommendations.filter(r => r.priority === 'medium').length}
              </div>
              <div className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Medium Priority</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                +{recommendations.reduce((sum, r) => sum + r.predicted_delta, 0).toFixed(1)}
              </div>
              <div className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Total Potential Impact</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
