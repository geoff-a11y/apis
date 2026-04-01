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

  // Estimate readability grade based on score
  const getReadabilityGrade = (readabilityScore: number) => {
    if (readabilityScore >= 80) return { grade: 'A', label: 'Excellent', color: '#22c55e' };
    if (readabilityScore >= 60) return { grade: 'B', label: 'Good', color: '#22c55e' };
    if (readabilityScore >= 40) return { grade: 'C', label: 'Fair', color: '#f59e0b' };
    if (readabilityScore >= 20) return { grade: 'D', label: 'Needs Work', color: '#f59e0b' };
    return { grade: 'F', label: 'Poor', color: '#ef4444' };
  };

  const readabilityGrade = getReadabilityGrade(score.readability_score || 0);

  return (
    <section className="card p-6">
      <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        Machine Readability
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-mid)' }}>
        How easily AI systems can extract and understand your product information.
        This affects whether AI assistants can accurately represent your product.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Extraction Quality */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Content Extraction</span>
              <span
                className="text-sm font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: `${getQualityColor(score.extraction_quality)}20`, color: getQualityColor(score.extraction_quality) }}
              >
                {score.extraction_quality?.toUpperCase() || 'N/A'}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
              {getQualityLabel(score.extraction_quality)}
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Readability Score</span>
              <div className="flex items-center gap-2">
                <span
                  className="text-lg font-bold"
                  style={{ color: readabilityGrade.color }}
                >
                  {readabilityGrade.grade}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
                  ({Math.round(score.readability_score || 0)}/100)
                </span>
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
              {readabilityGrade.label} - Clear, well-structured content helps AI understand your product
            </p>
          </div>

          {score.readability_flags && score.readability_flags.length > 0 && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#ef444410', border: '1px solid #ef444430' }}>
              <p className="text-sm font-medium mb-2" style={{ color: '#ef4444' }}>Issues Detected</p>
              <ul className="space-y-1">
                {score.readability_flags.map((flag, idx) => (
                  <li key={idx} className="text-xs flex items-start gap-2" style={{ color: 'var(--color-text-mid)' }}>
                    <span style={{ color: '#ef4444' }}>!</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Schema Markup Checklist */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            Structured Data Best Practices
          </p>
          <div className="space-y-2">
            {SCHEMA_CHECKLIST.map((schema) => (
              <div
                key={schema.id}
                className="flex items-start gap-3 p-3 rounded-lg"
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
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{schema.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>{schema.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-soft)' }}>
            Schema.org markup helps AI systems understand your product. Visit{' '}
            <a
              href="https://schema.org/Product"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              schema.org/Product
            </a>{' '}
            for implementation guides.
          </p>
        </div>
      </div>
    </section>
  );
}
