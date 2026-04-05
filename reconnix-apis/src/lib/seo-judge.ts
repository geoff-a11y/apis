// src/lib/seo-judge.ts — Rule-based SEO scoring for Page Optimizer V3
// NO LLM calls - all calculations are deterministic and fast

/**
 * SEO Score result types
 */
export interface TitleSEOScore {
  score: number;        // 0-12 points
  lengthScore: number;  // 0-6 points
  keywordScore: number; // 0-6 points
  hardFail: boolean;
  issues: string[];
}

export interface DescSEOScore {
  score: number;        // 0-10 points
  lengthScore: number;  // 0-5 points
  keywordScore: number; // 0-3 points
  ctaScore: number;     // 0-2 points
  hardFail: boolean;
  issues: string[];
}

export interface SchemaSEOScore {
  score: number;        // 0-8 points
  hasSchema: boolean;
  hasRequiredProps: boolean;
  issues: string[];
}

export interface ReadabilityScore {
  score: number;        // 0-12 points
  gradeLevel: number;   // Flesch-Kincaid grade level
  sentenceCount: number;
  avgWordsPerSentence: number;
  issues: string[];
}

export interface ScannabilityScore {
  score: number;        // 0-8 points
  hasBullets: boolean;
  hasHeaders: boolean;
  hasShortParagraphs: boolean;
  issues: string[];
}

export interface KeywordScore {
  score: number;        // 0-10 points
  density: number;      // keyword density as decimal
  count: number;        // keyword occurrences
  hardFail: boolean;
  issues: string[];
}

export interface StructureScore {
  score: number;        // 0-10 points
  hasH1: boolean;
  hasHeadingHierarchy: boolean;
  issues: string[];
}

export interface TechnicalScore {
  score: number;        // 0-30 points
  mobileEstimate: number;
  uniquenessEstimate: number;
  pageSpeedImpact: number;
  issues: string[];
}

export interface SEOScore {
  total: number;        // 0-100
  breakdown: {
    title: TitleSEOScore;
    description: DescSEOScore;
    schema: SchemaSEOScore;
    readability: ReadabilityScore;
    scannability: ScannabilityScore;
    keyword: KeywordScore;
    structure: StructureScore;
    technical: TechnicalScore;
  };
  hardFails: string[];
  softFails: string[];
  issues: string[];
}

export interface VariantContent {
  title?: string;
  description?: string;
  features?: string[];
  content?: string;
  schema?: Record<string, unknown>;
  headings?: Array<{ level: number; text: string }>;
}

// CTA verbs that indicate action-oriented copy
const CTA_VERBS = [
  'buy', 'shop', 'order', 'get', 'try', 'start', 'discover',
  'save', 'learn', 'explore', 'join', 'sign up', 'subscribe',
  'download', 'claim', 'unlock', 'request', 'book', 'reserve'
];

/**
 * Score title for SEO optimization
 * Total: 12 points (length: 6, keyword: 6)
 */
export function scoreTitleSEO(title: string, keyword: string): TitleSEOScore {
  const issues: string[] = [];
  let lengthScore = 0;
  let keywordScore = 0;
  let hardFail = false;

  const titleLen = title.length;

  // Length scoring (0-6 points)
  if (titleLen >= 50 && titleLen <= 60) {
    lengthScore = 6; // Optimal
  } else if (titleLen >= 40 && titleLen <= 70) {
    lengthScore = 4; // Good
  } else if (titleLen >= 30 && titleLen <= 80) {
    lengthScore = 2; // Acceptable
    issues.push(`Title length (${titleLen}) not optimal. Aim for 50-60 characters.`);
  } else if (titleLen > 80) {
    lengthScore = 0;
    hardFail = true;
    issues.push(`Title too long (${titleLen} chars). Max 80 characters.`);
  } else if (titleLen < 30) {
    lengthScore = 1;
    issues.push(`Title too short (${titleLen} chars). Aim for 50-60 characters.`);
  }

  // Keyword scoring (0-6 points)
  const lowerTitle = title.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const keywordIndex = lowerTitle.indexOf(lowerKeyword);

  if (keywordIndex === -1) {
    keywordScore = 0;
    issues.push(`Target keyword "${keyword}" not found in title.`);
  } else {
    // Base points for having keyword
    keywordScore = 2;

    // Bonus for keyword in first half
    const midpoint = title.length / 2;
    if (keywordIndex < midpoint) {
      keywordScore += 2;
    } else {
      issues.push(`Keyword "${keyword}" should appear in first half of title.`);
    }

    // Bonus for keyword at start
    if (keywordIndex === 0 || keywordIndex <= 5) {
      keywordScore += 2;
    }
  }

  return {
    score: lengthScore + keywordScore,
    lengthScore,
    keywordScore,
    hardFail,
    issues,
  };
}

