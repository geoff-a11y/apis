'use client';

interface ImprovementSummaryProps {
  before: number;
  after: number;
  label: string;
}

export default function ImprovementSummary({
  before,
  after,
  label,
}: ImprovementSummaryProps) {
  const delta = after - before;
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const isNeutral = delta === 0;

  const deltaColor = isPositive ? '#22c55e' : isNegative ? '#ef4444' : 'var(--color-text-soft)';
  const deltaText = isPositive ? `+${delta}` : isNegative ? `${delta}` : '0';

  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
        {label}
      </span>

      <div className="flex items-center gap-3">
        {/* Before Score */}
        <span
          className="text-lg font-mono"
          style={{ color: 'var(--color-text-soft)' }}
        >
          {before}
        </span>

        {/* Arrow */}
        <span style={{ color: 'var(--color-text-mid)' }}>→</span>

        {/* After Score */}
        <span
          className="text-lg font-bold font-mono"
          style={{ color: 'var(--color-text)' }}
        >
          {after}
        </span>

        {/* Delta */}
        <span
          className="text-sm font-bold px-2 py-1 rounded"
          style={{
            color: deltaColor,
            backgroundColor: isPositive
              ? 'rgba(34, 197, 94, 0.1)'
              : isNegative
              ? 'rgba(239, 68, 68, 0.1)'
              : 'transparent',
          }}
        >
          {deltaText}
        </span>
      </div>
    </div>
  );
}

interface ImprovementSummaryGroupProps {
  baseline: {
    ai: number;
    seo: number;
    human: number;
  };
  current: {
    ai: number;
    seo: number;
    human: number;
  };
}

export function ImprovementSummaryGroup({
  baseline,
  current,
}: ImprovementSummaryGroupProps) {
  const totalBefore = Math.round((baseline.ai + baseline.seo + baseline.human) / 3);
  const totalAfter = Math.round((current.ai + current.seo + current.human) / 3);

  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
        Score Improvements
      </h3>
      <ImprovementSummary before={baseline.ai} after={current.ai} label="AI Score" />
      <ImprovementSummary before={baseline.seo} after={current.seo} label="SEO Score" />
      <ImprovementSummary before={baseline.human} after={current.human} label="Human Score" />
      <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <ImprovementSummary before={totalBefore} after={totalAfter} label="Overall" />
      </div>
    </div>
  );
}
