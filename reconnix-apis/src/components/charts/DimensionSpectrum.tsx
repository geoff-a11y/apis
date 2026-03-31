'use client';

import { getDimensionEffectSizes, getConfirmatoryModels, getModel } from '@/lib/data';
import type { Dimension } from '@/lib/types';

// Semantic pole labels for each dimension
// Low pole = skeptical/unaffected, High pole = responsive/affected
const DIMENSION_POLES: Record<string, { low: string; high: string }> = {
  dim_01: { low: 'Independent', high: 'Authority-Driven' },
  dim_02: { low: 'Self-Directed', high: 'Crowd-Following' },
  dim_03: { low: 'Platform-Skeptic', high: 'Platform-Trusting' },
  dim_04: { low: 'Unmoved', high: 'Urgency-Responsive' },
  dim_05: { low: 'Price-Anchored', high: 'Anchor-Influenced' },
  dim_06: { low: 'Brand-Agnostic', high: 'Brand-Loyal' },
  dim_07: { low: 'Trial-Skeptic', high: 'Trial-Motivated' },
  dim_08: { low: 'Single-Item', high: 'Bundle-Preferring' },
  dim_09: { low: 'Eco-Neutral', high: 'Eco-Conscious' },
  dim_10: { low: 'Privacy-Neutral', high: 'Privacy-Prioritizing' },
  dim_11: { low: 'Origin-Agnostic', high: 'Local-Preferring' },
  dim_12: { low: 'Risk-Averse', high: 'Novelty-Seeking' },
  dim_13: { low: 'Risk-Tolerant', high: 'Risk-Averse' },
  dim_14: { low: 'Warranty-Indifferent', high: 'Warranty-Focused' },
  dim_15: { low: 'Return-Neutral', high: 'Return-Sensitive' },
  dim_16: { low: 'Negative-Ignoring', high: 'Negative-Weighting' },
  dim_17: { low: 'History-Focused', high: 'Recency-Biased' },
  dim_18: { low: 'Vague-Tolerant', high: 'Specificity-Seeking' },
  dim_19: { low: 'Self-Evaluating', high: 'Comparison-Influenced' },
  dim_20: { low: 'Surface-Level', high: 'Deep-Diving' },
  dim_21: { low: 'Assumption-Making', high: 'Clarification-Seeking' },
  dim_22: { low: 'Consistent', high: 'Revision-Prone' },
  dim_23: { low: 'Overconfident', high: 'Well-Calibrated' },
  dim_24: { low: 'Ethics-Neutral', high: 'Ethics-Prioritizing' },
  dim_25: { low: 'Default-Ignoring', high: 'Default-Following' },
  dim_26: { low: 'Gain-Focused', high: 'Loss-Averse' },
};

// Model colors for dots
const MODEL_COLORS: Record<string, string> = {
  gpt54: '#10A37F',
  o3: '#374151',
  gemini: '#4285F4',
  claude: '#D4A853',
  llama: '#0064E0',
  sonar: '#20808D',
  perplexity: '#20808D',
};

interface DimensionSpectrumProps {
  dimension: Dimension;
  showLabels?: boolean;
  compact?: boolean;
}

export default function DimensionSpectrum({
  dimension,
  showLabels = true,
  compact = false,
}: DimensionSpectrumProps) {
  const poles = DIMENSION_POLES[dimension.id] || { low: 'Low', high: 'High' };
  const effects = getDimensionEffectSizes(dimension.id, 'pooled');
  const models = getConfirmatoryModels();

  // Filter to only models we have data for
  const modelEffects = effects
    .filter((e) => models.some((m) => m.id === e.model_id))
    .map((e) => ({
      model_id: e.model_id,
      model: getModel(e.model_id),
      cohen_h: e.cohen_h,
    }))
    .sort((a, b) => a.cohen_h - b.cohen_h);

  // Find min/max for scaling (use -0.5 to 1.0 as typical range)
  const minH = -0.5;
  const maxH = 1.0;
  const range = maxH - minH;

  // Convert Cohen's h to percentage position (0-100)
  const getPosition = (cohen_h: number): number => {
    const clamped = Math.max(minH, Math.min(maxH, cohen_h));
    return ((clamped - minH) / range) * 100;
  };

  if (compact) {
    return (
      <div className="w-full">
        <div className="relative h-6 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
          {/* Center line (neutral) */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${getPosition(0)}%`,
              backgroundColor: 'var(--color-border)',
            }}
          />
          {/* Model dots */}
          {modelEffects.map((effect) => (
            <div
              key={effect.model_id}
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{
                left: `${getPosition(effect.cohen_h)}%`,
                backgroundColor: MODEL_COLORS[effect.model_id] || '#6b7280',
                transform: 'translate(-50%, -50%)',
              }}
              title={`${effect.model?.name || effect.model_id}: ${effect.cohen_h.toFixed(2)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Pole labels */}
      {showLabels && (
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--color-text-soft)' }}>{poles.low}</span>
          <span style={{ color: 'var(--color-text-soft)' }}>{poles.high}</span>
        </div>
      )}

      {/* Spectrum bar */}
      <div className="relative h-8 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        {/* Gradient background: red (negative) → neutral → green (positive) */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 30%, transparent 33%, transparent 67%, rgba(34, 197, 94, 0.05) 70%, rgba(34, 197, 94, 0.15) 100%)',
          }}
        />

        {/* Center line (neutral/zero effect) */}
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{
            left: `${getPosition(0)}%`,
            backgroundColor: 'var(--color-border)',
          }}
        />

        {/* Model dots */}
        {modelEffects.map((effect) => (
          <div
            key={effect.model_id}
            className="absolute top-1/2 group"
            style={{
              left: `${getPosition(effect.cohen_h)}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Dot */}
            <div
              className="w-5 h-5 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125"
              style={{
                backgroundColor: MODEL_COLORS[effect.model_id] || '#6b7280',
              }}
            />
            {/* Tooltip */}
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <span className="font-medium">{effect.model?.name || effect.model_id}</span>
              <span className="ml-1 font-mono" style={{ color: effect.cohen_h >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                {effect.cohen_h > 0 ? '+' : ''}{effect.cohen_h.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scale markers */}
      <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
        <span>-0.5</span>
        <span>0</span>
        <span>+0.5</span>
        <span>+1.0</span>
      </div>
    </div>
  );
}

// Export poles for use in other components
export { DIMENSION_POLES };
