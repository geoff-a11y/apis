'use client';

import { useState } from 'react';
import { validateUserFeedback, extractFeedbackInsights, getRemainingUserGuidedGenerations } from '../../lib/user-guided-mutation';

interface GenerationFeedbackProps {
  onSubmit: (feedback: string) => void;
  generation?: number;
  loading?: boolean;
  userGuidedCount?: number;
}

const EXAMPLE_FEEDBACK = [
  'Add more urgency and scarcity messaging',
  'Focus on sustainability and eco-friendly benefits',
  'Make the headline shorter and punchier',
  'Include more social proof and customer testimonials',
  'Emphasize the warranty and money-back guarantee',
];

export default function GenerationFeedback({
  onSubmit,
  generation = 6,
  loading = false,
  userGuidedCount = 0,
}: GenerationFeedbackProps) {
  const [feedback, setFeedback] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  const validation = validateUserFeedback(feedback);
  const insights = feedback.length >= 10 ? extractFeedbackInsights(feedback) : null;
  const remaining = getRemainingUserGuidedGenerations(userGuidedCount);
  const canSubmit = validation.valid && !loading && remaining > 0;

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(feedback);
    }
  };

  const handleExampleClick = (example: string) => {
    setFeedback(example);
    setShowExamples(false);
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Guide Generation {generation}
        </h3>
        <span className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
          {remaining} run{remaining !== 1 ? 's' : ''} remaining
        </span>
      </div>

      <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
        Tell us what changes you&apos;d like to see in the next generation of variants.
      </p>

      {/* Feedback textarea */}
      <div className="relative">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Example: Add more urgency and emphasize the limited-time offer..."
          className="w-full p-4 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            minHeight: '100px',
          }}
          disabled={loading || remaining === 0}
        />
        <span
          className="absolute bottom-2 right-2 text-xs"
          style={{ color: 'var(--color-text-soft)' }}
        >
          {feedback.length}/1000
        </span>
      </div>

      {/* Validation errors */}
      {!validation.valid && feedback.length > 0 && (
        <div className="text-xs space-y-1" style={{ color: '#ef4444' }}>
          {validation.errors.map((error, idx) => (
            <p key={idx}>• {error}</p>
          ))}
        </div>
      )}

      {/* Detected insights */}
      {insights && (
        <div className="flex flex-wrap gap-2">
          {insights.wantsUrgency && (
            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
              🔥 Urgency
            </span>
          )}
          {insights.wantsScarcity && (
            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
              ⏱️ Scarcity
            </span>
          )}
          {insights.wantsSocialProof && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              👥 Social Proof
            </span>
          )}
          {insights.wantsTrust && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
              ✅ Trust
            </span>
          )}
          {insights.wantsSimplicity && (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
              📝 Simplicity
            </span>
          )}
        </div>
      )}

      {/* Example suggestions */}
      <div className="space-y-2">
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="text-sm flex items-center gap-2"
          style={{ color: 'var(--color-accent)' }}
        >
          {showExamples ? '▼' : '▶'} Need inspiration?
        </button>

        {showExamples && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_FEEDBACK.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(example)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-mid)',
                }}
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-3 rounded-lg font-medium transition-all"
        style={{
          backgroundColor: canSubmit ? 'var(--color-accent)' : 'var(--color-border)',
          color: canSubmit ? 'white' : 'var(--color-text-soft)',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> Running Generation {generation}...
          </span>
        ) : remaining === 0 ? (
          'No more user-guided runs available'
        ) : (
          `Run Generation ${generation}`
        )}
      </button>
    </div>
  );
}
