'use client';

import { useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell
} from 'recharts';

// Types for price assessment
interface ProductInfo {
  name: string;
  brand?: string;
  price: number;
  category?: string;
  url?: string;
  description?: string;
}

interface ModelAnchor {
  model_id: string;
  model_name: string;
  median_price: number;
  competitor_count: number;
  weight: number;
}

interface CompetitorInfo {
  name: string;
  brand: string;
  price_low: number;
  price_high: number;
  price_typical: number;
  differentiator?: string;
  source_model: string;
}

interface PriceAssessment {
  product: ProductInfo;
  assessed_at: string;
  weighted_anchor: number;
  model_anchors: ModelAnchor[];
  current_multiplier: number;
  cliff_threshold: number;
  cliff_category: string;
  zone: 'green' | 'yellow' | 'red';
  headroom: number;
  headroom_pct: number;
  competitors: CompetitorInfo[];
  competitor_range: { min: number; max: number; median: number };
  recommendation: string;
  risk_level: string;
  suggested_price_range: { conservative: number; moderate: number; aggressive: number };
}

interface WhatIfResult {
  price: number;
  multiplier: number;
  zone: 'green' | 'yellow' | 'red';
  recommendation: string;
  delta_from_current: number;
  delta_pct: number;
}

// Category options
const CATEGORIES = [
  { value: 'default', label: 'General / Other' },
  { value: 'household_consumables', label: 'Household Consumables' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'apparel_footwear', label: 'Apparel & Footwear' },
  { value: 'nutrition_supplements', label: 'Nutrition & Supplements' },
  { value: 'small_appliances', label: 'Small Appliances' },
  { value: 'b2b_software', label: 'B2B Software' },
  { value: 'professional_services', label: 'Professional Services' },
];

const SEGMENTS = [
  { value: 'b2c', label: 'B2C (Consumer)' },
  { value: 'b2b', label: 'B2B (Business)' },
];

// Zone colors
const ZONE_COLORS = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

// Loading component
function PageLoading() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          AI Price Competitiveness Assessment
        </h1>
        <p className="max-w-2xl" style={{ color: 'var(--color-text-mid)' }}>
          Loading...
        </p>
      </section>
    </div>
  );
}

// Main page component
export default function PriceAssessmentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PriceAssessmentInner />
    </Suspense>
  );
}

