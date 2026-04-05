'use client';

import { BaselineScore, BaselineIssue } from '../../lib/baseline-scorer';

interface ScoreBarProps {
  label: string;
  score: number;
  color: string;
  maxScore?: number;
}

function ScoreBar({ label, score, color, maxScore = 100 }: ScoreBarProps) {
  const percentage = Math.min(100, (score / maxScore) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span style={{ color: 'var(--color-text)' }}>{label}</span>
        <span style={{ color: 'var(--color-text-mid)' }}>{score}/{maxScore}</span>
      </div>
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function IssueItem({ issue }: { issue: BaselineIssue }) {
  const severityColors = {
    critical: '#ef4444',
    major: '#f97316',
    minor: '#eab308',
  };

  const severityIcons = {
    critical: '●',
    major: '◐',
    minor: '○',
  };

  return (
    <div className="flex items-start gap-2 text-sm py-1">
      <span style={{ color: severityColors[issue.severity] }}>
        {severityIcons[issue.severity]}
      </span>
      <span style={{ color: 'var(--color-text-mid)' }}>{issue.message}</span>
      {issue.field && (
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-soft)',
          }}
        >
          {issue.field}
        </span>
      )}
    </div>
  );
}

interface BaselineDisplayProps {
  baseline: Partial<BaselineScore>;
  onStart?: () => void;
  loading?: boolean;
}

export default function BaselineDisplay({
  baseline,
  onStart,
  loading = false,
}: BaselineDisplayProps) {
  const aiScore = baseline.aiScore ?? 0;
  const seoScore = baseline.seoScore ?? 0;
  const humanScore = baseline.humanScore ?? 0;
  const totalScore = baseline.totalScore ?? Math.round((aiScore + seoScore + humanScore) / 3);
  const issues = baseline.issues ?? [];
  const potential = baseline.improvementPotential;

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const majorCount = issues.filter(i => i.severity === 'major').length;
  const minorCount = issues.filter(i => i.severity === 'minor').length;

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Baseline Analysis
        </h2>
        <div
          className="text-2xl font-bold px-4 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: totalScore >= 70 ? '#22c55e' : totalScore >= 50 ? '#eab308' : '#ef4444',
          }}
        >
          {totalScore}
        </div>
      </div>

      {/* Score Bars */}
      <div className="space-y-4">
        <ScoreBar label="AI Recommendation" score={aiScore} color="#8b5cf6" />
        <ScoreBar label="SEO Performance" score={seoScore} color="#06b6d4" />
        <ScoreBar label="Human Appeal" score={humanScore} color="#22c55e" />
      </div>

      {/* Improvement Potential */}
      {potential && (
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--color-accent-soft)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              Improvement Potential
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--color-accent)' }}
            >
              +{potential.total} pts
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-mid)' }}>
            <span>AI: +{potential.ai}</span>
            <span>SEO: +{potential.seo}</span>
            <span>Human: +{potential.human}</span>
          </div>
        </div>
      )}

      {/* Issues Summary */}
      {issues.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: 'var(--color-text)' }}>Issues Found:</span>
            {criticalCount > 0 && (
              <span style={{ color: '#ef4444' }}>{criticalCount} critical</span>
            )}
            {majorCount > 0 && (
              <span style={{ color: '#f97316' }}>{majorCount} major</span>
            )}
            {minorCount > 0 && (
              <span style={{ color: '#eab308' }}>{minorCount} minor</span>
            )}
          </div>

          <div
            className="max-h-40 overflow-y-auto space-y-1 p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            {issues.slice(0, 10).map((issue, idx) => (
              <IssueItem key={idx} issue={issue} />
            ))}
            {issues.length > 10 && (
              <p className="text-xs pt-2" style={{ color: 'var(--color-text-soft)' }}>
                +{issues.length - 10} more issues
              </p>
            )}
          </div>
        </div>
      )}

      {/* Start Button */}
      {onStart && (
        <button
          onClick={onStart}
          disabled={loading}
          className="w-full py-3 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: loading ? 'var(--color-border)' : 'var(--color-accent)',
            color: loading ? 'var(--color-text-soft)' : 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Analyzing...' : 'Start Optimization'}
        </button>
      )}
    </div>
  );
}
