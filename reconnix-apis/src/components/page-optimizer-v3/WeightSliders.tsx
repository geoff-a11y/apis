'use client';

import { useState, useEffect } from 'react';
import { WEIGHT_PRESETS, Weights } from '../../lib/unified-fitness';

interface WeightSlidersProps {
  onChange: (weights: { ai: number; seo: number; human: number }) => void;
  initial?: { ai: number; seo: number; human: number };
}

// Convert 0-1 weights to percentages
function toPercentages(weights: Weights): { ai: number; seo: number; human: number } {
  return {
    ai: Math.round(weights.ai * 100),
    seo: Math.round(weights.seo * 100),
    human: Math.round(weights.human * 100),
  };
}

// Convert percentages to 0-1 weights
function toWeights(percentages: { ai: number; seo: number; human: number }): Weights {
  const sum = percentages.ai + percentages.seo + percentages.human;
  return {
    ai: percentages.ai / sum,
    seo: percentages.seo / sum,
    human: percentages.human / sum,
  };
}

type PresetKey = keyof typeof WEIGHT_PRESETS;

const presetLabels: Record<PresetKey, string> = {
  balanced: 'Balanced',
  ai_first: 'AI First',
  seo_first: 'SEO First',
  conversion: 'Conversion',
};

const presetDescriptions: Record<PresetKey, string> = {
  balanced: 'Equal weight to all three dimensions',
  ai_first: 'Prioritize AI recommendation signals',
  seo_first: 'Prioritize search engine optimization',
  conversion: 'Prioritize human appeal and conversion',
};

export default function WeightSliders({
  onChange,
  initial,
}: WeightSlidersProps) {
  const [activePreset, setActivePreset] = useState<PresetKey | null>('balanced');
  const [weights, setWeights] = useState(
    initial || toPercentages(WEIGHT_PRESETS.balanced)
  );

  // Sync with initial value
  useEffect(() => {
    if (initial) {
      setWeights(initial);
      setActivePreset(null);
    }
  }, [initial]);

  // Handle slider change while maintaining sum = 100
  const handleSliderChange = (dimension: 'ai' | 'seo' | 'human', value: number) => {
    const others = ['ai', 'seo', 'human'].filter(d => d !== dimension) as ('ai' | 'seo' | 'human')[];
    const remaining = 100 - value;
    const otherSum = weights[others[0]] + weights[others[1]];

    let newWeights: typeof weights;

    if (otherSum === 0) {
      // Distribute remaining evenly
      newWeights = {
        ...weights,
        [dimension]: value,
        [others[0]]: remaining / 2,
        [others[1]]: remaining / 2,
      };
    } else {
      // Distribute remaining proportionally
      const ratio0 = weights[others[0]] / otherSum;
      const ratio1 = weights[others[1]] / otherSum;
      newWeights = {
        ...weights,
        [dimension]: value,
        [others[0]]: Math.round(remaining * ratio0),
        [others[1]]: Math.round(remaining * ratio1),
      };

      // Fix rounding errors
      const total = newWeights.ai + newWeights.seo + newWeights.human;
      if (total !== 100) {
        newWeights[others[1]] += 100 - total;
      }
    }

    setWeights(newWeights);
    setActivePreset(null);
    onChange(newWeights);
  };

  // Apply preset
  const applyPreset = (preset: PresetKey) => {
    const newWeights = toPercentages(WEIGHT_PRESETS[preset]);
    setWeights(newWeights);
    setActivePreset(preset);
    onChange(newWeights);
  };

  return (
    <div className="card p-6 space-y-5">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
        Score Weights
      </h3>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(WEIGHT_PRESETS) as PresetKey[]).map((preset) => (
          <button
            key={preset}
            onClick={() => applyPreset(preset)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activePreset === preset
                ? 'var(--color-accent)'
                : 'var(--color-surface)',
              color: activePreset === preset
                ? 'white'
                : 'var(--color-text-mid)',
            }}
          >
            {presetLabels[preset]}
          </button>
        ))}
      </div>

      {/* Preset description */}
      {activePreset && (
        <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
          {presetDescriptions[activePreset]}
        </p>
      )}

      {/* Sliders */}
      <div className="space-y-4">
        {/* AI Weight */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label htmlFor="ai-weight" style={{ color: 'var(--color-text)' }}>
              AI Weight
            </label>
            <span className="font-mono" style={{ color: '#8b5cf6' }}>
              {weights.ai}%
            </span>
          </div>
          <input
            id="ai-weight"
            type="range"
            min="0"
            max="100"
            value={weights.ai}
            onChange={(e) => handleSliderChange('ai', parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #8b5cf6 ${weights.ai}%, var(--color-border) ${weights.ai}%)`,
            }}
            aria-label="AI Weight"
          />
        </div>

        {/* SEO Weight */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label htmlFor="seo-weight" style={{ color: 'var(--color-text)' }}>
              SEO Weight
            </label>
            <span className="font-mono" style={{ color: '#06b6d4' }}>
              {weights.seo}%
            </span>
          </div>
          <input
            id="seo-weight"
            type="range"
            min="0"
            max="100"
            value={weights.seo}
            onChange={(e) => handleSliderChange('seo', parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #06b6d4 ${weights.seo}%, var(--color-border) ${weights.seo}%)`,
            }}
            aria-label="SEO Weight"
          />
        </div>

        {/* Human Weight */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label htmlFor="human-weight" style={{ color: 'var(--color-text)' }}>
              Human Weight
            </label>
            <span className="font-mono" style={{ color: '#22c55e' }}>
              {weights.human}%
            </span>
          </div>
          <input
            id="human-weight"
            type="range"
            min="0"
            max="100"
            value={weights.human}
            onChange={(e) => handleSliderChange('human', parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #22c55e ${weights.human}%, var(--color-border) ${weights.human}%)`,
            }}
            aria-label="Human Weight"
          />
        </div>
      </div>

      {/* Visual distribution */}
      <div className="h-4 rounded-full overflow-hidden flex">
        <div
          className="transition-all"
          style={{ width: `${weights.ai}%`, backgroundColor: '#8b5cf6' }}
        />
        <div
          className="transition-all"
          style={{ width: `${weights.seo}%`, backgroundColor: '#06b6d4' }}
        />
        <div
          className="transition-all"
          style={{ width: `${weights.human}%`, backgroundColor: '#22c55e' }}
        />
      </div>
    </div>
  );
}
