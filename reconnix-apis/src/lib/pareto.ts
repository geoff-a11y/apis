// src/lib/pareto.ts — Pareto frontier calculation and analysis
// Identifies non-dominated variants representing optimal trade-offs

export interface ParetoScores {
  ai: number;
  seo: number;
  human: number;
}

export interface ParetoVariant extends ParetoScores {
  id: string;
  nickname?: string;
  recommended?: boolean;
  dominatedBy?: string[];  // IDs of variants that dominate this one
}

export type NicknameType = 'AI Champion' | 'SEO Specialist' | 'Human Touch' | 'Balanced Winner';

/**
 * Check if variant A is dominated by variant B
 * A is dominated by B if B is >= A in all dimensions and > A in at least one
 */
export function isDominated(a: ParetoScores, b: ParetoScores): boolean {
  // B must be >= A in all dimensions
  const allGreaterOrEqual = b.ai >= a.ai && b.seo >= a.seo && b.human >= a.human;

  if (!allGreaterOrEqual) {
    return false;
  }

  // B must be strictly greater in at least one dimension
  const atLeastOneGreater = b.ai > a.ai || b.seo > a.seo || b.human > a.human;

  return atLeastOneGreater;
}

/**
 * Find all non-dominated variants (the Pareto frontier)
 */
export function findParetoFrontier<T extends ParetoScores & { id: string }>(
  variants: T[]
): T[] {
  if (variants.length === 0) {
    return [];
  }

  const frontier: T[] = [];

  for (const candidate of variants) {
    let dominated = false;

    // Check if any other variant dominates this one
    for (const other of variants) {
      if (other.id !== candidate.id && isDominated(candidate, other)) {
        dominated = true;
        break;
      }
    }

    if (!dominated) {
      frontier.push(candidate);
    }
  }

  return frontier;
}

/**
 * Get variants that dominate a given variant
 */
export function getDominators<T extends ParetoScores & { id: string }>(
  variant: T,
  allVariants: T[]
): T[] {
  return allVariants.filter(
    other => other.id !== variant.id && isDominated(variant, other)
  );
}

/**
 * Calculate the "balance" score - how evenly distributed are the three scores
 * Lower variance = more balanced
 */
function calculateBalanceScore(scores: ParetoScores): number {
  const values = [scores.ai, scores.seo, scores.human];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  // Convert variance to a "balance" score - lower variance = higher balance
  // Max possible variance is ~2222 (if one score is 100 and others are 0)
  return 100 - Math.sqrt(variance);
}

/**
 * Assign nicknames to Pareto frontier variants
 * - "AI Champion": Highest AI score
 * - "SEO Specialist": Highest SEO score
 * - "Human Touch": Highest Human score
 * - "Balanced Winner": Most balanced (lowest variance) - marked as RECOMMENDED
 */
export function assignNicknames<T extends ParetoScores & { id: string }>(
  variants: T[]
): (T & { nickname?: NicknameType; recommended?: boolean })[] {
  if (variants.length === 0) {
    return [];
  }

  // Clone variants to avoid mutation - explicitly type to include optional properties
  type ResultType = T & { nickname?: NicknameType; recommended?: boolean };
  const result: ResultType[] = variants.map(v => ({ ...v } as ResultType));

  // Track assigned nicknames to avoid duplicates
  const assigned = new Set<string>();

  // Find AI Champion (highest AI score)
  const aiSorted = [...result].sort((a, b) => b.ai - a.ai);
  const aiChampion = aiSorted[0];
  if (!assigned.has(aiChampion.id)) {
    const target = result.find(v => v.id === aiChampion.id)!;
    target.nickname = 'AI Champion';
    assigned.add(aiChampion.id);
  }

  // Find SEO Specialist (highest SEO score)
  const seoSorted = [...result].sort((a, b) => b.seo - a.seo);
  for (const candidate of seoSorted) {
    if (!assigned.has(candidate.id)) {
      const target = result.find(v => v.id === candidate.id)!;
      target.nickname = 'SEO Specialist';
      assigned.add(candidate.id);
      break;
    }
  }

  // Find Human Touch (highest Human score)
  const humanSorted = [...result].sort((a, b) => b.human - a.human);
  for (const candidate of humanSorted) {
    if (!assigned.has(candidate.id)) {
      const target = result.find(v => v.id === candidate.id)!;
      target.nickname = 'Human Touch';
      assigned.add(candidate.id);
      break;
    }
  }

  // Find Balanced Winner (most balanced)
  const balanceSorted = [...result].sort(
    (a, b) => calculateBalanceScore(b) - calculateBalanceScore(a)
  );
  for (const candidate of balanceSorted) {
    if (!assigned.has(candidate.id)) {
      const target = result.find(v => v.id === candidate.id)!;
      target.nickname = 'Balanced Winner';
      target.recommended = true;
      assigned.add(candidate.id);
      break;
    }
  }

  // If only one variant exists, mark it as recommended
  if (result.length === 1) {
    result[0].recommended = true;
    // If it doesn't have a nickname, give it Balanced Winner
    if (!result[0].nickname) {
      result[0].nickname = 'Balanced Winner';
    }
  }

  return result;
}

