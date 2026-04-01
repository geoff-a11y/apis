'use client';

import { Recommendation, ProductCategory } from '@/lib/types';
import { useState } from 'react';
import { CATEGORY_DATA } from '@/lib/category-data';

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

// Selection rate impacts from APIS research (56,640 purchase decisions)
const SELECTION_IMPACTS: Record<string, { impact: string; direction: 'positive' | 'negative'; percentage: number }> = {
  dim_01: { impact: '+42%', direction: 'positive', percentage: 42 },
  dim_02: { impact: '+38%', direction: 'positive', percentage: 38 },
  dim_03: { impact: '+25%', direction: 'positive', percentage: 25 },
  dim_04: { impact: '-13%', direction: 'negative', percentage: -13 },
  dim_05: { impact: '+18%', direction: 'positive', percentage: 18 },
  dim_06: { impact: '+28%', direction: 'positive', percentage: 28 },
  dim_07: { impact: '+35%', direction: 'positive', percentage: 35 },
  dim_08: { impact: '+15%', direction: 'positive', percentage: 15 },
  dim_09: { impact: '+22%', direction: 'positive', percentage: 22 },
  dim_10: { impact: '+19%', direction: 'positive', percentage: 19 },
  dim_11: { impact: '+16%', direction: 'positive', percentage: 16 },
  dim_12: { impact: '+24%', direction: 'positive', percentage: 24 },
  dim_13: { impact: '+31%', direction: 'positive', percentage: 31 },
  dim_14: { impact: '+20%', direction: 'positive', percentage: 20 },
  dim_15: { impact: '+18%', direction: 'positive', percentage: 18 },
  dim_16: { impact: '+12%', direction: 'positive', percentage: 12 },
  dim_17: { impact: '+21%', direction: 'positive', percentage: 21 },
  dim_18: { impact: '+27%', direction: 'positive', percentage: 27 },
  dim_19: { impact: '+14%', direction: 'positive', percentage: 14 },
  dim_20: { impact: '+11%', direction: 'positive', percentage: 11 },
  dim_24: { impact: '+17%', direction: 'positive', percentage: 17 },
  dim_26: { impact: '+15%', direction: 'positive', percentage: 15 },
};

