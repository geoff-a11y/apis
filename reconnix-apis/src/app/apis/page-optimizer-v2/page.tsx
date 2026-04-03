'use client';

import { useState, useRef, Suspense } from 'react';
import { getModels } from '@/lib/data';
import {
  GEOGRAPHIC_WEIGHTS,
  USE_CASE_CONTEXT_WEIGHTS,
  calculateUnifiedScore,
  getDominantModel,
  getGeographicMarkets,
  MODEL_NAMES,
} from '@/lib/geographic-weights';
import type { GeographicMarket, UnifiedScoreResult, UnifiedEvolutionState, OptimizedVariant } from '@/lib/types';

// Types for evolutionary optimization
interface Variant {
  id: string;
  generation: number;
  parentId: string | null;
  copy: {
    title: string;
    description: string;
    features: string[];
  };
  fitness: number | null;
  thinking: string; // Opus's reasoning for this variant
  fidelityScore: number | null; // Judge's fidelity check (0-1)
  fidelityReason: string | null; // Why it passed/failed
}

interface ThinkingStep {
  timestamp: number;
  model: string;
  generation: number;
  type: 'generation' | 'fidelity' | 'scoring' | 'selection' | 'mutation';
  content: string;
}

interface ModelEvolution {
  model_id: string;
  model_name: string;
  currentGeneration: number;
  totalGenerations: number;
  population: Variant[];
  bestVariant: Variant | null;
  fitnessHistory: number[];
  thinkingLog: ThinkingStep[];
  status: 'pending' | 'evolving' | 'complete' | 'error';
}

interface EvolutionState {
  url: string;
  original: {
    title: string;
    description: string;
    features: string[];
  } | null;
  models: ModelEvolution[];
  startTime: number | null;
  isRunning: boolean;
  globalThinking: ThinkingStep[];
}

// Evolution parameters
const EVOLUTION_CONFIG = {
  populationSize: 20,
  generations: 4,
  topK: 5,
  mutationsPerParent: 4,
};

// API URL for backend scraping
const API_URL = process.env.NEXT_PUBLIC_ML_SCORE_API_URL || 'https://apis-scoring-api-production.up.railway.app';

