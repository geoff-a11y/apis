'use client';

import { SignalInteraction } from '@/lib/types';
import { getDimension } from '@/lib/data';

interface SignalInteractionsProps {
  interactions: SignalInteraction[];
  adjustment: number;
}

export default function SignalInteractions({ interactions, adjustment }: SignalInteractionsProps) {
  if (!interactions || interactions.length === 0) {
    return null;
  }

  const getCombinationLabel = (type: string): string => {
    switch (type) {
      case 'positive_pair': return 'Synergy';
      case 'negative_pair': return 'Interference';
      case 'mixed_pair': return 'Mixed Effect';
      case 'triple_combo': return 'Triple Combination';
      default: return type;
    }
  };

  const getCombinationColor = (type: string): string => {
    switch (type) {
      case 'positive_pair': return 'var(--color-score-high)';
      case 'negative_pair': return 'var(--color-score-low)';
      case 'mixed_pair': return 'var(--color-score-mid)';
      case 'triple_combo': return 'var(--color-accent)';
      default: return 'var(--color-text-mid)';
    }
  };

  const getCombinationIcon = (type: string): string => {
    switch (type) {
      case 'positive_pair': return '↗';
      case 'negative_pair': return '↘';
      case 'mixed_pair': return '↔';
      case 'triple_combo': return '⬆';
      default: return '•';
    }
  };

  const formatBonus = (bonus: number): string => {
    if (bonus >= 0) return `+${bonus.toFixed(2)}`;
    return bonus.toFixed(2);
  };

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Signal Interactions
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-mid)' }}>
            How detected signals combine (based on APIS interaction study)
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm" style={{ color: 'var(--color-text-soft)' }}>Net Adjustment</div>
          <div
            className="font-mono text-xl font-bold"
            style={{ color: adjustment >= 0 ? 'var(--color-score-high)' : 'var(--color-score-low)' }}
          >
            {adjustment >= 0 ? '+' : ''}{adjustment.toFixed(1)} pts
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {interactions.map((interaction, idx) => {
          const signalNames = interaction.signal_ids.map(id => {
            const dim = getDimension(id);
            return dim?.display_name || id;
          });

          return (
            <div
              key={idx}
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-lg"
                    style={{ color: getCombinationColor(interaction.combination_type) }}
                  >
                    {getCombinationIcon(interaction.combination_type)}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: getCombinationColor(interaction.combination_type),
                      color: 'white'
                    }}
                  >
                    {getCombinationLabel(interaction.combination_type)}
                  </span>
                </div>
                <div className="text-right">
                  <div
                    className="font-mono font-semibold"
                    style={{ color: interaction.interaction_bonus >= 0 ? 'var(--color-score-high)' : 'var(--color-score-low)' }}
                  >
                    {formatBonus(interaction.interaction_bonus)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                    {interaction.model_used} model
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {signalNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                  >
                    {name}
                    {i < signalNames.length - 1 && (
                      <span style={{ color: 'var(--color-text-soft)' }}>+</span>
                    )}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs" style={{ color: 'var(--color-text-mid)' }}>
                <div>
                  <span className="block" style={{ color: 'var(--color-text-soft)' }}>Individual</span>
                  <span className="font-mono">
                    {Object.values(interaction.individual_effects).map(e => e.toFixed(3)).join(' + ')}
                  </span>
                </div>
                <div>
                  <span className="block" style={{ color: 'var(--color-text-soft)' }}>Combined</span>
                  <span className="font-mono">{interaction.combined_effect.toFixed(3)}</span>
                </div>
                <div>
                  <span className="block" style={{ color: 'var(--color-text-soft)' }}>Bonus</span>
                  <span className="font-mono">{formatBonus(interaction.interaction_bonus)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
        <div className="flex items-start gap-3">
          <span className="text-xl">📊</span>
          <div className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
            <strong style={{ color: 'var(--color-text)' }}>Understanding Signal Interactions:</strong>
            {' '}Research shows AI agents process multiple signals using a multiplicative model—synergistic signals
            amplify each other, while conflicting signals can reduce overall effectiveness. The adjustment above
            reflects this empirically-measured interaction effect.
          </div>
        </div>
      </div>
    </section>
  );
}
