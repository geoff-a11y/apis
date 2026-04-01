'use client';

import { useState } from 'react';
import { MLScore, ProductCategory } from '@/lib/types';
import { detectCategory } from '@/lib/category-data';
import { generateModelDistribution } from '@/lib/model-weights';
import ScoreHeroDashboard from '@/components/score/ScoreHeroDashboard';
import ScoreResult from '@/components/score/ScoreResult';
import SignalInventory from '@/components/score/SignalInventory';
import Recommendations from '@/components/score/Recommendations';
import ModelScores from '@/components/score/ModelScores';

// Progress stages for analysis
const ANALYSIS_STAGES = [
  { key: 'fetching', label: 'Fetching page content', duration: 5000 },
  { key: 'extracting', label: 'Extracting product signals', duration: 8000 },
  { key: 'scoring', label: 'Calculating ML Score', duration: 10000 },
  { key: 'generating', label: 'Generating custom recommendations with AI', duration: 20000 },
];

export default function ScorePage() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MLScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ProductCategory>('other');
  const [analysisStage, setAnalysisStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAnalyze = async (forceRefresh: boolean = false) => {
    if (!isValidUrl(url)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setAnalysisStage(0);
    setProgress(0);

    // Simulate progress through stages while waiting for API
    let stageInterval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;
    let currentStage = 0;

    const advanceProgress = () => {
      stageInterval = setInterval(() => {
        if (currentStage < ANALYSIS_STAGES.length - 1) {
          currentStage++;
          setAnalysisStage(currentStage);
        }
      }, 8000); // Advance stage every 8 seconds

      progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 95)); // Cap at 95% until complete
      }, 500);
    };

    advanceProgress();

    try {
      // Use agentonomics ML Score API
      const apiUrl = process.env.NEXT_PUBLIC_ML_SCORE_API_URL || 'https://api.agentonomics.io';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for Opus

      const response = await fetch(`${apiUrl}/api/v1/ml-score/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, force_refresh: forceRefresh }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to score URL: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Normalize API response to match MLScore type with defaults for missing fields
      const data: MLScore = {
        ...rawData,
        recommendations: rawData.recommendations || [],
        readability_score: rawData.readability_score ?? 0,
        readability_flags: rawData.readability_flags || [],
        extraction_quality: rawData.extraction_quality || 'partial',
        signal_inventory: (rawData.signal_inventory || []).map((s: { dimension_id: string; score: number; zone_contributions?: unknown[] }) => ({
          ...s,
          zone_contributions: s.zone_contributions || [],
        })),
      };

      // Detect product category from URL
      const detectedCategory = detectCategory(url);
      setCategory(detectedCategory);

      // Store in localStorage for shareable results (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`score_${data.id}`, JSON.stringify(data));
      }

      setProgress(100);
      setResult(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The page may be too large or slow to load. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred while scoring the URL');
      }
    } finally {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleAnalyze(false);
    }
  };

  const handleRefresh = () => {
    if (!isLoading && url) {
      handleAnalyze(true);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Machine Likeability Score Calculator
        </h1>
        <p className="max-w-2xl" style={{ color: 'var(--color-text-mid)' }}>
          Enter a product URL to calculate its Machine Likeability Score — a measure
          of how likely AI agents are to recommend this product based on its content signals.
        </p>
      </section>

      {/* URL input */}
      <section className="card p-6">
        <div className="max-w-xl">
          <label htmlFor="url" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
            Product URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://example.com/product"
              className="flex-1 px-4 py-3 rounded-lg focus:outline-none"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-accent)';
                e.target.style.boxShadow = '0 0 0 3px var(--color-accent-soft)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border)';
                e.target.style.boxShadow = 'none';
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => handleAnalyze(false)}
              className="btn-primary"
              disabled={isLoading || !url}
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
            {result && (
              <button
                onClick={handleRefresh}
                className="btn-secondary"
                disabled={isLoading}
                title="Re-analyze with fresh data"
              >
                ↻
              </button>
            )}
          </div>
          {error && (
            <p className="text-score-low text-sm mt-2">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* Loading state with progress */}
      {isLoading && (
        <section className="card p-8 min-h-[400px]">
          <div className="max-w-md mx-auto space-y-6">
            {/* Animated loader */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
            </div>

            {/* Current stage */}
            <div className="text-center">
              <p className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                {ANALYSIS_STAGES[analysisStage]?.label || 'Analyzing...'}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
                This takes 30-60 seconds to generate custom recommendations
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: 'var(--color-accent)'
                  }}
                />
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--color-text-soft)' }}>
                {progress}% complete
              </p>
            </div>

            {/* Stage indicators */}
            <div className="flex justify-between text-xs pt-4" style={{ color: 'var(--color-text-soft)' }}>
              {ANALYSIS_STAGES.map((stage, idx) => (
                <div
                  key={stage.key}
                  className={`flex flex-col items-center gap-1 ${idx <= analysisStage ? 'opacity-100' : 'opacity-40'}`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: idx <= analysisStage ? 'var(--color-accent)' : 'var(--color-border)'
                    }}
                  />
                  <span className="text-center max-w-[60px]">{stage.key.charAt(0).toUpperCase() + stage.key.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      {result && !isLoading && (
        <>
          {/* Executive Dashboard - CMO-friendly overview */}
          <ScoreHeroDashboard
            score={result}
            category={category}
            recommendations={result.recommendations}
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
              modelDistribution={result.model_distribution || generateModelDistribution(result.signal_inventory, result.universal_score)}
              signalInventory={result.signal_inventory}
            />

            {/* Full recommendations with copy suggestions */}
            <div id="recommendations">
              <Recommendations recommendations={result.recommendations} category={category} />
            </div>

            {/* Signal inventory - all 26 dimensions */}
            <SignalInventory signals={result.signal_inventory} />

            {/* Technical details */}
            <ScoreResult score={result} />
          </section>
        </>
      )}

      {/* Placeholder when no results */}
      {!result && !isLoading && !error && (
        <section className="card p-8 border-dashed border-2 min-h-[300px] flex flex-col items-center justify-center" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-center text-lg mb-2" style={{ color: 'var(--color-text)' }}>
            Enter a product URL above to get started
          </p>
          <p className="text-center max-w-md" style={{ color: 'var(--color-text-soft)' }}>
            Find out how likely AI assistants like ChatGPT, Claude, and Gemini
            are to recommend your product to shoppers.
          </p>
        </section>
      )}

      {/* How it works - simplified */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Why This Matters
        </h2>
        <p className="mb-4" style={{ color: 'var(--color-text-mid)' }}>
          Millions of consumers now ask AI assistants like ChatGPT, Claude, and Google Gemini
          for product recommendations. These AI systems evaluate your product pages and decide
          whether to recommend you — or your competitors.
        </p>
        <p style={{ color: 'var(--color-text-mid)' }}>
          Our score is based on <span className="font-medium">56,640 simulated purchase decisions</span> across
          6 leading AI models, identifying exactly what makes AI recommend one product over another.
          <a href="/methodology" className="ml-1 hover:underline" style={{ color: 'var(--color-accent)' }}>
            Learn more →
          </a>
        </p>
      </section>
    </div>
  );
}
