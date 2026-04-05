'use client';

import { useState } from 'react';
import { ParetoVariant, NicknameType } from '../../lib/pareto';
import { getShortDescription, explainTradeoffDetailed } from '../../lib/pareto-explainer';

interface ExplainableVariant extends ParetoVariant {
  nickname?: NicknameType;
  recommended?: boolean;
}

interface ParetoExplorerProps {
  variants: ExplainableVariant[];
  baseline?: { ai?: number; seo?: number; human?: number };
  onSelect?: (variant: ExplainableVariant) => void;
  selectedId?: string;
}

const nicknameColors: Record<NicknameType, string> = {
  'AI Champion': '#8b5cf6',
  'SEO Specialist': '#06b6d4',
  'Human Touch': '#22c55e',
  'Balanced Winner': '#f97316',
};

const nicknameIcons: Record<NicknameType, string> = {
  'AI Champion': '🤖',
  'SEO Specialist': '🔍',
  'Human Touch': '💚',
  'Balanced Winner': '⭐',
};

export default function ParetoExplorer({
  variants,
  baseline,
  onSelect,
  selectedId,
}: ParetoExplorerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Calculate chart dimensions
  const chartWidth = 400;
  const chartHeight = 300;
  const padding = 40;

  // Find min/max for scaling
  const aiScores = variants.map(v => v.ai);
  const seoScores = variants.map(v => v.seo);
  const minAi = Math.min(...aiScores, baseline?.ai ?? 100) - 5;
  const maxAi = Math.max(...aiScores, baseline?.ai ?? 0) + 5;
  const minSeo = Math.min(...seoScores, baseline?.seo ?? 100) - 5;
  const maxSeo = Math.max(...seoScores, baseline?.seo ?? 0) + 5;

  // Scale functions
  const scaleX = (ai: number) =>
    padding + ((ai - minAi) / (maxAi - minAi)) * (chartWidth - 2 * padding);
  const scaleY = (seo: number) =>
    chartHeight - padding - ((seo - minSeo) / (maxSeo - minSeo)) * (chartHeight - 2 * padding);

  const hoveredVariant = variants.find(v => v.id === hoveredId);
  const alternatives = variants.filter(v => v.id !== hoveredId);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Pareto Frontier
        </h3>
        <span className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
          {variants.length} optimal variants
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(nicknameColors).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1">
            <span style={{ color }}>{nicknameIcons[name as NicknameType]}</span>
            <span style={{ color: 'var(--color-text-mid)' }}>{name}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="relative" role="img" aria-label="Pareto frontier chart">
        <svg width={chartWidth} height={chartHeight} className="overflow-visible">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(tick => {
            const aiTick = minAi + (tick / 100) * (maxAi - minAi);
            const seoTick = minSeo + (tick / 100) * (maxSeo - minSeo);
            return (
              <g key={tick}>
                <line
                  x1={scaleX(aiTick)}
                  y1={padding}
                  x2={scaleX(aiTick)}
                  y2={chartHeight - padding}
                  stroke="var(--color-border)"
                  strokeDasharray="2,2"
                />
                <line
                  x1={padding}
                  y1={scaleY(seoTick)}
                  x2={chartWidth - padding}
                  y2={scaleY(seoTick)}
                  stroke="var(--color-border)"
                  strokeDasharray="2,2"
                />
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 5}
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-text-mid)"
          >
            AI Score →
          </text>
          <text
            x={12}
            y={chartHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-text-mid)"
            transform={`rotate(-90, 12, ${chartHeight / 2})`}
          >
            SEO Score →
          </text>

          {/* Baseline point */}
          {baseline?.ai !== undefined && baseline?.seo !== undefined && (
            <circle
              cx={scaleX(baseline.ai)}
              cy={scaleY(baseline.seo)}
              r={8}
              fill="var(--color-text-soft)"
              stroke="var(--color-border)"
              strokeWidth={2}
              opacity={0.5}
            />
          )}

          {/* Variant points */}
          {variants.map(variant => {
            const isHovered = hoveredId === variant.id;
            const isSelected = selectedId === variant.id;
            const color = variant.nickname
              ? nicknameColors[variant.nickname]
              : 'var(--color-accent)';

            return (
              <g key={variant.id}>
                <circle
                  cx={scaleX(variant.ai)}
                  cy={scaleY(variant.seo)}
                  r={isHovered || isSelected ? 12 : variant.recommended ? 10 : 8}
                  fill={color}
                  stroke={isSelected ? 'white' : 'transparent'}
                  strokeWidth={2}
                  opacity={isHovered ? 1 : 0.8}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredId(variant.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onSelect?.(variant)}
                />
                {variant.recommended && (
                  <text
                    x={scaleX(variant.ai)}
                    y={scaleY(variant.seo) - 16}
                    textAnchor="middle"
                    fontSize="14"
                  >
                    ⭐
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Variant cards */}
      <div className="grid grid-cols-2 gap-3">
        {variants.map(variant => {
          const isSelected = selectedId === variant.id;
          const color = variant.nickname
            ? nicknameColors[variant.nickname]
            : 'var(--color-accent)';

          return (
            <button
              key={variant.id}
              onClick={() => onSelect?.(variant)}
              onMouseEnter={() => setHoveredId(variant.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`p-3 rounded-lg text-left transition-all ${
                variant.recommended ? 'recommended' : ''
              }`}
              style={{
                backgroundColor: isSelected
                  ? 'var(--color-accent-soft)'
                  : 'var(--color-surface)',
                borderLeft: `3px solid ${color}`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color }}>
                  {variant.nickname || `Variant ${variant.id.slice(0, 6)}`}
                </span>
                {variant.recommended && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                    REC
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                {getShortDescription(variant)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Hover explanation */}
      {hoveredVariant && (
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="text-sm space-y-2">
            <p style={{ color: 'var(--color-text)' }}>
              {explainTradeoffDetailed(hoveredVariant, alternatives, baseline || {}).summary}
            </p>
            {explainTradeoffDetailed(hoveredVariant, alternatives, baseline || {}).recommendation && (
              <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
                {explainTradeoffDetailed(hoveredVariant, alternatives, baseline || {}).recommendation}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