/**
 * Score meta description for SEO
 * Total: 10 points (length: 5, keyword: 3, CTA: 2)
 */
export function scoreDescriptionSEO(desc: string, keyword: string): DescSEOScore {
  const issues: string[] = [];
  let lengthScore = 0;
  let keywordScore = 0;
  let ctaScore = 0;
  let hardFail = false;

  const descLen = desc.length;

  // Length scoring (0-5 points)
  if (descLen >= 150 && descLen <= 160) {
    lengthScore = 5; // Optimal
  } else if (descLen >= 130 && descLen <= 170) {
    lengthScore = 4; // Good
  } else if (descLen >= 100 && descLen <= 200) {
    lengthScore = 2; // Acceptable
    issues.push(`Description length (${descLen}) not optimal. Aim for 150-160 characters.`);
  } else if (descLen > 200) {
    lengthScore = 1;
    hardFail = false; // Soft fail, not hard
    issues.push(`Description may be truncated in search results (${descLen} chars). Risk of truncation.`);
  } else if (descLen < 100) {
    lengthScore = 1;
    issues.push(`Description too short (${descLen} chars). Aim for 150-160 characters.`);
  }

  // Keyword scoring (0-3 points)
  const lowerDesc = desc.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  if (lowerDesc.includes(lowerKeyword)) {
    keywordScore = 3;
  } else {
    issues.push(`Target keyword "${keyword}" not found in description.`);
  }

  // CTA scoring (0-2 points)
  const hasCtaVerb = CTA_VERBS.some(verb => lowerDesc.includes(verb));
  if (hasCtaVerb) {
    ctaScore = 2;
  } else {
    issues.push('No clear call-to-action verb found in description.');
  }

  return {
    score: lengthScore + keywordScore + ctaScore,
    lengthScore,
    keywordScore,
    ctaScore,
    hardFail,
    issues,
  };
}

/**
 * Score Schema.org markup
 * Total: 8 points
 */
export function scoreSchemaSEO(schema: Record<string, unknown> | undefined): SchemaSEOScore {
  const issues: string[] = [];
  let score = 0;

  if (!schema || Object.keys(schema).length === 0) {
    return {
      score: 0,
      hasSchema: false,
      hasRequiredProps: false,
      issues: ['No Schema.org markup detected. Consider adding Product or Organization schema.'],
    };
  }

  // Has schema: 4 points base
  score = 4;
  const hasSchema = true;

  // Check for required properties
  const requiredProps = ['@type', 'name'];
  const hasRequiredProps = requiredProps.every(prop => prop in schema);

  if (hasRequiredProps) {
    score += 2;
  } else {
    issues.push('Schema missing required properties (@type, name).');
  }

  // Bonus for extended properties
  const extendedProps = ['description', 'image', 'offers', 'aggregateRating', 'review'];
  const extendedCount = extendedProps.filter(prop => prop in schema).length;
  if (extendedCount >= 2) {
    score += 2;
  } else if (extendedCount >= 1) {
    score += 1;
    issues.push('Schema could be enhanced with more properties (offers, rating, reviews).');
  } else {
    issues.push('Schema missing valuable properties (description, offers, rating).');
  }

  return {
    score,
    hasSchema,
    hasRequiredProps,
    issues,
  };
}

/**
 * Calculate Flesch-Kincaid Grade Level
 */
