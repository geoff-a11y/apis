'use client';

import { useState, useRef, Suspense, useCallback, useEffect } from 'react';
import { getModels } from '@/lib/data';
import {
  GEOGRAPHIC_WEIGHTS,
  USE_CASE_CONTEXT_WEIGHTS,
  calculateUnifiedScore,
  getDominantModel,
  getGeographicMarkets,
  MODEL_NAMES,
} from '@/lib/geographic-weights';
import {
  EVOLUTION_CONFIG_V3,
  scoreVariant,
  getModelForGeneration,
  shouldUseHumanJudge,
  ScoredVariant,
  VariantContent,
} from '@/lib/evolution-engine';
import {
  analyzeBrandVoice,
  generateBrandVoiceGuidelines,
  formatBrandVoiceForPrompt,
  scoreBrandVoiceConsistency,
  BrandVoiceProfile,
  BrandVoiceGuidelines,
} from '@/lib/brand-voice';
import {
  findParetoFrontier,
  assignNicknames,
  ParetoVariant,
  NicknameType,
} from '@/lib/pareto';
import { calculateSEOScore } from '@/lib/seo-judge';
import { estimateHumanScore } from '@/lib/human-estimator';
import { WEIGHT_PRESETS, Weights } from '@/lib/unified-fitness';
import type { GeographicMarket } from '@/lib/types';

// API URL for backend scraping
const API_URL = process.env.NEXT_PUBLIC_ML_SCORE_API_URL || 'https://apis-scoring-api-production.up.railway.app';

// ============================================================================
// Types
// ============================================================================

interface BaselineScores {
  ai: number;
  seo: number;
  human: number;
  issues: Array<{ category: string; message: string; severity: 'low' | 'medium' | 'high' }>;
}

interface GenerationLog {
  generation: number;
  timestamp: number;
  variantsCount: number;
  bestFitness: number;
  avgFitness: number;
  model: string;
  humanJudgeUsed: boolean;
  userFeedback?: string;
}

interface ThinkingStep {
  timestamp: number;
  type: 'generation' | 'fidelity' | 'scoring' | 'selection' | 'mutation' | 'analysis';
  content: string;
}

interface EvolutionStateV3 {
  status: 'idle' | 'fetching' | 'analyzing' | 'evolving' | 'complete' | 'error';
  url: string;
  original: VariantContent | null;
  baseline: BaselineScores | null;
  brandVoiceProfile: BrandVoiceProfile | null;
  brandVoiceGuidelines: BrandVoiceGuidelines | null;
  currentGeneration: number;
  generations: GenerationLog[];
  allVariants: ScoredVariant[];
  paretoFrontier: (ParetoVariant & { nickname?: NicknameType; recommended?: boolean })[];
  bestVariant: ScoredVariant | null;
  errorMessage: string | null;
  weights: Weights;
  userFeedback: string;
  userGuidedCount: number;
  thinkingLog: ThinkingStep[];
}

// ============================================================================
// Helper Functions
// ============================================================================

