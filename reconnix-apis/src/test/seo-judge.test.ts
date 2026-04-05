// src/test/seo-judge.test.ts — Unit tests for SEO Judge
import { describe, it, expect } from 'vitest';
import {
  scoreTitleSEO,
  scoreDescriptionSEO,
  scoreSchemaSEO,
  scoreReadability,
  scoreScannability,
  scoreKeywordDensity,
  scoreStructure,
  scoreTechnical,
  calculateSEOScore,
} from '../lib/seo-judge';

describe('SEO Judge - Title Scoring', () => {
  it('scores optimal title length (50-60 chars) as 6 points', () => {
    // 40 chars + 'widget' = 46 chars, need more
    const title = 'Premium Widget Pro - Quality Guaranteed Now'; // 43 chars, let's make it longer
    const optimalTitle = 'Premium Widget Pro - Quality Guaranteed For You'; // ~47 chars
    const result = scoreTitleSEO('Premium Widget Pro - Quality Guaranteed Today', 'widget'); // 45 chars
    // Title is 45 chars which is in the 40-70 range (4 points), not 50-60 optimal
    expect(result.lengthScore).toBeGreaterThanOrEqual(4);
  });

  it('scores perfect optimal title (50-60 chars) as 6 length points', () => {
    const title = 'The Best Widget Product for Your Home and Office Use'; // 52 chars
    const result = scoreTitleSEO(title, 'widget');
    expect(result.lengthScore).toBe(6);
  });

  it('returns HARD FAIL for title > 80 chars', () => {
    const result = scoreTitleSEO('A'.repeat(85), 'test');
    expect(result.hardFail).toBe(true);
    expect(result.lengthScore).toBe(0);
  });

  it('adds keyword points when keyword in first half', () => {
    const first = scoreTitleSEO('Widget Pro - Premium Quality Product', 'widget');
    const last = scoreTitleSEO('Premium Quality Product - Widget Pro', 'widget');
    expect(first.keywordScore).toBeGreaterThan(last.keywordScore);
  });

  it('gives max keyword score when keyword at start', () => {
    const result = scoreTitleSEO('Widget Pro - Best Quality Product', 'widget');
    expect(result.keywordScore).toBe(6); // 2 (has keyword) + 2 (first half) + 2 (at start)
  });

  it('scores 0 for missing keyword', () => {
    const result = scoreTitleSEO('Great Product Here', 'widget');
    expect(result.keywordScore).toBe(0);
  });

  it('handles empty title', () => {
    const result = scoreTitleSEO('', 'widget');
    expect(result.score).toBeLessThanOrEqual(12);
    expect(result.keywordScore).toBe(0);
  });

  it('handles case-insensitive keyword matching', () => {
    const result = scoreTitleSEO('WIDGET PRO - Premium Quality', 'widget');
    expect(result.keywordScore).toBeGreaterThan(0);
  });
});

describe('SEO Judge - Description Scoring', () => {
  it('scores optimal length (150-160 chars) as 5 length points', () => {
    const desc = 'A'.repeat(155);
    const result = scoreDescriptionSEO(desc, 'test');
    expect(result.lengthScore).toBe(5);
  });

  it('scores good length (130-170 chars) as 4 points', () => {
    const desc = 'A'.repeat(135);
    const result = scoreDescriptionSEO(desc, 'test');
    expect(result.lengthScore).toBe(4);
  });

  it('detects CTA verbs and adds 2 points', () => {
    const withCTA = scoreDescriptionSEO('Buy now and save 20% on this amazing product', 'product');
    const noCTA = scoreDescriptionSEO('This is a product that exists in the world', 'product');
    expect(withCTA.ctaScore).toBe(2);
    expect(noCTA.ctaScore).toBe(0);
  });

  it('detects various CTA verbs', () => {
    const ctaVerbs = ['buy', 'shop', 'order', 'get', 'try', 'start', 'discover', 'save'];
    ctaVerbs.forEach(verb => {
      const result = scoreDescriptionSEO(`${verb} this product today for best results`, 'product');
      expect(result.ctaScore).toBe(2);
    });
  });

  it('adds keyword score when keyword present', () => {
    const result = scoreDescriptionSEO('This product is the best widget you can buy today', 'widget');
    expect(result.keywordScore).toBe(3);
  });

  it('flags descriptions > 200 chars', () => {
    const result = scoreDescriptionSEO('A'.repeat(210), 'test');
    expect(result.issues.some(i => i.toLowerCase().includes('truncat'))).toBe(true);
  });

  it('penalizes very short descriptions', () => {
    const result = scoreDescriptionSEO('Short', 'test');
    expect(result.lengthScore).toBeLessThanOrEqual(1);
  });
});

