// src/app/fingerprints/page.tsx — Fingerprints page (Phase 1)

'use client';

import { useState } from 'react';
import { getConfirmatoryFingerprints, getConfirmatoryModels, getModel } from '@/lib/data';
import FingerprintRadar from '@/components/charts/FingerprintRadar';

// Models with light backgrounds that need dark text
const LIGHT_BG_MODELS = ['o3'];

function getModelTextColor(modelId: string, isSelected: boolean): string {
  if (!isSelected) return 'var(--color-text-mid)';
  return LIGHT_BG_MODELS.includes(modelId) ? 'var(--color-text)' : 'white';
}

export default function FingerprintsPage() {
  const fingerprints = getConfirmatoryFingerprints();
  const models = getConfirmatoryModels();
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(
    models.slice(0, 3).map((m) => m.id) // Default: select first 3 models
  );

  const toggleModel = (modelId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Behavioral Fingerprints
        </h1>
        <p className="max-w-2xl" style={{ color: 'var(--color-text-mid)' }}>
          Each model's unique pattern of responses across all {fingerprints[0]?.vector.length ?? 26} dimensions,
          normalized to a 0–100 scale. These fingerprints reveal how different AI systems
          weight various content signals differently.
        </p>
      </section>

      {/* Model selector */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Select Models to Compare
        </h2>
        <div className="flex flex-wrap gap-2">
          {models.map((model) => {
            const isSelected = selectedModelIds.includes(model.id);
            return (
              <button
                key={model.id}
                onClick={() => toggleModel(model.id)}
                className="badge transition-all cursor-pointer"
                style={{
                  backgroundColor: isSelected
                    ? `var(--model-${model.id})`
                    : 'var(--color-surface-2)',
                  color: getModelTextColor(model.id, isSelected),
                  border: isSelected && LIGHT_BG_MODELS.includes(model.id)
                    ? '1px solid var(--color-border)'
                    : 'none',
                }}
              >
                {model.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--color-text-soft)' }}>
          {selectedModelIds.length} model{selectedModelIds.length !== 1 ? 's' : ''} selected
        </p>
      </section>

      {/* Radar chart */}
      <section className="card p-8">
        <h2 className="font-display text-xl font-semibold mb-6" style={{ color: 'var(--color-text)' }}>
          Radar Visualization
        </h2>
        <FingerprintRadar
          fingerprints={fingerprints}
          models={models}
          selectedModelIds={selectedModelIds}
        />
      </section>

      {/* Fingerprint data table */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Fingerprint Summary
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>Model</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>Provider</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>Mean Effect</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>Top Dimensions</th>
              </tr>
            </thead>
            <tbody>
              {fingerprints.map((fp) => {
                const model = getModel(fp.model_id);
                return (
                  <tr
                    key={fp.model_id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="py-3 px-4 font-medium" style={{ color: 'var(--color-text)' }}>{model?.name ?? fp.model_id}</td>
                    <td className="py-3 px-4" style={{ color: 'var(--color-text-mid)' }}>{model?.provider ?? '—'}</td>
                    <td className="py-3 px-4 font-mono" style={{ color: 'var(--color-text)' }}>
                      {fp.mean_effect_size.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-xs" style={{ color: 'var(--color-text-mid)' }}>
                      {fp.top_dimensions.slice(0, 3).join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