async function extractPageContent(url: string): Promise<VariantContent> {
  const response = await fetch(`${API_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to fetch page');
  }

  const data = await response.json();
  return {
    id: 'original',
    title: data.title || 'Product',
    description: data.description || '',
    features: data.features || ['Quality product', 'Great value', 'Trusted brand'],
  };
}

function analyzeBaseline(content: VariantContent, keyword: string): BaselineScores {
  const seoResult = calculateSEOScore(content, keyword);
  const humanResult = estimateHumanScore(content);

  // Simple AI score calculation
  let aiScore = 50;
  const allText = [content.title || '', content.description || '', ...(content.features || [])].join(' ').toLowerCase();
  if (/warranty|guarantee/.test(allText)) aiScore += 8;
  if (/return|refund/.test(allText)) aiScore += 6;
  if (/free shipping/.test(allText)) aiScore += 5;
  if (/review|rating/.test(allText)) aiScore += 6;
  aiScore = Math.min(100, Math.max(0, aiScore));

  const issues: BaselineScores['issues'] = [];

  // Collect SEO issues
  if (seoResult.hardFails.length > 0) {
    seoResult.hardFails.forEach(fail => {
      issues.push({ category: 'seo', message: fail, severity: 'high' });
    });
  }
  if (seoResult.softFails.length > 0) {
    seoResult.softFails.forEach(fail => {
      issues.push({ category: 'seo', message: fail, severity: 'medium' });
    });
  }

  // Check human appeal issues
  if (humanResult.ctaBonus === 0) {
    issues.push({ category: 'human', message: 'Missing clear call-to-action', severity: 'medium' });
  }
  if (humanResult.socialProofBonus === 0) {
    issues.push({ category: 'human', message: 'No social proof indicators', severity: 'low' });
  }

  return {
    ai: aiScore,
    seo: seoResult.total,
    human: humanResult.score,
    issues,
  };
}

function generateMockVariants(
  original: VariantContent,
  count: number,
  generation: number,
  brandVoiceGuidelines?: BrandVoiceGuidelines
): VariantContent[] {
  const variants: VariantContent[] = [];

  const titleVariations = [
    `${original.title} - Premium Quality`,
    `Best ${original.title} | Trusted Choice`,
    `${original.title} - Save Today`,
    `Professional ${original.title} | Free Shipping`,
    `${original.title} - 5-Star Rated`,
  ];

  const descVariations = [
    `Discover ${original.description?.slice(0, 50)}... Trusted by thousands.`,
    `Get the best ${original.title?.toLowerCase()} with our quality guarantee.`,
    `${original.description?.slice(0, 80)} Order now for fast delivery.`,
    `Premium ${original.title?.toLowerCase()} designed for you. 30-day returns.`,
  ];

  for (let i = 0; i < count; i++) {
    variants.push({
      id: `gen${generation}_var${i}_${Date.now()}`,
      title: titleVariations[i % titleVariations.length],
      description: descVariations[i % descVariations.length],
      features: [
        ...(original.features || []).slice(0, 2),
        'Free shipping on all orders',
        '30-day money-back guarantee',
        'Trusted by 10,000+ customers',
      ].slice(0, 5),
    });
  }

  return variants;
}

// ============================================================================
// Components
// ============================================================================

function BaselineDisplay({
  baseline,
  brandVoice,
  onStartOptimization
}: {
  baseline: BaselineScores;
  brandVoice: BrandVoiceGuidelines | null;
  onStartOptimization: () => void;
}) {
  const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span style={{ color: 'var(--color-text-soft)' }}>{label}</span>
        <span style={{ color: 'var(--color-text)' }}>{score}</span>
      </div>
      <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
        Baseline Analysis
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-soft)' }}>
            Current Scores
          </h4>
          <ScoreBar label="AI Optimization" score={baseline.ai} color="var(--color-accent)" />
          <ScoreBar label="SEO Score" score={baseline.seo} color="#10b981" />
          <ScoreBar label="Human Appeal" score={baseline.human} color="#f59e0b" />
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-soft)' }}>
            Issues Found ({baseline.issues.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {baseline.issues.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No issues detected</p>
            ) : (
              baseline.issues.map((issue, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm p-2 rounded"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <span className={`badge badge-${issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'amber' : 'blue'} text-xs`}>
                    {issue.category}
                  </span>
                  <span style={{ color: 'var(--color-text-soft)' }}>{issue.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {brandVoice && (
        <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'var(--color-surface)' }}>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>
            Detected Brand Voice
          </h4>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {brandVoice.summary}
          </p>
        </div>
      )}

      <button
        onClick={onStartOptimization}
        className="btn btn-primary w-full mt-4"
      >
        Start Optimization (5 Generations)
      </button>
    </div>
  );
}

function ImprovementSummary({
  baseline,
  current
}: {
  baseline: BaselineScores;
  current: { ai: number; seo: number; human: number };
}) {
  const Delta = ({ before, after, label }: { before: number; after: number; label: string }) => {
    const delta = after - before;
    const isPositive = delta >= 0;
    return (
      <div className="text-center">
        <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg" style={{ color: 'var(--color-text-soft)' }}>{before}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>→</span>
          <span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{after}</span>
          <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{delta}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="card p-4">
      <h4 className="text-sm font-medium mb-3 text-center" style={{ color: 'var(--color-text-soft)' }}>
        Improvement Summary
      </h4>
      <div className="grid grid-cols-3 gap-4">
        <Delta before={baseline.ai} after={current.ai} label="AI" />
        <Delta before={baseline.seo} after={current.seo} label="SEO" />
        <Delta before={baseline.human} after={current.human} label="Human" />
      </div>
    </div>
  );
}

function ParetoExplorer({
  variants,
  baseline,
  onSelect,
}: {
  variants: (ParetoVariant & { nickname?: NicknameType; recommended?: boolean; title?: string })[];
  baseline: BaselineScores;
  onSelect: (variant: ParetoVariant) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (variant: ParetoVariant) => {
    setSelectedId(variant.id);
    onSelect(variant);
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
        Pareto Frontier ({variants.length} optimal variants)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {variants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => handleSelect(variant)}
            className={`p-4 rounded-lg text-left transition-all ${
              selectedId === variant.id ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: selectedId === variant.id
                ? 'var(--color-accent-muted)'
                : 'var(--color-surface)',
              borderColor: variant.recommended ? 'var(--color-accent)' : 'transparent',
              borderWidth: variant.recommended ? '2px' : '1px',
              borderStyle: 'solid',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {variant.nickname && (
                <span className={`badge ${
                  variant.nickname === 'AI Champion' ? 'badge-blue' :
                  variant.nickname === 'SEO Specialist' ? 'badge-green' :
                  variant.nickname === 'Human Touch' ? 'badge-amber' :
                  'badge-purple'
                } text-xs`}>
                  {variant.nickname}
                </span>
              )}
              {variant.recommended && (
                <span className="badge badge-green text-xs">Recommended</span>
              )}
            </div>

            <div className="text-sm mb-2 font-medium" style={{ color: 'var(--color-text)' }}>
              {variant.title?.slice(0, 50) || `Variant ${variant.id.slice(-4)}`}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>AI</span>
                <div className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                  {variant.ai}
                  <span className={variant.ai > baseline.ai ? 'text-green-500' : 'text-red-500'}>
                    {' '}({variant.ai > baseline.ai ? '+' : ''}{variant.ai - baseline.ai})
                  </span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>SEO</span>
                <div className="font-semibold text-emerald-500">
                  {variant.seo}
                  <span className={variant.seo > baseline.seo ? 'text-green-500' : 'text-red-500'}>
                    {' '}({variant.seo > baseline.seo ? '+' : ''}{variant.seo - baseline.seo})
                  </span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Human</span>
                <div className="font-semibold text-amber-500">
                  {variant.human}
                  <span className={variant.human > baseline.human ? 'text-green-500' : 'text-red-500'}>
                    {' '}({variant.human > baseline.human ? '+' : ''}{variant.human - baseline.human})
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GenerationFeedback({
  generation,
  onSubmit,
  disabled,
  remainingGenerations,
}: {
  generation: number;
  onSubmit: (feedback: string) => void;
  disabled: boolean;
  remainingGenerations: number;
}) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (feedback.trim().length >= 10) {
      onSubmit(feedback.trim());
      setFeedback('');
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        User-Guided Generation {generation}
      </h3>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Provide feedback to guide the next generation of variants.
        {remainingGenerations > 0
          ? ` (${remainingGenerations} generations remaining)`
          : ' (No more generations available)'}
      </p>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="e.g., Add more urgency to the headline, emphasize the warranty, make it more conversational..."
        className="w-full p-3 rounded-lg text-sm"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border-subtle)',
          minHeight: '100px',
        }}
        disabled={disabled || remainingGenerations <= 0}
      />

      <button
        onClick={handleSubmit}
        disabled={disabled || feedback.trim().length < 10 || remainingGenerations <= 0}
        className="btn btn-primary mt-3"
      >
        Run Generation {generation}
      </button>
    </div>
  );
}

