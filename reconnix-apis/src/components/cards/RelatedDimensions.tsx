import Link from 'next/link';
import { Dimension } from '@/lib/types';
import { getDimensionMeanEffect } from '@/lib/data';

interface RelatedDimensionsProps {
  currentDimension: Dimension;
  relatedDimensions: Dimension[];
}

// Helper to get effect magnitude label
const getEffectMagnitudeLabel = (effect: number): string => {
  const absEffect = Math.abs(effect);
  if (absEffect >= 0.8) return 'Large';
  if (absEffect >= 0.5) return 'Medium';
  if (absEffect >= 0.2) return 'Small';
  return 'Minimal';
};

// Helper to get effect direction indicator
const getEffectIndicator = (effect: number) => {
  const magnitude = getEffectMagnitudeLabel(effect);
  const direction = effect > 0 ? 'Positive' : effect < 0 ? 'Negative' : 'Neutral';

  let colorClass = 'text-text-soft';
  if (Math.abs(effect) >= 0.5) {
    colorClass = effect > 0 ? 'text-score-high' : 'text-score-low';
  } else if (Math.abs(effect) >= 0.2) {
    colorClass = 'text-score-mid';
  }

  return { magnitude, direction, colorClass, value: effect };
};

export default function RelatedDimensions({ currentDimension, relatedDimensions }: RelatedDimensionsProps) {
  // Limit to 3-4 related dimensions (exclude current)
  const displayDimensions = relatedDimensions
    .filter(d => d.id !== currentDimension.id)
    .slice(0, 4);

  if (displayDimensions.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold text-navy mb-4">
          Related Dimensions
        </h2>
        <p className="text-text-soft text-sm">
          No other dimensions in this cluster
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold text-navy">
          Related Dimensions
        </h2>
        <p className="text-sm text-text-soft mt-1">
          Other dimensions in Cluster {currentDimension.cluster}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {displayDimensions.map((dimension) => {
          const meanEffect = getDimensionMeanEffect(dimension.id);
          const indicator = getEffectIndicator(meanEffect);

          return (
            <Link
              key={dimension.id}
              href={`/dimensions/${dimension.id}`}
              className="group block p-4 rounded-lg border border-border bg-white hover:border-blue hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full bg-cluster-${dimension.cluster.toLowerCase()}`}
                  />
                  <h3 className="font-semibold text-sm text-navy group-hover:text-blue transition-colors">
                    {dimension.display_name}
                  </h3>
                </div>
                {dimension.replication && (
                  <span className="badge badge-blue text-xs px-2 py-0.5">
                    Replication
                  </span>
                )}
              </div>

              <p className="text-xs text-text-soft line-clamp-2 mb-3">
                {dimension.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-soft">Mean Effect:</span>
                  <span className={`font-mono text-sm font-semibold ${indicator.colorClass}`}>
                    h = {indicator.value.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Effect magnitude indicator */}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    Math.abs(meanEffect) >= 0.5
                      ? 'bg-blue-light text-blue'
                      : Math.abs(meanEffect) >= 0.2
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {indicator.magnitude}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Link
          href={`/dimensions?cluster=${currentDimension.cluster}`}
          className="text-sm text-blue hover:text-navy font-medium inline-flex items-center gap-1 transition-colors"
        >
          View all Cluster {currentDimension.cluster} dimensions
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
