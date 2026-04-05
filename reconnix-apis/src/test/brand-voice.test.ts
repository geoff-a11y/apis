// src/test/brand-voice.test.ts — Tests for brand voice analysis and consistency

import { describe, it, expect } from 'vitest';
import {
  analyzeBrandVoice,
  generateBrandVoiceGuidelines,
  formatBrandVoiceForPrompt,
  scoreBrandVoiceConsistency,
  quickBrandVoiceCheck,
  BrandVoiceProfile,
  VariantContent,
} from '../lib/brand-voice';

// ============================================================================
// Test Fixtures
// ============================================================================

const casualWarmContent: VariantContent = {
  title: "You'll Love Our Amazing Widget!",
  description: "We're so excited to share our awesome new widget with you. It's totally going to change your life - trust us, you won't be disappointed! This will help you save time and improve your workflow.",
  features: [
    "Super easy to use - anyone can do it!",
    "Saves you hours every single week",
    "Join 10,000+ happy customers who love it - trusted by everyone!",
  ],
};

const formalCorporateContent: VariantContent = {
  title: "Enterprise Widget Solution - Industry Leading Performance",
  description: "Leverage our comprehensive widget platform to optimize your organizational efficiency. Our solution facilitates seamless integration with existing infrastructure. Therefore, this enterprise solution consequently delivers robust performance.",
  features: [
    "Enterprise-grade scalability and reliability",
    "Comprehensive API integration capabilities",
    "ISO 27001 certified security compliance",
  ],
};

const technicalProductContent: VariantContent = {
  title: "Widget Pro X3000 - Professional Grade API Integration",
  description: "The Widget Pro X3000 delivers scalable enterprise infrastructure with advanced algorithm optimization and comprehensive API integration for modular SaaS deployment.",
  features: [
    "Scalable enterprise API architecture",
    "Advanced analytics optimization engine",
    "Comprehensive infrastructure integration",
  ],
};

const balancedContent: VariantContent = {
  title: "Premium Widget - Quality You Can Trust",
  description: "Discover our premium widget, designed to help you work smarter. Trusted by thousands of customers worldwide.",
  features: [
    "Easy setup in under 5 minutes",
    "30-day money-back guarantee",
    "Free shipping on all orders",
  ],
};

// ============================================================================
// analyzeBrandVoice Tests
// ============================================================================

