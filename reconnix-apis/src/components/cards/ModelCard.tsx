'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Model, BehavioralFingerprint } from '@/lib/types';
import { getMeanEffectSize } from '@/lib/data';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface ModelCardProps {
  model: Model;
  fingerprint: BehavioralFingerprint;
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

export function ModelCard({ model, fingerprint }: ModelCardProps) {
  const meanEffectSize = getMeanEffectSize(model.id);
  const modelColor = getModelColor(model.id);

  // Create mini radar data (simplified, using vector directly)
  const radarData = fingerprint.vector.map((value, index) => ({
    dimension: `D${index + 1}`,
    value: value,
  }));

  return (
    <Link href={`/fingerprints/${model.id}`}>
      <div className="card p-6 hover:shadow-md transition-all cursor-pointer group">
        {/* Header with logo and name */}
        <div className="flex items-center gap-3 mb-4">
          {model.logo && (
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src={model.logo}
                alt={`${model.provider} logo`}
                fill
                className="object-contain"
              />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold text-navy group-hover:text-blue transition-colors">
              {model.name}
            </h3>
            <p className="text-xs text-text-soft">{model.provider}</p>
          </div>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: modelColor }}
            title={`Model color: ${model.id}`}
          />
        </div>

        {/* Mini radar preview */}
        <div className="h-32 -mx-4 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData.slice(0, 8)}>
              <PolarGrid stroke="#E4EAFF" strokeWidth={0.5} />
              <PolarAngleAxis dataKey="dimension" tick={false} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
              <Radar
                dataKey="value"
                stroke={modelColor}
                fill={modelColor}
                fillOpacity={0.3}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-soft">Mean Effect Size</span>
            <span className="font-mono text-sm font-semibold text-navy">
              h = {meanEffectSize.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-soft">Measurement Date</span>
            <span className="text-xs font-medium text-text-mid">
              {new Date(model.measurement_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-soft">Study Type</span>
            <span
              className={`badge text-xs ${
                model.study_type === 'confirmatory' ? 'badge-green' : 'badge-amber'
              }`}
            >
              {model.study_type}
            </span>
          </div>
        </div>

        {/* View details link */}
        <div className="mt-4 text-center">
          <span className="text-sm text-blue font-medium group-hover:underline">
            View Full Fingerprint →
          </span>
        </div>
      </div>
    </Link>
  );
}
