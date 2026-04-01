'use client';

import Link from 'next/link';
import { ProductCategory } from '@/lib/types';
import { CATEGORY_PRICING_THRESHOLDS } from '@/lib/category-data';

interface PricingInsightsProps {
  category: ProductCategory;
}

export default function PricingInsights({ category }: PricingInsightsProps) {
  const pricing = CATEGORY_PRICING_THRESHOLDS[category];
  const cliffPercent = Math.round((pricing.cliff_multiplier - 1) * 100);

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
          Pricing Guidance for AI
        </h2>
        <Link
          href="/apis/pricing"
          className="text-xs hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          Pricing study (17,200 trials) →
        </Link>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--color-text-mid)' }}>
        From our pricing study: how AI agents respond to price premiums in your category.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {/* Price Cliff Threshold */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {pricing.cliff_multiplier}x
            </span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
              +{cliffPercent}%
            </span>
          </div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>Price Cliff Threshold</p>
          <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
            {pricing.description}
          </p>
        </div>

        {/* Position Bias */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold" style={{ color: '#22c55e' }}>+5.5pp</span>
          </div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>First Position Advantage</p>
          <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
            Products listed first get a 5.5 percentage point selection boost
          </p>
        </div>

        {/* Psychological Pricing */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--color-text-muted)' }}>0%</span>
          </div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>Charm Pricing Effect</p>
          <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
            .99 endings have zero effect on AI — focus on actual value
          </p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
          Pricing Recommendation
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
          {pricing.recommendation}. Beyond this threshold, AI models significantly reduce recommendation rates.
          Ensure your product appears in the top position when possible for an additional 5.5pp advantage.
        </p>
      </div>
    </section>
  );
}
