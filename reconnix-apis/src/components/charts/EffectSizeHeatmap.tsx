'use client';

import { useState } from 'react';
import { getModels, getDimensions, getEffectSizes } from '@/lib/data';
import type { EffectSize, Model, Dimension } from '@/lib/types';
import {
  getEffectSizeColor,
  getEffectSizeBgColor,
  getEffectSizeLabel,
  generateColorScale,
} from '@/lib/colors';
import clsx from 'clsx';

interface EffectSizeHeatmapProps {
  context?: 'b2c' | 'b2b' | 'pooled';
  confirmatoryOnly?: boolean;
  className?: string;
}

interface HeatmapCell {
  modelId: string;
  dimensionId: string;
  effectSize: EffectSize | null;
}

interface CellDetails {
  modelName: string;
  dimensionName: string;
  effectSize: EffectSize;
}

export function EffectSizeHeatmap({
  context = 'pooled',
  confirmatoryOnly = true,
  className,
}: EffectSizeHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<CellDetails | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Get data
  const models = getModels().filter((m) =>
    confirmatoryOnly ? m.study_type === 'confirmatory' : true
  );
  const dimensions = getDimensions();
  const effectSizes = getEffectSizes(context);

  // Build matrix
  const matrix: HeatmapCell[][] = models.map((model) => {
    return dimensions.map((dimension) => {
      const effectSize =
        effectSizes.find(
          (e) => e.model_id === model.id && e.dimension_id === dimension.id
        ) || null;

      return {
        modelId: model.id,
        dimensionId: dimension.id,
        effectSize,
      };
    });
  });

  const handleCellClick = (cell: HeatmapCell) => {
    if (!cell.effectSize) return;

    const model = models.find((m) => m.id === cell.modelId);
    const dimension = dimensions.find((d) => d.id === cell.dimensionId);

    if (model && dimension) {
      setSelectedCell({
        modelName: model.name,
        dimensionName: dimension.display_name,
        effectSize: cell.effectSize,
      });
    }
  };

  const getCellKey = (modelId: string, dimId: string) => `${modelId}-${dimId}`;

  const colorScale = generateColorScale(11);

  return (
    <div className={clsx('relative rounded-xl p-6', className)} style={{ backgroundColor: '#ffffff' }}>
      {/* Legend */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>
            Effect Size Heatmap
          </h3>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Cohen&apos;s h effect sizes across models and dimensions
          </p>
        </div>

        {/* Color scale legend */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-soft">-1.0</span>
          <div className="flex h-6">
            {colorScale.map((item, idx) => (
              <div
                key={idx}
                className="w-6 h-full first:rounded-l last:rounded-r"
                style={{ backgroundColor: item.color }}
                title={`h = ${item.value.toFixed(2)}`}
              />
            ))}
          </div>
          <span className="text-xs text-text-soft">+1.0</span>
        </div>
      </div>

      {/* Heatmap container with horizontal scroll */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="inline-block min-w-full">
          {/* Column headers (dimensions) */}
          <div className="flex mb-2">
            {/* Spacer for row labels */}
            <div className="w-32 sm:w-40 flex-shrink-0" />

            {/* Dimension headers */}
            {dimensions.map((dim) => (
              <div
                key={dim.id}
                className="w-12 sm:w-16 flex-shrink-0 flex items-end justify-center"
                title={dim.display_name}
              >
                <div className="transform -rotate-45 origin-bottom-left text-[10px] sm:text-xs text-text-mid font-medium whitespace-nowrap mb-8 sm:mb-10">
                  {/* Show abbreviated dimension name */}
                  {dim.id.replace('dim_', 'D')}
                </div>
              </div>
            ))}
          </div>

          {/* Heatmap rows */}
          {models.map((model, rowIdx) => (
            <div key={model.id} className="flex items-center mb-1">
              {/* Model name (row label) */}
              <div className="w-32 sm:w-40 flex-shrink-0 pr-3">
                <span className="text-xs sm:text-sm font-medium text-navy truncate block">
                  {model.name}
                </span>
              </div>

              {/* Effect size cells */}
              {matrix[rowIdx].map((cell) => {
                const cellKey = getCellKey(cell.modelId, cell.dimensionId);
                const isHovered = hoveredCell === cellKey;
                const cohenH = cell.effectSize?.cohen_h ?? 0;

                return (
                  <div
                    key={cell.dimensionId}
                    className={clsx(
                      'w-12 sm:w-16 h-12 sm:h-16 flex-shrink-0 border border-border cursor-pointer transition-all duration-150',
                      'flex items-center justify-center text-xs font-mono',
                      isHovered && 'ring-2 ring-blue ring-offset-1 scale-105 z-10'
                    )}
                    style={{
                      backgroundColor: cell.effectSize
                        ? getEffectSizeBgColor(cohenH)
                        : '#f9fafb',
                      color: cell.effectSize ? getEffectSizeColor(cohenH) : '#9ca3af',
                    }}
                    onClick={() => handleCellClick(cell)}
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={
                      cell.effectSize
                        ? `${cohenH.toFixed(3)} (${getEffectSizeLabel(cohenH)})`
                        : 'No data'
                    }
                  >
                    {cell.effectSize ? (
                      <span className="font-semibold">
                        {cohenH > 0 ? '+' : ''}
                        {cohenH.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Dimension key below heatmap */}
      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="text-xs font-semibold text-navy mb-2">Dimension Key</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1 text-xs">
          {dimensions.map((dim) => (
            <div key={dim.id} className="text-text-mid">
              <span className="font-mono font-semibold">
                {dim.id.replace('dim_', 'D')}
              </span>
              : {dim.display_name}
            </div>
          ))}
        </div>
      </div>

      {/* Selected cell details modal/panel */}
      {selectedCell && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="bg-white rounded-lg shadow-md max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-navy">
                  Effect Size Details
                </h3>
                <p className="text-sm text-text-soft mt-1">
                  {selectedCell.modelName} × {selectedCell.dimensionName}
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-text-soft hover:text-navy transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Cohen's h */}
              <div>
                <div className="text-xs text-text-soft mb-1">Cohen&apos;s h</div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-3xl font-bold font-mono"
                    style={{
                      color: getEffectSizeColor(selectedCell.effectSize.cohen_h),
                    }}
                  >
                    {selectedCell.effectSize.cohen_h > 0 ? '+' : ''}
                    {selectedCell.effectSize.cohen_h.toFixed(3)}
                  </span>
                  <span className="text-sm text-text-mid">
                    {getEffectSizeLabel(selectedCell.effectSize.cohen_h)}
                  </span>
                </div>
              </div>

              {/* Confidence interval */}
              <div>
                <div className="text-xs text-text-soft mb-1">
                  95% Confidence Interval
                </div>
                <div className="text-sm font-mono text-navy">
                  [{selectedCell.effectSize.ci_lower.toFixed(3)},{' '}
                  {selectedCell.effectSize.ci_upper.toFixed(3)}]
                </div>
              </div>

              {/* Proportions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-text-soft mb-1">
                    Control Proportion
                  </div>
                  <div className="text-lg font-semibold text-navy">
                    {(selectedCell.effectSize.p_control * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-soft mb-1">
                    Manipulation Proportion
                  </div>
                  <div className="text-lg font-semibold text-navy">
                    {(selectedCell.effectSize.p_manipulation * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Sample size */}
              <div>
                <div className="text-xs text-text-soft mb-1">Sample Size</div>
                <div className="text-sm text-navy">
                  n = {selectedCell.effectSize.n_trials} trials
                </div>
              </div>

              {/* Confirmatory badge */}
              {selectedCell.effectSize.confirmatory && (
                <div className="pt-2 border-t border-border">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                    Confirmatory (ICC ≥ 0.70)
                  </span>
                </div>
              )}
            </div>

            {/* Close button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue rounded hover:bg-blue/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