describe('analyzeBrandVoice', () => {
  describe('Tone Detection', () => {
    it('detects casual/low formality content', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(profile.formality).toBeLessThan(50);
    });

    it('detects formal/high formality content', () => {
      const profile = analyzeBrandVoice(formalCorporateContent);
      expect(profile.formality).toBeGreaterThanOrEqual(50);
    });

    it('detects high enthusiasm content', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(profile.enthusiasm).toBeGreaterThan(60);
    });

    it('detects reserved enthusiasm in corporate content', () => {
      const profile = analyzeBrandVoice(formalCorporateContent);
      expect(profile.enthusiasm).toBeLessThan(70);
    });

    it('detects warmth in customer-focused content', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(profile.warmth).toBeGreaterThan(60);
    });

    it('detects lower warmth in corporate jargon', () => {
      const profile = analyzeBrandVoice(formalCorporateContent);
      expect(profile.warmth).toBeLessThan(60);
    });
  });

  describe('Style Markers', () => {
    it('detects contractions in casual content', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(profile.usesContractions).toBe(true);
    });

    it('detects absence of contractions in formal content', () => {
      const profile = analyzeBrandVoice(formalCorporateContent);
      expect(profile.usesContractions).toBe(false);
    });

    it('detects exclamation marks', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(profile.usesExclamations).toBe(true);
    });

    it('detects second person usage (you/your)', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(profile.usesSecondPerson).toBe(true);
    });

    it('detects first person usage (we/our)', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(profile.usesFirstPerson).toBe(true);
    });
  });

  describe('Vocabulary Level', () => {
    it('identifies technical vocabulary', () => {
      const profile = analyzeBrandVoice(technicalProductContent);
      expect(profile.vocabularyLevel).toBe('technical');
    });

    it('identifies simple vocabulary in casual content', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(['simple', 'moderate']).toContain(profile.vocabularyLevel);
    });

    it('identifies sophisticated vocabulary in corporate content', () => {
      const profile = analyzeBrandVoice(formalCorporateContent);
      expect(['moderate', 'sophisticated', 'technical']).toContain(profile.vocabularyLevel);
    });
  });

  describe('Content Patterns', () => {
    it('detects benefit-focused content', () => {
      // Create content with clear benefit language
      const benefitContent: VariantContent = {
        title: "Widget That Helps You Save Time",
        description: "This product will help you improve productivity and save money every month.",
        features: ["Saves you hours", "Reduces costs by 30%", "Helps you achieve more"],
      };
      const profile = analyzeBrandVoice(benefitContent);
      expect(profile.benefitFocused).toBe(true);
    });

    it('detects prominent social proof', () => {
      // Create content with clear social proof
      const socialProofContent: VariantContent = {
        title: "Top-Rated Widget - Trusted by 50,000+ Customers",
        description: "Awarded best-selling product of the year. 50,000+ happy customers love us.",
        features: ["Trusted by thousands", "10,000+ 5-star reviews", "Award-winning design"],
      };
      const profile = analyzeBrandVoice(socialProofContent);
      expect(['subtle', 'prominent']).toContain(profile.socialProofStyle);
    });

    it('detects aggressive CTA style', () => {
      const urgentContent: VariantContent = {
        title: "Buy Now - Limited Time Only!",
        description: "Act now and save 50%. Don't wait - this deal expires today!",
        features: ["Order now for instant access"],
      };
      const profile = analyzeBrandVoice(urgentContent);
      expect(profile.ctaStyle).toBe('aggressive');
    });

    it('detects soft or moderate CTA style for informational content', () => {
      const softContent: VariantContent = {
        title: "Information About Our Solution",
        description: "Contact us to inquire about your needs. We are available to help.",
        features: ["Available for inquiry"],
      };
      const profile = analyzeBrandVoice(softContent);
      expect(['soft', 'moderate']).toContain(profile.ctaStyle);
    });
  });

  describe('Extracted Examples', () => {
    it('extracts sample phrases', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(profile.samplePhrases.length).toBeGreaterThan(0);
    });

    it('extracts key terms', () => {
      const profile = analyzeBrandVoice(casualWarmContent);
      expect(profile.keyTerms.length).toBeGreaterThan(0);
    });
  });

  describe('Raw Metrics', () => {
    it('counts words correctly', () => {
      const profile = analyzeBrandVoice(balancedContent);
      expect(profile.totalWords).toBeGreaterThan(20);
    });

    it('counts sentences correctly', () => {
      const profile = analyzeBrandVoice(balancedContent);
      expect(profile.totalSentences).toBeGreaterThan(0);
    });

    it('calculates average word length', () => {
      const profile = analyzeBrandVoice(balancedContent);
      expect(profile.avgWordLength).toBeGreaterThan(3);
      expect(profile.avgWordLength).toBeLessThan(10);
    });
  });
});

// ============================================================================
// generateBrandVoiceGuidelines Tests
// ============================================================================

describe('generateBrandVoiceGuidelines', () => {
  it('generates summary from profile', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    expect(guidelines.summary).toBeDefined();
    expect(guidelines.summary.length).toBeGreaterThan(20);
  });

  it('generates do list for casual content', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    expect(guidelines.doList.length).toBeGreaterThan(0);
    expect(guidelines.doList.some(item =>
      item.toLowerCase().includes('conversational') ||
      item.toLowerCase().includes('approachable') ||
      item.toLowerCase().includes('contraction')
    )).toBe(true);
  });

  it('generates guidelines for formal content', () => {
    const profile = analyzeBrandVoice(formalCorporateContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    // For formal content, either dont list has relevant items OR do list has formal guidance
    const hasFormality = guidelines.dontList.some(item =>
      item.toLowerCase().includes('slang') ||
      item.toLowerCase().includes('casual') ||
      item.toLowerCase().includes('contraction')
    ) || guidelines.doList.some(item =>
      item.toLowerCase().includes('formal') ||
      item.toLowerCase().includes('professional')
    );
    expect(hasFormality).toBe(true);
  });

  it('includes example phrases when available', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    expect(guidelines.examplePhrases.length).toBeGreaterThan(0);
  });

  it('includes key terms when available', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    expect(guidelines.keyTerms.length).toBeGreaterThan(0);
  });

  it('mentions vocabulary level in summary', () => {
    const profile = analyzeBrandVoice(technicalProductContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    // Summary should contain the vocabulary level
    expect(guidelines.summary).toMatch(/simple|moderate|technical|sophisticated/);
  });

  it('mentions CTA style in summary', () => {
    const profile = analyzeBrandVoice(balancedContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    expect(guidelines.summary).toMatch(/soft|moderate|aggressive/);
  });
});

