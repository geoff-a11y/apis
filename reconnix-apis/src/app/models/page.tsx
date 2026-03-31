// src/app/models/page.tsx — Models overview page

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  getConfirmatoryModels,
  getModelEffectSizes,
  getDimensions,
  getFingerprint,
} from '@/lib/data';

// Color scale for effect sizes
function getEffectColor(cohen_h: number): string {
  const absH = Math.abs(cohen_h);
  if (absH >= 0.8) return cohen_h > 0 ? 'var(--color-green)' : 'var(--color-red)';
  if (absH >= 0.5) return cohen_h > 0 ? 'var(--color-green-soft)' : 'var(--color-red-soft)';
  if (absH >= 0.2) return cohen_h > 0 ? 'var(--color-green-muted)' : 'var(--color-red-muted)';
  return 'var(--color-text-muted)';
}

function getEffectLabel(cohen_h: number): string {
  const absH = Math.abs(cohen_h);
  if (absH >= 0.8) return 'Large';
  if (absH >= 0.5) return 'Medium';
  if (absH >= 0.2) return 'Small';
  return 'Negligible';
}

export default function ModelsPage() {
  const models = getConfirmatoryModels();
  const dimensions = getDimensions();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Calculate aggregate stats for each model
  const modelStats = models.map((model) => {
    const effects = getModelEffectSizes(model.id);
    const fingerprint = getFingerprint(model.id);

    const positiveEffects = effects.filter((e) => e.cohen_h > 0.2);
    const negativeEffects = effects.filter((e) => e.cohen_h < -0.2);
    const meanEffect = effects.length > 0
      ? effects.reduce((sum, e) => sum + e.cohen_h, 0) / effects.length
      : 0;
    const maxEffect = effects.length > 0
      ? Math.max(...effects.map((e) => e.cohen_h))
      : 0;
    const minEffect = effects.length > 0
      ? Math.min(...effects.map((e) => e.cohen_h))
      : 0;

    // Find top 3 dimensions by absolute effect
    const topDimensions = [...effects]
      .sort((a, b) => Math.abs(b.cohen_h) - Math.abs(a.cohen_h))
      .slice(0, 3)
      .map((e) => {
        const dim = dimensions.find((d) => d.id === e.dimension_id);
        return {
          id: e.dimension_id,
          name: dim?.display_name || e.dimension_id,
          cohen_h: e.cohen_h,
        };
      });

    return {
      model,
      effects,
      positiveCount: positiveEffects.length,
      negativeCount: negativeEffects.length,
      meanEffect,
      maxEffect,
      minEffect,
      topDimensions,
      fingerprint,
    };
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Model Performance
        </h1>
        <p className="max-w-3xl" style={{ color: 'var(--color-text-mid)' }}>
          How each AI model responds to the 26 cognitive signals in our study.
          Effect sizes show how much adding a signal increases (or decreases) selection probability.
        </p>
      </section>

      {/* Effect size legend */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <span style={{ color: 'var(--color-text-mid)' }}>Effect size (Cohen&apos;s h):</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-green)' }} />
            <span style={{ color: 'var(--color-text-soft)' }}>Large positive (&gt;0.8)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-green-soft)' }} />
            <span style={{ color: 'var(--color-text-soft)' }}>Medium (0.5-0.8)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-green-muted)' }} />
            <span style={{ color: 'var(--color-text-soft)' }}>Small (0.2-0.5)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-red)' }} />
            <span style={{ color: 'var(--color-text-soft)' }}>Negative effect</span>
          </div>
        </div>
      </section>

      {/* Model cards grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modelStats.map(({ model, effects, positiveCount, negativeCount, meanEffect, topDimensions }) => (
          <div
            key={model.id}
            className="card p-6 cursor-pointer transition-all hover:shadow-lg"
            style={{
              borderLeft: `4px solid var(--model-${model.id})`,
              backgroundColor: selectedModel === model.id ? 'var(--color-surface-2)' : undefined,
            }}
            onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Image
                  src={model.logo}
                  alt={model.provider}
                  width={32}
                  height={32}
                  className="rounded"
                />
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {model.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                    {model.provider}
                  </p>
                </div>
              </div>
              <span
                className="badge text-xs"
                style={{
                  backgroundColor: meanEffect > 0.1 ? 'var(--color-green-bg)' : 'var(--color-surface-2)',
                  color: meanEffect > 0.1 ? 'var(--color-green)' : 'var(--color-text-soft)',
                }}
              >
                {meanEffect > 0 ? '+' : ''}{meanEffect.toFixed(2)} avg
              </span>
            </div>

            {/* Stats row */}
            <div className="flex gap-4 mb-4 text-sm">
              <div>
                <span style={{ color: 'var(--color-green)' }}>{positiveCount}</span>
                <span style={{ color: 'var(--color-text-soft)' }}> positive</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-red)' }}>{negativeCount}</span>
                <span style={{ color: 'var(--color-text-soft)' }}> negative</span>
              </div>
            </div>

            {/* Top dimensions */}
            <div className="space-y-2">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-mid)' }}>
                Strongest responses:
              </p>
              {topDimensions.map((dim) => (
                <div key={dim.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-text-soft)' }}>{dim.name}</span>
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: getEffectColor(dim.cohen_h),
                      color: 'white',
                    }}
                  >
                    {dim.cohen_h > 0 ? '+' : ''}{dim.cohen_h.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* View fingerprint link */}
            <Link
              href={`/fingerprints/${model.id}`}
              className="mt-4 block text-center text-sm py-2 rounded transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-text-mid)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              View full fingerprint
            </Link>
          </div>
        ))}
      </section>

      {/* Detailed comparison heatmap */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Effect Size Heatmap
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-soft)' }}>
          Cohen&apos;s h effect sizes for each model-dimension combination. Larger values indicate stronger influence on selection.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th
                  className="text-left py-2 px-3 sticky left-0"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text-mid)',
                    minWidth: '180px',
                  }}
                >
                  Dimension
                </th>
                {models.map((model) => (
                  <th
                    key={model.id}
                    className="text-center py-2 px-2"
                    style={{ color: `var(--model-${model.id})`, minWidth: '80px' }}
                  >
                    {model.name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dim) => (
                <tr key={dim.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td
                    className="py-2 px-3 sticky left-0"
                    style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-soft)' }}
                  >
                    <Link
                      href={`/dimensions/${dim.id}`}
                      className="hover:underline"
                      style={{ color: 'var(--color-text-soft)' }}
                    >
                      {dim.display_name}
                    </Link>
                  </td>
                  {models.map((model) => {
                    const effect = modelStats
                      .find((s) => s.model.id === model.id)
                      ?.effects.find((e) => e.dimension_id === dim.id);
                    const cohen_h = effect?.cohen_h ?? 0;

                    return (
                      <td key={model.id} className="text-center py-2 px-2">
                        <span
                          className="inline-block w-full py-1 rounded text-xs font-mono"
                          style={{
                            backgroundColor: `${getEffectColor(cohen_h)}20`,
                            color: getEffectColor(cohen_h),
                          }}
                        >
                          {cohen_h !== 0 ? (cohen_h > 0 ? '+' : '') + cohen_h.toFixed(2) : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interpretation guide */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          How to Read This Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm" style={{ color: 'var(--color-text-mid)' }}>
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Effect Size (Cohen&apos;s h)</h3>
            <p className="mb-2">
              Measures how much adding a signal changes the probability of a model selecting that option.
            </p>
            <ul className="space-y-1 ml-4">
              <li>&bull; <strong>0.8+</strong> = Large effect (practically significant)</li>
              <li>&bull; <strong>0.5-0.8</strong> = Medium effect (noticeable impact)</li>
              <li>&bull; <strong>0.2-0.5</strong> = Small effect (detectable but subtle)</li>
              <li>&bull; <strong>&lt;0.2</strong> = Negligible effect</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Negative Effects</h3>
            <p className="mb-2">
              Some signals actually <em>decrease</em> selection probability. For example:
            </p>
            <ul className="space-y-1 ml-4">
              <li>&bull; Scarcity tactics may trigger skepticism</li>
              <li>&bull; Price anchoring can backfire</li>
              <li>&bull; Heavy social proof may seem manipulative</li>
            </ul>
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-soft)' }}>
              These findings are from 56,640 controlled trials across 6 models.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