function calculateFleschKincaid(text: string): { gradeLevel: number; sentenceCount: number; avgWordsPerSentence: number } {
  // Count sentences (rough approximation)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  // Count words
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = Math.max(words.length, 1);

  // Count syllables (approximation)
  const syllableCount = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  // Flesch-Kincaid Grade Level formula
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  return {
    gradeLevel: Math.max(0, Math.round(gradeLevel * 10) / 10),
    sentenceCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
  };
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  // Common patterns
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Score text readability
 * Total: 12 points
 */
export function scoreReadability(text: string): ReadabilityScore {
  const issues: string[] = [];
  const { gradeLevel, sentenceCount, avgWordsPerSentence } = calculateFleschKincaid(text);

  let score = 0;

  // Grade level 6-8 is optimal for web content
  if (gradeLevel >= 6 && gradeLevel <= 8) {
    score = 12;
  } else if (gradeLevel >= 5 && gradeLevel <= 9) {
    score = 9;
    issues.push(`Reading level (grade ${gradeLevel}) could be simpler. Aim for grade 6-8.`);
  } else if (gradeLevel >= 4 && gradeLevel <= 10) {
    score = 6;
    issues.push(`Reading level (grade ${gradeLevel}) may be difficult for some users. Simplify language.`);
  } else if (gradeLevel > 12) {
    score = 2;
    issues.push(`Reading level too high (grade ${gradeLevel}). Content may lose readers.`);
  } else if (gradeLevel > 10) {
    score = 4;
    issues.push(`Reading level (grade ${gradeLevel}) is challenging. Consider simplifying.`);
  } else {
    score = 8; // Very simple, which might be fine
    issues.push(`Reading level very low (grade ${gradeLevel}). May lack substance.`);
  }

  // Additional penalty for very long sentences
  if (avgWordsPerSentence > 25) {
    score = Math.max(0, score - 3);
    issues.push(`Average sentence length (${avgWordsPerSentence} words) is too long. Keep under 20.`);
  }

  return {
    score,
    gradeLevel,
    sentenceCount,
    avgWordsPerSentence,
    issues,
  };
}

/**
 * Score content scannability
 * Total: 8 points
 */
export function scoreScannability(text: string, features: string[]): ScannabilityScore {
  const issues: string[] = [];
  let score = 0;

  // Check for bullet points / list items (in features)
  const hasBullets = features && features.length >= 3;
  if (hasBullets) {
    score += 3;
  } else {
    issues.push('Add more bullet points or list items for better scannability.');
  }

  // Check for short paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / Math.max(paragraphs.length, 1);
  const hasShortParagraphs = avgParagraphLength <= 50;
  if (hasShortParagraphs) {
    score += 3;
  } else {
    issues.push('Break up long paragraphs for better readability.');
  }

  // Check for headers (simple heuristic - presence of features or structured content)
  const hasHeaders = features && features.length > 0;
  if (hasHeaders) {
    score += 2;
  } else {
    issues.push('Add section headers or feature highlights.');
  }

  return {
    score,
    hasBullets,
    hasHeaders,
    hasShortParagraphs,
    issues,
  };
}

/**
 * Score keyword density
 * Total: 10 points
 */
export function scoreKeywordDensity(text: string, keyword: string): KeywordScore {
  const issues: string[] = [];
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Count keyword occurrences
  const lowerKeyword = keyword.toLowerCase();
  const keywordWords = lowerKeyword.split(/\s+/);
  let count = 0;

  if (keywordWords.length === 1) {
    // Single word keyword
    count = words.filter(w => w.includes(lowerKeyword)).length;
  } else {
    // Multi-word keyword (phrase)
    const lowerText = text.toLowerCase();
    let pos = 0;
    while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
      count++;
      pos += lowerKeyword.length;
    }
  }

  // Calculate density
  const density = wordCount > 0 ? count / wordCount : 0;

  let score = 0;
  let hardFail = false;

  // Optimal density: 1-2%
  if (density >= 0.01 && density <= 0.02) {
    score = 10;
  } else if (density >= 0.005 && density <= 0.025) {
    score = 7;
    issues.push(`Keyword density (${(density * 100).toFixed(1)}%) slightly off optimal range. Aim for 1-2%.`);
  } else if (density > 0.03) {
    score = 0;
    hardFail = true;
    issues.push(`Keyword stuffing detected (${(density * 100).toFixed(1)}% density). Max 3%.`);
  } else if (density > 0.025) {
    score = 3;
    issues.push(`Keyword density (${(density * 100).toFixed(1)}%) too high. Risk of being flagged as spam.`);
  } else if (density > 0) {
    score = 4;
    issues.push(`Keyword density (${(density * 100).toFixed(1)}%) too low. Consider adding more keyword mentions.`);
  } else {
    score = 0;
    issues.push(`Target keyword "${keyword}" not found in content.`);
  }

  return {
    score,
    density,
    count,
    hardFail,
    issues,
  };
}

/**
 * Score content structure (H1, heading hierarchy)
 * Total: 10 points
 */
