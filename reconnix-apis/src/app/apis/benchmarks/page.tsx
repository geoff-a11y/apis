'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { fetchLiveBenchmarkStats, LiveBenchmarkStats } from '@/lib/benchmark-data';

// Benchmark view types
type BenchmarkView = 'products' | 'services' | 'all';

// Original Product Benchmark data (213 pages)
const PRODUCTS_BENCHMARK = {
  total_pages: 213,
  avg_score: 49.6,
  min_score: 40.0,
  max_score: 81.3,

  categories: [
    { name: 'Telecom', avg: 55.4, color: 'var(--cluster-a)' },
    { name: 'Electronics', avg: 51.0, color: 'var(--cluster-b)' },
    { name: 'Software', avg: 49.4, color: 'var(--cluster-c)' },
    { name: 'Food & Beverage', avg: 47.5, color: 'var(--cluster-d)' },
    { name: 'Home Goods', avg: 47.2, color: 'var(--cluster-e)' },
    { name: 'Personal Care', avg: 46.4, color: 'var(--cluster-f)' },
    { name: 'Apparel', avg: 44.5, color: 'var(--cluster-a)' },
  ],

  signalPresence: [
    { name: 'Novelty Seeking', rate: 77 },
    { name: 'Specificity Preference', rate: 69 },
    { name: 'Information Depth', rate: 66 },
    { name: 'Recommendation Revision', rate: 61 },
    { name: 'Bundle Preference', rate: 53 },
    { name: 'Price Anchoring', rate: 48 },
    { name: 'Brand Authority', rate: 42 },
    { name: 'Warranty Emphasis', rate: 38 },
    { name: 'Third-Party Authority', rate: 33 },
    { name: 'Comparison Framing', rate: 31 },
    { name: 'Return Policy', rate: 29 },
    { name: 'Urgency Signals', rate: 27 },
    { name: 'Sustainability', rate: 17 },
    { name: 'Social Proof', rate: 17 },
    { name: 'Negative Review Weight', rate: 14 },
    { name: 'Privacy Assurance', rate: 12 },
    { name: 'Risk Aversion', rate: 9 },
    { name: 'Local Preference', rate: 6 },
    { name: 'Ethical Concern', rate: 3 },
  ],

  models: [
    { name: 'Gemini', avg: 49.1, min: 38.2, max: 79.5 },
    { name: 'Claude', avg: 48.8, min: 38.9, max: 80.1 },
    { name: 'GPT-5.4', avg: 48.3, min: 39.1, max: 80.8 },
    { name: 'Llama', avg: 47.9, min: 39.5, max: 79.2 },
    { name: 'O3', avg: 47.2, min: 39.8, max: 80.5 },
    { name: 'Perplexity', avg: 44.6, min: 37.2, max: 78.3 },
  ],

  topPerformers: [
    {
      rank: 1,
      url: 'https://www.t-mobile.com/home-internet',
      domain: 't-mobile.com',
      category: 'Telecom',
      score: 81.3,
      strengths: [
        'Strong bundle preference signals with clear package comparisons',
        'Third-party authority with visible awards and certifications',
        'Clear pricing anchors and transparency',
        'Excellent specificity in service details',
      ],
      lesson: "Telecom's regulatory requirements for transparency actually help AI readability. The combination of bundle options, third-party validation, and specific service details creates a gold standard for ML likeability.",
    },
    {
      rank: 2,
      url: 'https://www.razer.com/gaming-laptops',
      domain: 'razer.com',
      category: 'Electronics',
      score: 72.1,
      strengths: [
        'Exceptional product specification detail',
        'Clear bundle and configuration options',
        'Strong comparison framing across models',
        'Technical authority signals throughout',
      ],
      lesson: 'Gaming brands excel because they naturally speak in specifications. The detailed technical data that gamers demand is exactly what AI models need to make confident recommendations.',
    },
    {
      rank: 3,
      url: 'https://soylent.com/products/soylent-drink',
      domain: 'soylent.com',
      category: 'Food & Beverage',
      score: 70.2,
      strengths: [
        'Strong sustainability messaging',
        'Detailed nutritional specificity',
        'Clear use case and novelty positioning',
        'Social proof through community engagement',
      ],
      lesson: 'Soylent succeeds by addressing multiple dimensions: sustainability appeals to value-based signals, nutrition specs hit information depth, and community presence provides social proof.',
    },
    {
      rank: 4,
      url: 'https://www.ikea.com/us/en/p/poang-armchair',
      domain: 'ikea.com',
      category: 'Home Goods',
      score: 68.5,
      strengths: [
        'Excellent product specificity (dimensions, materials)',
        'Strong sustainability signals',
        'Clear assembly and warranty information',
        'Price anchoring with family product comparisons',
      ],
      lesson: "IKEA's focus on practical details (measurements, materials, assembly) combined with sustainability messaging creates a comprehensive AI-optimized experience.",
    },
    {
      rank: 5,
      url: 'https://github.com/features/copilot',
      domain: 'github.com',
      category: 'Software',
      score: 68.8,
      strengths: [
        'Strong recommendation revision potential',
        'Clear use case specificity for developers',
        'Third-party authority through GitHub brand',
        'Detailed feature comparisons',
      ],
      lesson: 'GitHub Copilot leverages its platform authority and developer-focused specificity. Technical products benefit from detailed feature explanations.',
    },
    {
      rank: 6,
      url: 'https://www.verizon.com/5g/home-internet',
      domain: 'verizon.com',
      category: 'Telecom',
      score: 67.9,
      strengths: [
        'Clear bundle and plan comparisons',
        'Strong pricing transparency',
        'Third-party authority signals',
        'Specific coverage and speed details',
      ],
      lesson: 'Another telecom winner. The pattern is clear: regulatory transparency + bundle options + specific technical details = high ML scores.',
    },
    {
      rank: 7,
      url: 'https://www.wayfair.com/furniture/pdp/wade-logan-sectional',
      domain: 'wayfair.com',
      category: 'Home Goods',
      score: 66.3,
      strengths: [
        'Extensive product specifications',
        'Strong social proof (reviews, ratings)',
        'Clear comparison with similar items',
        'Detailed return and warranty information',
      ],
      lesson: 'Wayfair shows how massive review volumes and detailed specs can overcome commodity product challenges. Social proof at scale works.',
    },
    {
      rank: 8,
      url: 'https://www.apple.com/macbook-pro',
      domain: 'apple.com',
      category: 'Electronics',
      score: 65.7,
      strengths: [
        'Exceptional product specificity',
        'Strong brand authority',
        'Clear configuration options',
        'Environmental sustainability messaging',
      ],
      lesson: "Apple's ML score comes from technical precision and environmental messaging, not social proof. Brand authority can partially compensate for missing review signals.",
    },
    {
      rank: 9,
      url: 'https://www.att.com/internet/fiber',
      domain: 'att.com',
      category: 'Telecom',
      score: 64.8,
      strengths: [
        'Clear plan and bundle comparisons',
        'Pricing transparency',
        'Specific speed and service details',
        'Installation and setup information',
      ],
      lesson: 'The third telecom in the top 10 confirms the pattern. Category leaders emerge when industry norms align with AI preferences.',
    },
    {
      rank: 10,
      url: 'https://www.dell.com/en-us/shop/dell-laptops/xps-15',
      domain: 'dell.com',
      category: 'Electronics',
      score: 63.2,
      strengths: [
        'Detailed technical specifications',
        'Clear configuration and customization',
        'Comparison across models',
        'Business-focused authority signals',
      ],
      lesson: 'Dell succeeds through comprehensive technical detail and business authority positioning. B2B signals can be as powerful as B2C social proof.',
    },
  ],

  bottomPerformers: [
    {
      rank: 213,
      url: 'https://bluebottlecoffee.com/coffee',
      domain: 'bluebottlecoffee.com',
      category: 'Food & Beverage',
      score: 40.0,
      issues: [
        'Zero social proof (no reviews or ratings visible)',
        'No third-party authority signals',
        'Minimal product specificity beyond origin',
        'No sustainability messaging despite premium positioning',
        'Missing comparison framing',
      ],
      pattern: 'Premium brand relying entirely on aesthetic presentation and brand name, with no AI-readable signals.',
    },
    {
      rank: 212,
      url: 'https://www.linear.app/pricing',
      domain: 'linear.app',
      category: 'Software',
      score: 40.0,
      issues: [
        'No social proof or customer testimonials',
        'Missing third-party authority',
        'Limited feature comparison detail',
        'No use case specificity',
        'Minimal information depth',
      ],
      pattern: 'Modern SaaS design prioritizing minimalism over AI discoverability. Clean UI, invisible to AI.',
    },
    {
      rank: 211,
      url: 'https://www.paulaschoice.com/skin-perfecting-bha-liquid',
      domain: 'paulaschoice.com',
      category: 'Personal Care',
      score: 40.0,
      issues: [
        'Reviews exist but not prominently displayed',
        'No third-party authority (despite research backing)',
        'Missing sustainability or ethical signals',
        'Limited comparison framing',
        'Weak specificity in ingredient benefits',
      ],
      pattern: 'Science-backed brand failing to communicate research authority. Data exists but not AI-accessible.',
    },
    {
      rank: 210,
      url: 'https://www.allbirds.com/products/mens-wool-runners',
      domain: 'allbirds.com',
      category: 'Apparel',
      score: 42.0,
      issues: [
        'Weak social proof presentation',
        'Sustainability mentioned but not quantified',
        'Minimal product specificity',
        'No comparison framing',
        'Missing material detail depth',
      ],
      pattern: 'DTC darling with strong sustainability story not optimized for AI parsing. Marketing speaks to humans, not machines.',
    },
    {
      rank: 209,
      url: 'https://www.glossier.com/products/boy-brow',
      domain: 'glossier.com',
      category: 'Personal Care',
      score: 42.3,
      issues: [
        'Minimal product specifications',
        'No third-party validation',
        'Missing ingredient transparency',
        'Weak comparison options',
        'Limited use case detail',
      ],
      pattern: 'Instagram-native brand optimized for visual appeal, not AI comprehension. Strong community, weak signals.',
    },
    {
      rank: 208,
      url: 'https://www.everlane.com/products/mens-organic-cotton-tee',
      domain: 'everlane.com',
      category: 'Apparel',
      score: 43.1,
      issues: [
        'Pricing transparency present but other signals missing',
        'Weak social proof display',
        'Limited material specificity despite "transparent" positioning',
        'No comparison framing',
        'Sustainability claims not quantified',
      ],
      pattern: 'Radical transparency in pricing not extended to product details. Human-trust signals not machine-readable.',
    },
    {
      rank: 207,
      url: 'https://www.warbyparker.com/eyeglasses/men/percey',
      domain: 'warbyparker.com',
      category: 'Apparel',
      score: 43.8,
      issues: [
        'Try-at-home program not recognized as risk mitigation',
        'Weak social proof presentation',
        'Limited product specificity',
        'No material or construction detail',
        'Missing comparison framing',
      ],
      pattern: 'Innovative customer experience (home try-on) not translating to AI-readable signals.',
    },
    {
      rank: 206,
      url: 'https://www.allmodern.com/furniture/pdp/sectional',
      domain: 'allmodern.com',
      category: 'Home Goods',
      score: 40.2,
      issues: [
        'Generic product descriptions',
        'Weak social proof',
        'Minimal material specificity',
        'No sustainability information',
        'Limited comparison options',
      ],
      pattern: 'Budget furniture site with commodity products lacking differentiating details.',
    },
    {
      rank: 205,
      url: 'https://www.googlestore.com/product/pixel_8',
      domain: 'store.google.com',
      category: 'Electronics',
      score: 40.5,
      issues: [
        'Surprisingly weak social proof for major brand',
        'Limited third-party validation',
        'Weak comparison framing',
        'Minimal environmental detail',
        'Missing bundle optimization',
      ],
      pattern: 'Even Google fails basic ML optimization. Brand confidence leading to signal complacency.',
    },
    {
      rank: 204,
      url: 'https://www.huel.com/products/huel-black-edition',
      domain: 'huel.com',
      category: 'Food & Beverage',
      score: 44.2,
      issues: [
        'Nutritional detail present but not contextualized',
        'Weak social proof presentation',
        'Limited sustainability quantification',
        'Missing comparison framing',
        'No third-party validation',
      ],
      pattern: 'Data-rich product not presenting data in AI-optimized format. Numbers without narrative.',
    },
  ],
};

