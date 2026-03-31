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
  Legend,
  Cell,
} from 'recharts';

interface ContextComparisonBarProps {
  b2cEffects: EffectSize[];
  b2bEffects: EffectSize[];
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
    gpt4o: '#10A37F',
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
          <span className="text-text-soft">B2C Effect:</span>
          <span className="font-mono font-semibold" style={{ color: '#7C3AED' }}>
            h = {data.b2c.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-soft">B2B Effect:</span>
          <span className="font-mono font-semibold" style={{ color: '#B45309' }}>
            h = {data.b2b.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-soft">Difference:</span>
          <span className="font-mono text-text-mid">
            {Math.abs(data.b2c - data.b2b).toFixed(3)}
          </span>
        </div>
        {data.b2c !== 0 && data.b2b !== 0 && (
          <div className="pt-2 mt-2 border-t border-border">
            <span className="text-text-soft">
              {Math.abs(data.b2c) > Math.abs(data.b2b)
                ? 'Stronger in B2C context'
                : Math.abs(data.b2b) > Math.abs(data.b2c)
                ? 'Stronger in B2B context'
                : 'Equal effect in both contexts'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom legend
const CustomLegend = ({ payload }: any) => {
  if (!payload || !payload.length) return null;

  return (
    <div className="flex justify-center gap-6 mt-4">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7C3AED' }} />
        <span className="text-sm font-medium text-text-mid">B2C Context</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#B45309' }} />
        <span className="text-sm font-medium text-text-mid">B2B Context</span>
      </div>
    </div>
  );
};

export default function ContextComparisonBar({
  b2cEffects,
  b2bEffects,
  models
}: ContextComparisonBarProps) {
  // Merge B2C and B2B data by model
  const chartData: any[] = [];

  // Create a map of models that have both B2C and B2B data
  const modelMap = new Map<string, { b2c?: number; b2b?: number; modelName: string }>();

  b2cEffects.forEach((es) => {
    const model = models.find((m) => m.id === es.model_id);
    modelMap.set(es.model_id, {
      b2c: es.cohen_h,
      b2b: modelMap.get(es.model_id)?.b2b,
      modelName: model?.name || es.model_id,
    });
  });

  b2bEffects.forEach((es) => {
    const model = models.find((m) => m.id === es.model_id);
    const existing = modelMap.get(es.model_id);
    if (existing) {
      existing.b2b = es.cohen_h;
    } else {
      modelMap.set(es.model_id, {
        b2c: undefined,
        b2b: es.cohen_h,
        modelName: model?.name || es.model_id,
      });
    }
  });

  // Convert to array and filter to only models with both contexts
  modelMap.forEach((value, key) => {
    if (value.b2c !== undefined && value.b2b !== undefined) {
      chartData.push({
        model_id: key,
        modelName: value.modelName,
        b2c: value.b2c,
        b2b: value.b2b,
        color: getModelColor(key),
      });
    }
  });

  // Sort by the larger absolute effect
  chartData.sort((a, b) => {
    const maxA = Math.max(Math.abs(a.b2c), Math.abs(a.b2b));
    const maxB = Math.max(Math.abs(b.b2c), Math.abs(b.b2b));
    return maxB - maxA;
  });

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-text-soft">
        <p>No context comparison data available (requires both B2C and B2B measurements)</p>
      </div>
    );
  }

  // Calculate domain
  const allValues = chartData.flatMap(d => [d.b2c, d.b2b]);
  const maxAbs = Math.max(...allValues.map(v => Math.abs(v)));
  const domain = [-Math.ceil(maxAbs * 1.1 * 10) / 10, Math.ceil(maxAbs * 1.1 * 10) / 10];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 70)}>
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
            label={{
              value: "Cohen's h",
              position: 'insideBottom',
              offset: -5,
              style: { fill: '#6B7A99', fontSize: 12 }
            }}
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
          <Legend content={<CustomLegend />} />

          <Bar dataKey="b2c" fill="#7C3AED" radius={[0, 4, 4, 0]} />
          <Bar dataKey="b2b" fill="#B45309" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-sm text-text-soft text-center">
        Side-by-side comparison of effect sizes across B2C and B2B contexts
      </div>
    </div>
  );
}
