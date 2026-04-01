'use client';

import { useState } from 'react';
import { UseCase, SignalPresence } from '@/lib/types';
import { USE_CASE_WEIGHTS, calculateWeightedScore, getModelContributions, getScoreExtremes } from '@/lib/model-weights';
import { MODEL_PERSONALITIES, analyzeDivergence } from '@/lib/model-personalities';

interface ModelScoresProps {
  modelDistribution: Record<string, number>;
  signalInventory?: SignalPresence[];
}

const MODEL_COLORS: Record<string, string> = {
  gpt54: '#10A37F',
  o3: '#1A1A1A',
  gemini: '#4285F4',
  claude: '#D4A853',
  llama: '#0064E0',
  sonar: '#20808D',
};

export default function ModelScores({ modelDistribution, signalInventory }: ModelScoresProps) {
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase>('b2c_consumer');
  const [showPersonalities, setShowPersonalities] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const weightedScore = calculateWeightedScore(modelDistribution, selectedUseCase);
  const contributions = getModelContributions(modelDistribution, selectedUseCase);
  const extremes = getScoreExtremes(modelDistribution);

  // Analyze divergence between highest and lowest scoring models
  const divergenceAnalysis = signalInventory
    ? analyzeDivergence(signalInventory, extremes.highest.modelId, extremes.lowest.modelId)
    : [];

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'text-score-high';
    if (score >= 50) return 'text-score-mid';
    return 'text-score-low';
  };

  return (
    <section className="card p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Score by AI Model
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
            How different AI assistants would rate this product, weighted by your target audience
          </p>
        </div>

        {/* Use case selector */}
        <div className="flex-shrink-0">
          <select
            value={selectedUseCase}
            onChange={(e) => setSelectedUseCase(e.target.value as UseCase)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {Object.values(USE_CASE_WEIGHTS).map((useCase) => (
              <option key={useCase.id} value={useCase.id}>
                {useCase.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weighted score headline */}
      <div className="mb-8 p-6 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <p className="text-sm mb-2" style={{ color: 'var(--color-text-mid)' }}>
          {USE_CASE_WEIGHTS[selectedUseCase].name} Weighted Score
        </p>
        <div className={`text-5xl font-bold font-display ${getScoreColor(weightedScore)}`}>
          {Math.round(weightedScore)}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-soft)' }}>
          out of 100
        </p>
        <p className="text-sm mt-3" style={{ color: 'var(--color-text-mid)' }}>
          {USE_CASE_WEIGHTS[selectedUseCase].description}
        </p>
      </div>

      {/* Model breakdown table */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Model Breakdown</h3>
        <div className="space-y-3">
          {contributions.map((contrib) => (
            <div
              key={contrib.modelId}
              className="p-3 rounded-lg transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-bg)' }}
              onClick={() => setExpandedModel(expandedModel === contrib.modelId ? null : contrib.modelId)}
            >
              <div className="flex items-center gap-4">
                {/* Model color indicator */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: MODEL_COLORS[contrib.modelId] || '#888' }}
                />

                {/* Model name */}
                <div className="w-24 flex-shrink-0">
                  <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                    {contrib.modelName}
                  </span>
                </div>

                {/* Score */}
                <div className="w-16 text-right flex-shrink-0">
                  <span className={`font-mono font-medium ${getScoreColor(contrib.score)}`}>
                    {contrib.score}
                  </span>
                </div>

                {/* Weight */}
                <div className="w-16 text-right flex-shrink-0">
                  <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
                    {(contrib.weight ?? 0).toFixed(0)}%
                  </span>
                </div>

                {/* Contribution bar */}
                <div className="flex-1">
                  <div className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(contrib.contribution / weightedScore) * 100}%`,
                        backgroundColor: MODEL_COLORS[contrib.modelId] || '#888',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>

                {/* Contribution value */}
                <div className="w-12 text-right flex-shrink-0">
                  <span className="font-mono text-sm" style={{ color: 'var(--color-text-mid)' }}>
                    {(contrib.contribution ?? 0).toFixed(1)}
                  </span>
                </div>

                {/* Expand icon */}
                <div style={{ color: 'var(--color-text-soft)' }}>
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedModel === contrib.modelId ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded model personality */}
              {expandedModel === contrib.modelId && MODEL_PERSONALITIES[contrib.modelId] && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                    {MODEL_PERSONALITIES[contrib.modelId].summary}
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-mid)' }}>Responds well to:</p>
                      <ul className="text-xs space-y-1" style={{ color: 'var(--color-text-soft)' }}>
                        {MODEL_PERSONALITIES[contrib.modelId].strengths.slice(0, 3).map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-mid)' }}>To improve this score:</p>
                      <ul className="text-xs space-y-1" style={{ color: 'var(--color-text-soft)' }}>
                        {MODEL_PERSONALITIES[contrib.modelId].improvement_tips.slice(0, 2).map((t, i) => (
                          <li key={i}>• {t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-4 mt-2 px-3 text-xs" style={{ color: 'var(--color-text-soft)' }}>
          <div className="w-3" />
          <div className="w-24">Model</div>
          <div className="w-16 text-right">Score</div>
          <div className="w-16 text-right">Weight</div>
          <div className="flex-1 text-center">Contribution</div>
          <div className="w-12 text-right">Points</div>
          <div className="w-4" />
        </div>
      </div>

      {/* Divergence analysis */}
      {extremes.range > 15 && (
        <div className="p-5 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-start gap-3 mb-4">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                Why Models Score Differently
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
                Your page scores vary by {Math.round(extremes.range)} points across models
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Highest scorer */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: MODEL_COLORS[extremes.highest.modelId] }}
                />
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {MODEL_PERSONALITIES[extremes.highest.modelId]?.name || extremes.highest.modelId}
                </span>
                <span className="text-score-high font-mono font-medium ml-auto">
                  {Math.round(extremes.highest.score)}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
                {MODEL_PERSONALITIES[extremes.highest.modelId]?.summary || 'Scores this page highly'}
              </p>
            </div>

            {/* Lowest scorer */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: MODEL_COLORS[extremes.lowest.modelId] }}
                />
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {MODEL_PERSONALITIES[extremes.lowest.modelId]?.name || extremes.lowest.modelId}
                </span>
                <span className="text-score-low font-mono font-medium ml-auto">
                  {Math.round(extremes.lowest.score)}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
                {MODEL_PERSONALITIES[extremes.lowest.modelId]?.summary || 'Scores this page lower'}
              </p>
            </div>
          </div>

          {divergenceAnalysis.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Key differences:
              </p>
              <ul className="space-y-1">
                {divergenceAnalysis.slice(0, 3).map((d, i) => (
                  <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text-mid)' }}>
                    <span className={d.impact === 'high' ? 'text-score-low' : 'text-score-mid'}>•</span>
                    <span><strong>{d.dimensionName}:</strong> {d.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actionable tip */}
          <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
            <span>💡</span>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              <strong>Tip:</strong> To boost your {MODEL_PERSONALITIES[extremes.lowest.modelId]?.name || 'lowest'} score without hurting others,{' '}
              {MODEL_PERSONALITIES[extremes.lowest.modelId]?.improvement_tips[0]?.toLowerCase() || 'address the signals this model values most'}.
            </p>
          </div>
        </div>
      )}

      {/* Toggle model personalities */}
      <button
        onClick={() => setShowPersonalities(!showPersonalities)}
        className="mt-6 text-sm flex items-center gap-2 transition-colors"
        style={{ color: 'var(--color-accent)' }}
      >
        <span>{showPersonalities ? '▼' : '▶'}</span>
        <span>{showPersonalities ? 'Hide' : 'Show'} Model Personalities</span>
      </button>

      {showPersonalities && (
        <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(MODEL_PERSONALITIES).map((personality) => (
            <div
              key={personality.model_id}
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: MODEL_COLORS[personality.model_id] }}
                />
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {personality.name}
                </span>
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-mid)' }}>
                {personality.summary}
              </p>
              <div className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                <p className="font-medium mb-1">Strengths:</p>
                <ul className="space-y-0.5 mb-2">
                  {personality.strengths.slice(0, 2).map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
                <p className="font-medium mb-1">Biases:</p>
                <ul className="space-y-0.5">
                  {personality.biases.slice(0, 2).map((b, i) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