function WeightSliders({
  weights,
  onChange,
}: {
  weights: Weights;
  onChange: (weights: Weights) => void;
}) {
  const presets = [
    { name: 'Balanced', weights: WEIGHT_PRESETS.balanced },
    { name: 'AI First', weights: WEIGHT_PRESETS.ai_first },
    { name: 'SEO First', weights: WEIGHT_PRESETS.seo_first },
    { name: 'Conversion', weights: WEIGHT_PRESETS.conversion },
  ];

  return (
    <div className="card p-4">
      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-soft)' }}>
        Optimization Weights
      </h4>

      <div className="flex gap-2 mb-4">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onChange(preset.weights)}
            className="btn btn-ghost text-xs px-3 py-1"
            style={{
              backgroundColor: JSON.stringify(weights) === JSON.stringify(preset.weights)
                ? 'var(--color-accent-muted)'
                : 'transparent',
            }}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(['ai', 'seo', 'human'] as const).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs w-16" style={{ color: 'var(--color-text-soft)' }}>
              {key.toUpperCase()}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(weights[key] * 100)}
              onChange={(e) => {
                const newValue = parseInt(e.target.value) / 100;
                const others = (['ai', 'seo', 'human'] as const).filter(k => k !== key);
                const remaining = 1 - newValue;
                const otherSum = weights[others[0]] + weights[others[1]];
                onChange({
                  ...weights,
                  [key]: newValue,
                  [others[0]]: otherSum > 0 ? (weights[others[0]] / otherSum) * remaining : remaining / 2,
                  [others[1]]: otherSum > 0 ? (weights[others[1]] / otherSum) * remaining : remaining / 2,
                });
              }}
              className="flex-1"
            />
            <span className="text-xs w-10" style={{ color: 'var(--color-text)' }}>
              {Math.round(weights[key] * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariantDetail({
  variant,
  baseline,
  brandVoiceProfile,
}: {
  variant: ScoredVariant;
  baseline: BaselineScores;
  brandVoiceProfile: BrandVoiceProfile | null;
}) {
  const voiceConsistency = brandVoiceProfile
    ? scoreBrandVoiceConsistency(variant, brandVoiceProfile)
    : null;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: variant.title,
    description: variant.description,
  }, null, 2);

  const allContent = `# Optimized Content

## Title
${variant.title}

## Description
${variant.description}

## Features
${variant.features?.map(f => `- ${f}`).join('\n') || ''}

## Structured Data (JSON-LD)
\`\`\`json
${jsonLd}
\`\`\`
`;

  return (
    <div className="card p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Optimized Copy Output
        </h3>
        <div className="flex gap-2">
          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
            Fitness: {variant.fitness?.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <CopyableSection label="TITLE" content={variant.title || ''} />

        {/* Description */}
        <CopyableSection label="DESCRIPTION" content={variant.description || ''} />

        {/* Features */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>FEATURES</span>
            <button
              onClick={() => navigator.clipboard.writeText(variant.features?.join('\n') || '')}
              className="text-xs px-2 py-1 rounded flex items-center gap-1"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
          <ul className="space-y-2">
            {variant.features?.map((f, i) => (
              <li key={i} className="flex items-start gap-2" style={{ color: 'var(--color-text-mid)' }}>
                <span style={{ color: 'var(--color-accent)' }}>•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* JSON-LD */}
        <CopyableSection label="STRUCTURED DATA (JSON-LD)" content={jsonLd} isCode />

        {/* Brand Voice Consistency */}
        {voiceConsistency && (
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Brand Voice Consistency
              </span>
              <span className={`font-semibold ${
                voiceConsistency.score >= 80 ? 'text-green-500' :
                voiceConsistency.score >= 60 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {voiceConsistency.score}%
              </span>
            </div>
            {voiceConsistency.issues.length > 0 && (
              <div className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {voiceConsistency.issues.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Copy All Button */}
        <button
          onClick={() => navigator.clipboard.writeText(allContent)}
          className="w-full py-3 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        >
          Copy All Optimized Content
        </button>
      </div>
    </div>
  );
}

function GenerationProgress({
  generations,
  currentGeneration,
  isRunning,
}: {
  generations: GenerationLog[];
  currentGeneration: number;
  isRunning: boolean;
}) {
  return (
    <div className="card p-4">
      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-soft)' }}>
        Evolution Progress
      </h4>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((gen) => {
          const log = generations.find(g => g.generation === gen);
          const isCurrent = currentGeneration === gen && isRunning;
          const isComplete = log !== undefined;

          return (
            <div
              key={gen}
              className="flex-1 text-center p-2 rounded"
              style={{
                backgroundColor: isComplete
                  ? 'var(--color-accent-muted)'
                  : isCurrent
                    ? 'var(--color-warning-muted)'
                    : 'var(--color-surface)',
              }}
            >
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gen {gen}</div>
              {isComplete && (
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {log.bestFitness.toFixed(0)}
                </div>
              )}
              {isCurrent && (
                <div className="text-xs animate-pulse" style={{ color: 'var(--color-warning)' }}>
                  Running...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThinkingPanel({
  thinkingLog,
  isRunning,
}: {
  thinkingLog: ThinkingStep[];
  isRunning: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (panelRef.current && isRunning) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [thinkingLog, isRunning]);

  const getTypeStyle = (type: ThinkingStep['type']) => {
    switch (type) {
      case 'generation':
        return 'bg-blue-500/20 text-blue-400';
      case 'fidelity':
        return 'bg-red-500/20 text-red-400';
      case 'scoring':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'selection':
        return 'bg-green-500/20 text-green-400';
      case 'mutation':
        return 'bg-purple-500/20 text-purple-400';
      case 'analysis':
        return 'bg-cyan-500/20 text-cyan-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>
          Visible Thinking
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs px-2 py-1 rounded"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-soft)' }}
        >
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {isExpanded && (
        <div
          ref={panelRef}
          className="h-[300px] overflow-y-auto space-y-2 font-mono text-xs"
          style={{ backgroundColor: 'var(--color-bg)', borderRadius: '8px', padding: '12px' }}
        >
          {thinkingLog.length === 0 && !isRunning && (
            <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              Thinking will appear here during optimization...
            </div>
          )}
          {thinkingLog.map((step, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${getTypeStyle(step.type)}`}>
                {step.type.toUpperCase()}
              </span>
              <span style={{ color: 'var(--color-text-mid)' }}>
                {step.content}
              </span>
            </div>
          ))}
          {isRunning && (
            <div className="flex gap-1 py-2">
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyableSection({
  label,
  content,
  isCode = false,
}: {
  label: string;
  content: string;
  isCode?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>{label}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
          style={{ backgroundColor: 'var(--color-surface)', color: copied ? 'var(--color-score-high)' : 'var(--color-accent)' }}
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {isCode ? (
        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap" style={{ color: 'var(--color-text-mid)' }}>
          {content}
        </pre>
      ) : (
        <p className={label === 'TITLE' ? 'text-lg font-medium' : 'text-sm'} style={{ color: 'var(--color-text)' }}>
          {content}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

function PageOptimizerV3Inner() {
  const [url, setUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [evolution, setEvolution] = useState<EvolutionStateV3>({
    status: 'idle',
    url: '',
    original: null,
    baseline: null,
    brandVoiceProfile: null,
    brandVoiceGuidelines: null,
    currentGeneration: 0,
    generations: [],
    allVariants: [],
    paretoFrontier: [],
    bestVariant: null,
    errorMessage: null,
    weights: WEIGHT_PRESETS.balanced,
    userFeedback: '',
    userGuidedCount: 0,
    thinkingLog: [],
  });

  // Helper to add thinking steps
  const addThinking = useCallback((type: ThinkingStep['type'], content: string) => {
    setEvolution(prev => ({
      ...prev,
      thinkingLog: [...prev.thinkingLog, { timestamp: Date.now(), type, content }],
    }));
  }, []);
  const [selectedVariant, setSelectedVariant] = useState<ScoredVariant | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Geographic and context settings
  const [geographicMarket, setGeographicMarket] = useState<GeographicMarket>('global_balanced');
  const [contextType, setContextType] = useState<'b2b' | 'b2c'>('b2c');

  const geographicMarkets = getGeographicMarkets();

  const isValidUrl = (urlString: string): boolean => {
    try {
      const parsedUrl = new URL(urlString);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Fetch and analyze page
  const handleAnalyze = async () => {
    if (!isValidUrl(url)) {
      setEvolution(prev => ({ ...prev, status: 'error', errorMessage: 'Please enter a valid URL' }));
      return;
    }

    // Clear previous state and start fresh
    setEvolution(prev => ({
      ...prev,
      status: 'fetching',
      errorMessage: null,
      thinkingLog: [],
      generations: [],
      allVariants: [],
      paretoFrontier: [],
      bestVariant: null,
    }));

    addThinking('analysis', `Fetching content from ${url}...`);

    try {
      // Extract page content
      const original = await extractPageContent(url);

      addThinking('analysis', `Extracted: "${original.title}" with ${original.features?.length || 0} features.`);
      addThinking('analysis', `Description: ${(original.description || '').slice(0, 100)}...`);

      // Analyze baseline scores
      const kw = keyword || original.title?.split(' ')[0] || 'product';
      const baseline = analyzeBaseline(original, kw);

      addThinking('scoring', `Baseline scores: AI=${baseline.ai}, SEO=${baseline.seo}, Human=${baseline.human}`);

      // Analyze brand voice
      const brandVoiceProfile = analyzeBrandVoice(original);
      const brandVoiceGuidelines = generateBrandVoiceGuidelines(brandVoiceProfile);

      addThinking('analysis', `Brand voice: ${brandVoiceProfile.formality > 60 ? 'Formal' : 'Casual'}, ${brandVoiceProfile.enthusiasm > 60 ? 'Enthusiastic' : 'Reserved'}`);
      addThinking('analysis', `Ready to optimize. Click "Start Optimization" to begin evolution.`);

      setEvolution(prev => ({
        ...prev,
        status: 'analyzing',
        url,
        original,
        baseline,
        brandVoiceProfile,
        brandVoiceGuidelines,
      }));

    } catch (error) {
      addThinking('analysis', `Error: ${error instanceof Error ? error.message : 'Failed to analyze page'}`);
      setEvolution(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Failed to analyze page',
      }));
    }
  };

  // Run evolution
  const handleStartOptimization = async () => {
    if (!evolution.original || !evolution.baseline) return;

    setEvolution(prev => ({ ...prev, status: 'evolving', currentGeneration: 1 }));
    addThinking('generation', `Starting evolutionary optimization with ${EVOLUTION_CONFIG_V3.populationSize} variants over ${EVOLUTION_CONFIG_V3.generations} generations.`);

    try {
      let currentVariants: ScoredVariant[] = [];
      const allGenerations: GenerationLog[] = [];
      const kw = keyword || evolution.original.title?.split(' ')[0] || 'product';

      // Run 5 generations
      for (let gen = 1; gen <= 5; gen++) {
        setEvolution(prev => ({ ...prev, currentGeneration: gen }));
        const model = getModelForGeneration(gen);
        const useHumanJudge = shouldUseHumanJudge(gen);

        addThinking('generation', `Generation ${gen}: Using ${model} for mutations. ${useHumanJudge ? 'Human Judge active.' : 'Estimator only.'}`);

        // Generate variants (in real implementation, this would call LLM)
        const newVariantsRaw = generateMockVariants(
          evolution.original,
          gen === 1 ? 20 : 8,
          gen,
          evolution.brandVoiceGuidelines || undefined
        );

        addThinking('mutation', `Created ${newVariantsRaw.length} variant${newVariantsRaw.length > 1 ? 's' : ''} for Generation ${gen}.`);

        // Score variants
        const scored = newVariantsRaw.map(v => {
          const result = scoreVariant(v, {
            keyword: kw,
            estimator: estimateHumanScore,
          });
          return {
            ...result,
            generation: gen,
          } as ScoredVariant;
        });

        addThinking('scoring', `Scored ${scored.length} variants. Best: ${Math.max(...scored.map(v => v.penalizedFitness)).toFixed(1)}`);

        // Combine with elite from previous generation
        if (currentVariants.length > 0) {
          const elites = currentVariants
            .sort((a, b) => b.penalizedFitness - a.penalizedFitness)
            .slice(0, 2);
          scored.push(...elites);
          addThinking('selection', `Preserved ${elites.length} elite variants from previous generation.`);
        }

        // Sort by fitness
        scored.sort((a, b) => b.penalizedFitness - a.penalizedFitness);
        currentVariants = scored;

        // Log generation
        const fitnesses = scored.map(v => v.penalizedFitness);
        const bestFitness = Math.max(...fitnesses);
        allGenerations.push({
          generation: gen,
          timestamp: Date.now(),
          variantsCount: scored.length,
          bestFitness,
          avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
          model,
          humanJudgeUsed: useHumanJudge,
        });

        addThinking('selection', `Gen ${gen} complete. Best fitness: ${bestFitness.toFixed(1)}. Top variant: "${scored[0]?.title?.slice(0, 50)}..."`);

        setEvolution(prev => ({
          ...prev,
          generations: [...allGenerations],
          allVariants: [...currentVariants],
        }));

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Find Pareto frontier
      addThinking('analysis', `Calculating Pareto frontier from ${currentVariants.length} final variants...`);

      const paretoInput = currentVariants.map(v => ({
        id: v.id,
        ai: v.scores.ai,
        seo: v.scores.seo,
        human: v.scores.human,
        title: v.title,
      }));
      const frontier = findParetoFrontier(paretoInput);
      const namedFrontier = assignNicknames(frontier);

      addThinking('selection', `Found ${frontier.length} variants on Pareto frontier.`);

      // Log nicknames
      namedFrontier.forEach(v => {
        if (v.nickname) {
          addThinking('selection', `"${v.nickname}": AI=${v.ai}, SEO=${v.seo}, Human=${v.human}${v.recommended ? ' [RECOMMENDED]' : ''}`);
        }
      });

      // Find best variant
      const bestVariant = currentVariants[0];

      addThinking('analysis', `Evolution complete! Best overall variant: "${bestVariant?.title?.slice(0, 50)}..." with fitness ${bestVariant?.penalizedFitness?.toFixed(1)}`);

      setEvolution(prev => ({
        ...prev,
        status: 'complete',
        paretoFrontier: namedFrontier as (ParetoVariant & { nickname?: NicknameType; recommended?: boolean; title?: string })[],
        bestVariant,
      }));

      setSelectedVariant(bestVariant);

    } catch (error) {
      setEvolution(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Evolution failed',
      }));
    }
  };

  // Run user-guided generation
  const handleUserGuidedGeneration = async (feedback: string) => {
    if (!evolution.original || evolution.userGuidedCount >= 3) return;

    const nextGen = 6 + evolution.userGuidedCount;
    setEvolution(prev => ({
      ...prev,
      status: 'evolving',
      currentGeneration: nextGen,
      userFeedback: feedback,
    }));

    try {
      const kw = keyword || evolution.original.title?.split(' ')[0] || 'product';

      // Generate user-guided variants
      const newVariantsRaw = generateMockVariants(
        evolution.original,
        8,
        nextGen,
        evolution.brandVoiceGuidelines || undefined
      );

      // Score variants
      const scored = newVariantsRaw.map(v => {
        const result = scoreVariant(v, {
          keyword: kw,
          estimator: estimateHumanScore,
        });
        return {
          ...result,
          generation: nextGen,
        } as ScoredVariant;
      });

      // Add elites from previous
      const elites = evolution.allVariants
        .sort((a, b) => b.penalizedFitness - a.penalizedFitness)
        .slice(0, 2);
      scored.push(...elites);

      scored.sort((a, b) => b.penalizedFitness - a.penalizedFitness);

      // Log generation
      const fitnesses = scored.map(v => v.penalizedFitness);
      const newLog: GenerationLog = {
        generation: nextGen,
        timestamp: Date.now(),
        variantsCount: scored.length,
        bestFitness: Math.max(...fitnesses),
        avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
        model: 'claude-opus',
        humanJudgeUsed: true,
        userFeedback: feedback,
      };

      // Update Pareto frontier
      const paretoInput = scored.map(v => ({
        id: v.id,
        ai: v.scores.ai,
        seo: v.scores.seo,
        human: v.scores.human,
        title: v.title,
      }));
      const frontier = findParetoFrontier(paretoInput);
      const namedFrontier = assignNicknames(frontier);

      await new Promise(resolve => setTimeout(resolve, 1000));

      setEvolution(prev => ({
        ...prev,
        status: 'complete',
        generations: [...prev.generations, newLog],
        allVariants: scored,
        paretoFrontier: namedFrontier as (ParetoVariant & { nickname?: NicknameType; recommended?: boolean; title?: string })[],
        bestVariant: scored[0],
        userGuidedCount: prev.userGuidedCount + 1,
      }));

      setSelectedVariant(scored[0]);

    } catch (error) {
      setEvolution(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'User-guided generation failed',
      }));
    }
  };

  const handleParetoSelect = (variant: ParetoVariant) => {
    const fullVariant = evolution.allVariants.find(v => v.id === variant.id);
    if (fullVariant) {
      setSelectedVariant(fullVariant);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                Page Optimizer v3
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Triple-Judge System (AI + SEO + Human) with brand voice preservation
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span>Generations: {EVOLUTION_CONFIG_V3.generations}</span>
              <span>Population: {EVOLUTION_CONFIG_V3.populationSize}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* URL Input */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>
                Product URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com/product"
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-subtle)',
                }}
                disabled={evolution.status === 'fetching' || evolution.status === 'evolving'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>
                Target Keyword (optional)
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., widget"
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-subtle)',
                }}
                disabled={evolution.status === 'fetching' || evolution.status === 'evolving'}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAnalyze}
                disabled={!url || evolution.status === 'fetching' || evolution.status === 'evolving'}
                className="btn btn-primary w-full"
              >
                {evolution.status === 'fetching' ? 'Fetching...' : 'Analyze'}
              </button>
            </div>
          </div>

          {evolution.errorMessage && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
              {evolution.errorMessage}
            </div>
          )}

          {/* Geographic & Context Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>
                Geographic Market
              </label>
              <select
                value={geographicMarket}
                onChange={(e) => setGeographicMarket(e.target.value as GeographicMarket)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                {geographicMarkets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>
                Context Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setContextType('b2c')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
                    contextType === 'b2c' ? 'bg-blue-500 text-white' : ''
                  }`}
                  style={contextType !== 'b2c' ? {
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-soft)',
                  } : {}}
                >
                  B2C Consumer
                </button>
                <button
                  onClick={() => setContextType('b2b')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
                    contextType === 'b2b' ? 'bg-blue-500 text-white' : ''
                  }`}
                  style={contextType !== 'b2b' ? {
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-soft)',
                  } : {}}
                >
                  B2B Enterprise
                </button>
              </div>
            </div>

            <WeightSliders
              weights={evolution.weights}
              onChange={(weights) => setEvolution(prev => ({ ...prev, weights }))}
            />
          </div>
        </div>

        {/* Baseline Analysis */}
        {evolution.baseline && evolution.status === 'analyzing' && (
          <div className="mb-6">
            <BaselineDisplay
              baseline={evolution.baseline}
              brandVoice={evolution.brandVoiceGuidelines}
              onStartOptimization={handleStartOptimization}
            />
          </div>
        )}

        {/* Evolution Progress + Thinking Panel */}
        {(evolution.status === 'evolving' || evolution.status === 'complete' || evolution.status === 'analyzing' || evolution.status === 'fetching') && evolution.thinkingLog.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Left: Progress or Results */}
            <div className="space-y-4">
              {(evolution.status === 'evolving' || evolution.status === 'complete') && (
                <GenerationProgress
                  generations={evolution.generations}
                  currentGeneration={evolution.currentGeneration}
                  isRunning={evolution.status === 'evolving'}
                />
              )}
            </div>

            {/* Right: Thinking Panel */}
            <ThinkingPanel
              thinkingLog={evolution.thinkingLog}
              isRunning={evolution.status === 'evolving' || evolution.status === 'fetching'}
            />
          </div>
        )}

        {/* Results */}
        {evolution.status === 'complete' && evolution.baseline && (
          <div className="space-y-6">
            {/* Improvement Summary */}
            {evolution.bestVariant && (
              <ImprovementSummary
                baseline={evolution.baseline}
                current={evolution.bestVariant.scores}
              />
            )}

            {/* Pareto Frontier */}
            {evolution.paretoFrontier.length > 0 && (
              <ParetoExplorer
                variants={evolution.paretoFrontier}
                baseline={evolution.baseline}
                onSelect={handleParetoSelect}
              />
            )}

            {/* Selected Variant Detail / Optimized Copy Output */}
            {selectedVariant && (
              <VariantDetail
                variant={selectedVariant}
                baseline={evolution.baseline}
                brandVoiceProfile={evolution.brandVoiceProfile}
              />
            )}

            {/* User-Guided Generation */}
            <GenerationFeedback
              generation={6 + evolution.userGuidedCount}
              onSubmit={handleUserGuidedGeneration}
              disabled={evolution.userGuidedCount >= 3}
              remainingGenerations={3 - evolution.userGuidedCount}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PageOptimizerV3Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading Page Optimizer v3...</p>
        </div>
      </div>
    }>
      <PageOptimizerV3Inner />
    </Suspense>
  );
}
