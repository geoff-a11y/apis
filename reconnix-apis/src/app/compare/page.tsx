// src/app/compare/page.tsx — Model comparison page (Enhanced)
'use client';

import { useState } from 'react';
import {
  getConfirmatoryModels,
  getCosineSimilarityMatrix,
  getConfirmatoryFingerprints,
  getModelSimilarity,
} from '@/lib/data';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ContextSwitcher, ContextBadge, type Context } from '@/components/ui/ContextSwitcher';
import FingerprintRadar from '@/components/charts/FingerprintRadar';
import { ModelComparisonTable } from '@/components/charts/ModelComparisonTable';

export default function ComparePage() {
  const [selectedContext, setSelectedContext] = useState<Context>('pooled');
  const models = getConfirmatoryModels();
  const fingerprints = getConfirmatoryFingerprints();
  const similarities = getCosineSimilarityMatrix();
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  // Filter models and fingerprints based on selection
  const displayModels =
    selectedModelIds.length > 0
      ? models.filter((m) => selectedModelIds.includes(m.id))
      : models;

  const displayFingerprints =
    selectedModelIds.length > 0
      ? fingerprints.filter((fp) => selectedModelIds.includes(fp.model_id))
      : fingerprints;

  // Calculate pairwise similarities for selected models
  const pairwiseSimilarities = [];
  if (selectedModelIds.length >= 2) {
    for (let i = 0; i < selectedModelIds.length; i++) {
      for (let j = i + 1; j < selectedModelIds.length; j++) {
        const modelA = models.find((m) => m.id === selectedModelIds[i]);
        const modelB = models.find((m) => m.id === selectedModelIds[j]);
        if (modelA && modelB) {
          const similarity = getModelSimilarity(selectedModelIds[i], selectedModelIds[j]);
          pairwiseSimilarities.push({
            modelA,
            modelB,
            similarity,
          });
        }
      }
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Compare Models
        </h1>
        <p className="max-w-2xl" style={{ color: 'var(--color-text-mid)' }}>
          Compare behavioral fingerprints across models to understand how different AI
          systems weight content signals differently.
        </p>
      </section>

      {/* Context Switcher */}
      <section className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>View effects for:</span>
          <ContextSwitcher
            value={selectedContext}
            onChange={setSelectedContext}
            showPooled={true}
          />
        </div>
        <ContextBadge context={selectedContext} />
      </section>

      {/* Model selection */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Select Models to Compare
        </h2>
        <ModelSelector
          models={models}
          mode="multi"
          selectedIds={selectedModelIds}
          onSelectionChange={setSelectedModelIds}
          showLogos={true}
        />
      </section>

      {/* Cosine similarity scores for selected models */}
      {selectedModelIds.length >= 2 && (
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Cosine Similarity Scores
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-mid)' }}>
            Similarity ranges from 0% (completely different) to 100% (identical). Higher
            scores indicate models have more similar behavioral fingerprints.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pairwiseSimilarities.map((pair, index) => (
              <div
                key={index}
                className="rounded-lg p-4 transition-colors"
                style={{
                  border: '1px solid var(--color-border)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {pair.modelA.name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-soft)' }}>vs</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {pair.modelB.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                      {(pair.similarity * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>similarity</div>
                  </div>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pair.similarity * 100}%`, backgroundColor: 'var(--color-accent)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Radar chart comparison */}
      <section className="card p-8">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Behavioral Fingerprint Comparison
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-mid)' }}>
          {selectedModelIds.length === 0 && (
            <>Select models above to visualize their behavioral fingerprints together.</>
          )}
          {selectedModelIds.length === 1 && (
            <>Viewing {displayModels[0].name}&apos;s fingerprint. Select additional models to compare.</>
          )}
          {selectedModelIds.length === 2 && (
            <>Side-by-side comparison of {displayModels[0].name} and {displayModels[1].name}.</>
          )}
          {selectedModelIds.length >= 3 && (
            <>Overlaid comparison of {selectedModelIds.length} models. Hover over dimensions to see individual values.</>
          )}
        </p>

        {selectedModelIds.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]" style={{ color: 'var(--color-text-soft)' }}>
            <p>Select at least one model to display the radar chart</p>
          </div>
        ) : selectedModelIds.length === 2 ? (
          // Side-by-side view for 2 models
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {displayFingerprints.map((fp) => {
              const model = displayModels.find((m) => m.id === fp.model_id);
              if (!model) return null;
              return (
                <div key={fp.model_id} className="rounded-lg p-6" style={{ border: '1px solid var(--color-border)' }}>
                  <h3 className="font-display text-lg font-semibold mb-4 text-center" style={{ color: 'var(--color-text)' }}>
                    {model.name}
                  </h3>
                  <FingerprintRadar
                    fingerprints={[fp]}
                    models={[model]}
                    selectedModelIds={[model.id]}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          // Overlaid view for 1 or 3+ models
          <FingerprintRadar
            fingerprints={displayFingerprints}
            models={displayModels}
            selectedModelIds={selectedModelIds.length > 0 ? selectedModelIds : undefined}
          />
        )}
      </section>

      {/* Dimension comparison table */}
      {selectedModelIds.length > 0 && (
        <section>
          <div className="mb-6">
            <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Dimension-by-Dimension Comparison
            </h2>
            <p style={{ color: 'var(--color-text-mid)' }}>
              Effect sizes for each dimension across selected models. Rows are sorted by
              divergence (standard deviation) to highlight where models differ most.
            </p>
          </div>
          <ModelComparisonTable models={models} selectedModelIds={selectedModelIds} context={selectedContext} />
        </section>
      )}

      {/* Full similarity matrix (only show when no models selected or all selected) */}
      {(selectedModelIds.length === 0 || selectedModelIds.length === models.length) && (
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Full Cosine Similarity Matrix
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-mid)' }}>
            Pairwise similarity scores between all {models.length} models. Diagonal cells
            (model vs itself) are shown in gray.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}></th>
                  {displayModels.map((m) => (
                    <th
                      key={m.id}
                      className="text-center py-3 px-2 font-medium text-xs"
                      style={{ color: 'var(--color-text-soft)' }}
                    >
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayModels.map((modelA) => (
                  <tr key={modelA.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="py-3 px-4 font-medium">{modelA.name}</td>
                    {displayModels.map((modelB) => {
                      const sim = similarities.find(
                        (s) => s.model_a === modelA.id && s.model_b === modelB.id
                      );
                      const value = sim?.similarity ?? 0;
                      const isIdentity = modelA.id === modelB.id;
                      return (
                        <td
                          key={modelB.id}
                          className={`py-3 px-2 text-center font-mono text-xs ${
                            isIdentity
                              ? ''
                              : value > 0.9
                              ? 'font-semibold'
                              : value > 0.8
                              ? ''
                              : value > 0.7
                              ? ''
                              : 'font-semibold'
                          }`}
                          style={{
                            backgroundColor: isIdentity
                              ? 'var(--color-surface)'
                              : value > 0.9
                              ? '#d1fae5'
                              : value > 0.8
                              ? '#bfdbfe'
                              : value > 0.7
                              ? '#fef3c7'
                              : '#fee2e2',
                            color: isIdentity
                              ? 'var(--color-text-muted)'
                              : value > 0.9
                              ? '#065f46'
                              : value > 0.8
                              ? '#1e3a8a'
                              : value > 0.7
                              ? '#92400e'
                              : '#991b1b'
                          }}
                        >
                          {(value * 100).toFixed(0)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend for similarity matrix */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--color-text-soft)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-text-mid)' }}>Similarity Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d1fae5', border: '1px solid #6ee7b7' }}></div>
              <span>Very Similar (&gt;90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#bfdbfe', border: '1px solid #93c5fd' }}></div>
              <span>Similar (80–90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}></div>
              <span>Moderate (70–80%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5' }}></div>
              <span>Different (&lt;70%)</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