function PriceAssessmentInner() {
  // Form state
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('default');
  const [segment, setSegment] = useState('b2c');

  // Analysis state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PriceAssessment | null>(null);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfResult[] | null>(null);

  // What-if state
  const [whatIfPrices, setWhatIfPrices] = useState('');

  const handleAnalyze = useCallback(async () => {
    if (!productName || !price) {
      setError('Please enter product name and price');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setWhatIfResults(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_ML_SCORE_API_URL || 'https://api.agentonomics.io';
      const response = await fetch(`${apiUrl}/api/v1/price-assessment/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: productName,
            brand: brand || undefined,
            price: priceNum,
            category: category !== 'default' ? category : undefined,
          },
          segment,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Analysis failed: ${response.statusText}`);
      }

      const data: PriceAssessment = await response.json();
      setResult(data);

      // Auto-generate what-if scenarios
      const anchor = data.weighted_anchor;
      const scenarios = [
        Math.round(anchor * 0.8 * 100) / 100,
        Math.round(anchor * 1.0 * 100) / 100,
        Math.round(anchor * 1.2 * 100) / 100,
        Math.round(anchor * 1.5 * 100) / 100,
        Math.round(anchor * 1.8 * 100) / 100,
        Math.round(anchor * 2.0 * 100) / 100,
        Math.round(anchor * 2.5 * 100) / 100,
      ];
      setWhatIfPrices(scenarios.join(', '));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  }, [productName, brand, price, category, segment]);

  const handleWhatIf = useCallback(async () => {
    if (!result || !whatIfPrices) return;

    const prices = whatIfPrices
      .split(',')
      .map(p => parseFloat(p.trim()))
      .filter(p => !isNaN(p) && p > 0);

    if (prices.length === 0) {
      setError('Please enter valid prices for what-if analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_ML_SCORE_API_URL || 'https://api.agentonomics.io';
      const response = await fetch(`${apiUrl}/api/v1/price-assessment/whatif`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: result.product,
          new_prices: prices,
          segment,
        }),
      });

      if (!response.ok) {
        throw new Error('What-if analysis failed');
      }

      const data: WhatIfResult[] = await response.json();
      setWhatIfResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'What-if analysis failed');
    } finally {
      setIsLoading(false);
    }
  }, [result, whatIfPrices, segment]);

  // Chart data for what-if visualization
  const whatIfChartData = whatIfResults?.map(r => ({
    price: r.price,
    multiplier: r.multiplier,
    zone: r.zone,
    fill: ZONE_COLORS[r.zone],
  })) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <div className="flex items-center gap-2 text-sm mb-4" style={{ color: 'var(--color-text-mid)' }}>
          <Link href="/apis/pricing" className="hover:underline">Pricing Study</Link>
          <span>/</span>
          <span>Price Assessment</span>
        </div>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          AI Price Competitiveness Assessment
        </h1>
        <p className="max-w-2xl" style={{ color: 'var(--color-text-mid)' }}>
          Analyze whether your product price is within AI recommendation thresholds.
          Based on the <Link href="/apis/pricing/methodology" className="underline hover:text-white">APIS Price Sensitivity Study</Link> of 17,200 AI purchase decisions.
        </p>
      </section>

      {/* Input Form */}
      <section className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
        <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Product Details</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-mid)' }}>
              Product Name *
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Premium Wireless Headphones"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-mid)' }}>
              Brand
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., AudioTech"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-mid)' }}>
              Current Price (USD) *
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 149.99"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-mid)' }}>
              Product Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-mid)' }}>
              Market Segment
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              {SEGMENTS.map(seg => (
                <option key={seg.value} value={seg.value}>{seg.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !productName || !price}
            className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
            }}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Price'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            {error}
          </div>
        )}
      </section>

      {/* Results */}
      {result && (
        <>
          {/* Zone Summary */}
          <section className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Assessment Result</h2>
              <div
                className="px-4 py-2 rounded-full font-semibold text-sm uppercase"
                style={{
                  backgroundColor: `${ZONE_COLORS[result.zone]}20`,
                  color: ZONE_COLORS[result.zone],
                  border: `1px solid ${ZONE_COLORS[result.zone]}`,
                }}
              >
                {result.zone === 'green' ? 'Competitive' : result.zone === 'yellow' ? 'Borderline' : 'Above Cliff'}
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  ${result.weighted_anchor.toFixed(2)}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                  Weighted Anchor
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                <div className="text-2xl font-bold" style={{ color: ZONE_COLORS[result.zone] }}>
                  {result.current_multiplier.toFixed(2)}x
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                  Price Multiplier
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                <div className="text-2xl font-bold" style={{ color: result.headroom >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                  {result.headroom >= 0 ? '+' : ''}${result.headroom.toFixed(2)}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                  Headroom to Cliff
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {result.cliff_threshold.toFixed(1)}x
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                  Cliff Threshold
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
              <p style={{ color: 'var(--color-text)' }}>{result.recommendation}</p>
            </div>
          </section>

          {/* Model Anchors */}
          <section className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Model-Specific Anchors</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-mid)' }}>
              Each AI model discovers its own competitive set. The weighted anchor is the market-share-weighted median of these anchors.
            </p>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={result.model_anchors.map(a => ({
                    name: a.model_name,
                    anchor: a.median_price,
                    weight: a.weight * 100,
                    competitors: a.competitor_count,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-text-mid)" domain={[0, 'dataMax']} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="var(--color-text-mid)" width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'anchor') return [`$${value.toFixed(2)}`, 'Anchor Price'];
                      if (name === 'weight') return [`${value.toFixed(0)}%`, 'Market Weight'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="anchor" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
                  <ReferenceLine x={result.product.price} stroke="var(--color-red)" strokeDasharray="5 5" label={{ value: 'Your Price', fill: 'var(--color-red)', fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Suggested Price Range */}
          <section className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Suggested Price Range</h2>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: `${ZONE_COLORS.green}15`, border: `1px solid ${ZONE_COLORS.green}40` }}>
                <div className="text-xl font-bold" style={{ color: ZONE_COLORS.green }}>
                  ${result.suggested_price_range.conservative.toFixed(2)}
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Conservative</div>
                <div className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                  Safe zone - high recommendation likelihood
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: `${ZONE_COLORS.yellow}15`, border: `1px solid ${ZONE_COLORS.yellow}40` }}>
                <div className="text-xl font-bold" style={{ color: ZONE_COLORS.yellow }}>
                  ${result.suggested_price_range.moderate.toFixed(2)}
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Moderate</div>
                <div className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                  At the cliff threshold
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: `${ZONE_COLORS.red}15`, border: `1px solid ${ZONE_COLORS.red}40` }}>
                <div className="text-xl font-bold" style={{ color: ZONE_COLORS.red }}>
                  ${result.suggested_price_range.aggressive.toFixed(2)}
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Aggressive</div>
                <div className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
                  Above cliff - needs strong justification
                </div>
              </div>
            </div>
          </section>

          {/* What-If Analysis */}
          <section className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-text)' }}>What-If Price Analysis</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-mid)' }}>
              Simulate different price points to find your optimal price.
            </p>

            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={whatIfPrices}
                onChange={(e) => setWhatIfPrices(e.target.value)}
                placeholder="e.g., 99.99, 119.99, 149.99"
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
              <button
                onClick={handleWhatIf}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                Simulate
              </button>
            </div>

            {whatIfResults && whatIfResults.length > 0 && (
              <>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={whatIfChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="price" stroke="var(--color-text-mid)" tickFormatter={(v) => `$${v}`} />
                      <YAxis stroke="var(--color-text-mid)" label={{ value: 'Multiplier', angle: -90, position: 'insideLeft', fill: 'var(--color-text-mid)' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-bg-elevated)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)}x`, 'Multiplier']}
                        labelFormatter={(label) => `$${label}`}
                      />
                      <ReferenceLine y={result.cliff_threshold} stroke="var(--color-red)" strokeDasharray="5 5" label={{ value: 'Cliff', fill: 'var(--color-red)', fontSize: 12 }} />
                      <Bar dataKey="multiplier" radius={[4, 4, 0, 0]}>
                        {whatIfChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Price</th>
                        <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Multiplier</th>
                        <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Zone</th>
                        <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Delta</th>
                        <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Assessment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whatIfResults.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td className="py-2 px-3 font-mono" style={{ color: 'var(--color-text)' }}>${r.price.toFixed(2)}</td>
                          <td className="py-2 px-3 font-mono" style={{ color: ZONE_COLORS[r.zone] }}>{r.multiplier.toFixed(2)}x</td>
                          <td className="py-2 px-3">
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                              style={{
                                backgroundColor: `${ZONE_COLORS[r.zone]}20`,
                                color: ZONE_COLORS[r.zone],
                              }}
                            >
                              {r.zone}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono" style={{ color: r.delta_from_current < 0 ? 'var(--color-green)' : r.delta_from_current > 0 ? 'var(--color-red)' : 'var(--color-text-mid)' }}>
                            {r.delta_from_current >= 0 ? '+' : ''}${r.delta_from_current.toFixed(2)} ({r.delta_pct >= 0 ? '+' : ''}{r.delta_pct.toFixed(1)}%)
                          </td>
                          <td className="py-2 px-3 text-xs" style={{ color: 'var(--color-text-mid)' }}>{r.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Competitors Found */}
          {result.competitors.length > 0 && (
            <section className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-text)' }}>AI-Discovered Competitors</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-mid)' }}>
                Competitive set assembled by querying 4 AI models. Range: ${result.competitor_range.min.toFixed(2)} - ${result.competitor_range.max.toFixed(2)} (median: ${result.competitor_range.median.toFixed(2)})
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Product</th>
                      <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Brand</th>
                      <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Price Range</th>
                      <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Typical</th>
                      <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.competitors.slice(0, 12).map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>{c.name}</td>
                        <td className="py-2 px-3" style={{ color: 'var(--color-text-mid)' }}>{c.brand}</td>
                        <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--color-text-mid)' }}>
                          ${c.price_low.toFixed(2)} - ${c.price_high.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 font-mono" style={{ color: 'var(--color-text)' }}>${c.price_typical.toFixed(2)}</td>
                        <td className="py-2 px-3 text-xs" style={{ color: 'var(--color-text-mid)' }}>{c.source_model}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* Methodology Link */}
      <section className="text-center py-8" style={{ color: 'var(--color-text-mid)' }}>
        <p className="text-sm">
          Based on the APIS Price Sensitivity Study analyzing 17,200 AI purchase decisions.{' '}
          <Link href="/apis/pricing/methodology" className="underline hover:text-white">
            View full methodology
          </Link>
        </p>
      </section>
    </div>
  );
}