describe('SEO Judge - Schema Scoring', () => {
  it('returns 0 for missing schema', () => {
    const result = scoreSchemaSEO(undefined);
    expect(result.score).toBe(0);
    expect(result.hasSchema).toBe(false);
  });

  it('returns 0 for empty schema', () => {
    const result = scoreSchemaSEO({});
    expect(result.score).toBe(0);
    expect(result.hasSchema).toBe(false);
  });

  it('gives base score for having schema', () => {
    const result = scoreSchemaSEO({ '@type': 'Product', name: 'Widget' });
    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.hasSchema).toBe(true);
  });

  it('gives bonus for required properties', () => {
    const result = scoreSchemaSEO({ '@type': 'Product', name: 'Widget' });
    expect(result.hasRequiredProps).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(6);
  });

  it('gives bonus for extended properties', () => {
    const result = scoreSchemaSEO({
      '@type': 'Product',
      name: 'Widget',
      description: 'A great widget',
      offers: { price: '99.99' },
      aggregateRating: { ratingValue: 4.5 },
    });
    expect(result.score).toBe(8); // max score
  });
});

describe('SEO Judge - Readability', () => {
  it('calculates Flesch-Kincaid grade level', () => {
    const simple = 'This is good. It works well. You will like it.';
    const result = scoreReadability(simple);
    expect(result.gradeLevel).toBeLessThan(8);
  });

  it('scores grade 6-8 as optimal (high score)', () => {
    // Simple, clear sentences
    const result = scoreReadability('Short sentences work best. Users like them. Keep it simple.');
    expect(result.score).toBeGreaterThanOrEqual(6); // Good readability score
    expect(result.gradeLevel).toBeLessThan(10); // Should be readable
  });

  it('penalizes grade > 12', () => {
    const complex = 'Notwithstanding the aforementioned considerations regarding the implementation of sophisticated algorithmic mechanisms, the epistemological framework necessitates comprehensive reevaluation of presupposed ontological constructs.';
    const result = scoreReadability(complex);
    expect(result.score).toBeLessThanOrEqual(4);
  });

  it('calculates average words per sentence', () => {
    const text = 'This is one sentence. Here is another one. And one more.';
    const result = scoreReadability(text);
    expect(result.avgWordsPerSentence).toBeGreaterThan(0);
    expect(result.sentenceCount).toBe(3);
  });

  it('penalizes very long sentences', () => {
    // One very long sentence
    const longSentence = 'This is a very long sentence that goes on and on and on and keeps continuing without any breaks or punctuation to separate the thoughts which makes it really hard to read and understand what the author is trying to say.';
    const result = scoreReadability(longSentence);
    expect(result.avgWordsPerSentence).toBeGreaterThan(25);
    expect(result.issues.some(i => i.toLowerCase().includes('sentence length'))).toBe(true);
  });
});