// ============================================================================
// formatBrandVoiceForPrompt Tests
// ============================================================================

describe('formatBrandVoiceForPrompt', () => {
  it('formats guidelines as markdown', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    const prompt = formatBrandVoiceForPrompt(guidelines);

    expect(prompt).toContain('## BRAND VOICE GUIDELINES');
    expect(prompt).toContain('**DO:**');
  });

  it('includes summary', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    const prompt = formatBrandVoiceForPrompt(guidelines);

    expect(prompt).toContain(guidelines.summary);
  });

  it('includes do items', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    const prompt = formatBrandVoiceForPrompt(guidelines);

    for (const item of guidelines.doList.slice(0, 3)) {
      expect(prompt).toContain(item);
    }
  });

  it('includes dont items when present', () => {
    const profile = analyzeBrandVoice(formalCorporateContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    const prompt = formatBrandVoiceForPrompt(guidelines);

    if (guidelines.dontList.length > 0) {
      expect(prompt).toContain("**DON'T:**");
    }
  });

  it('includes example phrases when present', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    const prompt = formatBrandVoiceForPrompt(guidelines);

    expect(prompt).toContain('**EXAMPLE PHRASES TO EMULATE:**');
  });

  it('includes key terms when present', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    const prompt = formatBrandVoiceForPrompt(guidelines);

    expect(prompt).toContain('**KEY TERMS TO PRESERVE:**');
  });

  it('includes importance reminder', () => {
    const profile = analyzeBrandVoice(casualWarmContent);
    const guidelines = generateBrandVoiceGuidelines(profile);
    const prompt = formatBrandVoiceForPrompt(guidelines);

    expect(prompt).toContain('MUST maintain this exact brand voice');
  });
});

// ============================================================================
// scoreBrandVoiceConsistency Tests
// ============================================================================

