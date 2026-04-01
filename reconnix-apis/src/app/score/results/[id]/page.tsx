'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MLScore, ProductCategory } from '@/lib/types';
import { detectCategory, CATEGORY_DATA } from '@/lib/category-data';
import { generateModelDistribution } from '@/lib/model-weights';
import ScoreHeroDashboard from '@/components/score/ScoreHeroDashboard';
import ScoreResult from '@/components/score/ScoreResult';
import SignalInventory from '@/components/score/SignalInventory';
import SignalInteractions from '@/components/score/SignalInteractions';
import Recommendations from '@/components/score/Recommendations';
import ModelScores from '@/components/score/ModelScores';
import BenchmarkInsights from '@/components/score/BenchmarkInsights';

export default function ScoreResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [score, setScore] = useState<MLScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ProductCategory>('other');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchScore = async () => {
      // Try fetching from API first (persistent database storage)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_ML_SCORE_API_URL || 'https://api.agentonomics.io';
        const response = await fetch(`${apiUrl}/api/v1/ml-score/score/${id}`);

        if (response.ok) {
          const data = await response.json();
          // Normalize API response
          const normalized: MLScore = {
            ...data,
            recommendations: data.recommendations || [],
            readability_score: data.readability_score ?? 0,
            readability_flags: data.readability_flags || [],
            extraction_quality: data.extraction_quality || 'partial',
            signal_inventory: (data.signal_inventory || []).map((s: { dimension_id: string; score: number; zone_contributions?: unknown[] }) => ({
              ...s,
              zone_contributions: s.zone_contributions || [],
            })),
          };
          setScore(normalized);
          const detectedCategory = detectCategory(normalized.url);
          setCategory(detectedCategory);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('API fetch failed, trying localStorage:', err);
      }

      // Fall back to localStorage for backward compatibility
      const storedData = localStorage.getItem(`score_${id}`);
      if (storedData) {
        try {
          const parsed: MLScore = JSON.parse(storedData);
          setScore(parsed);
          const detectedCategory = detectCategory(parsed.url);
          setCategory(detectedCategory);
          setIsLoading(false);
        } catch (err) {
          setError('Failed to parse stored score data');
          setIsLoading(false);
        }
      } else {
        setError('Score result not found. This result may have expired or the ID is invalid.');
        setIsLoading(false);
      }
    };

    fetchScore();
  }, [id]);

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mx-auto" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
          <p style={{ color: 'var(--color-text-mid)' }}>Loading score results...</p>
        </div>
      </div>
    );
  }

  if (error || !score) {
    return (
      <div className="space-y-8">
        <section className="card p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Score Not Found
          </h1>
          <p className="mb-6 max-w-md mx-auto" style={{ color: 'var(--color-text-mid)' }}>
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
          <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            About Score Reports
          </h2>
          <div className="text-sm space-y-2" style={{ color: 'var(--color-text-mid)' }}>
            <p>
              Score reports are stored in our database and can be accessed via their unique URL.
              Reports remain available for sharing with team members or clients.
            </p>
            <p className="mt-4">
              If you need a fresh analysis, you can always{' '}
              <Link href="/score" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
                score a new URL
              </Link>.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const categoryData = CATEGORY_DATA[category];

  return (
    <div className="space-y-8">
      {/* Header with navigation and share */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/score')}
            className="flex items-center gap-2 transition-colors"
            style={{ color: 'var(--color-text-mid)' }}
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

          <span style={{ color: 'var(--color-border)' }}>|</span>

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
              {Object.entries(CATEGORY_DATA).map(([catId, data]) => (
                <option key={catId} value={catId}>
                  {data.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: copied ? 'var(--color-score-high)' : 'var(--color-surface)',
            color: copied ? 'white' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Report
            </>
          )}
        </button>
      </section>

      {/* Executive Dashboard - CMO-friendly overview */}
      <ScoreHeroDashboard
        score={score}
        category={category}
        recommendations={score.recommendations}
      />

      {/* Benchmark Comparison - How you compare to 213 analyzed pages */}
      <BenchmarkInsights
        universalScore={score.universal_score}
        signals={score.signal_inventory}
        category={category}
      />

      {/* Deep Dive Section */}
      <section className="mt-12">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Detailed Analysis
          </h2>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        {/* Model breakdown with full details */}
        <ModelScores
          modelDistribution={score.model_distribution || generateModelDistribution(score.signal_inventory, score.universal_score)}
          signalInventory={score.signal_inventory}
        />

        {/* Full recommendations with copy suggestions */}
        <div id="recommendations">
          <Recommendations recommendations={score.recommendations} category={category} />
        </div>

        {/* Signal inventory - all 26 dimensions */}
        <SignalInventory signals={score.signal_inventory} />

        {/* Signal interactions if present */}
        {score.signal_interactions && score.signal_interactions.length > 0 && (
          <SignalInteractions
            interactions={score.signal_interactions}
            adjustment={score.interaction_adjustment ?? 0}
          />
        )}

        {/* Technical details */}
        <ScoreResult score={score} />
      </section>

      {/* Methodology section */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Why This Matters
        </h2>
        <p className="mb-4" style={{ color: 'var(--color-text-mid)' }}>
          Millions of consumers now ask AI assistants like ChatGPT, Claude, and Google Gemini
          for product recommendations. These AI systems evaluate your product pages and decide
          whether to recommend you — or your competitors.
        </p>
        <p className="mb-4" style={{ color: 'var(--color-text-mid)' }}>
          Our score is based on <span className="font-medium">56,640 simulated purchase decisions</span> across
          6 leading AI models, identifying exactly what makes AI recommend one product over another.
          <Link href="/methodology" className="ml-1 hover:underline" style={{ color: 'var(--color-accent)' }}>
            Learn more →
          </Link>
        </p>
        <div
          className="p-4 rounded-lg mt-4"
          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
            Benchmark Insight
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
            We've analyzed <strong>213 product pages</strong> across 7 categories. The average score is just <strong>49.6</strong> —
            meaning most sites leave significant AI recommendation potential untapped. Top performers like T-Mobile (81.3)
            and Razer (72.1) show what's possible with optimized signals.
          </p>
          <Link
            href="/apis/benchmarks"
            className="inline-block mt-3 text-sm hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            View full benchmark analysis →
          </Link>
        </div>
      </section>
    </div>
  );
}
