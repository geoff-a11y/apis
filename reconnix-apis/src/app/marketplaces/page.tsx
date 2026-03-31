// src/app/marketplaces/page.tsx — Marketplace-specific insights (Phase 2)
'use client';

import { useState } from 'react';
import { B2CvsB2BComparison, ContextDifferenceTable } from '@/components/charts/ContextComparison';
import { ContextSwitcher, type Context } from '@/components/ui/ContextSwitcher';
import { getEffectSizes, getDimensions } from '@/lib/data';

export default function MarketplacesPage() {
  const [selectedContext, setSelectedContext] = useState<Context>('pooled');

  const marketplaces = [
    {
      id: 'amazon',
      name: 'Amazon',
      logo: '/images/marketplaces/amazon.svg',
      status: 'coming-soon',
      description: 'Product detail page optimization for Amazon listings',
    },
    {
      id: 'walmart',
      name: 'Walmart',
      logo: '/images/marketplaces/walmart.svg',
      status: 'coming-soon',
      description: 'Walmart Marketplace content optimization',
    },
    {
      id: 'google-shopping',
      name: 'Google Shopping',
      logo: '/images/marketplaces/google.svg',
      status: 'coming-soon',
      description: 'Product data feed optimization for Google Shopping',
    },
    {
      id: 'web',
      name: 'D2C / Web',
      logo: '/images/marketplaces/web.svg',
      status: 'available',
      description: 'Direct-to-consumer website product pages',
    },
  ];

  // Calculate context-specific stats
  const b2cEffects = getEffectSizes('b2c');
  const b2bEffects = getEffectSizes('b2b');
  const dimensions = getDimensions();

  const b2cMean = b2cEffects.length > 0
    ? b2cEffects.reduce((sum, e) => sum + e.cohen_h, 0) / b2cEffects.length
    : 0;
  const b2bMean = b2bEffects.length > 0
    ? b2bEffects.reduce((sum, e) => sum + e.cohen_h, 0) / b2bEffects.length
    : 0;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold text-navy mb-2">
          Marketplaces
        </h1>
        <p className="text-text-mid max-w-2xl">
          Platform-specific guidance for optimizing product content. Each marketplace
          has unique constraints and opportunities for applying APIS insights.
        </p>
      </section>

      {/* Marketplace cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {marketplaces.map((mp) => (
          <div
            key={mp.id}
            className={`card p-6 ${mp.status === 'coming-soon' ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-light rounded-lg flex items-center justify-center">
                <span className="text-blue font-bold text-lg">
                  {mp.name.charAt(0)}
                </span>
              </div>
              <span className={`badge ${mp.status === 'available' ? 'badge-green' : 'badge-amber'}`}>
                {mp.status === 'available' ? 'Available' : 'Coming Soon'}
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold text-navy mb-2">
              {mp.name}
            </h3>
            <p className="text-text-mid text-sm">
              {mp.description}
            </p>
            {mp.status === 'available' && (
              <button className="btn-secondary mt-4 text-sm py-2 px-4">
                View Guide
              </button>
            )}
          </div>
        ))}
      </section>

      {/* Context switching info */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold text-navy mb-4">
          B2B vs B2C Contexts
        </h2>
        <p className="text-text-mid mb-4">
          Our research measures effect sizes in both B2C and B2B purchase contexts.
          Many dimensions show different effect magnitudes depending on the context.
        </p>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 rounded-lg bg-blue-light">
            <h3 className="font-medium text-navy mb-2">B2C Context</h3>
            <p className="text-sm text-text-mid mb-3">
              Consumer products with emotional decision factors, lower price points,
              and individual purchasers. Social proof and urgency signals tend to
              have stronger effects.
            </p>
            <div className="text-xs text-text-soft">
              Mean effect: <span className="font-mono font-semibold text-navy">h = {b2cMean.toFixed(3)}</span>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-blue-light">
            <h3 className="font-medium text-navy mb-2">B2B Context</h3>
            <p className="text-sm text-text-mid mb-3">
              Business products with rational decision factors, higher price points,
              and organizational purchasers. Authority and specification signals
              tend to have stronger effects.
            </p>
            <div className="text-xs text-text-soft">
              Mean effect: <span className="font-mono font-semibold text-navy">h = {b2bMean.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* B2C vs B2B Comparison */}
      <section>
        <B2CvsB2BComparison topN={10} />
      </section>

      {/* Full comparison table */}
      <section>
        <h2 className="font-display text-2xl font-semibold text-navy mb-4">
          All Dimensions - Context Differences
        </h2>
        <p className="text-text-mid text-sm mb-4">
          Complete breakdown of effect size differences across all {dimensions.length} dimensions.
          Higher differences indicate dimensions that respond differently to B2C vs B2B contexts.
        </p>
        <ContextDifferenceTable showAll={true} />
      </section>
    </div>
  );
}