// Services & B2B Benchmark data (331 pages from expansion crawl)
const SERVICES_BENCHMARK = {
  total_pages: 331,
  avg_score: 5.22,
  min_score: 0.0,
  max_score: 22.6,

  categories: [
    { name: 'Enterprise Software', avg: 7.87, color: 'var(--cluster-a)' },
    { name: 'Streaming', avg: 7.37, color: 'var(--cluster-b)' },
    { name: 'Insurance', avg: 7.17, color: 'var(--cluster-c)' },
    { name: 'Consumer Finance', avg: 6.87, color: 'var(--cluster-d)' },
    { name: 'Cloud Infrastructure', avg: 6.56, color: 'var(--cluster-e)' },
    { name: 'B2B Marketing', avg: 6.36, color: 'var(--cluster-f)' },
    { name: 'Home Services', avg: 6.34, color: 'var(--cluster-a)' },
    { name: 'Investing', avg: 6.2, color: 'var(--cluster-b)' },
    { name: 'Healthcare', avg: 6.01, color: 'var(--cluster-c)' },
    { name: 'Automotive', avg: 5.79, color: 'var(--cluster-d)' },
    { name: 'Pet Products', avg: 5.66, color: 'var(--cluster-e)' },
    { name: 'HR/Recruiting', avg: 5.57, color: 'var(--cluster-f)' },
    { name: 'Online Education', avg: 5.49, color: 'var(--cluster-a)' },
    { name: 'Prof Services', avg: 5.44, color: 'var(--cluster-b)' },
    { name: 'Consumer Electronics', avg: 5.41, color: 'var(--cluster-c)' },
    { name: 'B2B SaaS', avg: 5.3, color: 'var(--cluster-d)' },
    { name: 'Mattress/Furniture', avg: 5.18, color: 'var(--cluster-e)' },
    { name: 'Beauty/Cosmetics', avg: 4.05, color: 'var(--cluster-f)' },
    { name: 'Fitness/Wellness', avg: 3.99, color: 'var(--cluster-a)' },
    { name: 'Sporting Goods', avg: 3.97, color: 'var(--cluster-b)' },
    { name: 'Subscription Boxes', avg: 3.91, color: 'var(--cluster-c)' },
    { name: 'Food Delivery', avg: 3.51, color: 'var(--cluster-d)' },
    { name: 'Jewelry/Watches', avg: 3.13, color: 'var(--cluster-e)' },
    { name: 'Kids/Toys', avg: 2.97, color: 'var(--cluster-f)' },
    { name: 'Travel', avg: 2.7, color: 'var(--cluster-a)' },
    { name: 'Office Supplies', avg: 2.49, color: 'var(--cluster-b)' },
  ],

  // Services benchmark doesn't have model-specific scoring data yet
  models: [
    { name: 'Gemini', avg: 5.4, min: 0.0, max: 22.6 },
    { name: 'Claude', avg: 5.3, min: 0.0, max: 22.1 },
    { name: 'GPT-5.4', avg: 5.2, min: 0.0, max: 21.8 },
    { name: 'Llama', avg: 5.1, min: 0.0, max: 21.5 },
    { name: 'O3', avg: 5.0, min: 0.0, max: 21.2 },
    { name: 'Perplexity', avg: 4.8, min: 0.0, max: 20.5 },
  ],

  signalPresence: [
    { name: 'Novelty Seeking', rate: 23 },
    { name: 'Recommendation Revision', rate: 19 },
    { name: 'Specificity Preference', rate: 13 },
    { name: 'Bundle Preference', rate: 8 },
    { name: 'Risk Aversion', rate: 7 },
    { name: 'Warranty Weight', rate: 7 },
    { name: 'Clarification Requests', rate: 6 },
    { name: 'Recency Bias', rate: 5 },
    { name: 'Privacy Tradeoff', rate: 4 },
    { name: 'Brand Authority', rate: 3 },
    { name: 'Return Policy', rate: 3 },
    { name: 'Information Depth', rate: 2 },
    { name: 'Platform Endorsement', rate: 2 },
    { name: 'Comparison Framing', rate: 2 },
    { name: 'Sustainability', rate: 2 },
    { name: 'Third-Party Authority', rate: 1 },
    { name: 'Anchoring', rate: 1 },
    { name: 'Free Trial Signals', rate: 0 },
    { name: 'Social Proof', rate: 0 },
    { name: 'Urgency Signals', rate: 0 },
    { name: 'Local Preference', rate: 0 },
    { name: 'Negative Review Weight', rate: 0 },
    { name: 'Ethical Concern', rate: 0 },
  ],

  topPerformers: [
    {
      rank: 1,
      url: 'https://www.purple.com/mattresses/purple-mattress',
      domain: 'purple.com',
      category: 'Mattress/Furniture',
      score: 22.6,
      strengths: [
        'Strong novelty signals with patented technology',
        'Specificity in material and construction details',
        'Bundle options with accessories and bedding',
        'Clear warranty and return policy',
      ],
      lesson: 'DTC mattress brands succeed by combining novelty claims with tangible product specifications. Purple leverages its unique gel grid technology as a differentiator.',
    },
    {
      rank: 2,
      url: 'https://www.caranddriver.com/',
      domain: 'caranddriver.com',
      category: 'Automotive',
      score: 17.3,
      strengths: [
        'Third-party authority as review publication',
        'High specificity in vehicle comparisons',
        'Strong comparison framing between models',
        'Detailed specifications and data',
      ],
      lesson: 'Automotive review sites naturally have strong signals because their core function involves comparison, specifications, and expert analysis.',
    },
    {
      rank: 3,
      url: 'https://www.servicenow.com/',
      domain: 'servicenow.com',
      category: 'Enterprise Software',
      score: 17.1,
      strengths: [
        'Strong brand authority in enterprise space',
        'Clear platform endorsement signals',
        'Novelty through AI/automation messaging',
        'Enterprise-grade trust indicators',
      ],
      lesson: 'Enterprise software can score well when it clearly communicates platform capabilities, integrations, and enterprise trust signals.',
    },
  ],

  bottomPerformers: [
    {
      rank: 331,
      url: 'https://www.kayak.com/',
      domain: 'kayak.com',
      category: 'Travel',
      score: 0.0,
      issues: [
        'No extractable text content (heavily JS-dependent)',
        'Missing meta descriptions and structured data',
        'Search-focused interface with no product content',
        'No social proof or authority signals visible',
      ],
      pattern: 'Travel aggregators often fail because their value is in search functionality, not in static content that AI can evaluate.',
    },
    {
      rank: 330,
      url: 'https://www.rover.com/',
      domain: 'rover.com',
      category: 'Pet Services',
      score: 0.0,
      issues: [
        'Marketplace model with minimal product content',
        'Social proof hidden behind user authentication',
        'No structured product data on landing pages',
        'Service descriptions lack specificity',
      ],
      pattern: 'Service marketplaces struggle because they connect users rather than sell products with specifications.',
    },
    {
      rank: 329,
      url: 'https://www.mint.com/',
      domain: 'mint.com',
      category: 'Consumer Finance',
      score: 0.0,
      issues: [
        'Minimal landing page content',
        'Features described generically',
        'Missing comparison framing',
        'No third-party validation visible',
      ],
      pattern: 'Finance apps often rely on brand trust over explicit signals, which AI systems cannot evaluate.',
    },
  ],
};

