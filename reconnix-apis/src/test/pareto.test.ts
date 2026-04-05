// src/test/pareto.test.ts — Unit tests for Pareto frontier and explainer
import { describe, it, expect } from 'vitest';
import {
  isDominated,
  findParetoFrontier,
  assignNicknames,
  getDominantDimension,
  calculateDistance,
  findClosestAlternative,
  rankByTotalScore,
  getParetoStats,
  getDominators,
  ParetoScores,
} from '../lib/pareto';
import {
  explainTradeoff,
  explainTradeoffDetailed,
  generateComparisonSummary,
  getShortDescription,
  explainFrontierMembership,
} from '../lib/pareto-explainer';

// ============================================================================
// Pareto Domination Tests
// ============================================================================

describe('Pareto Domination', () => {
  it('correctly identifies domination (A dominates B)', () => {
    const a = { ai: 80, seo: 70, human: 60 };
    const b = { ai: 70, seo: 60, human: 50 };
    expect(isDominated(b, a)).toBe(true); // B is dominated by A
    expect(isDominated(a, b)).toBe(false);
  });

  it('returns false when neither dominates (trade-off)', () => {
    const a = { ai: 90, seo: 50, human: 60 }; // Better AI
    const b = { ai: 60, seo: 80, human: 70 }; // Better SEO + Human
    expect(isDominated(a, b)).toBe(false);
    expect(isDominated(b, a)).toBe(false);
  });

  it('handles equal scores correctly', () => {
    const a = { ai: 70, seo: 70, human: 70 };
    const b = { ai: 70, seo: 70, human: 70 };
    expect(isDominated(a, b)).toBe(false);
    expect(isDominated(b, a)).toBe(false);
  });

  it('requires ALL scores to be >= for domination', () => {
    const a = { ai: 90, seo: 90, human: 50 }; // One dimension worse
    const b = { ai: 80, seo: 80, human: 60 };
    expect(isDominated(a, b)).toBe(false); // A not dominated (higher AI/SEO)
    expect(isDominated(b, a)).toBe(false); // B not dominated (higher human)
  });

  it('requires at least one strictly greater for domination', () => {
    const a = { ai: 80, seo: 70, human: 60 };
    const b = { ai: 80, seo: 70, human: 60 }; // Equal to A
    expect(isDominated(a, b)).toBe(false); // Equal, not dominated
    expect(isDominated(b, a)).toBe(false);
  });
});

// ============================================================================
// Pareto Frontier Tests
// ============================================================================

describe('Pareto Frontier', () => {
  it('returns all non-dominated variants', () => {
    const variants = [
      { id: '1', ai: 90, seo: 50, human: 60 },
      { id: '2', ai: 60, seo: 85, human: 65 },
      { id: '3', ai: 70, seo: 70, human: 80 },
      { id: '4', ai: 50, seo: 50, human: 50 }, // Dominated by all
    ];
    const frontier = findParetoFrontier(variants);

    expect(frontier).toHaveLength(3);
    expect(frontier.map(v => v.id)).toContain('1');
    expect(frontier.map(v => v.id)).toContain('2');
    expect(frontier.map(v => v.id)).toContain('3');
    expect(frontier.map(v => v.id)).not.toContain('4');
  });

  it('returns single variant if it dominates all others', () => {
    const variants = [
      { id: '1', ai: 95, seo: 90, human: 92 }, // Dominates all
      { id: '2', ai: 60, seo: 60, human: 60 },
      { id: '3', ai: 70, seo: 70, human: 70 },
    ];
    const frontier = findParetoFrontier(variants);

    expect(frontier).toHaveLength(1);
    expect(frontier[0].id).toBe('1');
  });

  it('handles empty input', () => {
    expect(findParetoFrontier([])).toEqual([]);
  });

  it('handles single variant', () => {
    const variants = [{ id: '1', ai: 70, seo: 70, human: 70 }];
    expect(findParetoFrontier(variants)).toHaveLength(1);
  });

  it('includes all variants when none dominate', () => {
    const variants = [
      { id: '1', ai: 100, seo: 0, human: 0 },
      { id: '2', ai: 0, seo: 100, human: 0 },
      { id: '3', ai: 0, seo: 0, human: 100 },
    ];
    const frontier = findParetoFrontier(variants);
    expect(frontier).toHaveLength(3);
  });
});

// ============================================================================
// Nickname Assignment Tests
// ============================================================================

