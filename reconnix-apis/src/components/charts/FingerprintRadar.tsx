'use client';

import { BehavioralFingerprint, Model, Dimension } from '@/lib/types';
import { getDimensions } from '@/lib/data';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface FingerprintRadarProps {
  fingerprints: BehavioralFingerprint[];
  models: Model[];
  selectedModelIds?: string[];
}

// Map model ID to CSS color variable
const getModelColor = (modelId: string): string => {
  const colorMap: Record<string, string> = {
    gpt54: '#10A37F',
    o3: '#374151',  // Darker gray for visibility on white
    gemini: '#4285F4',
    claude: '#D4A853',
    llama: '#0064E0',
    sonar: '#20808D',
  };
  return colorMap[modelId] || '#2E7CF6';
};

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
  payload: {
    display_name: string;
    dimension: string;
    cluster: string;
    description: string;
    what_it_measures: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

// Custom tooltip component with dimension explanation
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const dimension = payload[0].payload;

  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-4 max-w-sm" role="tooltip">
      <p className="font-semibold text-sm mb-1" style={{ color: '#1a1a2e' }}>
        {dimension.display_name}
      </p>
      <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
        {dimension.what_it_measures || dimension.description}
      </p>
      <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span style={{ color: '#4b5563' }}>{entry.name}</span>
            </div>
            <span className="font-mono font-semibold" style={{ color: '#1a1a2e' }}>
              {entry.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface LegendPayloadEntry {
  color: string;
  value: string;
}

interface CustomLegendProps {
  payload?: LegendPayloadEntry[];
}

// Custom legend component
const CustomLegend = ({ payload }: CustomLegendProps) => {
  if (!payload || !payload.length) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-6" role="list" aria-label="Model legend">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2" role="listitem">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium" style={{ color: '#374151' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function FingerprintRadar({
  fingerprints,
  models,
  selectedModelIds,
}: FingerprintRadarProps) {
  const dimensions = getDimensions();

  // Filter to selected models if provided
  const filteredFingerprints = selectedModelIds
    ? fingerprints.filter((fp) => selectedModelIds.includes(fp.model_id))
    : fingerprints;

  if (filteredFingerprints.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-text-soft">
        <p>Select at least one model to display the radar chart</p>
      </div>
    );
  }

  // Transform data for Recharts
  // Each data point represents one dimension with values for each selected model
  const radarData = dimensions.map((dim, index) => {
    const dataPoint: Record<string, string | number> = {
      dimension: dim.id,
      display_name: dim.display_name,
      cluster: dim.cluster,
      description: dim.description,
      what_it_measures: dim.what_it_measures,
    };

    // Add each model's value for this dimension
    filteredFingerprints.forEach((fp) => {
      const model = models.find((m) => m.id === fp.model_id);
      const value = fp.vector[index] || 0;
      dataPoint[model?.name || fp.model_id] = value;
    });

    return dataPoint;
  });

  // Generate model names for the radar data keys
  const modelNames = filteredFingerprints.map((fp) => {
    const model = models.find((m) => m.id === fp.model_id);
    return model?.name || fp.model_id;
  });

  return (
    <div className="w-full rounded-xl p-6" style={{ backgroundColor: '#ffffff' }}>
      <ResponsiveContainer width="100%" height={600}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="display_name"
            tick={{ fill: '#374151', fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickCount={6}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />

          {/* Render a Radar line for each selected model */}
          {filteredFingerprints.map((fp, index) => {
            const model = models.find((m) => m.id === fp.model_id);
            const color = getModelColor(fp.model_id);
            const name = model?.name || fp.model_id;

            return (
              <Radar
                key={fp.model_id}
                name={name}
                dataKey={name}
                stroke={color}
                fill={color}
                fillOpacity={0.1 + (index * 0.05)}
                strokeWidth={2}
              />
            );
          })}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
