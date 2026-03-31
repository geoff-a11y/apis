// src/app/fingerprints/[model]/page.tsx — Individual model fingerprint detail page

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  getModel,
  getFingerprint,
  getModelEffectSizes,
  getDimensions,
  getConfirmatoryModels,
  getDimension,
  getTopDimensionsForModel,
} from '@/lib/data';
import FingerprintRadar from '@/components/charts/FingerprintRadar';

interface PageProps {
  params: Promise<{
    model: string;
  }>;
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

export default async function FingerprintDetailPage({ params }: PageProps) {
  const { model: modelId } = await params;
  const model = getModel(modelId);
  const fingerprint = getFingerprint(modelId);
  const effectSizes = getModelEffectSizes(modelId);
  const dimensions = getDimensions();
  const allModels = getConfirmatoryModels();
  const topDimensionIds = getTopDimensionsForModel(modelId, 5);

  if (!model || !fingerprint) {
    notFound();
  }

  const modelColor = getModelColor(model.id);

  // Sort dimensions by effect size for the table
  const sortedEffects = [...effectSizes].sort(
    (a, b) => Math.abs(b.cohen_h) - Math.abs(a.cohen_h)
  );

  // Calculate mean effect size
  const meanEffectSize =
    effectSizes.length > 0
      ? effectSizes.reduce((sum, e) => sum + e.cohen_h, 0) / effectSizes.length
      : 0;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <section>
        <Link
          href="/fingerprints"
          className="inline-flex items-center gap-2 text-sm hover:underline mb-4"
          style={{ color: 'var(--color-accent)' }}
        >
          ← Back to All Models
        </Link>

        <div className="flex items-start gap-6">
          {/* Model logo */}
          <div className="relative w-20 h-20 flex-shrink-0">
            {model.logo ? (
              <Image
                src={model.logo}
                alt={`${model.provider} logo`}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-500">
                  {model.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Model info */}
          <div className="flex-1">
            <h1 className="font-display text-4xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
              {model.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4" style={{ color: 'var(--color-text-mid)' }}>
              <div className="flex items-center gap-2">
                <span className="text-text-soft">Provider:</span>
                <span className="font-medium">{model.provider}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--color-text-soft)' }}>Model String:</span>
                <code className="font-mono text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface)' }}>
                  {model.model_string}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-soft">Measured:</span>
                <span className="font-medium">
                  {new Date(model.measurement_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`badge ${
                    model.study_type === 'confirmatory' ? 'badge-green' : 'badge-amber'
                  }`}
                >
                  {model.study_type}
                </span>
              </div>
            </div>
            {model.notes && (
              <p className="text-sm text-text-soft mt-3 max-w-2xl">{model.notes}</p>
            )}
          </div>

          {/* Model color indicator */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-full border-4 border-white shadow-md"
              style={{ backgroundColor: modelColor }}
            />
            <span className="text-xs text-text-soft">Model Color</span>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>Mean Effect Size</h3>
          <p className="font-mono text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            h = {meanEffectSize.toFixed(2)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
            Average across {dimensions.length} dimensions
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>Strong Effects</h3>
          <p className="font-mono text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {effectSizes.filter((e) => Math.abs(e.cohen_h) >= 0.8).length}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
            |h| &ge; 0.8 (large effect)
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>Total Trials</h3>
          <p className="font-mono text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {effectSizes.length > 0 ? effectSizes[0].n_trials : 0}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
            Per dimension measurement
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>Temperature</h3>
          <p className="font-mono text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {model.temperature ?? 'N/A'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
            Sampling configuration
          </p>
        </div>
      </section>

      {/* Behavioral Fingerprint Radar Chart */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--color-text)' }}>
          Behavioral Fingerprint
        </h2>
        <p className="mb-6 max-w-3xl" style={{ color: 'var(--color-text-mid)' }}>
          This radar chart visualizes how strongly this model responds to each of the{' '}
          {dimensions.length} content dimensions. Values are normalized to 0-100 scale based
          on effect sizes.
        </p>
        <FingerprintRadar
          fingerprints={[fingerprint]}
          models={[model]}
          selectedModelIds={[model.id]}
        />
      </section>

      {/* Top 5 Strongest Effects */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Top 5 Strongest Effects
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          These dimensions have the largest effect sizes for {model.name}, indicating the
          content signals that most strongly influence its recommendations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topDimensionIds.slice(0, 5).map((dimId, index) => {
            const dimension = getDimension(dimId);
            const effect = effectSizes.find((e) => e.dimension_id === dimId);

            if (!dimension || !effect) return null;

            return (
              <div
                key={dimId}
                className="rounded-lg p-4 transition-colors"
                style={{ border: '2px solid var(--color-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: 'var(--color-text-soft)' }}>
                      #{index + 1}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white`}
                      style={{
                        backgroundColor: `var(--cluster-${dimension.cluster.toLowerCase()})`,
                      }}
                    >
                      {dimension.cluster}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-lg font-bold ${
                      effect.cohen_h > 0 ? 'text-score-high' : 'text-score-low'
                    }`}
                  >
                    {effect.cohen_h > 0 ? '+' : ''}
                    {effect.cohen_h.toFixed(2)}
                  </span>
                </div>
                <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  {dimension.display_name}
                </h4>
                <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-soft)' }}>
                  {dimension.description}
                </p>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <Link
                    href={`/dimensions/${dimension.id}`}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    View dimension details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* All Dimensions Table */}
      <section className="card overflow-hidden">
        <div className="p-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            All Dimensions & Effect Sizes
          </h2>
          <p className="mt-2" style={{ color: 'var(--color-text-mid)' }}>
            Complete breakdown of effect sizes across all {dimensions.length} dimensions,
            sorted by absolute magnitude.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--color-text-mid)' }}>Rank</th>
                <th className="text-center py-3 px-3 font-semibold" style={{ color: 'var(--color-text-mid)' }}>
                  Cluster
                </th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--color-text-mid)' }}>
                  Dimension
                </th>
                <th className="text-center py-3 px-3 font-semibold" style={{ color: 'var(--color-text-mid)' }}>
                  Cohen&apos;s h
                </th>
                <th className="text-center py-3 px-3 font-semibold" style={{ color: 'var(--color-text-mid)' }}>
                  95% CI
                </th>
                <th className="text-center py-3 px-3 font-semibold" style={{ color: 'var(--color-text-mid)' }}>
                  |Effect|
                </th>
                <th className="text-center py-3 px-3 font-semibold" style={{ color: 'var(--color-text-mid)' }}>
                  Magnitude
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEffects.map((effect, index) => {
                const dimension = getDimension(effect.dimension_id);
                if (!dimension) return null;

                const absEffect = Math.abs(effect.cohen_h);
                let magnitude = 'Negligible';
                if (absEffect >= 0.8) magnitude = 'Large';
                else if (absEffect >= 0.5) magnitude = 'Medium';
                else if (absEffect >= 0.3) magnitude = 'Small';
                else if (absEffect >= 0.1) magnitude = 'Weak';

                return (
                  <tr
                    key={effect.dimension_id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="py-3 px-4 text-center font-mono" style={{ color: 'var(--color-text-soft)' }}>
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white`}
                        style={{
                          backgroundColor: `var(--cluster-${dimension.cluster.toLowerCase()})`,
                        }}
                      >
                        {dimension.cluster}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/dimensions/${dimension.id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--color-text)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text)'}
                        >
                          {dimension.display_name}
                        </Link>
                        <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-soft)' }}>
                          {dimension.description}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`py-3 px-3 text-center font-mono font-bold ${
                        effect.cohen_h > 0 ? 'text-score-high' : 'text-score-low'
                      }`}
                    >
                      {effect.cohen_h > 0 ? '+' : ''}
                      {effect.cohen_h.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs" style={{ color: 'var(--color-text-soft)' }}>
                      [{effect.ci_lower.toFixed(2)}, {effect.ci_upper.toFixed(2)}]
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold" style={{ color: 'var(--color-text)' }}>
                      {absEffect.toFixed(2)}
                    </td>
                    <td className={`py-3 px-3 text-center ${getEffectColorClass(effect.cohen_h)}`}>
                      <span className="font-medium text-xs">{magnitude}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--color-text-soft)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-text-mid)' }}>Effect Size Magnitude:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d1fae5', border: '1px solid #6ee7b7' }}></div>
              <span>Large (&ge;0.8)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#bfdbfe', border: '1px solid #93c5fd' }}></div>
              <span>Medium (0.5–0.8)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}></div>
              <span>Small (0.3–0.5)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fed7aa', border: '1px solid #fdba74' }}></div>
              <span>Weak (0.1–0.3)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}></div>
              <span>Negligible (&lt;0.1)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Compare with other models */}
      <section className="card p-8" style={{ backgroundColor: 'var(--color-accent-soft)', borderColor: 'var(--color-accent)' }}>
        <h2 className="font-display text-xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Compare with Other Models
        </h2>
        <p className="mb-4" style={{ color: 'var(--color-text-mid)' }}>
          See how {model.name}&apos;s behavioral fingerprint compares to other AI models.
        </p>
        <Link href="/compare" className="btn-primary inline-block">
          Go to Model Comparison
        </Link>
      </section>
    </div>
  );
}