/**
 * Get the dominant dimension for a variant
 */
export function getDominantDimension(scores: ParetoScores): 'ai' | 'seo' | 'human' {
  if (scores.ai >= scores.seo && scores.ai >= scores.human) {
    return 'ai';
  }
  if (scores.seo >= scores.ai && scores.seo >= scores.human) {
    return 'seo';
  }
  return 'human';
}

/**
 * Calculate Euclidean distance between two variants in score space
 */
export function calculateDistance(a: ParetoScores, b: ParetoScores): number {
  return Math.sqrt(
    Math.pow(a.ai - b.ai, 2) +
    Math.pow(a.seo - b.seo, 2) +
    Math.pow(a.human - b.human, 2)
  );
}

/**
 * Find the closest alternative on the Pareto frontier
 */
export function findClosestAlternative<T extends ParetoScores & { id: string }>(
  variant: T,
  frontier: T[]
): T | undefined {
  const others = frontier.filter(v => v.id !== variant.id);
  if (others.length === 0) {
    return undefined;
  }

  let closest = others[0];
  let minDistance = calculateDistance(variant, closest);

  for (const other of others.slice(1)) {
    const dist = calculateDistance(variant, other);
    if (dist < minDistance) {
      minDistance = dist;
      closest = other;
    }
  }

  return closest;
}

/**
 * Rank variants by their overall quality (sum of scores)
 */
export function rankByTotalScore<T extends ParetoScores>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    const totalA = a.ai + a.seo + a.human;
    const totalB = b.ai + b.seo + b.human;
    return totalB - totalA;
  });
}

/**
 * Get summary statistics for a set of variants
 */
export function getParetoStats(variants: ParetoScores[]): {
  avgAi: number;
  avgSeo: number;
  avgHuman: number;
  maxAi: number;
  maxSeo: number;
  maxHuman: number;
  minAi: number;
  minSeo: number;
  minHuman: number;
} {
  if (variants.length === 0) {
    return {
      avgAi: 0, avgSeo: 0, avgHuman: 0,
      maxAi: 0, maxSeo: 0, maxHuman: 0,
      minAi: 0, minSeo: 0, minHuman: 0,
    };
  }

  const aiScores = variants.map(v => v.ai);
  const seoScores = variants.map(v => v.seo);
  const humanScores = variants.map(v => v.human);

  return {
    avgAi: Math.round(aiScores.reduce((a, b) => a + b, 0) / variants.length * 10) / 10,
    avgSeo: Math.round(seoScores.reduce((a, b) => a + b, 0) / variants.length * 10) / 10,
    avgHuman: Math.round(humanScores.reduce((a, b) => a + b, 0) / variants.length * 10) / 10,
    maxAi: Math.max(...aiScores),
    maxSeo: Math.max(...seoScores),
    maxHuman: Math.max(...humanScores),
    minAi: Math.min(...aiScores),
    minSeo: Math.min(...seoScores),
    minHuman: Math.min(...humanScores),
  };
}