describe('Nickname Assignment', () => {
  it('assigns "AI Champion" to highest AI score', () => {
    const variants = [
      { id: '1', ai: 95, seo: 50, human: 60 },
      { id: '2', ai: 60, seo: 80, human: 70 },
    ];
    const nicknamed = assignNicknames(variants);
    const aiChamp = nicknamed.find(v => v.nickname === 'AI Champion');

    expect(aiChamp?.id).toBe('1');
  });

  it('assigns "SEO Specialist" to highest SEO score', () => {
    const variants = [
      { id: '1', ai: 95, seo: 50, human: 60 },
      { id: '2', ai: 60, seo: 90, human: 70 },
    ];
    const nicknamed = assignNicknames(variants);
    const seoSpec = nicknamed.find(v => v.nickname === 'SEO Specialist');

    expect(seoSpec?.id).toBe('2');
  });

  it('assigns "Human Touch" to highest human score', () => {
    const variants = [
      { id: '1', ai: 70, seo: 65, human: 95 },
      { id: '2', ai: 80, seo: 70, human: 60 },
      { id: '3', ai: 60, seo: 80, human: 70 },
    ];
    const nicknamed = assignNicknames(variants);
    const humanTouch = nicknamed.find(v => v.nickname === 'Human Touch');

    expect(humanTouch?.id).toBe('1');
  });

  it('marks "Balanced Winner" with RECOMMENDED tag', () => {
    const variants = [
      { id: '1', ai: 90, seo: 50, human: 50 }, // Unbalanced
      { id: '2', ai: 75, seo: 78, human: 77 }, // Most balanced
      { id: '3', ai: 50, seo: 90, human: 50 }, // Unbalanced
      { id: '4', ai: 50, seo: 50, human: 90 }, // Unbalanced
    ];
    const nicknamed = assignNicknames(variants);
    const balanced = nicknamed.find(v => v.nickname === 'Balanced Winner');

    expect(balanced?.id).toBe('2');
    expect(balanced?.recommended).toBe(true);
  });

  it('handles ties by using variant order', () => {
    const variants = [
      { id: '1', ai: 80, seo: 80, human: 80 },
      { id: '2', ai: 80, seo: 80, human: 80 }, // Same scores
    ];
    const nicknamed = assignNicknames(variants);

    // At least one should have a nickname
    const withNicknames = nicknamed.filter(v => v.nickname);
    expect(withNicknames.length).toBeGreaterThan(0);
  });

  it('handles empty array', () => {
    expect(assignNicknames([])).toEqual([]);
  });

  it('assigns nickname to single variant', () => {
    const variants = [{ id: '1', ai: 75, seo: 75, human: 75 }];
    const nicknamed = assignNicknames(variants);

    expect(nicknamed[0].nickname).toBeDefined();
    expect(nicknamed[0].recommended).toBe(true);
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Dominant Dimension', () => {
  it('returns ai when AI is highest', () => {
    expect(getDominantDimension({ ai: 90, seo: 50, human: 60 })).toBe('ai');
  });

  it('returns seo when SEO is highest', () => {
    expect(getDominantDimension({ ai: 50, seo: 90, human: 60 })).toBe('seo');
  });

  it('returns human when Human is highest', () => {
    expect(getDominantDimension({ ai: 50, seo: 60, human: 90 })).toBe('human');
  });

  it('handles ties (returns first in order)', () => {
    const result = getDominantDimension({ ai: 80, seo: 80, human: 80 });
    expect(['ai', 'seo', 'human']).toContain(result);
  });
});

describe('Distance Calculation', () => {
  it('calculates Euclidean distance', () => {
    const a = { ai: 0, seo: 0, human: 0 };
    const b = { ai: 30, seo: 40, human: 0 };
    // sqrt(30^2 + 40^2) = sqrt(900 + 1600) = sqrt(2500) = 50
    expect(calculateDistance(a, b)).toBe(50);
  });

  it('returns 0 for identical variants', () => {
    const a = { ai: 70, seo: 70, human: 70 };
    expect(calculateDistance(a, a)).toBe(0);
  });
});

describe('Find Closest Alternative', () => {
  it('finds the variant with minimum distance', () => {
    const variant = { id: '1', ai: 80, seo: 80, human: 80 };
    const frontier = [
      { id: '1', ai: 80, seo: 80, human: 80 },
      { id: '2', ai: 79, seo: 79, human: 79 }, // Closest
      { id: '3', ai: 50, seo: 50, human: 50 }, // Far
    ];
    const closest = findClosestAlternative(variant, frontier);
    expect(closest?.id).toBe('2');
  });

  it('returns undefined for empty frontier', () => {
    const variant = { id: '1', ai: 80, seo: 80, human: 80 };
    expect(findClosestAlternative(variant, [])).toBeUndefined();
  });

  it('returns undefined when only the variant itself is in frontier', () => {
    const variant = { id: '1', ai: 80, seo: 80, human: 80 };
    const frontier = [{ id: '1', ai: 80, seo: 80, human: 80 }];
    expect(findClosestAlternative(variant, frontier)).toBeUndefined();
  });
});

describe('Rank By Total Score', () => {
  it('ranks variants by sum of scores', () => {
    const variants = [
      { id: '1', ai: 50, seo: 50, human: 50 }, // Total: 150
      { id: '2', ai: 80, seo: 80, human: 80 }, // Total: 240
      { id: '3', ai: 60, seo: 70, human: 65 }, // Total: 195
    ];
    const ranked = rankByTotalScore(variants);

    expect(ranked[0].id).toBe('2'); // Highest total
    expect(ranked[1].id).toBe('3');
    expect(ranked[2].id).toBe('1'); // Lowest total
  });
});

describe('Pareto Stats', () => {
  it('calculates correct statistics', () => {
    const variants = [
      { ai: 60, seo: 50, human: 70 },
      { ai: 80, seo: 90, human: 60 },
      { ai: 70, seo: 70, human: 80 },
    ];
    const stats = getParetoStats(variants);

    expect(stats.avgAi).toBe(70); // (60+80+70)/3
    expect(stats.maxAi).toBe(80);
    expect(stats.minAi).toBe(60);
    expect(stats.maxSeo).toBe(90);
    expect(stats.minHuman).toBe(60);
  });

  it('handles empty array', () => {
    const stats = getParetoStats([]);
    expect(stats.avgAi).toBe(0);
    expect(stats.maxAi).toBe(0);
  });
});

describe('Get Dominators', () => {
  it('finds all variants that dominate the given variant', () => {
    const weak = { id: '1', ai: 50, seo: 50, human: 50 };
    const allVariants = [
      { id: '1', ai: 50, seo: 50, human: 50 },
      { id: '2', ai: 60, seo: 60, human: 60 }, // Dominates weak
      { id: '3', ai: 70, seo: 70, human: 70 }, // Dominates weak
      { id: '4', ai: 90, seo: 40, human: 40 }, // Does not dominate (lower SEO/human)
    ];
    const dominators = getDominators(weak, allVariants);

    expect(dominators.map(d => d.id)).toContain('2');
    expect(dominators.map(d => d.id)).toContain('3');
    expect(dominators.map(d => d.id)).not.toContain('4');
  });
});

// ============================================================================
// Trade-off Explainer Tests
// ============================================================================

describe('Trade-off Explainer', () => {
  it('generates plain-English explanation', () => {
    const variant = { id: '1', ai: 90, seo: 50, human: 60, nickname: 'AI Champion' as const };
    const alternatives = [{ id: '2', ai: 60, seo: 85, human: 70, nickname: 'SEO Specialist' as const }];
    const baseline = { ai: 50, seo: 50, human: 50 };

    const explanation = explainTradeoff(variant, alternatives, baseline);

    expect(explanation).toContain('AI');
    expect(typeof explanation).toBe('string');
    expect(explanation.length).toBeGreaterThan(20);
  });

  it('explains what you gain vs what you trade away', () => {
    const variant = { id: '1', ai: 95, seo: 40, human: 60 };
    const alternatives = [{ id: '2', ai: 60, seo: 90, human: 70 }];
    const explanation = explainTradeoff(variant, alternatives, {});

    expect(explanation.toLowerCase()).toMatch(/trade|seo/);
  });

  it('shows improvement over baseline', () => {
    const variant = { id: '1', ai: 80, seo: 70, human: 75 };
    const baseline = { ai: 50, seo: 50, human: 50 };
    const explanation = explainTradeoff(variant, [], baseline);

    expect(explanation).toMatch(/\+30|\+20|\+25|baseline/i);
  });

  it('handles variant with no nickname', () => {
    const variant = { id: '1', ai: 70, seo: 70, human: 70 };
    const explanation = explainTradeoff(variant, [], {});

    expect(explanation.length).toBeGreaterThan(10);
  });
});

describe('Detailed Trade-off Explanation', () => {
  it('returns structured explanation', () => {
    const variant = { id: '1', ai: 85, seo: 75, human: 80, nickname: 'Balanced Winner' as const, recommended: true };
    const alternatives = [{ id: '2', ai: 95, seo: 60, human: 65, nickname: 'AI Champion' as const }];
    const baseline = { ai: 50, seo: 50, human: 50 };

    const result = explainTradeoffDetailed(variant, alternatives, baseline);

    expect(result.summary).toBeDefined();
    expect(result.strengths).toBeDefined();
    expect(result.tradeoffs).toBeDefined();
    expect(result.vsBaseline).toBeDefined();
    expect(result.recommendation).toBeDefined();
  });

  it('identifies strengths correctly', () => {
    const variant = { id: '1', ai: 90, seo: 85, human: 82 };
    const result = explainTradeoffDetailed(variant, [], {});

    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.strengths.some(s => s.includes('AI') || s.includes('SEO') || s.includes('human'))).toBe(true);
  });

  it('identifies trade-offs compared to alternatives', () => {
    const variant = { id: '1', ai: 70, seo: 70, human: 70 };
    const alternatives = [{ id: '2', ai: 95, seo: 95, human: 95 }];
    const result = explainTradeoffDetailed(variant, alternatives, {});

    expect(result.tradeoffs.length).toBeGreaterThan(0);
  });

  it('includes recommendation for recommended variant', () => {
    const variant = { id: '1', ai: 75, seo: 75, human: 75, nickname: 'Balanced Winner' as const, recommended: true };
    const result = explainTradeoffDetailed(variant, [], {});

    expect(result.recommendation).toContain('RECOMMENDED');
  });
});

describe('Comparison Summary', () => {
  it('generates text summary of all variants', () => {
    const variants = [
      { id: '1', ai: 90, seo: 60, human: 70, nickname: 'AI Champion' as const },
      { id: '2', ai: 70, seo: 85, human: 75, nickname: 'SEO Specialist' as const },
    ];
    const baseline = { ai: 50, seo: 50, human: 50 };

    const summary = generateComparisonSummary(variants, baseline);

    expect(summary).toContain('AI Champion');
    expect(summary).toContain('SEO Specialist');
    expect(summary).toContain('AI');
    expect(summary).toContain('SEO');
    expect(summary).toContain('Human');
  });

  it('includes baseline deltas when provided', () => {
    const variants = [{ id: '1', ai: 80, seo: 70, human: 75 }];
    const baseline = { ai: 50, seo: 50, human: 50 };

    const summary = generateComparisonSummary(variants, baseline);

    expect(summary).toContain('+30');
    expect(summary).toContain('+20');
    expect(summary).toContain('+25');
  });
});

describe('Short Description', () => {
  it('returns short description for AI Champion', () => {
    const variant = { id: '1', ai: 95, seo: 60, human: 70, nickname: 'AI Champion' as const };
    const desc = getShortDescription(variant);

    expect(desc).toContain('AI');
    expect(desc).toContain('95');
  });

  it('returns short description for variant without nickname', () => {
    const variant = { id: '1', ai: 80, seo: 70, human: 75 };
    const desc = getShortDescription(variant);

    expect(desc).toContain('Total');
    expect(desc).toContain('225'); // 80+70+75
  });
});

describe('Frontier Membership Explanation', () => {
  it('explains why variant is on frontier for max scores', () => {
    const variant = { id: '1', ai: 95, seo: 60, human: 70 };
    const frontier = [
      { id: '1', ai: 95, seo: 60, human: 70 },
      { id: '2', ai: 60, seo: 90, human: 65 },
    ];

    const explanation = explainFrontierMembership(variant, frontier);

    expect(explanation).toContain('AI');
    expect(explanation).toContain('highest');
  });

  it('explains trade-off for non-max variants', () => {
    const variant = { id: '1', ai: 75, seo: 75, human: 75 };
    const frontier = [
      { id: '1', ai: 75, seo: 75, human: 75 },
      { id: '2', ai: 90, seo: 60, human: 80 },  // Max AI and Human
      { id: '3', ai: 60, seo: 90, human: 70 },  // Max SEO
    ];

    const explanation = explainFrontierMembership(variant, frontier);

    expect(explanation.toLowerCase()).toContain('frontier');
    expect(explanation.toLowerCase()).toMatch(/better|dimension|simultaneously|no other/);
  });
});