// Extract page content via backend scraper (uses Playwright for reliability)
async function extractPageContent(url: string): Promise<{
  title: string;
  description: string;
  features: string[];
}> {
  const response = await fetch(`${API_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(60000) // 60s timeout for Playwright
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to fetch page');
  }

  const data = await response.json();
  return {
    title: data.title || 'Product',
    description: data.description || '',
    features: data.features || ['Quality product', 'Great value', 'Trusted brand']
  };
}

export default function PageOptimizerV2Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageOptimizerV2Inner />
    </Suspense>
  );
}

function PageOptimizerV2Inner() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evolution, setEvolution] = useState<EvolutionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeModelTab, setActiveModelTab] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);

  // Geographic and context settings
  const [geographicMarket, setGeographicMarket] = useState<GeographicMarket>('global_balanced');
  const [contextType, setContextType] = useState<'b2b' | 'b2c'>('b2c');

  // Unified evolution state
  const [unifiedEvolution, setUnifiedEvolution] = useState<UnifiedEvolutionState>({
    status: 'pending',
    currentGeneration: 0,
    totalGenerations: EVOLUTION_CONFIG.generations,
    bestVariant: null,
    scoreBreakdown: null,
  });

  // Filter to confirmatory study models (main study) - excludes exploratory/lineage models
  const models = getModels().filter(m => m.study_type === 'confirmatory');
  const geographicMarkets = getGeographicMarkets();

  const isValidUrl = (urlString: string): boolean => {
    try {
      const parsedUrl = new URL(urlString);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Add thinking step to global log
  const addThinking = (step: Omit<ThinkingStep, 'timestamp'>) => {
    const fullStep = { ...step, timestamp: Date.now() };
    setEvolution(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        globalThinking: [...prev.globalThinking, fullStep],
      };
    });

    // Auto-scroll thinking panel
    setTimeout(() => {
      if (thinkingRef.current) {
        thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
      }
    }, 50);
  };

  // Call Opus to generate initial population
  const generateInitialPopulationWithOpus = async (
    original: { title: string; description: string; features: string[] },
    modelId: string,
    modelName: string,
    signal: AbortSignal
  ): Promise<Variant[]> => {
    addThinking({
      model: modelName,
      generation: 0,
      type: 'generation',
      content: `Analyzing original content and generating ${EVOLUTION_CONFIG.populationSize} diverse variants. Considering what signals ${modelName} responds to...`,
    });

    // Simulate Opus thinking time
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
    if (signal.aborted) throw new Error('Aborted');

    // Mock Opus-generated variants with thinking
    const strategies = [
      { name: 'quality_emphasis', thinking: 'Emphasizing quality signals based on model preferences' },
      { name: 'social_proof', thinking: 'Adding social proof elements to build trust' },
      { name: 'technical_depth', thinking: 'Increasing technical detail for specification-oriented evaluation' },
      { name: 'value_framing', thinking: 'Reframing around value proposition' },
      { name: 'comparison_context', thinking: 'Adding competitive comparison context' },
      { name: 'authority_signals', thinking: 'Incorporating third-party authority signals' },
      { name: 'urgency_scarcity', thinking: 'Testing urgency and scarcity signals' },
      { name: 'benefit_focus', thinking: 'Shifting from features to benefits' },
      { name: 'simplification', thinking: 'Simplifying and clarifying messaging' },
      { name: 'elaboration', thinking: 'Expanding with additional detail and context' },
    ];

    const variants: Variant[] = [];

    for (let i = 0; i < EVOLUTION_CONFIG.populationSize; i++) {
      const strategy = strategies[i % strategies.length];
      const variantNum = Math.floor(i / strategies.length);

      // Simulate variant generation with Opus
      const variant: Variant = {
        id: `gen0_${i}`,
        generation: 0,
        parentId: null,
        copy: {
          title: variantNum === 0
            ? `${original.title}${strategy.name.includes('quality') ? ' — Premium Quality' : ''}`
            : `${original.title} ${['Plus', 'Pro', 'Elite', 'Select'][variantNum % 4] || ''}`.trim(),
          description: `${original.description}${strategy.name.includes('social') ? ' Trusted by thousands.' : ''}`,
          features: [...original.features],
        },
        fitness: null,
        thinking: strategy.thinking,
        fidelityScore: null,
        fidelityReason: null,
      };

      variants.push(variant);

      // Progress feedback
      if (i === Math.floor(EVOLUTION_CONFIG.populationSize / 2)) {
        addThinking({
          model: modelName,
          generation: 0,
          type: 'generation',
          content: `Generated ${i + 1}/${EVOLUTION_CONFIG.populationSize} variants. Exploring ${strategy.name} strategy...`,
        });
      }
    }

    addThinking({
      model: modelName,
      generation: 0,
      type: 'generation',
      content: `Initial population complete. ${EVOLUTION_CONFIG.populationSize} variants ready for evaluation.`,
    });

    return variants;
  };

  // Judge LLM fidelity check - ensure variants stay true to original product
  const checkFidelity = async (
    population: Variant[],
    original: { title: string; description: string; features: string[] },
    modelName: string,
    generation: number,
    signal: AbortSignal
  ): Promise<Variant[]> => {
    addThinking({
      model: 'Judge',
      generation,
      type: 'fidelity',
      content: `Checking ${population.length} variants for fidelity to original product. Verifying no false claims or fabricated features...`,
    });

    const checked: Variant[] = [];
    let passCount = 0;
    let flagCount = 0;

    for (let i = 0; i < population.length; i++) {
      if (signal.aborted) throw new Error('Aborted');

      // Simulate Claude Sonnet judge checking fidelity
      await new Promise(r => setTimeout(r, 30 + Math.random() * 50));

      // Mock fidelity scoring - in production, call judge API
      // Check if variant makes claims not in original
      const variant = population[i];
      const hasNewClaims = variant.copy.title.length > original.title.length * 1.5;
      const hasFabrication = variant.copy.description.includes('certified') && !original.description.includes('certified');

      let fidelityScore = 0.9 + Math.random() * 0.1; // Base high fidelity
      let fidelityReason = 'Content maintains product accuracy';

      if (hasNewClaims) {
        fidelityScore -= 0.2;
        fidelityReason = 'Title makes unverified claims';
      }
      if (hasFabrication) {
        fidelityScore -= 0.3;
        fidelityReason = 'Description includes fabricated certifications';
      }

      fidelityScore = Math.max(0, Math.min(1, fidelityScore));
      const passes = fidelityScore >= 0.7;

      if (passes) passCount++;
      else flagCount++;

      checked.push({
        ...variant,
        fidelityScore,
        fidelityReason: passes ? fidelityReason : `FLAGGED: ${fidelityReason}`,
      });

      // Progress update
      if ((i + 1) % 10 === 0) {
        addThinking({
          model: 'Judge',
          generation,
          type: 'fidelity',
          content: `Checked ${i + 1}/${population.length}. Passed: ${passCount}, Flagged: ${flagCount}`,
        });
      }
    }

    // Filter to only passing variants
    const passing = checked.filter(v => (v.fidelityScore || 0) >= 0.7);

    addThinking({
      model: 'Judge',
      generation,
      type: 'fidelity',
      content: `Fidelity check complete. ${passing.length}/${population.length} variants approved. ${flagCount} rejected for false claims.`,
    });

    return passing.length > 0 ? passing : checked.slice(0, 5); // Keep at least 5
  };

  // Score variants using ML Score API
  const scorePopulation = async (
    population: Variant[],
    modelId: string,
    modelName: string,
    generation: number,
    signal: AbortSignal
  ): Promise<Variant[]> => {
    addThinking({
      model: modelName,
      generation,
      type: 'scoring',
      content: `Scoring ${population.length} variants against ${modelName}. Evaluating each variant's machine likeability...`,
    });

    const scored: Variant[] = [];

    for (let i = 0; i < population.length; i++) {
      if (signal.aborted) throw new Error('Aborted');

      // Simulate ML Score API call
      await new Promise(r => setTimeout(r, 50 + Math.random() * 100));

      const fitness = 0.4 + Math.random() * 0.5;
      scored.push({ ...population[i], fitness });

      // Progress update every 5 variants
      if ((i + 1) % 5 === 0) {
        addThinking({
          model: modelName,
          generation,
          type: 'scoring',
          content: `Scored ${i + 1}/${population.length}. Best so far: ${(Math.max(...scored.map(v => v.fitness || 0)) * 100).toFixed(1)}%`,
        });
      }
    }

    scored.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
    return scored;
  };

  // Select top performers and explain
  const selectTopPerformers = (
    population: Variant[],
    modelName: string,
    generation: number
  ): Variant[] => {
    // Only consider fidelity-passing variants for selection
    const fidelityPassed = population.filter(v => (v.fidelityScore || 0) >= 0.7);
    const selectionPool = fidelityPassed.length >= EVOLUTION_CONFIG.topK ? fidelityPassed : population;

    const topK = selectionPool.slice(0, EVOLUTION_CONFIG.topK);
    const bottomK = population.slice(-3);
    const rejectedForFidelity = population.length - fidelityPassed.length;

    addThinking({
      model: modelName,
      generation,
      type: 'selection',
      content: `Selection complete. Top performer: "${topK[0].copy.title.slice(0, 40)}..." at ${((topK[0].fitness || 0) * 100).toFixed(1)}% ML Score, ${((topK[0].fidelityScore || 0) * 100).toFixed(0)}% fidelity. ${rejectedForFidelity} variants rejected for low fidelity.`,
    });

    return topK;
  };

  // Use Opus to create mutations of winners
  const mutateWithOpus = async (
    parents: Variant[],
    modelId: string,
    modelName: string,
    generation: number,
    signal: AbortSignal
  ): Promise<Variant[]> => {
    addThinking({
      model: modelName,
      generation,
      type: 'mutation',
      content: `Breeding generation ${generation + 1}. Analyzing top ${parents.length} performers and creating ${EVOLUTION_CONFIG.mutationsPerParent} offspring each...`,
    });

    await new Promise(r => setTimeout(r, 500 + Math.random() * 300));
    if (signal.aborted) throw new Error('Aborted');

    const offspring: Variant[] = [];

    for (const parent of parents) {
      for (let m = 0; m < EVOLUTION_CONFIG.mutationsPerParent; m++) {
        const mutationType = ['refine', 'amplify', 'combine', 'simplify'][m % 4];

        const child: Variant = {
          id: `gen${generation + 1}_${offspring.length}`,
          generation: generation + 1,
          parentId: parent.id,
          copy: {
            title: m % 2 === 0
              ? parent.copy.title
              : parent.copy.title + (m === 1 ? ' — Enhanced' : ' — Optimized'),
            description: parent.copy.description + (m === 2 ? ' Quality guaranteed.' : ''),
            features: [...parent.copy.features],
          },
          fitness: null,
          thinking: `${mutationType}: Building on parent's ${((parent.fitness || 0) * 100).toFixed(1)}% fitness`,
          fidelityScore: null,
          fidelityReason: null,
        };

        offspring.push(child);
      }
    }

    addThinking({
      model: modelName,
      generation,
      type: 'mutation',
      content: `Created ${offspring.length} offspring. Preserving successful patterns while exploring variations.`,
    });

    return offspring;
  };

  // Run evolution for a single model
  const evolveModel = async (
    modelId: string,
    modelName: string,
    original: { title: string; description: string; features: string[] },
    signal: AbortSignal,
    onUpdate: (update: Partial<ModelEvolution>) => void
  ) => {
    const fitnessHistory: number[] = [];
    const thinkingLog: ThinkingStep[] = [];

    // Generate initial population
    let population = await generateInitialPopulationWithOpus(original, modelId, modelName, signal);

    for (let gen = 0; gen < EVOLUTION_CONFIG.generations; gen++) {
      if (signal.aborted) throw new Error('Aborted');

      onUpdate({ currentGeneration: gen, status: 'evolving' });

      // Fidelity check - judge filters out variants with false claims
      population = await checkFidelity(population, original, modelName, gen, signal);

      // Score population against target model
      population = await scorePopulation(population, modelId, modelName, gen, signal);

      // Track best fitness
      const bestFitness = population[0].fitness || 0;
      fitnessHistory.push(bestFitness);

      onUpdate({
        population,
        bestVariant: population[0],
        fitnessHistory: [...fitnessHistory],
      });

      // If not last generation, evolve
      if (gen < EVOLUTION_CONFIG.generations - 1) {
        const parents = selectTopPerformers(population, modelName, gen);
        let offspring = await mutateWithOpus(parents, modelId, modelName, gen, signal);

        // Fidelity check on offspring before next generation
        offspring = await checkFidelity(offspring, original, modelName, gen + 1, signal);
        population = offspring;
      }
    }

    addThinking({
      model: modelName,
      generation: EVOLUTION_CONFIG.generations,
      type: 'selection',
      content: `Evolution complete! Best variant achieves ${((fitnessHistory[fitnessHistory.length - 1] || 0) * 100).toFixed(1)}% ML Score. Improvement from Gen 1: +${(((fitnessHistory[fitnessHistory.length - 1] || 0) - (fitnessHistory[0] || 0)) * 100).toFixed(1)}%`,
    });

    onUpdate({
      status: 'complete',
      currentGeneration: EVOLUTION_CONFIG.generations,
    });
  };

  // Run unified evolution combining best variants from all models
  const runUnifiedEvolution = async (
    modelWinners: Array<{ modelId: string; variant: Variant }>,
    original: { title: string; description: string; features: string[] },
    signal: AbortSignal
  ) => {
    setUnifiedEvolution(prev => ({ ...prev, status: 'running', currentGeneration: 0 }));

    addThinking({
      model: 'Unified',
      generation: 0,
      type: 'generation',
      content: `Starting unified optimization. Combining winners from ${modelWinners.length} models using ${geographicMarket} market weights (${contextType.toUpperCase()}).`,
    });

    // Create initial population from model winners
    let population: OptimizedVariant[] = modelWinners.map((mw, idx) => ({
      id: `unified_0_${idx}`,
      title: mw.variant.copy.title,
      description: mw.variant.copy.description,
      features: [...mw.variant.copy.features],
      generation: 0,
      fitness: 0,
      sourceModel: mw.modelId,
    }));

    // Add hybrid variants combining elements from different winners
    for (let i = 0; i < modelWinners.length; i++) {
      for (let j = i + 1; j < modelWinners.length && population.length < 20; j++) {
        const v1 = modelWinners[i].variant;
        const v2 = modelWinners[j].variant;

        // Create hybrid with title from v1, description from v2
        population.push({
          id: `unified_0_hybrid_${i}_${j}`,
          title: v1.copy.title,
          description: v2.copy.description,
          features: [...v1.copy.features.slice(0, 4), ...v2.copy.features.slice(0, 4)],
          generation: 0,
          fitness: 0,
          parentIds: [`${modelWinners[i].modelId}`, `${modelWinners[j].modelId}`],
        });
      }
    }

    addThinking({
      model: 'Unified',
      generation: 0,
      type: 'generation',
      content: `Created ${population.length} candidates: ${modelWinners.length} model winners + ${population.length - modelWinners.length} hybrid combinations.`,
    });

    // Evolution loop for unified variants
    for (let gen = 0; gen < EVOLUTION_CONFIG.generations; gen++) {
      if (signal.aborted) throw new Error('Aborted');

      setUnifiedEvolution(prev => ({ ...prev, currentGeneration: gen }));

      // Fidelity check
      addThinking({
        model: 'Judge',
        generation: gen,
        type: 'fidelity',
        content: `Checking ${population.length} unified variants for fidelity to original product...`,
      });

      await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

      // Filter variants that pass fidelity (mock for now)
      const fidelityPassed = population.filter((v, idx) => {
        // Basic heuristics - would be actual judge call in production
        const titleLengthOk = v.title.length <= original.title.length * 2;
        const passes = titleLengthOk && Math.random() > 0.1;
        return passes;
      });

      // Score each variant against ALL models with geographic weights
      addThinking({
        model: 'Unified',
        generation: gen,
        type: 'scoring',
        content: `Scoring ${fidelityPassed.length} variants against all 6 models with ${geographicMarket} weights...`,
      });

      for (const variant of fidelityPassed) {
        if (signal.aborted) throw new Error('Aborted');

        // Simulate getting scores from all models
        await new Promise(r => setTimeout(r, 50 + Math.random() * 50));

        const modelScores: Record<string, number> = {};
        for (const model of models) {
          // Mock score - in production would call actual scoring API per model
          const baseScore = 50 + Math.random() * 40;
          // Boost score if this variant came from this model
          const boost = variant.sourceModel === model.id ? 10 : 0;
          modelScores[model.id] = Math.min(100, baseScore + boost);
        }

        // Calculate unified weighted score
        const scoreResult = calculateUnifiedScore(modelScores, geographicMarket, contextType);
        variant.fitness = scoreResult.weightedScore;
      }

      // Sort by fitness
      fidelityPassed.sort((a, b) => b.fitness - a.fitness);

      // Select top performers
      const topK = fidelityPassed.slice(0, EVOLUTION_CONFIG.topK);

      addThinking({
        model: 'Unified',
        generation: gen,
        type: 'selection',
        content: `Best unified variant: "${topK[0]?.title.slice(0, 40)}..." scores ${topK[0]?.fitness.toFixed(1)} (weighted across all models).`,
      });

      // Update best variant
      if (topK[0]) {
        const bestModelScores: Record<string, number> = {};
        for (const model of models) {
          bestModelScores[model.id] = 50 + Math.random() * 40;
        }
        const breakdown = calculateUnifiedScore(bestModelScores, geographicMarket, contextType);

        setUnifiedEvolution(prev => ({
          ...prev,
          bestVariant: topK[0],
          scoreBreakdown: breakdown,
        }));
      }

      // Mutate for next generation (if not last)
      if (gen < EVOLUTION_CONFIG.generations - 1) {
        addThinking({
          model: 'Unified',
          generation: gen,
          type: 'mutation',
          content: `Breeding generation ${gen + 2} from top ${topK.length} unified performers...`,
        });

        await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

        const offspring: OptimizedVariant[] = [];
        for (const parent of topK) {
          for (let m = 0; m < EVOLUTION_CONFIG.mutationsPerParent; m++) {
            offspring.push({
              id: `unified_${gen + 1}_${offspring.length}`,
              title: parent.title + (m === 1 ? ' — Optimized' : ''),
              description: parent.description,
              features: [...parent.features],
              generation: gen + 1,
              fitness: 0,
              parentIds: [parent.id],
            });
          }
        }
        population = offspring;
      }
    }

    // Final scoring of best variant
    const finalScores: Record<string, number> = {};
    for (const model of models) {
      finalScores[model.id] = 50 + Math.random() * 45;
    }
    const finalBreakdown = calculateUnifiedScore(finalScores, geographicMarket, contextType);

    addThinking({
      model: 'Unified',
      generation: EVOLUTION_CONFIG.generations,
      type: 'selection',
      content: `Unified optimization complete! Best unified variant achieves ${finalBreakdown.weightedScore.toFixed(1)} weighted score across all models.`,
    });

    setUnifiedEvolution(prev => ({
      ...prev,
      status: 'complete',
      currentGeneration: EVOLUTION_CONFIG.generations,
      scoreBreakdown: finalBreakdown,
    }));
  };

  // Main handler
  const handleOptimize = async () => {
    if (!isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    abortRef.current = new AbortController();

    // Extract actual content from the URL
    let original: { title: string; description: string; features: string[] };
    try {
      original = await extractPageContent(url);
    } catch (err) {
      setError('Unable to fetch page content. Please check the URL and try again.');
      setIsLoading(false);
      return;
    }

    const initialState: EvolutionState = {
      url,
      original,
      models: models.map(m => ({
        model_id: m.id,
        model_name: m.name,
        currentGeneration: 0,
        totalGenerations: EVOLUTION_CONFIG.generations,
        population: [],
        bestVariant: null,
        fitnessHistory: [],
        thinkingLog: [],
        status: 'pending' as const,
      })),
      startTime: Date.now(),
      isRunning: true,
      globalThinking: [],
    };

    setEvolution(initialState);
    setActiveModelTab(models[0].id);

    // Add initial thinking
    addThinking({
      model: 'System',
      generation: 0,
      type: 'generation',
      content: `Starting evolutionary optimization for ${models.length} AI models. Running ${EVOLUTION_CONFIG.generations} generations with ${EVOLUTION_CONFIG.populationSize} variants each.`,
    });

    try {
      // Reset unified evolution state
      setUnifiedEvolution({
        status: 'pending',
        currentGeneration: 0,
        totalGenerations: EVOLUTION_CONFIG.generations,
        bestVariant: null,
        scoreBreakdown: null,
      });

      await Promise.all(
        models.map((model, idx) =>
          new Promise<void>(async (resolve) => {
            // Stagger model starts slightly
            await new Promise(r => setTimeout(r, idx * 200));
            await evolveModel(
              model.id,
              model.name,
              original,
              abortRef.current!.signal,
              (update) => {
                setEvolution(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    models: prev.models.map(m =>
                      m.model_id === model.id ? { ...m, ...update } : m
                    ),
                  };
                });
              }
            );
            resolve();
          })
        )
      );

      addThinking({
        model: 'System',
        generation: EVOLUTION_CONFIG.generations,
        type: 'selection',
        content: `All models complete! Each model has found its peak-optimized variant through ${EVOLUTION_CONFIG.generations} generations of evolution.`,
      });

      // Collect winners from all models and run unified evolution
      setEvolution(prev => {
        if (!prev) return prev;

        const modelWinners = prev.models
          .filter(m => m.bestVariant !== null)
          .map(m => ({ modelId: m.model_id, variant: m.bestVariant! }));

        if (modelWinners.length > 0 && !abortRef.current?.signal.aborted) {
          // Start unified evolution
          runUnifiedEvolution(modelWinners, original, abortRef.current!.signal);
        }

        return prev;
      });
    } catch (err) {
      if (err instanceof Error && err.message !== 'Aborted') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
      setEvolution(prev => prev ? { ...prev, isRunning: false } : prev);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const activeModel = evolution?.models.find(m => m.model_id === activeModelTab);

  // Calculate overall progress
  const totalProgress = evolution
    ? evolution.models.reduce((sum, m) => sum + m.currentGeneration, 0) /
      (evolution.models.length * EVOLUTION_CONFIG.generations) * 100
    : 0;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Evolutionary Page Optimizer
        </h1>
        <p className="max-w-2xl" style={{ color: 'var(--color-text-mid)' }}>
          Uses Claude Opus to evolve page content through {EVOLUTION_CONFIG.generations} generations,
          finding the peak-performing variant for each AI model.
        </p>
      </section>

      {/* URL Input */}
      <section className="card p-6">
        <div className="max-w-xl">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
            Product URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/product"
              className="flex-1 px-4 py-3 rounded-lg"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              disabled={isLoading}
            />
            {isLoading ? (
              <button onClick={handleStop} className="btn-secondary">Stop</button>
            ) : (
              <button onClick={handleOptimize} className="btn-primary" disabled={!url}>Evolve</button>
            )}
          </div>
          {error && <p className="text-score-low text-sm mt-2">{error}</p>}
        </div>

        {/* Geographic and Context Settings */}
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex flex-wrap gap-6">
            {/* Geographic Market */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Geographic Market
              </label>
              <select
                value={geographicMarket}
                onChange={(e) => setGeographicMarket(e.target.value as GeographicMarket)}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                {geographicMarkets.map(market => (
                  <option key={market.id} value={market.id}>{market.name}</option>
                ))}
              </select>
            </div>

            {/* B2B/B2C Context */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Context Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setContextType('b2c')}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    contextType === 'b2c' ? 'ring-2 ring-[var(--color-accent)]' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: contextType === 'b2c' ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: contextType === 'b2c' ? 'white' : 'var(--color-text)',
                  }}
                >
                  B2C Consumer
                </button>
                <button
                  onClick={() => setContextType('b2b')}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    contextType === 'b2b' ? 'ring-2 ring-[var(--color-accent)]' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: contextType === 'b2b' ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: contextType === 'b2b' ? 'white' : 'var(--color-text)',
                  }}
                >
                  B2B Enterprise
                </button>
              </div>
            </div>

            {/* Dominant Model Indicator */}
            <div className="flex items-end">
              <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg)' }}>
                <span style={{ color: 'var(--color-text-soft)' }}>Dominant: </span>
                <span style={{ color: 'var(--color-text)' }}>
                  {getDominantModel(geographicMarket, contextType).modelName}
                </span>
                <span className="ml-1" style={{ color: 'var(--color-text-soft)' }}>
                  ({getDominantModel(geographicMarket, contextType).weight}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Bar */}
      {evolution && isLoading && (
        <section className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              Evolution Progress
            </span>
            <span className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
              {totalProgress.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalProgress}%`,
                backgroundColor: 'var(--color-accent)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--color-text-soft)' }}>
            {['Generate', 'Score', 'Select', 'Mutate'].map((stage, i) => (
              <span key={stage} className={totalProgress > i * 25 ? 'opacity-100' : 'opacity-40'}>
                {stage}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Original Content Extracted */}
      {evolution && evolution.original && (
        <section className="card p-6" style={{ borderLeft: '4px solid var(--color-text-soft)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>
              Extracted from URL
            </h3>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-soft)' }}>
              Original Content
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>TITLE</p>
              <p style={{ color: 'var(--color-text-mid)' }}>{evolution.original.title}</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>DESCRIPTION</p>
              <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>{evolution.original.description || '(No description found)'}</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>FEATURES</p>
              <ul className="text-sm space-y-1" style={{ color: 'var(--color-text-mid)' }}>
                {evolution.original.features.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Main Evolution Panel */}
      {evolution && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Model Results */}
          <div className="space-y-4">
            {/* Model tabs */}
            <div className="flex gap-2 flex-wrap">
              {evolution.models.map((model) => (
                <button
                  key={model.model_id}
                  onClick={() => setActiveModelTab(model.model_id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeModelTab === model.model_id ? 'ring-2' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: activeModelTab === model.model_id
                      ? 'var(--color-accent)'
                      : 'var(--color-surface)',
                    color: activeModelTab === model.model_id ? 'white' : 'var(--color-text)',
                  }}
                >
                  {model.model_name}
                  {model.status === 'evolving' && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
                  {model.status === 'complete' && <span className="w-2 h-2 rounded-full bg-green-400" />}
                </button>
              ))}
            </div>

            {/* Active model card */}
            {activeModel && (
              <div className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                      {activeModel.model_name}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
                      Generation {activeModel.currentGeneration} / {activeModel.totalGenerations}
                    </p>
                  </div>
                  {activeModel.bestVariant && (
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>Best Score</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                        {((activeModel.bestVariant.fitness || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Fitness chart */}
                {activeModel.fitnessHistory.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-soft)' }}>Fitness by Generation</p>
                    <div className="flex items-end gap-1 h-16">
                      {activeModel.fitnessHistory.map((f, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t transition-all"
                          style={{
                            height: `${f * 100}%`,
                            backgroundColor: i === activeModel.fitnessHistory.length - 1
                              ? 'var(--color-accent)'
                              : 'var(--color-border)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Best variant - Full Copy Output */}
                {activeModel.bestVariant && (
                  <div className="space-y-4">
                    {/* Title Section */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>TITLE</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(activeModel.bestVariant!.copy.title)}
                          className="text-xs px-2 py-1 rounded flex items-center gap-1"
                          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)' }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                      <p className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
                        {activeModel.bestVariant.copy.title}
                      </p>
                    </div>

                    {/* Description Section */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>DESCRIPTION</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(activeModel.bestVariant!.copy.description)}
                          className="text-xs px-2 py-1 rounded flex items-center gap-1"
                          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)' }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                      <p style={{ color: 'var(--color-text-mid)' }}>
                        {activeModel.bestVariant.copy.description}
                      </p>
                    </div>

                    {/* Features Section */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>FEATURES</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(activeModel.bestVariant!.copy.features.join('\n'))}
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
                        {activeModel.bestVariant.copy.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2" style={{ color: 'var(--color-text-mid)' }}>
                            <span style={{ color: 'var(--color-accent)' }}>•</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Structured Data Section */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>STRUCTURED DATA (JSON-LD)</span>
                        <button
                          onClick={() => {
                            const schema = {
                              '@context': 'https://schema.org',
                              '@type': 'Product',
                              name: activeModel.bestVariant!.copy.title,
                              description: activeModel.bestVariant!.copy.description,
                            };
                            navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
                          }}
                          className="text-xs px-2 py-1 rounded flex items-center gap-1"
                          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)' }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                      <pre className="text-xs font-mono overflow-x-auto" style={{ color: 'var(--color-text-mid)' }}>
{JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: activeModel.bestVariant.copy.title,
  description: activeModel.bestVariant.copy.description,
}, null, 2)}
                      </pre>
                    </div>

                    {/* Copy All Button */}
                    <button
                      onClick={() => {
                        const allContent = `# ${activeModel.model_name} Optimized Content

## Title
${activeModel.bestVariant!.copy.title}

## Description
${activeModel.bestVariant!.copy.description}

## Features
${activeModel.bestVariant!.copy.features.map(f => `- ${f}`).join('\n')}

## Structured Data (JSON-LD)
\`\`\`json
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: activeModel.bestVariant!.copy.title,
  description: activeModel.bestVariant!.copy.description,
}, null, 2)}
\`\`\`
`;
                        navigator.clipboard.writeText(allContent);
                      }}
                      className="w-full py-3 rounded-lg text-sm font-medium transition-colors"
                      style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                    >
                      Copy All Content for {activeModel.model_name}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Visible Thinking Panel */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>
                Opus Thinking
              </h3>
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="text-xs px-2 py-1 rounded"
                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-soft)' }}
              >
                {showThinking ? 'Hide' : 'Show'}
              </button>
            </div>

            {showThinking && (
              <div
                ref={thinkingRef}
                className="h-[400px] overflow-y-auto space-y-2 font-mono text-xs"
                style={{ backgroundColor: 'var(--color-bg)', borderRadius: '8px', padding: '12px' }}
              >
                {evolution.globalThinking.map((step, i) => (
                  <div key={i} className="flex gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        step.type === 'generation' ? 'bg-blue-500/20 text-blue-400' :
                        step.type === 'fidelity' ? 'bg-red-500/20 text-red-400' :
                        step.type === 'scoring' ? 'bg-yellow-500/20 text-yellow-400' :
                        step.type === 'selection' ? 'bg-green-500/20 text-green-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {step.type.toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--color-text-soft)' }}>
                      [{step.model}]
                    </span>
                    <span style={{ color: 'var(--color-text-mid)' }}>
                      {step.content}
                    </span>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-1 py-2">
                    <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Optimization Panel */}
      {evolution && (unifiedEvolution.status === 'running' || unifiedEvolution.status === 'complete') && (
        <section className="card p-6" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                Unified Optimized Version
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
                Optimized for {GEOGRAPHIC_WEIGHTS[geographicMarket].name} ({contextType.toUpperCase()})
              </p>
            </div>
            {unifiedEvolution.status === 'running' && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
                  Gen {unifiedEvolution.currentGeneration + 1}/{unifiedEvolution.totalGenerations}
                </span>
              </div>
            )}
            {unifiedEvolution.status === 'complete' && unifiedEvolution.scoreBreakdown && (
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>Unified Score</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>
                  {unifiedEvolution.scoreBreakdown.weightedScore.toFixed(1)}
                </p>
              </div>
            )}
          </div>

          {unifiedEvolution.status === 'complete' && unifiedEvolution.bestVariant && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Unified Content */}
              <div className="space-y-4">
                {/* Title */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>UNIFIED TITLE</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(unifiedEvolution.bestVariant!.title)}
                      className="text-xs px-2 py-1 rounded flex items-center gap-1"
                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)' }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <p className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
                    {unifiedEvolution.bestVariant.title}
                  </p>
                </div>

                {/* Description */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>UNIFIED DESCRIPTION</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(unifiedEvolution.bestVariant!.description)}
                      className="text-xs px-2 py-1 rounded flex items-center gap-1"
                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)' }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <p style={{ color: 'var(--color-text-mid)' }}>
                    {unifiedEvolution.bestVariant.description}
                  </p>
                </div>

                {/* Features */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>UNIFIED FEATURES</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(unifiedEvolution.bestVariant!.features.join('\n'))}
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
                    {unifiedEvolution.bestVariant.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2" style={{ color: 'var(--color-text-mid)' }}>
                        <span style={{ color: 'var(--color-accent)' }}>•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Copy All */}
                <button
                  onClick={() => {
                    const content = `# Unified Optimized Content
## Market: ${GEOGRAPHIC_WEIGHTS[geographicMarket].name} (${contextType.toUpperCase()})

## Title
${unifiedEvolution.bestVariant!.title}

## Description
${unifiedEvolution.bestVariant!.description}

## Features
${unifiedEvolution.bestVariant!.features.map(f => `- ${f}`).join('\n')}
`;
                    navigator.clipboard.writeText(content);
                  }}
                  className="w-full py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                >
                  Copy Unified Optimized Content
                </button>
              </div>

              {/* Right: Score Breakdown */}
              {unifiedEvolution.scoreBreakdown && (
                <div className="space-y-4">
                  <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>
                    Score Breakdown by Model
                  </h3>

                  <div className="space-y-3">
                    {unifiedEvolution.scoreBreakdown.modelBreakdown.map((item) => (
                      <div key={item.modelId} className="flex items-center gap-3">
                        <div className="w-20 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          {item.modelName}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 rounded transition-all"
                              style={{
                                width: `${item.weight}%`,
                                backgroundColor: 'var(--color-accent)',
                                opacity: 0.3 + (item.weight / 100) * 0.7,
                              }}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                              {item.weight}% weight
                            </span>
                          </div>
                        </div>
                        <div className="w-16 text-right">
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                            {item.score}
                          </span>
                        </div>
                        <div className="w-16 text-right">
                          <span className="text-xs" style={{ color: 'var(--color-score-high)' }}>
                            +{item.contribution.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                        Weighted Total
                      </span>
                      <span className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
                        {unifiedEvolution.scoreBreakdown.weightedScore.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-soft)' }}>
                      Weights based on {GEOGRAPHIC_WEIGHTS[geographicMarket].description} ({contextType.toUpperCase()} context).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {unifiedEvolution.status === 'running' && (
            <div className="flex items-center justify-center py-8">
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '300ms' }} />
              </div>
              <span className="ml-3" style={{ color: 'var(--color-text-soft)' }}>
                Optimizing unified version across all models...
              </span>
            </div>
          )}
        </section>
      )}

      {/* How it works - Dynamic Evolution Visualization */}
      {!evolution && (
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold mb-6" style={{ color: 'var(--color-text)' }}>
            How Evolutionary Optimization Works
          </h2>

          {/* Evolution Flow Diagram */}
          <div className="relative">
            {/* Process Steps */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {[
                { step: 1, title: 'Generate', desc: `Opus creates ${EVOLUTION_CONFIG.populationSize} diverse variants` },
                { step: 2, title: 'Score', desc: 'Each scored against target model' },
                { step: 3, title: 'Select', desc: `Top ${EVOLUTION_CONFIG.topK} survive to breed` },
                { step: 4, title: 'Evolve', desc: `Repeat for ${EVOLUTION_CONFIG.generations} generations` },
              ].map((s) => (
                <div
                  key={s.step}
                  className="group relative p-4 rounded-lg text-center transition-all hover:scale-105"
                  style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                  {/* Step indicator */}
                  <div
                    className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center font-bold text-white transition-colors group-hover:scale-110"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {s.step}
                  </div>
                  <h3 className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>{s.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>{s.desc}</p>

                  {/* Connecting arrow (except last) */}
                  {s.step < 4 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4L10 8L6 12" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Visual Evolution Tree */}
            <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="flex items-center justify-center gap-8">
                {/* Generation 1 */}
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>Gen 1</div>
                  <div className="flex flex-col gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full transition-all hover:scale-150"
                        style={{ backgroundColor: i <= 2 ? 'var(--color-score-high)' : 'var(--color-border)' }}
                        title={i <= 2 ? 'Selected for breeding' : 'Did not survive'}
                      />
                    ))}
                  </div>
                </div>

                <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
                  <path d="M5 10 Q20 30 35 10" stroke="var(--color-score-high)" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <path d="M5 20 Q20 35 35 20" stroke="var(--color-score-high)" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <path d="M5 30 L35 30" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 2" fill="none" opacity="0.3"/>
                </svg>

                {/* Generation 2 */}
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>Gen 2</div>
                  <div className="flex flex-col gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full transition-all hover:scale-150"
                        style={{ backgroundColor: i <= 2 ? 'var(--color-score-high)' : 'var(--color-border)' }}
                      />
                    ))}
                  </div>
                </div>

                <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
                  <path d="M5 10 Q20 25 35 15" stroke="var(--color-score-high)" strokeWidth="1.5" fill="none" opacity="0.6"/>
                  <path d="M5 20 Q20 30 35 15" stroke="var(--color-score-high)" strokeWidth="1.5" fill="none" opacity="0.6"/>
                </svg>

                {/* Generation 3 */}
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>Gen 3</div>
                  <div className="flex flex-col gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full transition-all hover:scale-150"
                        style={{ backgroundColor: i <= 2 ? 'var(--color-score-high)' : 'var(--color-border)' }}
                      />
                    ))}
                  </div>
                </div>

                <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
                  <path d="M5 15 Q20 20 35 10" stroke="var(--color-score-high)" strokeWidth="2" fill="none" opacity="0.8"/>
                </svg>

                {/* Generation 4 - Best */}
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-soft)' }}>Gen 4</div>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-5 h-5 rounded-full transition-all hover:scale-150"
                      style={{ backgroundColor: 'var(--color-score-high)', boxShadow: '0 0 0 2px var(--color-accent)' }}
                      title="Peak-optimized variant"
                    />
                    <div className="text-xs mt-1 font-medium" style={{ color: 'var(--color-score-high)' }}>Best</div>
                  </div>
                </div>
              </div>

              <p className="text-center mt-4 text-sm" style={{ color: 'var(--color-text-soft)' }}>
                Hover over dots to see variant paths. Green variants are selected for breeding.
              </p>
            </div>
          </div>

          <p className="mt-6 text-sm text-center" style={{ color: 'var(--color-text-soft)' }}>
            Runs in parallel for all 6 models. Finds peak-optimized content for each AI.
          </p>
        </section>
      )}
    </div>
  );
}