export function scoreStructure(headings?: Array<{ level: number; text: string }>): StructureScore {
  const issues: string[] = [];
  let score = 0;

  if (!headings || headings.length === 0) {
    return {
      score: 3, // Minimal score - can't assess without headings
      hasH1: false,
      hasHeadingHierarchy: false,
      issues: ['No heading structure detected. Add H1 and subheadings.'],
    };
  }

  // Check for H1
  const hasH1 = headings.some(h => h.level === 1);
  if (hasH1) {
    score += 5;
  } else {
    issues.push('Missing H1 tag. Every page should have exactly one H1.');
  }

  // Check for hierarchy (H1 -> H2 -> H3 etc.)
  const levels = headings.map(h => h.level).sort((a, b) => a - b);
  const uniqueLevels = [...new Set(levels)];

  // Good hierarchy has at least H1 + H2
  const hasHeadingHierarchy = uniqueLevels.length >= 2 && uniqueLevels.includes(1) && uniqueLevels.includes(2);
  if (hasHeadingHierarchy) {
    score += 3;
  } else {
    issues.push('Heading hierarchy incomplete. Use H1, H2, H3 in logical order.');
  }

  // Check for multiple H1s (bad practice)
  const h1Count = headings.filter(h => h.level === 1).length;
  if (h1Count > 1) {
    score -= 2;
    issues.push(`Multiple H1 tags detected (${h1Count}). Use only one H1 per page.`);
  }

  // Bonus for well-structured content
  if (uniqueLevels.length >= 3 && hasH1 && hasHeadingHierarchy) {
    score += 2;
  }

  return {
    score: Math.max(0, Math.min(10, score)),
    hasH1,
    hasHeadingHierarchy,
    issues,
  };
}

/**
 * Score technical SEO factors (estimated without actual page load)
 * Total: 30 points
 */
export function scoreTechnical(variant: VariantContent): TechnicalScore {
  const issues: string[] = [];

  // These are estimates based on content analysis
  // Real scores would require actual page testing

  let mobileEstimate = 10; // Assume responsive by default
  let uniquenessEstimate = 10;
  let pageSpeedImpact = 10;

  // Content length affects page speed
  const totalContent = [
    variant.title || '',
    variant.description || '',
    ...(variant.features || []),
    variant.content || '',
  ].join(' ');

  const wordCount = totalContent.split(/\s+/).length;

  // Very long content might slow page
  if (wordCount > 2000) {
    pageSpeedImpact -= 3;
    issues.push('Very long content may impact page load time.');
  }

  // Check for uniqueness signals (very rough heuristic)
  const hasUniqueFeatures = variant.features && variant.features.length >= 5;
  if (!hasUniqueFeatures) {
    uniquenessEstimate -= 2;
    issues.push('Add more unique content to differentiate from competitors.');
  }

  // Schema helps with rich snippets (mobile-friendly)
  if (variant.schema && Object.keys(variant.schema).length > 0) {
    mobileEstimate = Math.min(10, mobileEstimate + 1);
  }

  const score = mobileEstimate + uniquenessEstimate + pageSpeedImpact;

  return {
    score,
    mobileEstimate,
    uniquenessEstimate,
    pageSpeedImpact,
    issues,
  };
}

/**
 * Calculate complete SEO score for a variant
 * Total: 100 points
 */
export function calculateSEOScore(variant: VariantContent, keyword: string): SEOScore {
  // Combine all content for text-based analysis
  const allContent = [
    variant.title || '',
    variant.description || '',
    ...(variant.features || []),
    variant.content || '',
  ].join(' ');

  // Score each component
  const title = scoreTitleSEO(variant.title || '', keyword);
  const description = scoreDescriptionSEO(variant.description || '', keyword);
  const schema = scoreSchemaSEO(variant.schema);
  const readability = scoreReadability(allContent);
  const scannability = scoreScannability(allContent, variant.features || []);
  const keywordResult = scoreKeywordDensity(allContent, keyword);
  const structure = scoreStructure(variant.headings);
  const technical = scoreTechnical(variant);

  // Collect hard and soft fails
  const hardFails: string[] = [];
  const softFails: string[] = [];

  if (title.hardFail) hardFails.push('title_too_long');
  if (keywordResult.hardFail) hardFails.push('keyword_stuffing');

  // Collect all issues
  const allIssues = [
    ...title.issues,
    ...description.issues,
    ...schema.issues,
    ...readability.issues,
    ...scannability.issues,
    ...keywordResult.issues,
    ...structure.issues,
    ...technical.issues,
  ];

  // Soft fails from specific conditions
  if (description.lengthScore < 3) softFails.push('description_short');
  if (!schema.hasSchema) softFails.push('missing_schema');
  if (!structure.hasH1) softFails.push('no_h1');
  if (readability.gradeLevel > 10) softFails.push('readability_difficult');

  // Calculate total (sum of all component scores)
  const total = Math.min(100, Math.max(0,
    title.score +         // 12 points
    description.score +   // 10 points
    schema.score +        // 8 points
    readability.score +   // 12 points
    scannability.score +  // 8 points
    keywordResult.score + // 10 points
    structure.score +     // 10 points
    technical.score       // 30 points
  ));

  return {
    total,
    breakdown: {
      title,
      description,
      schema,
      readability,
      scannability,
      keyword: keywordResult,
      structure,
      technical,
    },
    hardFails,
    softFails,
    issues: allIssues,
  };
}