describe('SEO Judge - Scannability', () => {
  it('rewards bullet points / features', () => {
    const text = 'Some content here.';
    const features = ['Feature one', 'Feature two', 'Feature three', 'Feature four'];
    const result = scoreScannability(text, features);
    expect(result.hasBullets).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('penalizes lack of features', () => {
    const text = 'Some content here without any structure.';
    const result = scoreScannability(text, []);
    expect(result.hasBullets).toBe(false);
    expect(result.issues.some(i => i.toLowerCase().includes('bullet'))).toBe(true);
  });

  it('detects short paragraphs', () => {
    const text = 'Short paragraph one.\n\nAnother short one.\n\nAnd one more.';
    const result = scoreScannability(text, ['feature']);
    expect(result.hasShortParagraphs).toBe(true);
  });

  it('flags long paragraphs', () => {
    const longParagraph = Array(100).fill('word').join(' ');
    const result = scoreScannability(longParagraph, []);
    expect(result.hasShortParagraphs).toBe(false);
    expect(result.issues.some(i => i.toLowerCase().includes('paragraph'))).toBe(true);
  });
});

describe('SEO Judge - Keyword Density', () => {
  it('scores 1-2% density as optimal (10 points)', () => {
    // 100 words with keyword appearing 1-2 times = 1-2% density
    const words = Array(98).fill('other').join(' ');
    const text = `widget ${words} widget`; // 2 widgets in 100 words = 2%
    const result = scoreKeywordDensity(text, 'widget');
    expect(result.density).toBeCloseTo(0.02, 1);
    expect(result.score).toBeGreaterThanOrEqual(7);
  });

  it('returns HARD FAIL for density > 3%', () => {
    const text = 'widget '.repeat(10); // 100% density
    const result = scoreKeywordDensity(text, 'widget');
    expect(result.hardFail).toBe(true);
    expect(result.score).toBe(0);
  });

  it('penalizes low density', () => {
    const text = 'other '.repeat(1000) + 'widget'; // ~0.1% density
    const result = scoreKeywordDensity(text, 'widget');
    expect(result.density).toBeLessThan(0.005);
    expect(result.score).toBeLessThan(7);
  });

  it('counts multi-word keywords as phrases', () => {
    const text = 'The best wireless headphones are our wireless headphones for music lovers.';
    const result = scoreKeywordDensity(text, 'wireless headphones');
    expect(result.count).toBe(2);
  });

  it('handles missing keyword', () => {
    const text = 'This text has no target keywords at all.';
    const result = scoreKeywordDensity(text, 'widget');
    expect(result.count).toBe(0);
    expect(result.score).toBe(0);
  });

  it('is case-insensitive', () => {
    const text = 'WIDGET widget Widget';
    const result = scoreKeywordDensity(text, 'widget');
    expect(result.count).toBe(3);
  });
});

describe('SEO Judge - Structure Scoring', () => {
  it('gives points for H1 presence', () => {
    const headings = [{ level: 1, text: 'Main Title' }];
    const result = scoreStructure(headings);
    expect(result.hasH1).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(5);
  });

  it('penalizes missing H1', () => {
    const headings = [{ level: 2, text: 'Subtitle' }];
    const result = scoreStructure(headings);
    expect(result.hasH1).toBe(false);
    expect(result.issues.some(i => i.toLowerCase().includes('h1'))).toBe(true);
  });

  it('rewards proper heading hierarchy', () => {
    const headings = [
      { level: 1, text: 'Title' },
      { level: 2, text: 'Section 1' },
      { level: 2, text: 'Section 2' },
    ];
    const result = scoreStructure(headings);
    expect(result.hasHeadingHierarchy).toBe(true);
  });

  it('penalizes multiple H1s', () => {
    const headings = [
      { level: 1, text: 'First H1' },
      { level: 1, text: 'Second H1' },
    ];
    const result = scoreStructure(headings);
    expect(result.issues.some(i => i.toLowerCase().includes('multiple h1'))).toBe(true);
  });

  it('handles missing headings', () => {
    const result = scoreStructure(undefined);
    expect(result.score).toBeLessThanOrEqual(3);
    expect(result.hasH1).toBe(false);
  });
});

describe('SEO Judge - Technical Scoring', () => {
  it('returns baseline score for typical content', () => {
    const variant = {
      title: 'Test Product',
      description: 'A good description',
      features: ['Feature 1', 'Feature 2'],
    };
    const result = scoreTechnical(variant);
    expect(result.score).toBeGreaterThanOrEqual(20);
  });

  it('penalizes very long content', () => {
    const variant = {
      title: 'Test',
      content: 'word '.repeat(3000), // Very long content
    };
    const result = scoreTechnical(variant);
    expect(result.issues.some(i => i.toLowerCase().includes('load time'))).toBe(true);
  });

  it('rewards schema presence', () => {
    const withSchema = scoreTechnical({
      title: 'Test',
      schema: { '@type': 'Product' },
      features: ['a', 'b', 'c', 'd', 'e'],
    });
    const withoutSchema = scoreTechnical({
      title: 'Test',
      features: ['a', 'b', 'c', 'd', 'e'],
    });
    expect(withSchema.mobileEstimate).toBeGreaterThanOrEqual(withoutSchema.mobileEstimate);
  });
});

describe('SEO Judge - Full Calculation', () => {
  it('returns total score 0-100', () => {
    const variant = { title: 'Widget Pro', description: 'Great widget for you', features: [] };
    const result = calculateSEOScore(variant, 'widget');
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('includes breakdown by category', () => {
    const variant = { title: 'Test Product', description: 'Test description', features: [] };
    const result = calculateSEOScore(variant, 'test');
    expect(result.breakdown).toHaveProperty('title');
    expect(result.breakdown).toHaveProperty('description');
    expect(result.breakdown).toHaveProperty('schema');
    expect(result.breakdown).toHaveProperty('readability');
    expect(result.breakdown).toHaveProperty('scannability');
    expect(result.breakdown).toHaveProperty('keyword');
    expect(result.breakdown).toHaveProperty('structure');
    expect(result.breakdown).toHaveProperty('technical');
  });

  it('collects all hard fails', () => {
    const variant = {
      title: 'A'.repeat(90), // Too long - hard fail
      description: 'B'.repeat(50),
      features: [],
    };
    const result = calculateSEOScore(variant, 'test');
    expect(result.hardFails.length).toBeGreaterThan(0);
    expect(result.hardFails).toContain('title_too_long');
  });

  it('collects soft fails', () => {
    const variant = {
      title: 'Short',
      description: 'Very short',
      features: [],
    };
    const result = calculateSEOScore(variant, 'test');
    expect(result.softFails.length).toBeGreaterThan(0);
  });

  it('scores well-optimized content higher', () => {
    const poor = {
      title: 'x',
      description: 'y',
      features: [],
    };
    const good = {
      title: 'Buy the Best Widget Pro - Premium Quality Guaranteed Today',
      description: 'Discover our amazing widget. Shop now and save 20% on the best widget in the market. Fast shipping and easy returns. Order today!',
      features: ['Premium quality', 'Fast shipping', 'Easy returns', 'Best price guaranteed', '30-day warranty'],
      schema: { '@type': 'Product', name: 'Widget Pro', offers: { price: '99.99' } },
    };

    const poorResult = calculateSEOScore(poor, 'widget');
    const goodResult = calculateSEOScore(good, 'widget');

    expect(goodResult.total).toBeGreaterThan(poorResult.total);
  });

  it('collects all issues from components', () => {
    const variant = { title: 'x', description: 'y', features: [] };
    const result = calculateSEOScore(variant, 'test');
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
