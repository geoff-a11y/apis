'use client';

import { Model, Dimension, EffectSize } from '@/lib/types';
import { getDimensions, getEffectSize } from '@/lib/data';

interface ModelComparisonTableProps {
  models: Model[];
  selectedModelIds: string[];
  context?: 'b2c' | 'b2b' | 'pooled';
}

// Map model ID to CSS color variable
const getModelColor = (modelId: string): string => {
  const colorMap: Record<string, string> = {
    gpt54: '#10A37F',
    o3: '#1A1A1A',
    gemini: '#4285F4',
    claude: '#D4A853',
    llama: '#0064E0',
    sonar: '#20808D',
  };
  return colorMap[modelId] || '#2E7CF6';
};

// Get background color based on effect size magnitude
const getEffectColorClass = (effectSize: number): string => {
  const abs = Math.abs(effectSize);
  if (abs >= 0.8) return 'bg-green-100 text-green-900';
  if (abs >= 0.5) return 'bg-blue-100 text-blue-900';
  if (abs >= 0.3) return 'bg-yellow-100 text-yellow-900';
  if (abs >= 0.1) return 'bg-orange-100 text-orange-900';
  return 'bg-gray-100 text-gray-600';
};

// Calculate standard deviation across models for a dimension
const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

export function ModelComparisonTable({ models, selectedModelIds, context = 'pooled' }: ModelComparisonTableProps) {
  const dimensions = getDimensions();
  const selectedModels = models.filter(m => selectedModelIds.includes(m.id));

  if (selectedModelIds.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-soft">
          Select at least one model to view the comparison table
        </p>
      </div>
    );
  }

  // Calculate divergence for each dimension (how much models differ)
  const dimensionsWithDivergence = dimensions.map(dim => {
    const effectSizes = selectedModelIds
      .map(modelId => {
        const effect = getEffectSize(dim.id, modelId, context);
        return effect?.cohen_h ?? 0;
      });

    const stdDev = calculateStdDev(effectSizes);
    const range = Math.max(...effectSizes) - Math.min(...effectSizes);

    return {
      dimension: dim,
      effectSizes,
      stdDev,
      range,
      divergence: stdDev, // Use stdDev as divergence metric
    };
  });

  // Sort by divergence (highest first) to show most different dimensions at top
  const sortedDimensions = [...dimensionsWithDivergence].sort(
    (a, b) => b.divergence - a.divergence
  );

  return (
    <div className="card overflow-hidden">
      {/* Table header */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left py-4 px-4 font-semibold text-text-mid sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                Dimension
                <span className="block text-xs font-normal text-text-soft mt-1">
                  Sorted by divergence
                </span>
              </th>
              <th className="text-center py-4 px-3 font-semibold text-text-mid">
                Cluster
              </th>
              {selectedModels.map(model => (
                <th
                  key={model.id}
                  className="text-center py-4 px-3 font-semibold"
                  style={{ color: getModelColor(model.id) }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="whitespace-nowrap">{model.name}</span>
                    <span className="text-xs font-normal text-text-soft">
                      Cohen&apos;s h
                    </span>
                  </div>
                </th>
              ))}
              <th className="text-center py-4 px-3 font-semibold text-text-mid">
                <div className="flex flex-col items-center gap-1">
                  <span>Divergence</span>
                  <span className="text-xs font-normal text-text-soft">
                    Std Dev
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDimensions.map(({ dimension, effectSizes, stdDev, range }, index) => {
              const isHighDivergence = stdDev > 0.3;

              return (
                <tr
                  key={dimension.id}
                  className={`border-b border-border hover:bg-blue-light/30 transition-colors ${
                    isHighDivergence ? 'bg-yellow-50/50' : ''
                  }`}
                >
                  {/* Dimension name */}
                  <td className="py-3 px-4 sticky left-0 bg-white z-10 group-hover:bg-blue-light/30">
                    <div className="flex flex-col">
                      <span className="font-medium text-navy">
                        {dimension.display_name}
                      </span>
                      <span className="text-xs text-text-soft mt-0.5">
                        {dimension.description}
                      </span>
                    </div>
                  </td>

                  {/* Cluster */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white cluster-${dimension.cluster.toLowerCase()}`}
                      style={{
                        backgroundColor: `var(--cluster-${dimension.cluster.toLowerCase()})`,
                      }}
                    >
                      {dimension.cluster}
                    </span>
                  </td>

                  {/* Effect sizes for each model */}
                  {selectedModelIds.map((modelId, idx) => {
                    const effect = getEffectSize(dimension.id, modelId, context);
                    const effectSize = effect?.cohen_h ?? 0;

                    return (
                      <td
                        key={modelId}
                        className={`py-3 px-3 text-center ${getEffectColorClass(effectSize)}`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-semibold">
                            {effectSize.toFixed(2)}
                          </span>
                          {effect && (
                            <span className="text-xs opacity-70">
                              [{effect.ci_lower.toFixed(2)}, {effect.ci_upper.toFixed(2)}]
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Divergence metric */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono font-semibold text-navy">
                        {stdDev.toFixed(2)}
                      </span>
                      <span className="text-xs text-text-soft">
                        Δ {range.toFixed(2)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="border-t border-border bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-text-soft">
          <span className="font-semibold text-text-mid">Effect Size Magnitude:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>Strong (&ge;0.8)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Moderate (0.5–0.8)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Small (0.3–0.5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
            <span>Weak (0.1–0.3)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Negligible (&lt;0.1)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
