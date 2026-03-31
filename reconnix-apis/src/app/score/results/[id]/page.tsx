'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MLScore, ProductCategory } from '@/lib/types';
import { detectCategory, CATEGORY_DATA } from '@/lib/category-data';
import ScoreResult from '@/components/score/ScoreResult';
import SignalInventory from '@/components/score/SignalInventory';
import SignalInteractions from '@/components/score/SignalInteractions';
import Recommendations from '@/components/score/Recommendations';
import ExecutiveSummary from '@/components/score/ExecutiveSummary';
import ModelScores from '@/components/score/ModelScores';
import CompetitiveBenchmark from '@/components/score/CompetitiveBenchmark';

export default function ScoreResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [score, setScore] = useState<MLScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ProductCategory>('other');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Try to load from localStorage first
    const storedData = localStorage.getItem(`score_${id}`);

    if (storedData) {
      try {
        const parsed: MLScore = JSON.parse(storedData);
        setScore(parsed);
        // Detect category from URL
        const detectedCategory = detectCategory(parsed.url);
        setCategory(detectedCategory);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to parse stored score data');
        setIsLoading(false);
      }
    } else {
      // In a production app, this would fetch from a database
      setError('Score result not found. Results are stored locally and may have been cleared.');
      setIsLoading(false);
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-16 h-16 bg-blue-light rounded-full mx-auto"></div>
          <p className="text-text-mid">Loading score results...</p>
        </div>
      </div>
    );
  }

  if (error || !score) {
    return (
      <div className="space-y-8">
        <section className="card p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="font-display text-2xl font-bold text-navy mb-2">
            Score Not Found
          </h1>
          <p className="text-text-mid mb-6 max-w-md mx-auto">
            {error || 'This score result could not be found. It may have been deleted or never existed.'}
          </p>
          <button
            onClick={() => router.push('/score')}
            className="btn-primary"
          >
            Score a New URL
          </button>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold text-navy mb-4">
            About Score Storage
          </h2>
          <div className="text-text-mid text-sm space-y-2">
            <p>
              In this demo version, score results are stored locally in your browser's localStorage.
              This means:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Results are only accessible on this device and browser</li>
              <li>Clearing browser data will delete stored scores</li>
              <li>Scores are not shared between devices or browsers</li>
            </ul>
            <p className="mt-4">
              A production version would store results in a database, enabling persistent
              sharing across devices.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const categoryData = CATEGORY_DATA[category];

  return (
    <div className="space-y-8">
      {/* Header with back button and category selector */}
      <section className="flex items-center justify-between gap-4">
        <button
          onClick={() => router.push('/score')}
          className="flex items-center gap-2 text-text-mid hover:text-navy transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Score Another URL
        </button>

        {/* Category selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--color-text-soft)' }}>Category:</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            className="px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {Object.entries(CATEGORY_DATA).map(([id, data]) => (
              <option key={id} value={id}>
                {data.display_name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 1. Executive Summary - Quick wins at the top */}
      <ExecutiveSummary
        recommendations={score.recommendations}
        category={category}
        universalScore={score.universal_score}
      />

      {/* 2. Competitive Benchmark - How you compare */}
      <CompetitiveBenchmark
        universalScore={score.universal_score}
        category={category}
      />

      {/* 3. Model Scores - Per-model breakdown with use-case weighting */}
      {score.model_distribution && Object.keys(score.model_distribution).length > 0 && (
        <ModelScores
          modelDistribution={score.model_distribution}
          signalInventory={score.signal_inventory}
        />
      )}

      {/* 4. Universal Score - Simplified gauge */}
      <ScoreResult score={score} />

      {/* 5. Recommendations - Enhanced with category context */}
      <Recommendations
        recommendations={score.recommendations}
        category={category}
      />

      {/* Advanced sections toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text-mid)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          <span>{showAdvanced ? 'Hide' : 'Show'} Detailed Signal Analysis</span>
        </button>
      </div>

      {/* 6. Signal Inventory - Detailed breakdown (collapsible) */}
      {showAdvanced && (
        <>
          <SignalInventory signals={score.signal_inventory} category={category} />

          {/* 7. Signal Interactions - Optional advanced section */}
          {score.signal_interactions && score.signal_interactions.length > 0 && (
            <SignalInteractions
              interactions={score.signal_interactions}
              adjustment={score.interaction_adjustment ?? 0}
            />
          )}
        </>
      )}

      {/* 8. Methodology - Trust-building explanation */}
      <section className="card p-8" style={{ backgroundColor: 'var(--color-surface)' }}>
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          How Machine Likeability Scoring Works
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
              <span className="font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Extract Content</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              We extract and parse all product content from the page, identifying title, description, features, reviews, and metadata.
            </p>
          </div>

          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
              <span className="font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Detect Signals</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              We measure the presence and intensity of each of the 26 content dimensions using NLP analysis calibrated against our research data.
            </p>
          </div>

          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
              <span className="font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Predict Preference</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              We apply the empirical effect sizes from our research to predict how each AI model would evaluate this content.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>The Research Behind This</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-mid)' }}>
            We analyzed how leading AI assistants (GPT-5, Claude, Gemini, and more) evaluate product pages.
            Our research tested <strong>17,200+ controlled purchase scenarios</strong> across 6 AI models to identify
            exactly what content signals make AI more likely to recommend products.
          </p>
          <ul className="text-sm space-y-1" style={{ color: 'var(--color-text-mid)' }}>
            <li>• 26 content dimensions identified and validated</li>
            <li>• Peer-reviewed methodology (OSF pre-registered)</li>
            <li>• Updated quarterly as AI models evolve</li>
          </ul>
          <p className="text-sm mt-3 font-medium" style={{ color: 'var(--color-text)' }}>
            A higher score = more likely to be recommended when customers ask AI assistants questions like
            "what's the best {categoryData.display_name.toLowerCase()} product?"
          </p>
        </div>
      </section>
    </div>
  );
}
