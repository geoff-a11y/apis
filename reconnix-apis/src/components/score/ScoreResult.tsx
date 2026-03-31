'use client';

import { MLScore } from '@/lib/types';

interface ScoreResultProps {
  score: MLScore;
}

export default function ScoreResult({ score }: ScoreResultProps) {
  const getScoreColor = (value: number): string => {
    if (value >= 70) return 'text-score-high';
    if (value >= 50) return 'text-score-mid';
    return 'text-score-low';
  };

  const getScoreBgColor = (value: number): string => {
    if (value >= 70) return 'bg-score-high';
    if (value >= 50) return 'bg-score-mid';
    return 'bg-score-low';
  };

  const getScoreLabel = (value: number): string => {
    if (value >= 80) return 'Excellent';
    if (value >= 70) return 'Good';
    if (value >= 50) return 'Fair';
    if (value >= 30) return 'Below Average';
    return 'Poor';
  };

  return (
    <section className="card p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Machine Likeability Score Report
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
            Scored at {new Date(score.scored_at).toLocaleString()}
          </p>
          <a
            href={score.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline break-all"
            style={{ color: 'var(--color-accent)' }}
          >
            {score.url}
          </a>
        </div>
        <button
          onClick={() => {
            const shareUrl = `${window.location.origin}/score/results/${score.id}`;
            navigator.clipboard.writeText(shareUrl);
            alert('Share link copied to clipboard!');
          }}
          className="btn-secondary text-sm"
        >
          Share
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Universal Machine Likeability Score Gauge */}
        <div className="flex flex-col items-center justify-center p-6 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Circular progress background */}
            <svg className="absolute w-full h-full -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="80"
                strokeWidth="16"
                fill="none"
                style={{ stroke: 'var(--color-border)' }}
              />
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${(score.universal_score / 100) * 502.4} 502.4`}
                strokeLinecap="round"
                className={getScoreColor(score.universal_score)}
              />
            </svg>
            {/* Score display */}
            <div className="text-center">
              <div className={`font-display text-5xl font-bold ${getScoreColor(score.universal_score)}`}>
                {Math.round(score.universal_score)}
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--color-text-soft)' }}>out of 100</div>
            </div>
          </div>
          <div className="text-center mt-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full ${getScoreBgColor(score.universal_score)} bg-opacity-10`}>
              <span className={`font-medium ${getScoreColor(score.universal_score)}`}>
                {getScoreLabel(score.universal_score)}
              </span>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-mid)' }}>Universal Machine Likeability Score</p>
          </div>
        </div>

        {/* Metadata and metrics */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Content Quality Metrics</h3>
            <div className="space-y-3">
              {score.extraction_quality && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Extraction Quality</span>
                  <span className={`font-medium ${
                    score.extraction_quality === 'full' ? 'text-score-high' :
                    score.extraction_quality === 'partial' ? 'text-score-mid' :
                    'text-score-low'
                  }`}>
                    {score.extraction_quality.charAt(0).toUpperCase() + score.extraction_quality.slice(1)}
                  </span>
                </div>
              )}
              {score.readability_score !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Readability Score</span>
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                    {Math.round(score.readability_score)}/100
                  </span>
                </div>
              )}
              {score.platform && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Platform</span>
                  <span className="font-medium capitalize" style={{ color: 'var(--color-text)' }}>
                    {score.platform.replace('_', ' ')}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Signals Detected</span>
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {score.signal_inventory.filter(s => s.score > 0.1).length} / 26
                </span>
              </div>
            </div>
          </div>

          {score.readability_flags && score.readability_flags.length > 0 && (
            <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--color-text)' }}>Readability Flags</h4>
              <ul className="space-y-1">
                {score.readability_flags.map((flag, idx) => (
                  <li key={idx} className="text-sm flex items-start" style={{ color: 'var(--color-text-mid)' }}>
                    <span className="text-score-mid mr-2">•</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