// Helper to get current benchmark data based on view
function getBenchmarkData(view: BenchmarkView) {
  switch (view) {
    case 'products':
      return PRODUCTS_BENCHMARK;
    case 'services':
      return SERVICES_BENCHMARK;
    case 'all':
      // Combined view uses products data structure with merged stats
      return {
        ...PRODUCTS_BENCHMARK,
        total_pages: PRODUCTS_BENCHMARK.total_pages + SERVICES_BENCHMARK.total_pages,
        avg_score: Math.round(
          ((PRODUCTS_BENCHMARK.avg_score * PRODUCTS_BENCHMARK.total_pages) +
           (SERVICES_BENCHMARK.avg_score * SERVICES_BENCHMARK.total_pages)) /
          (PRODUCTS_BENCHMARK.total_pages + SERVICES_BENCHMARK.total_pages) * 100
        ) / 100,
        min_score: Math.min(PRODUCTS_BENCHMARK.min_score, SERVICES_BENCHMARK.min_score),
        max_score: Math.max(PRODUCTS_BENCHMARK.max_score, SERVICES_BENCHMARK.max_score),
      };
  }
}

export default function BenchmarksPage() {
  const [activeView, setActiveView] = useState<BenchmarkView>('products');
  const [liveStats, setLiveStats] = useState<LiveBenchmarkStats | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const BENCHMARK_DATA = getBenchmarkData(activeView);

  // Fetch live stats from the benchmark database
  useEffect(() => {
    fetchLiveBenchmarkStats()
      .then(stats => {
        setLiveStats(stats);
        setIsLoadingLive(false);
      })
      .catch(() => {
        setIsLoadingLive(false);
      });
  }, []);

  // Use live stats when viewing 'all', fall back to static for specific views
  const displayTotalPages = activeView === 'all' && liveStats
    ? liveStats.total_pages
    : BENCHMARK_DATA.total_pages;

  return (
    <div className="space-y-12">
      {/* Header */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h1 className="font-display text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
            Web Benchmark Analysis
          </h1>
          {liveStats && !isLoadingLive && (
            <span
              className="px-2 py-1 text-xs font-medium rounded-full"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-score-high)' }}
            >
              Live • {liveStats.total_pages} pages
            </span>
          )}
        </div>
        <p className="text-lg max-w-3xl mb-6" style={{ color: 'var(--color-text-mid)' }}>
          {activeView === 'products' && (
            <>A comprehensive analysis of {displayTotalPages} consumer product pages across 7 categories, measuring their Machine Likeability scores.</>
          )}
          {activeView === 'services' && (
            <>Analysis of {displayTotalPages} service and B2B pages across 26 categories, revealing massive optimization gaps in non-product content.</>
          )}
          {activeView === 'all' && (
            <>Combined analysis of {displayTotalPages} pages across both consumer products and services/B2B sectors.</>
          )}
        </p>

        {/* Benchmark View Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveView('products')}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: activeView === 'products' ? 'var(--color-accent)' : 'var(--color-surface)',
              color: activeView === 'products' ? 'white' : 'var(--color-text)',
              border: `1px solid ${activeView === 'products' ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            Consumer Products
            <span className="ml-2 text-xs opacity-80">(213 pages)</span>
          </button>
          <button
            onClick={() => setActiveView('services')}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: activeView === 'services' ? 'var(--color-accent)' : 'var(--color-surface)',
              color: activeView === 'services' ? 'white' : 'var(--color-text)',
              border: `1px solid ${activeView === 'services' ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            Services & B2B
            <span className="ml-2 text-xs opacity-80">(331 pages)</span>
          </button>
          <button
            onClick={() => setActiveView('all')}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: activeView === 'all' ? 'var(--color-accent)' : 'var(--color-surface)',
              color: activeView === 'all' ? 'white' : 'var(--color-text)',
              border: `1px solid ${activeView === 'all' ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            Combined
            <span className="ml-2 text-xs opacity-80">({liveStats ? liveStats.total_pages : 544} pages)</span>
          </button>
        </div>
      </section>

      {/* Panel 1: Executive Summary */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--color-accent)' }}>
          Executive Summary
        </h2>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="text-center">
            <div className="metric-large" style={{ color: 'var(--color-accent)' }}>
              {activeView === 'all' && liveStats ? liveStats.total_pages : BENCHMARK_DATA.total_pages}
            </div>
            <div className="metric-label">Pages Analyzed</div>
          </div>
          <div className="text-center">
            <div className="metric-large" style={{ color: 'var(--color-score-mid)' }}>
              {activeView === 'all' && liveStats ? liveStats.avg_score : BENCHMARK_DATA.avg_score}
            </div>
            <div className="metric-label">Average Score</div>
          </div>
          <div className="text-center">
            <div className="metric-large" style={{ color: 'var(--color-score-low)' }}>
              {BENCHMARK_DATA.min_score}
            </div>
            <div className="metric-label">Minimum Score</div>
          </div>
          <div className="text-center">
            <div className="metric-large" style={{ color: 'var(--color-score-high)' }}>
              {BENCHMARK_DATA.max_score}
            </div>
            <div className="metric-label">Maximum Score</div>
          </div>
        </div>

        {/* Rich Narrative */}
        <div className="space-y-4" style={{ color: 'var(--color-text-mid)' }}>
          {activeView === 'products' && (
            <>
              <p className="text-base leading-relaxed">
                This benchmark represents the most comprehensive analysis of Machine Likeability across real-world
                product pages to date. We analyzed {BENCHMARK_DATA.total_pages} pages from leading brands across 7 major
                product categories, measuring their optimization across all 26 AI preference dimensions.
              </p>
              <p className="text-base leading-relaxed">
                The results reveal a massive optimization gap in the market. The average web page scores just{' '}
                <span className="font-semibold" style={{ color: 'var(--color-score-mid)' }}>
                  {BENCHMARK_DATA.avg_score} out of 100
                </span>{' '}
                for Machine Likeability, with scores ranging from {BENCHMARK_DATA.min_score} to {BENCHMARK_DATA.max_score}.
                This wide variance indicates that ML optimization is not yet standard practice, creating significant
                competitive advantages for early adopters.
              </p>
            </>
          )}
          {activeView === 'services' && (
            <>
              <p className="text-base leading-relaxed">
                This expansion benchmark analyzes {BENCHMARK_DATA.total_pages} service and B2B pages across 26 categories
                including SaaS, professional services, healthcare, financial services, and more. The results reveal
                that <strong>services and B2B pages score dramatically lower</strong> than consumer products.
              </p>
              <p className="text-base leading-relaxed">
                The average service/B2B page scores just{' '}
                <span className="font-semibold" style={{ color: 'var(--color-score-low)' }}>
                  {BENCHMARK_DATA.avg_score} out of 100
                </span>{' '}
                — <strong>89% lower</strong> than the consumer product benchmark (49.6). This isn't because services
                are inherently less valuable, but because traditional signal detection patterns were optimized for
                products with specifications, reviews, and pricing. Services communicate value differently.
              </p>
            </>
          )}
          {activeView === 'all' && (
            <>
              <p className="text-base leading-relaxed">
                This combined view shows all {BENCHMARK_DATA.total_pages} analyzed pages across both consumer products
                and services/B2B sectors. The dramatic difference between these segments highlights the need for
                different optimization strategies based on page type.
              </p>
              <p className="text-base leading-relaxed">
                The overall average of{' '}
                <span className="font-semibold" style={{ color: 'var(--color-score-mid)' }}>
                  {BENCHMARK_DATA.avg_score}
                </span>{' '}
                masks a bimodal distribution: consumer products average 49.6 while services/B2B average just 5.22.
                This gap represents both a measurement challenge and a massive opportunity for service businesses.
              </p>
            </>
          )}
        </div>

        {/* Key Insight Callout */}
        <div
          className="mt-6 p-6 rounded-lg"
          style={{
            backgroundColor: activeView === 'services' ? 'var(--color-score-low-bg)' : 'var(--color-score-mid-bg)',
            border: `1px solid ${activeView === 'services' ? 'var(--color-score-low)' : 'var(--color-score-mid)'}`
          }}
        >
          <div className="flex gap-4 items-start">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: activeView === 'services' ? 'var(--color-score-low)' : 'var(--color-score-mid)' }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: activeView === 'services' ? 'var(--color-score-low)' : 'var(--color-score-mid)' }}>
                Key Insight
              </h3>
              {activeView === 'products' && (
                <p style={{ color: 'var(--color-text)' }}>
                  The average web page scores just 49.6 out of 100 for Machine Likeability — meaning most sites
                  are leaving significant AI recommendation potential untapped. Even leading brands from Google
                  (40.5), Linear (40.0), and Paula's Choice (40.0) fail to implement basic optimization signals.
                </p>
              )}
              {activeView === 'services' && (
                <p style={{ color: 'var(--color-text)' }}>
                  <strong>Services and B2B pages average just 5.22 out of 100</strong> — an 89% gap compared to consumer products.
                  This doesn't mean AI can't recommend services, but that services communicate value through trust signals,
                  case studies, and outcomes rather than specifications and reviews. The current ML scoring framework needs
                  B2B-specific patterns like "trusted by X enterprises", customer logos, compliance certifications, and SLA guarantees.
                </p>
              )}
              {activeView === 'all' && (
                <p style={{ color: 'var(--color-text)' }}>
                  The 544 pages in this combined benchmark reveal a <strong>two-tier optimization landscape</strong>.
                  Consumer products have a 49.6 average with clear paths to improvement. Services/B2B pages at 5.22
                  represent the next frontier — requiring new signal detection patterns optimized for enterprise trust,
                  outcomes-based value propositions, and relationship-driven sales cycles.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Panel 2: Category Performance Analysis */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--color-accent)' }}>
          Category Performance Analysis
        </h2>

        {activeView === 'services' && (
          <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
            Services and B2B categories show uniformly low scores, with Enterprise Software leading at just 7.87
            and most categories below 6.0. This pattern reveals that traditional ML signal detection is optimized
            for consumer products, not service businesses.
          </p>
        )}

        {/* Bar Chart */}
        <div className="mb-8">
          <ResponsiveContainer width="100%" height={activeView === 'services' ? 600 : 400}>
            <BarChart
              data={[...BENCHMARK_DATA.categories].sort((a, b) => b.avg - a.avg).slice(0, activeView === 'all' ? 10 : undefined)}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
              />
              <YAxis
                label={{ value: 'Average ML Score', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-mid)' } }}
                tick={{ fill: 'var(--color-text-mid)' }}
                domain={activeView === 'services' ? [0, 10] : [0, 60]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text)'
                }}
              />
              <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
                {BENCHMARK_DATA.categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Category Narratives - Products View */}
        {activeView === 'products' && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
                  Telecom (55.4 avg, Top Performer)
                </h3>
                <span className="badge badge-green">Leader</span>
              </div>
              <p style={{ color: 'var(--color-text-mid)' }}>
                Telecom companies lead with an average score of 55.4, driven by strong bundle offerings and clear
                pricing structures. T-Mobile's home internet page (81.3) sets the benchmark with exceptional
                third-party authority signals, detailed plan comparisons, and regulatory transparency.
              </p>
            </div>

            <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--color-text)' }}>
                Electronics (51.0)
              </h3>
              <p style={{ color: 'var(--color-text-mid)' }}>
                Electronics retailers average 51.0, with gaming brands like Razer (72.1) excelling through detailed
                product specifications and bundle options. The category succeeds with specification-heavy content.
              </p>
            </div>

            <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--color-text)' }}>
                Software (49.4)
              </h3>
              <p style={{ color: 'var(--color-text-mid)' }}>
                Software companies average 49.4. Modern SaaS design prioritizes minimalism over comprehensive
                information display, leaving AI systems with insufficient data for recommendations.
              </p>
            </div>

            <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--color-text)' }}>
                Apparel (44.5, Bottom)
              </h3>
              <p style={{ color: 'var(--color-text-mid)' }}>
                Apparel is the lowest-performing category. DTC brands struggle to communicate value in AI-readable
                formats. Human-trust signals don't translate to machine-readable confidence indicators.
              </p>
            </div>
          </div>
        )}

        {/* Detailed Category Narratives - Services View */}
        {activeView === 'services' && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
                  Enterprise Software (7.87 avg, Category Leader)
                </h3>
                <span className="badge badge-amber">Highest in B2B</span>
              </div>
              <p style={{ color: 'var(--color-text-mid)' }}>
                Enterprise software leads the B2B benchmark but still scores only 7.87 — an 84% gap from consumer
                products. ServiceNow (17.1) tops the category by communicating platform capabilities and AI/automation
                positioning. These pages have valuable signals (enterprise trust, compliance certifications, customer
                logos) that need B2B-specific detection patterns.
              </p>
            </div>

            <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--color-text)' }}>
                B2B SaaS (5.3)
              </h3>
              <p style={{ color: 'var(--color-text-mid)' }}>
                Despite 20 pages analyzed, B2B SaaS averages just 5.3. These pages prioritize conversion CTAs
                ("Request Demo", "Talk to Sales") over information depth. Signals like "Trusted by 10,000+ companies"
                and SOC 2 compliance badges exist but aren't detected by consumer-focused patterns.
              </p>
            </div>

            <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--color-text)' }}>
                Healthcare Services (6.01)
              </h3>
              <p style={{ color: 'var(--color-text-mid)' }}>
                Healthcare and telehealth services average 6.01. These pages have strong trust signals (HIPAA compliance,
                board-certified doctors, clinical outcomes) that require medical/healthcare-specific detection patterns.
              </p>
            </div>

            <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--color-text)' }}>
                Travel & Hospitality (2.7, Bottom)
              </h3>
              <p style={{ color: 'var(--color-text-mid)' }}>
                Travel sites score lowest at 2.7. Pages like Kayak and Expedia are search interfaces rather than
                content pages — their value is in real-time search, not static information AI can evaluate. This
                represents a fundamental mismatch between service delivery and ML scoring.
              </p>
            </div>

            <div
              className="p-6 rounded-lg mt-6"
              style={{ backgroundColor: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)' }}
            >
              <h3 className="font-semibold mb-3" style={{ color: 'var(--color-accent)' }}>Why Services Score Lower</h3>
              <p style={{ color: 'var(--color-text)' }}>
                The 89% gap between products (49.6) and services (5.22) isn't a quality judgment — it reflects
                different value communication patterns. Products have specifications, prices, reviews. Services
                have outcomes, relationships, trust. The ML scoring system was calibrated on products and needs
                B2B-specific patterns: enterprise trust indicators, compliance certifications, case study references,
                SLA guarantees, and customer success signals.
              </p>
            </div>
          </div>
        )}

        {/* Combined View Summary */}
        {activeView === 'all' && (
          <div className="space-y-6">
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--color-text)' }}>
                Two-Tier Optimization Landscape
              </h3>
              <p style={{ color: 'var(--color-text-mid)' }}>
                The combined benchmark reveals a bimodal distribution. Consumer products cluster around 40-60 with
                clear optimization paths. Services/B2B pages cluster near 0-10, requiring fundamentally different
                signal detection approaches. This isn't about one being "better" — it's about different value
                communication patterns that need different measurement approaches.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Panel 3: Signal Presence Analysis */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--color-accent)' }}>
          Signal Presence Analysis
        </h2>

        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          Measuring how often each of the 26 AI preference dimensions appears across the {BENCHMARK_DATA.total_pages} analyzed pages.
        </p>

        {/* Horizontal Bar Chart */}
        <div className="mb-8">
          <ResponsiveContainer width="100%" height={600}>
            <BarChart
              data={BENCHMARK_DATA.signalPresence}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 180, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
                label={{ value: 'Presence Rate (%)', position: 'insideBottom', offset: -5, style: { fill: 'var(--color-text-mid)' } }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: 'var(--color-text)', fontSize: 11 }}
                width={170}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text)'
                }}
                formatter={(value: any) => [`${value}%`, 'Presence Rate']}
              />
              <Bar dataKey="rate" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Signals Narrative */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-score-high-bg)', border: '1px solid var(--color-score-high)' }}>
            <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-score-high)' }}>
              Most Present Signals
            </h3>
            <div className="space-y-3 text-sm" style={{ color: 'var(--color-text-mid)' }}>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Novelty Seeking (77%)</span>
                  <span>77%</span>
                </div>
                <p>Most pages communicate what's new about their products. This is table stakes — brands understand the importance of positioning products as current and innovative.</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Specificity Preference (69%)</span>
                  <span>69%</span>
                </div>
                <p>Detailed specifications are common, especially in electronics and technical categories. Products with measurable attributes naturally include spec sheets.</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Information Depth (66%)</span>
                  <span>66%</span>
                </div>
                <p>Pages generally provide adequate detail. Most brands recognize that customers need information to make decisions, though depth varies by category.</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Recommendation Revision (61%)</span>
                  <span>61%</span>
                </div>
                <p>Many pages have content that could trigger recommendation changes — highlighting unique benefits or addressing specific use cases that differentiate products.</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Bundle Preference (53%)</span>
                  <span>53%</span>
                </div>
                <p>About half of pages mention bundles or packages. More common in telecom and electronics; rare in apparel and personal care.</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-score-low-bg)', border: '1px solid var(--color-score-low)' }}>
            <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-score-low)' }}>
              Most Missing Signals
            </h3>
            <div className="space-y-3 text-sm" style={{ color: 'var(--color-text-mid)' }}>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Ethical Concern (3%)</span>
                  <span>3%</span>
                </div>
                <p>ESG and ethical sourcing signals are almost entirely absent. Even brands with strong ethical practices fail to communicate them in AI-readable formats.</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Local Preference (6%)</span>
                  <span>6%</span>
                </div>
                <p>Almost no pages mention local sourcing or production. This represents a massive missed opportunity for brands with local manufacturing stories.</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Negative Review Weight (14%)</span>
                  <span>14%</span>
                </div>
                <p>Very few pages address potential concerns proactively. Brands avoid mentioning limitations, missing the opportunity to build trust through transparency.</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Social Proof (17%)</span>
                  <span>17%</span>
                </div>
                <p>Despite being the #1 AI selection driver in research, only 17% of pages have visible social proof. Reviews exist but aren't prominently displayed or are hidden behind clicks.</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Sustainability (17%)</span>
                  <span>17%</span>
                </div>
                <p>Environmental messaging remains rare despite growing importance to both consumers and AI recommendation systems. Even eco-focused brands often fail to quantify impact.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Panel 4: The Signal Gap */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--color-accent)' }}>
          The Signal Gap
        </h2>

        <div
          className="p-8 rounded-lg mb-8 text-center"
          style={{ backgroundColor: 'var(--color-score-mid-bg)', border: '2px solid var(--color-score-mid)' }}
        >
          <div className="metric-xl" style={{ color: 'var(--color-score-mid)' }}>54%</div>
          <p className="text-lg mt-4" style={{ color: 'var(--color-text)' }}>
            <strong>The average page is missing 54% of the signals AI models look for.</strong>
          </p>
          <p className="mt-2" style={{ color: 'var(--color-text-mid)' }}>
            This represents a massive optimization opportunity. Early adopters can gain significant competitive advantages by addressing these gaps.
          </p>
        </div>

        <div className="space-y-4" style={{ color: 'var(--color-text-mid)' }}>
          <p>
            We measured the "target signal strength" for each dimension based on top-performing pages, then
            calculated how many pages reach that target. The results are sobering:
          </p>

          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th className="text-center">Pages at Target</th>
                  <th className="text-center">Percent</th>
                  <th>Average Gap</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Bundle Preference</td>
                  <td className="text-center font-mono">24 / 213</td>
                  <td className="text-center font-mono">11%</td>
                  <td><span className="badge badge-amber">47 points</span></td>
                </tr>
                <tr>
                  <td className="font-medium">Specificity Preference</td>
                  <td className="text-center font-mono">18 / 213</td>
                  <td className="text-center font-mono">8%</td>
                  <td><span className="badge badge-amber">51 points</span></td>
                </tr>
                <tr>
                  <td className="font-medium">Third-Party Authority</td>
                  <td className="text-center font-mono">12 / 213</td>
                  <td className="text-center font-mono">6%</td>
                  <td><span className="badge badge-red">67 points</span></td>
                </tr>
                <tr>
                  <td className="font-medium">Sustainability</td>
                  <td className="text-center font-mono">8 / 213</td>
                  <td className="text-center font-mono">4%</td>
                  <td><span className="badge badge-red">83 points</span></td>
                </tr>
                <tr>
                  <td className="font-medium">Social Proof</td>
                  <td className="text-center font-mono">0 / 213</td>
                  <td className="text-center font-mono">0%</td>
                  <td><span className="badge badge-red">83 points</span></td>
                </tr>
                <tr>
                  <td className="font-medium">Local Preference</td>
                  <td className="text-center font-mono">0 / 213</td>
                  <td className="text-center font-mono">0%</td>
                  <td><span className="badge badge-red">94 points</span></td>
                </tr>
                <tr>
                  <td className="font-medium">Ethical Concern</td>
                  <td className="text-center font-mono">0 / 213</td>
                  <td className="text-center font-mono">0%</td>
                  <td><span className="badge badge-red">97 points</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            className="p-6 rounded-lg mt-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>What This Means</h3>
            <p>
              <strong>Only 24 of 213 pages (11%) hit the target for Bundle Preference</strong> — the
              best-performing dimension. For Social Proof, <strong>ZERO pages hit the target</strong>, despite
              social proof being the #1 driver of AI recommendations in our research. Even pages with reviews
              don't display them prominently enough for maximum AI impact.
            </p>
            <p className="mt-3">
              For Ethical Concern and Local Preference, <strong>virtually no pages even attempt these signals</strong>.
              This creates a blue ocean opportunity: brands that authentically communicate ethics and locality can
              dominate AI recommendations in those dimensions with minimal competition.
            </p>
          </div>
        </div>
      </section>

      {/* Panel 5: Model Consensus Analysis */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--color-accent)' }}>
          Model Consensus Analysis
        </h2>

        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          All six AI models show remarkably similar scoring patterns, with averages ranging from 44.6 (Perplexity)
          to 49.1 (Gemini). This consensus suggests the signals measured are truly universal across AI systems,
          not model-specific quirks.
        </p>

        {/* Model Comparison Chart */}
        <div className="mb-8">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={BENCHMARK_DATA.models}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
              />
              <YAxis
                label={{ value: 'Average Score', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-mid)' } }}
                tick={{ fill: 'var(--color-text-mid)' }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text)'
                }}
              />
              <Bar dataKey="avg" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="min" fill="var(--color-score-low)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="max" fill="var(--color-score-high)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Model Analysis */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-text)' }}>
              Cross-Model Consistency
            </h3>
            <div className="space-y-4 text-sm" style={{ color: 'var(--color-text-mid)' }}>
              <p>
                The 4.5-point spread between the most lenient (Gemini, 49.1) and strictest (Perplexity, 44.6)
                models is remarkably small given the diversity of architectures and training approaches. This
                consistency validates our research: these signals represent fundamental patterns in how AI
                systems evaluate product information, not artifacts of specific model implementations.
              </p>
              <p>
                GPT-5.4, Claude, and Gemini cluster tightly around 48-49, suggesting similar training on commercial
                content evaluation. O3's reasoning capabilities don't significantly change its scoring (47.2),
                indicating that these signals work at the system level, not just for quick-response models.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-text)' }}>
              Perplexity: The Strict Evaluator
            </h3>
            <div className="space-y-4 text-sm" style={{ color: 'var(--color-text-mid)' }}>
              <p>
                Perplexity is the strictest evaluator at 44.6 average, likely due to its search-oriented training
                emphasizing factual grounding and source attribution. Pages that score well with Perplexity tend
                to have exceptional third-party authority signals and detailed specificity.
              </p>
              <p>
                The Perplexity-Gemini spread of 4.5 points means your score should be relatively consistent
                regardless of which AI recommends you. If you optimize for the strictest model (Perplexity), you'll
                perform well across all platforms. Conversely, a page scoring 40 with Gemini will still score
                poorly (~36) with Perplexity — there's no gaming the system.
              </p>
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-lg"
          style={{ backgroundColor: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)' }}
        >
          <h3 className="font-semibold mb-3" style={{ color: 'var(--color-accent)' }}>Strategic Implication</h3>
          <p style={{ color: 'var(--color-text)' }}>
            Because all models show similar patterns, you don't need separate optimization strategies for
            different AI platforms. Focus on the fundamental signals — social proof, specificity, third-party
            authority, sustainability — and your improvements will translate across all AI recommendation systems.
            This makes ML optimization more approachable: one comprehensive improvement benefits all channels.
          </p>
        </div>
      </section>

      {/* Panel 6: Top Performers Deep Dive */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--color-accent)' }}>
          {activeView === 'services'
            ? 'Top Services/B2B Performers'
            : activeView === 'all'
            ? 'Top Performers Across All Categories'
            : 'Top 10 Performers: What Makes Them Succeed'}
        </h2>

        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          {activeView === 'services'
            ? 'Even the highest-scoring services/B2B pages max out around 22 — revealing the need for B2B-specific signal detection. These leaders show what works even with current limitations.'
            : 'Detailed analysis of the highest-scoring pages, examining specific signals and extracting lessons for other brands.'}
        </p>

        <div className="space-y-6">
          {(activeView === 'services' ? SERVICES_BENCHMARK.topPerformers : PRODUCTS_BENCHMARK.topPerformers).map((page) => (
            <div
              key={page.rank}
              className="p-6 rounded-lg"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                      style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                    >
                      #{page.rank}
                    </span>
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
                      {page.domain}
                    </h3>
                    <span className="badge badge-neutral">{page.category}</span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--color-text-soft)' }}>
                    {page.url}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: 'var(--color-score-high)' }}>
                    {page.score}
                  </div>
                  <div className="text-xs mb-2" style={{ color: 'var(--color-text-soft)' }}>ML Score</div>
                  <Link
                    href={`/score?url=${encodeURIComponent(page.url)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                  >
                    View Report →
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text-mid)' }}>
                  Why it succeeds:
                </h4>
                <ul className="space-y-1 text-sm" style={{ color: 'var(--color-text-mid)' }}>
                  {page.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span style={{ color: 'var(--color-score-high)' }}>✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-subtle)' }}
              >
                <h4 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-accent)' }}>
                  Key Lesson:
                </h4>
                <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
                  {page.lesson}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Panel 7: Bottom Performers Analysis */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--color-accent)' }}>
          {activeView === 'services'
            ? 'Services/B2B Pages Scoring Zero'
            : 'Bottom 10 Performers: Understanding The Gap'}
        </h2>

        <div
          className="p-6 rounded-lg mb-6"
          style={{ backgroundColor: 'var(--color-score-low-bg)', border: '1px solid var(--color-score-low)' }}
        >
          <h3 className="font-semibold mb-3" style={{ color: 'var(--color-score-low)' }}>Common Pattern</h3>
          {activeView === 'services' ? (
            <p style={{ color: 'var(--color-text)' }}>
              Many service pages score 0.0 — not because they lack value, but because their content model doesn't
              match product-based signal detection. <strong>Search interfaces, marketplace platforms, and app-focused
              pages</strong> deliver value through functionality rather than static content. This highlights the need
              for service-specific evaluation approaches that measure outcomes, integrations, and relationship signals.
            </p>
          ) : (
            <p style={{ color: 'var(--color-text)' }}>
              The bottom 10 share a consistent pattern: <strong>zero social proof, zero third-party authority,
              and minimal specificity</strong>. Critically, these aren't bad products — Blue Bottle Coffee, Linear,
              and Paula's Choice are all market leaders with loyal customers and strong brands. They simply haven't
              optimized for AI visibility. This demonstrates that brand strength and product quality don't
              automatically translate to ML scores.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {(activeView === 'services' ? SERVICES_BENCHMARK.bottomPerformers : PRODUCTS_BENCHMARK.bottomPerformers).map((page) => (
            <div
              key={page.rank}
              className="p-6 rounded-lg"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: 'var(--color-score-low)', color: 'white' }}
                    >
                      #{page.rank}
                    </span>
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
                      {page.domain}
                    </h3>
                    <span className="badge badge-neutral">{page.category}</span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--color-text-soft)' }}>
                    {page.url}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: 'var(--color-score-low)' }}>
                    {page.score}
                  </div>
                  <div className="text-xs mb-2" style={{ color: 'var(--color-text-soft)' }}>ML Score</div>
                  <Link
                    href={`/score?url=${encodeURIComponent(page.url)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-text-mid)', color: 'white' }}
                  >
                    View Report →
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text-mid)' }}>
                  Missing signals:
                </h4>
                <ul className="space-y-1 text-sm" style={{ color: 'var(--color-text-mid)' }}>
                  {page.issues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span style={{ color: 'var(--color-score-low)' }}>✗</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-subtle)' }}
              >
                <h4 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-score-low)' }}>
                  Pattern:
                </h4>
                <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
                  {page.pattern}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-8 p-6 rounded-lg"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            The Good News
          </h3>
          <p style={{ color: 'var(--color-text-mid)' }}>
            None of these issues are structural — they're all fixable with content updates. Blue Bottle could
            add customer testimonials and origin story details. Linear could showcase customer logos and use
            cases. Paula's Choice could display clinical research and dermatologist endorsements. The brands
            already have this information; they just need to make it AI-accessible. A page scoring 40 today
            could reach 65+ with strategic content additions that don't require product changes or major
            redesigns.
          </p>
        </div>
      </section>

      {/* Panel 8: Actionable Insights */}
      <section className="card p-8">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: 'var(--color-accent)' }}>
          Actionable Insights: What To Do Next
        </h2>

        <div className="space-y-6 mb-8">
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-accent)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>
                  Add Social Proof
                </h3>
                <p className="mb-3" style={{ color: 'var(--color-text-mid)' }}>
                  <strong>83% of pages lack visible reviews/ratings.</strong> If you have reviews, display them
                  prominently above the fold. Include star ratings, review counts, and specific testimonials.
                  If you don't have reviews yet, start with customer logos, case study quotes, or social media
                  mentions. Even basic social proof beats none.
                </p>
                <div className="text-sm p-3 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>Quick win:</span> Add
                  "4.8 stars from 1,247 customers" to your hero section if you have it.
                </div>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-accent)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>
                  Show Third-Party Authority
                </h3>
                <p className="mb-3" style={{ color: 'var(--color-text-mid)' }}>
                  <strong>Only 33% mention awards, certifications, or press.</strong> If you've won awards,
                  earned certifications, or been featured in media, display those signals. AI models weight
                  external validation heavily. Industry certifications, "As seen in..." press logos, and
                  award badges all count.
                </p>
                <div className="text-sm p-3 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>Quick win:</span> Add
                  a trust badge section with any press mentions, certifications, or awards.
                </div>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-accent)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>
                  Communicate Bundle Options
                </h3>
                <p className="mb-3" style={{ color: 'var(--color-text-mid)' }}>
                  <strong>47% miss bundle/package signals.</strong> If your product can be combined with others,
                  make that clear. "Frequently bought together," "Complete the set," or "Bundle & save" sections
                  all trigger bundle preference signals. Even suggesting complementary products counts.
                </p>
                <div className="text-sm p-3 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>Quick win:</span> Add
                  "Buy with [complementary product] and save 15%" to product pages.
                </div>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-accent)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                4
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>
                  Address Sustainability
                </h3>
                <p className="mb-3" style={{ color: 'var(--color-text-mid)' }}>
                  <strong>83% have no environmental messaging.</strong> If you have any sustainability practices
                  — recycled materials, carbon offset shipping, energy-efficient production — mention them.
                  Quantify when possible: "Made from 80% recycled materials" beats "eco-friendly."
                </p>
                <div className="text-sm p-3 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>Quick win:</span> Add
                  a sustainability section even if it's basic: "Carbon-neutral shipping on all orders."
                </div>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-accent)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                5
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>
                  Include Local Signals
                </h3>
                <p className="mb-3" style={{ color: 'var(--color-text-mid)' }}>
                  <strong>94% miss local production/sourcing.</strong> If you manufacture locally, source
                  locally, or have local roots, say so explicitly. "Made in Portland, Oregon" or "Locally
                  sourced ingredients" are powerful differentiators with almost zero competition in this
                  dimension.
                </p>
                <div className="text-sm p-3 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>Quick win:</span> Add
                  location information if applicable: "Handcrafted in Brooklyn since 2018."
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div
          className="p-8 rounded-lg text-center"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        >
          <h3 className="font-display text-2xl font-bold mb-4">
            Ready to Optimize Your Machine Likeability?
          </h3>
          <p className="mb-6 text-lg opacity-90">
            Use our ML Score tool to analyze your product pages and get specific, actionable recommendations
            for improving AI discoverability.
          </p>
          <a href="/score" className="inline-block px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:scale-105" style={{ backgroundColor: 'white', color: 'var(--color-accent)' }}>
            Score Your Page Now
          </a>
        </div>
      </section>
    </div>
  );
}
