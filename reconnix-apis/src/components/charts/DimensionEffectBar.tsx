'use client';

import { EffectSize, Model } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ErrorBar,
  ReferenceLine,
} from 'recharts';

interface DimensionEffectBarProps {
  effectSizes: EffectSize[];
  models: Model[];
}

// Map model ID to color
const getModelColor = (modelId: string): string => {
  const colorMap: Record<string, string> = {
    gpt54: '#10A37F',
    o3: '#1A1A1A',
    gemini: '#4285F4',
    claude: '#D4A853',
    llama: '#0064E0',
    sonar: '#20808D',
    gpt4o: '#10A37F', // legacy GPT-4o
  };
  return colorMap[modelId] || '#2E7CF6';
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-border rounded-lg shadow-md p-4 max-w-sm">
      <p className="font-semibold text-sm text-navy mb-3">{data.modelName}</p>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-text-soft">Effect Size (h):</span>
          <span className="font-mono font-semibold text-navy">{data.cohen_h.toFixed(3)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-soft">95% CI:</span>
          <span className="font-mono text-text-mid">
            [{data.ci_lower.toFixed(3)}, {data.ci_upper.toFixed(3)}]
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-soft">P(control):</span>
          <span className="font-mono text-text-mid">{(data.p_control * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-soft">P(manipulation):</span>
          <span className="font-mono text-text-mid">{(data.p_manipulation * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-soft">Trials:</span>
          <span className="font-mono text-text-mid">{data.n_trials}</span>
        </div>
      </div>
    </div>
  );
};

export default function DimensionEffectBar({ effectSizes, models }: DimensionEffectBarProps) {
  // Transform data for bar chart
  const chartData = effectSizes
    .map((es) => {
      const model = models.find((m) => m.id === es.model_id);
      return {
        model_id: es.model_id,
        modelName: model?.name || es.model_id,
        cohen_h: es.cohen_h,
        ci_lower: es.ci_lower,
        ci_upper: es.ci_upper,
        p_control: es.p_control,
        p_manipulation: es.p_manipulation,
        n_trials: es.n_trials,
        color: getModelColor(es.model_id),
        // Error bar range
        errorY: [es.cohen_h - es.ci_lower, es.ci_upper - es.cohen_h],
      };
    })
    // Sort by absolute effect size magnitude (descending)
    .sort((a, b) => Math.abs(b.cohen_h) - Math.abs(a.cohen_h));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-text-soft">
        <p>No effect size data available</p>
      </div>
    );
  }

  // Calculate domain with some padding
  const maxAbsEffect = Math.max(...chartData.map((d) => Math.max(Math.abs(d.ci_lower), Math.abs(d.ci_upper))));
  const domain = [-Math.ceil(maxAbsEffect * 1.1 * 10) / 10, Math.ceil(maxAbsEffect * 1.1 * 10) / 10];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 60)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 100, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E4EAFF" horizontal={false} />
          <XAxis
            type="number"
            domain={domain}
            tick={{ fill: '#6B7A99', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E4EAFF' }}
            label={{ value: "Cohen's h", position: 'insideBottom', offset: -5, style: { fill: '#6B7A99', fontSize: 12 } }}
          />
          <YAxis
            type="category"
            dataKey="modelName"
            tick={{ fill: '#0A1628', fontSize: 13, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#EBF2FF' }} />
          <ReferenceLine x={0} stroke="#6B7A99" strokeWidth={1.5} strokeDasharray="3 3" />

          <Bar dataKey="cohen_h" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <ErrorBar
              dataKey="errorY"
              width={4}
              strokeWidth={2}
              stroke="#3D4F6B"
              direction="x"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 text-sm text-text-soft text-center">
        Bars sorted by effect magnitude. Error bars show 95% confidence intervals.
      </div>
    </div>
  );
}
