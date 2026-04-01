'use client';

import { MLScore } from '@/lib/types';

interface MachineReadabilityProps {
  score: MLScore;
}

// Schema markup checklist - what AI systems look for
const SCHEMA_CHECKLIST = [
  { id: 'product', name: 'Product Schema', description: 'Name, description, brand, SKU', importance: 'critical' },
  { id: 'offer', name: 'Offer/Price Schema', description: 'Price, availability, currency', importance: 'critical' },
  { id: 'reviews', name: 'AggregateRating Schema', description: 'Star ratings, review count', importance: 'high' },
  { id: 'brand', name: 'Brand Schema', description: 'Brand name, logo, URL', importance: 'medium' },
  { id: 'breadcrumb', name: 'BreadcrumbList Schema', description: 'Navigation hierarchy', importance: 'medium' },
  { id: 'faq', name: 'FAQ Schema', description: 'Common questions and answers', importance: 'low' },
];

export default function MachineReadability({ score }: MachineReadabilityProps) {
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'full': return '#22c55e';
      case 'partial': return '#f59e0b';
      case 'minimal': return '#ef4444';
      default: return 'var(--color-text-muted)';
    }
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'full': return 'Excellent - AI can fully understand this page';
      case 'partial': return 'Fair - Some content may be missed by AI';
      case 'minimal': return 'Poor - AI may struggle to extract key information';
      default: return 'Unknown';
    }
  };

  // Get detailed quality analysis
  const getQualityAnalysis = (quality: string) => {
    switch (quality) {
      case 'full':
        return {
          summary: 'This page has excellent machine readability.',
          details: [
            'Product information is well-structured and easily extractable',
            'Key attributes (price, availability, specs) are clearly marked',
            'Content hierarchy supports AI understanding of product benefits',
            'AI assistants can confidently represent this product to users'
          ],
          impact: 'AI assistants can accurately describe your product, increasing the likelihood of confident recommendations.'
        };
      case 'partial':
        return {
          summary: 'This page has moderate machine readability with room for improvement.',
          details: [
            'Some product information is structured, but gaps exist',
            'Key details may require AI inference rather than direct extraction',
            'Content organization could be clearer for machine parsing',
            'AI assistants may describe some features inaccurately or incompletely'
          ],
          impact: 'AI may miss important selling points or present incomplete information when recommending your product.'
        };
      case 'minimal':
        return {
          summary: 'This page has poor machine readability that limits AI understanding.',
          details: [
            'Product information is difficult for AI to extract accurately',
            'Key attributes are embedded in unstructured text or images',
            'Page structure makes it hard to identify product hierarchy',
            'AI assistants may misrepresent or skip this product entirely'
          ],
          impact: 'Poor readability significantly reduces the chance of AI recommending your product, as assistants prefer products they can describe accurately.'
        };
      default:
        return {
          summary: 'Machine readability could not be fully assessed.',
          details: [
            'Page content was partially extracted',
            'Some structured data may not have been detected'
          ],
          impact: 'Consider adding structured data to ensure AI can understand your product.'
        };
    }
  };

  // Estimate readability grade based on score
  const getReadabilityGrade = (readabilityScore: number) => {
    if (readabilityScore >= 80) return { grade: 'A', label: 'Excellent', color: '#22c55e' };
    if (readabilityScore >= 60) return { grade: 'B', label: 'Good', color: '#22c55e' };
    if (readabilityScore >= 40) return { grade: 'C', label: 'Fair', color: '#f59e0b' };
    if (readabilityScore >= 20) return { grade: 'D', label: 'Needs Work', color: '#f59e0b' };
    return { grade: 'F', label: 'Poor', color: '#ef4444' };
  };

  const readabilityGrade = getReadabilityGrade(score.readability_score || 0);
  const qualityAnalysis = getQualityAnalysis(score.extraction_quality);

  // Calculate zone distribution from signals
  const zoneStats = score.signal_inventory.reduce((acc, signal) => {
    if (signal.zone_contributions) {
      signal.zone_contributions.forEach(zc => {
        if (!acc[zc.zone]) acc[zc.zone] = { count: 0, avgScore: 0, total: 0 };
        acc[zc.zone].count++;
        acc[zc.zone].total += zc.score ?? 0;
      });
    }
    return acc;
  }, {} as Record<string, { count: number; avgScore: number; total: number }>);

  // Calculate averages
  Object.keys(zoneStats).forEach(zone => {
    zoneStats[zone].avgScore = zoneStats[zone].total / zoneStats[zone].count;
  });

  const zoneNames: Record<string, string> = {
    title: 'Product Title',
    bullets: 'Bullet Points',
    description: 'Description',
    specs: 'Specifications',
    reviews: 'Reviews Section',
    price: 'Price Area',
    header: 'Page Header',
    footer: 'Page Footer',
  };

  return (
    <section className="card p-6">
      <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        Machine Readability Analysis
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-mid)' }}>
        How easily AI systems can extract and understand your product information.
        This directly affects whether AI assistants can accurately represent your product when making recommendations.
      </p>

      {/* Quality Overview */}
      <div className="p-5 rounded-lg mb-6" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${getQualityColor(score.extraction_quality)}20` }}
          >
            <span
              className="text-2xl font-bold"
              style={{ color: getQualityColor(score.extraction_quality) }}
            >
              {readabilityGrade.grade}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {qualityAnalysis.summary}
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ backgroundColor: `${getQualityColor(score.extraction_quality)}20`, color: getQualityColor(score.extraction_quality) }}
              >
                {(score.extraction_quality || 'unknown').toUpperCase()}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Readability Score: {Math.round(score.readability_score || 0)}/100
            </p>
          </div>
        </div>

        {/* Detailed findings */}
        <div className="space-y-2 mb-4">
          {qualityAnalysis.details.map((detail, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-mid)' }}>
              <span style={{ color: getQualityColor(score.extraction_quality) }}>
                {score.extraction_quality === 'full' ? '✓' : score.extraction_quality === 'partial' ? '~' : '✗'}
              </span>
              <span>{detail}</span>
            </div>
          ))}
        </div>

        {/* Business impact */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
            <span className="font-medium">Business Impact:</span> {qualityAnalysis.impact}
          </p>
        </div>
      </div>

      {/* Issues and Zone Analysis - Side by side */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Readability Issues */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Detected Issues
          </h3>
          {score.readability_flags && score.readability_flags.length > 0 ? (
            <div className="space-y-2">
              {score.readability_flags.map((flag, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 rounded-lg"
                  style={{ backgroundColor: '#ef444410', border: '1px solid #ef444430' }}
                >
                  <span className="text-red-400 flex-shrink-0">!</span>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{flag}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
                      {flag.toLowerCase().includes('image') && 'AI cannot extract text from images - add alt text or HTML text equivalents.'}
                      {flag.toLowerCase().includes('javascript') && 'Content loaded via JavaScript may not be indexed by all AI systems.'}
                      {flag.toLowerCase().includes('pdf') && 'PDF content is harder for AI to parse - consider HTML alternatives.'}
                      {flag.toLowerCase().includes('frame') && 'Content in iframes may be inaccessible to AI crawlers.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#22c55e10', border: '1px solid #22c55e30' }}>
              <p className="text-sm" style={{ color: '#22c55e' }}>
                No critical readability issues detected
              </p>
            </div>
          )}
        </div>

        {/* Zone Distribution */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Content Zone Distribution
          </h3>
          {Object.keys(zoneStats).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(zoneStats)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([zone, stats]) => (
                <div
                  key={zone}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: 'var(--color-bg)' }}
                >
                  <span className="text-sm capitalize" style={{ color: 'var(--color-text)' }}>
                    {zoneNames[zone] || zone}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                      {stats.count} signal{stats.count !== 1 ? 's' : ''}
                    </span>
                    <div
                      className="w-16 h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--color-border)' }}
                    >
                      <div
                        className="h-full bg-score-high"
                        style={{ width: `${Math.min(100, stats.avgScore * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-soft)' }}>
              Zone-level analysis not available for this page
            </p>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-soft)' }}>
            AI assistants extract signals from different page zones. Strong signals in the title and bullets have the most impact.
          </p>
        </div>
      </div>

      {/* Schema Markup Recommendations */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
          Structured Data Best Practices
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-soft)' }}>
          Schema.org markup helps AI systems understand your product structure. While not all AI assistants directly use schema,
          it improves the overall machine readability of your page.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {SCHEMA_CHECKLIST.map((schema) => (
            <div
              key={schema.id}
              className="flex items-start gap-2 p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg)' }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs"
                style={{
                  backgroundColor: schema.importance === 'critical' ? '#ef444420' : schema.importance === 'high' ? '#f59e0b20' : 'var(--color-surface-2)',
                  color: schema.importance === 'critical' ? '#ef4444' : schema.importance === 'high' ? '#f59e0b' : 'var(--color-text-soft)',
                }}
              >
                {schema.importance === 'critical' ? '!' : schema.importance === 'high' ? '*' : '-'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{schema.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>{schema.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
            <strong>Implementation tip:</strong> Start with Product and Offer schema as these are critical for e-commerce.
            Test your markup with{' '}
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              Google&apos;s Rich Results Test
            </a>
            {' '}and reference{' '}
            <a
              href="https://schema.org/Product"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              schema.org/Product
            </a>
            {' '}for detailed implementation guides.
          </p>
        </div>
      </div>
    </section>
  );
}