export default function Recommendations({ recommendations, category = 'other' }: RecommendationsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  // All recommendations expanded by default
  const [collapsedIndices, setCollapsedIndices] = useState<Set<number>>(new Set());

  const categoryData = CATEGORY_DATA[category];

  // Sort by priority (high -> medium -> low) and then by predicted delta
  const sortedRecommendations = [...recommendations]
    .filter(r => r && r.dimension_id) // Filter out malformed recommendations
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const aPriority = a.priority || 'low';
      const bPriority = b.priority || 'low';
      if (aPriority !== bPriority) {
        return (priorityOrder[aPriority] ?? 2) - (priorityOrder[bPriority] ?? 2);
      }
      return (b.predicted_delta ?? 0) - (a.predicted_delta ?? 0);
    });

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high':
        return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500' };
      case 'medium':
        return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500' };
      case 'low':
        return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500' };
      default:
        return { bg: '', border: 'border-gray-500/30', text: 'text-gray-400', badge: 'bg-gray-500' };
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isAIGenerated = (rec: Recommendation): boolean => {
    return rec.ai_generated === true || !!rec.suggested_copy;
  };

  return (
    <section className="card p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Copy Recommendations
          </h2>
          {recommendations.some(isAIGenerated) && (
            <span className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
              AI-Powered
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
          Specific copy changes to improve your Machine Likeability Score. Each recommendation shows what to change and exactly what to write.
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
          {sortedRecommendations.map((rec, index) => {
            const styles = getPriorityStyles(rec.priority);
            const isExpanded = !collapsedIndices.has(index);
            const hasAICopy = isAIGenerated(rec);

            return (
              <div
                key={`${rec.dimension_id}-${index}`}
                className={`rounded-xl overflow-hidden transition-all duration-200 ${styles.bg}`}
                style={{ border: `1px solid var(--color-border)` }}
              >
                {/* Clickable Header */}
                <button
                  onClick={() => {
                    const newCollapsed = new Set(collapsedIndices);
                    if (isExpanded) {
                      newCollapsed.add(index);
                    } else {
                      newCollapsed.delete(index);
                    }
                    setCollapsedIndices(newCollapsed);
                  }}
                  className="w-full p-5 text-left flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Priority Badge */}
                    <div className={`px-2.5 py-1 rounded-md text-xs font-bold text-white ${styles.badge}`}>
                      {rec.priority === 'high' ? '1' : rec.priority === 'medium' ? '2' : '3'}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                        {rec.dimension_name || DIMENSION_NAMES[rec.dimension_id] || rec.dimension_id}
                      </h3>
                      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-mid)' }}>
                        <span className={styles.text}>{(rec.priority || 'medium').toUpperCase()} PRIORITY</span>
                        <span>•</span>
                        <span className="font-medium" style={{ color: 'var(--color-accent)' }}>
                          +{(rec.predicted_delta ?? 0).toFixed(1)} points potential
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--color-text-mid)' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4">
                    {/* Current State */}
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(248, 113, 113)' }}>
                          Current State
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                        {rec.current_state || (rec.current_signal < 0.2 ? 'Signal not detected on page' : `Signal detected at ${Math.round(rec.current_signal * 100)}% strength`)}
                      </p>
                    </div>

                    {/* Why This Matters - with quantified impact */}
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-mid)' }}>
                            Selection Rate Impact
                          </span>
                        </div>
                        {/* Big impact number */}
                        {SELECTION_IMPACTS[rec.dimension_id] && (
                          <div
                            className="px-3 py-1 rounded-full text-sm font-bold"
                            style={{
                              backgroundColor: SELECTION_IMPACTS[rec.dimension_id].direction === 'positive'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                              color: SELECTION_IMPACTS[rec.dimension_id].direction === 'positive'
                                ? 'rgb(248, 113, 113)'
                                : 'rgb(52, 211, 153)'
                            }}
                          >
                            {SELECTION_IMPACTS[rec.dimension_id].direction === 'positive'
                              ? `-${SELECTION_IMPACTS[rec.dimension_id].percentage}% without this`
                              : `${SELECTION_IMPACTS[rec.dimension_id].impact} selection rate`}
                          </div>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                        {rec.why_change || rec.research_basis || (
                          SELECTION_IMPACTS[rec.dimension_id]
                            ? `Missing this signal costs you ${Math.abs(SELECTION_IMPACTS[rec.dimension_id].percentage)}% of potential AI recommendations. Based on 56,640 simulated purchase decisions across 6 leading AI models.`
                            : `This signal has a ${(rec.predicted_delta ?? 0).toFixed(1)} point impact on AI recommendation likelihood.`
                        )}
                      </p>
                    </div>

                    {/* Suggested Copy - The Main Event */}
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(52, 211, 153)' }}>
                            Suggested Copy
                          </span>
                          {hasAICopy && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                              AI Generated
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(rec.suggested_copy || rec.copy_suggestion, index);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors"
                          style={{
                            backgroundColor: copiedIndex === index ? 'rgb(16, 185, 129)' : 'var(--color-surface)',
                            color: copiedIndex === index ? 'white' : 'var(--color-text)',
                            border: '1px solid var(--color-border)'
                          }}
                        >
                          {copiedIndex === index ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-3 rounded-md font-medium" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
                        &ldquo;{rec.suggested_copy || rec.copy_suggestion}&rdquo;
                      </div>
                    </div>

                    {/* Placement Guidance */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-mid)' }}>
                        Where to add:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 text-xs rounded-md" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                          {rec.placement || (rec.zone === 'title' ? 'Product title' : rec.zone === 'bullets' ? 'First bullet point' : 'Product description')}
                        </span>
                        <span className="px-2.5 py-1 text-xs rounded-md" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-soft)' }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
                          {rec.zone === 'title' ? 'First bullet' : 'Key features section'}
                        </span>
                        <span className="px-2.5 py-1 text-xs rounded-md" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-soft)' }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5"></span>
                          Avoid: Footer, below fold
                        </span>
                      </div>
                    </div>

                    {/* Score Progress */}
                    <div className="pt-2">
                      <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-text-soft)' }}>
                        <span>Current: {Math.round(rec.current_signal * 100)}%</span>
                        <span>Target: {Math.round(rec.target_signal * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div className="h-full rounded-full relative overflow-hidden" style={{ width: `${rec.target_signal * 100}%` }}>
                          <div
                            className="absolute inset-y-0 left-0 bg-score-mid"
                            style={{ width: `${(rec.current_signal / rec.target_signal) * 100}%` }}
                          />
                          <div
                            className="absolute inset-y-0 bg-emerald-500/30"
                            style={{
                              left: `${(rec.current_signal / rec.target_signal) * 100}%`,
                              right: 0
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {recommendations.length > 0 && (
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                {recommendations.filter(r => r.priority === 'high').length}
              </div>
              <div className="text-sm" style={{ color: 'var(--color-text-mid)' }}>High Priority</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                {recommendations.length}
              </div>
              <div className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Total Changes</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>
                +{recommendations.reduce((sum, r) => sum + (r.predicted_delta ?? 0), 0).toFixed(0)}
              </div>
              <div className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Points Potential</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