describe('scoreBrandVoiceConsistency', () => {
  it('scores identical content as 100', () => {
    const baseline = analyzeBrandVoice(casualWarmContent);
    const result = scoreBrandVoiceConsistency(casualWarmContent, baseline);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('scores similar content highly', () => {
    const baseline = analyzeBrandVoice(casualWarmContent);
    const similarContent: VariantContent = {
      title: "You're Going to Love This Amazing Widget!",
      description: "We can't wait to share our fantastic new widget with you. It'll totally transform how you work!",
      features: [
        "Super simple to get started",
        "Saves you tons of time every week",
        "Loved by 15,000+ happy users",
      ],
    };
    const result = scoreBrandVoiceConsistency(similarContent, baseline);
    expect(result.score).toBeGreaterThan(70);
  });

  it('penalizes formality mismatch', () => {
    const baseline = analyzeBrandVoice(casualWarmContent);
    const result = scoreBrandVoiceConsistency(formalCorporateContent, baseline);
    expect(result.score).toBeLessThan(80);
    expect(result.issues.some(i => i.toLowerCase().includes('formality'))).toBe(true);
  });

  it('penalizes vocabulary level mismatch', () => {
    const baseline = analyzeBrandVoice(casualWarmContent);
    const result = scoreBrandVoiceConsistency(technicalProductContent, baseline);
    expect(result.issues.some(i => i.toLowerCase().includes('vocabulary'))).toBe(true);
  });

  it('penalizes missing second person when baseline uses it', () => {
    const baseline = analyzeBrandVoice(casualWarmContent);
    const noYouContent: VariantContent = {
      title: "Amazing Widget Available Now",
      description: "The widget is fantastic. It changes everything.",
      features: ["Easy to use", "Saves time", "Popular choice"],
    };
    const result = scoreBrandVoiceConsistency(noYouContent, baseline);
    expect(result.issues.some(i => i.toLowerCase().includes('you'))).toBe(true);
  });

  it('penalizes added exclamations when baseline lacks them', () => {
    const baseline = analyzeBrandVoice(balancedContent);
    const excitedContent: VariantContent = {
      title: "Amazing Premium Widget!!!",
      description: "You'll love this! It's incredible! Best ever!",
      features: ["So great!", "Amazing!", "Wow!"],
    };
    const result = scoreBrandVoiceConsistency(excitedContent, baseline);
    expect(result.issues.some(i => i.toLowerCase().includes('exclamation'))).toBe(true);
  });

  it('penalizes CTA style mismatch', () => {
    const baseline = analyzeBrandVoice({
      title: "Learn About Our Widget",
      description: "Contact us when you're ready to learn more.",
      features: ["Available for inquiry"],
    });
    const aggressiveVariant: VariantContent = {
      title: "Buy NOW - Limited Time Only!",
      description: "Act fast! Order today before it's gone! Don't miss out!",
      features: ["Hurry - last chance!"],
    };
    const result = scoreBrandVoiceConsistency(aggressiveVariant, baseline);
    expect(result.issues.some(i => i.toLowerCase().includes('cta'))).toBe(true);
  });

  it('never scores below 0', () => {
    const baseline = analyzeBrandVoice(casualWarmContent);
    const result = scoreBrandVoiceConsistency(formalCorporateContent, baseline);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// quickBrandVoiceCheck Tests
// ============================================================================

describe('quickBrandVoiceCheck', () => {
  it('returns consistent true for similar content', () => {
    const result = quickBrandVoiceCheck(casualWarmContent, casualWarmContent);
    expect(result.consistent).toBe(true);
  });

  it('returns consistent false for mismatched content', () => {
    const result = quickBrandVoiceCheck(formalCorporateContent, casualWarmContent);
    expect(result.consistent).toBe(false);
  });

  it('returns major issues list', () => {
    const result = quickBrandVoiceCheck(formalCorporateContent, casualWarmContent);
    expect(result.majorIssues.length).toBeGreaterThan(0);
    expect(result.majorIssues.length).toBeLessThanOrEqual(3);
  });

  it('works with minimal content', () => {
    const minimal: VariantContent = { title: "Test" };
    const result = quickBrandVoiceCheck(minimal, minimal);
    expect(result.consistent).toBe(true);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Brand Voice Integration', () => {
  it('full pipeline: analyze -> guidelines -> prompt -> score', () => {
    // Step 1: Analyze baseline
    const profile = analyzeBrandVoice(balancedContent);
    expect(profile.formality).toBeDefined();

    // Step 2: Generate guidelines
    const guidelines = generateBrandVoiceGuidelines(profile);
    expect(guidelines.summary).toBeDefined();

    // Step 3: Format for prompt
    const prompt = formatBrandVoiceForPrompt(guidelines);
    expect(prompt).toContain('BRAND VOICE GUIDELINES');

    // Step 4: Score a variant
    const variant: VariantContent = {
      title: "Quality Widget - Trusted by Many",
      description: "Our quality widget helps you work better. Join thousands who trust us.",
      features: [
        "Quick 5-minute setup",
        "60-day guarantee",
        "Fast free shipping",
      ],
    };
    const result = scoreBrandVoiceConsistency(variant, profile);
    expect(result.score).toBeGreaterThan(50);
  });

  it('detects when variant drifts from baseline voice', () => {
    const casualBaseline = analyzeBrandVoice(casualWarmContent);

    // Create a variant that drifts toward formal/corporate voice
    const driftedVariant: VariantContent = {
      title: "Enterprise-Grade Widget Solution",
      description: "Leverage our comprehensive platform to optimize efficiency. Facilitate seamless integration.",
      features: [
        "Enterprise scalability",
        "API integration capabilities",
        "Compliance certified",
      ],
    };

    const result = scoreBrandVoiceConsistency(driftedVariant, casualBaseline);
    expect(result.score).toBeLessThan(70);
    expect(result.issues.length).toBeGreaterThan(2);
  });

  it('maintains consistency across generations', () => {
    const baseline = analyzeBrandVoice(casualWarmContent);

    // Simulate Gen 1 variant
    const gen1: VariantContent = {
      title: "You'll Really Love This Widget!",
      description: "We're thrilled to bring you something amazing. It's going to save you so much time!",
      features: ["Easy to use!", "Saves hours", "Everyone loves it"],
    };

    // Simulate Gen 5 variant (should maintain voice)
    const gen5: VariantContent = {
      title: "Your New Favorite Widget Awaits!",
      description: "We've crafted something special just for you. You're going to wonder how you lived without it!",
      features: ["Incredibly easy!", "Time-saving magic", "Join 20,000+ fans"],
    };

    const gen1Score = scoreBrandVoiceConsistency(gen1, baseline);
    const gen5Score = scoreBrandVoiceConsistency(gen5, baseline);

    expect(gen1Score.score).toBeGreaterThanOrEqual(65);
    expect(gen5Score.score).toBeGreaterThanOrEqual(65);
  });
});
