// src/app/dimensions/[id]/page.tsx — Individual dimension detail page

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getDimension,
  getDimensionEffectSizes,
  getICC,
  getCopyRule,
  getModel,
  getDimensions,
  getDimensionsByCluster,
  getModels
} from '@/lib/data';
import { CLUSTER_NAMES } from '@/lib/types';
import DimensionEffectBar from '@/components/charts/DimensionEffectBar';
import ContextComparisonBar from '@/components/charts/ContextComparisonBar';
import RelatedDimensions from '@/components/cards/RelatedDimensions';

interface Props {
  params: { id: string };
}

export function generateStaticParams() {
  return getDimensions().map((d) => ({ id: d.id }));
}

export default function DimensionDetailPage({ params }: Props) {
  const dimension = getDimension(params.id);

  if (!dimension) {
    notFound();
  }

  const effectSizes = getDimensionEffectSizes(params.id);
  const b2cEffects = getDimensionEffectSizes(params.id, 'b2c');
  const b2bEffects = getDimensionEffectSizes(params.id, 'b2b');
  const iccResult = getICC(params.id);
  const copyRule = getCopyRule(params.id);
  const models = getModels();
  const relatedDimensions = getDimensionsByCluster(dimension.cluster);

  const meanEffect = effectSizes.length > 0
    ? effectSizes.reduce((sum, e) => sum + e.cohen_h, 0) / effectSizes.length
    : 0;

  // Calculate if B2C/B2B contexts differ meaningfully
  const hasContextVariation = b2cEffects.length > 0 && b2bEffects.length > 0;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
        <Link href="/dimensions" className="hover:underline" style={{ color: 'var(--color-accent)' }}>Dimensions</Link>
        <span className="mx-2">/</span>
        <span style={{ color: 'var(--color-text)' }}>{dimension.display_name}</span>
      </nav>

      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`w-3 h-3 rounded-full bg-cluster-${dimension.cluster.toLowerCase()}`} />
            <span className="text-text-soft text-sm">
              Cluster {dimension.cluster}: {CLUSTER_NAMES[dimension.cluster]}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold mt-2 max-w-2xl" style={{ color: 'var(--color-text)' }}>
            {dimension.display_name}
          </h1>
          <p className="mt-2 max-w-2xl" style={{ color: 'var(--color-text-mid)' }}>
            {dimension.description}
          </p>
        </div>

        <div className="flex gap-2">
          <span className={`badge ${dimension.evidence_tier === 'a' ? 'badge-green' : dimension.evidence_tier === 'b' ? 'badge-amber' : 'badge-red'}`}>
            Tier {dimension.evidence_tier.toUpperCase()}
          </span>
          {dimension.replication && (
            <span className="badge badge-blue">Replication</span>
          )}
          {dimension.agentic && (
            <span className="badge badge-blue">Agentic</span>
          )}
        </div>
      </section>

      {/* Key Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>Mean Effect Size</h3>
          <p className={`font-mono text-3xl font-bold ${meanEffect > 0 ? 'text-score-high' : meanEffect < 0 ? 'text-score-low' : ''}`} style={meanEffect === 0 ? { color: 'var(--color-text)' } : {}}>
            h = {meanEffect.toFixed(3)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-soft)' }}>
            Across {effectSizes.length} models
          </p>
        </div>

        {iccResult && (
          <div className="card p-6">
            <h3 className="text-text-soft text-sm font-medium mb-2">Inter-Rater Reliability</h3>
            <p className={`font-mono text-3xl font-bold ${iccResult.icc >= 0.7 ? 'text-score-high' : 'text-score-mid'}`}>
              ICC = {iccResult.icc.toFixed(2)}
            </p>
            <p className="text-text-soft text-sm mt-1">
              {iccResult.confirmatory ? 'Confirmatory' : 'Exploratory'}
            </p>
          </div>
        )}

        <div className="card p-6">
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>Manipulation Check</h3>
          <p className="font-mono text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {iccResult ? `${(iccResult.manipulation_check_pass_rate * 100).toFixed(0)}%` : '—'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-soft)' }}>
            Pass rate
          </p>
        </div>
      </section>

      {/* What This Means - Interpretation */}
      <section className="card p-6" style={{ backgroundColor: 'var(--color-accent-soft)', borderWidth: '2px', borderColor: 'var(--color-accent)' }}>
        <h2 className="font-display text-xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          What This Means
        </h2>
        <div className="space-y-3" style={{ color: 'var(--color-text-mid)' }}>
          <p>
            {Math.abs(meanEffect) >= 0.8 ? (
              <>
                This dimension shows a <strong style={{ color: 'var(--color-text)' }}>large effect</strong> (h = {meanEffect.toFixed(3)})
                across tested models. {meanEffect > 0 ? 'Models strongly prefer' : 'Models strongly avoid'} products
                with this signal, making it a <strong style={{ color: 'var(--color-text)' }}>critical factor</strong> in AI agent purchase decisions.
              </>
            ) : Math.abs(meanEffect) >= 0.5 ? (
              <>
                This dimension shows a <strong style={{ color: 'var(--color-text)' }}>medium effect</strong> (h = {meanEffect.toFixed(3)})
                across tested models. {meanEffect > 0 ? 'Models tend to favor' : 'Models tend to avoid'} products
                with this signal, making it an <strong style={{ color: 'var(--color-text)' }}>important consideration</strong> for AI-optimized copy.
              </>
            ) : Math.abs(meanEffect) >= 0.2 ? (
              <>
                This dimension shows a <strong style={{ color: 'var(--color-text)' }}>small effect</strong> (h = {meanEffect.toFixed(3)})
                across tested models. {meanEffect > 0 ? 'Models slightly prefer' : 'Models slightly avoid'} products
                with this signal, but the impact is <strong style={{ color: 'var(--color-text)' }}>modest</strong>.
              </>
            ) : (
              <>
                This dimension shows <strong style={{ color: 'var(--color-text)' }}>minimal effect</strong> (h = {meanEffect.toFixed(3)})
                across tested models. The signal has <strong style={{ color: 'var(--color-text)' }}>negligible impact</strong> on AI agent
                purchase decisions.
              </>
            )}
          </p>

          {iccResult && (
            <p>
              {iccResult.confirmatory ? (
                <>
                  With an ICC of {iccResult.icc.toFixed(2)}, this finding is <strong style={{ color: 'var(--color-text)' }}>confirmatory</strong> -
                  the effect is reliable and consistent across independent raters.
                </>
              ) : (
                <>
                  With an ICC of {iccResult.icc.toFixed(2)}, this finding is <strong style={{ color: 'var(--color-text)' }}>exploratory</strong> -
                  interpret with caution as inter-rater reliability is below the confirmatory threshold.
                </>
              )}
            </p>
          )}

          {effectSizes.length > 0 && (
            <p>
              Effect sizes vary across models from {Math.min(...effectSizes.map(e => e.cohen_h)).toFixed(3)} to {' '}
              {Math.max(...effectSizes.map(e => e.cohen_h)).toFixed(3)}, indicating
              {Math.max(...effectSizes.map(e => e.cohen_h)) - Math.min(...effectSizes.map(e => e.cohen_h)) > 0.5
                ? ' significant model-specific differences'
                : ' relatively consistent behavior across AI systems'}.
            </p>
          )}
        </div>
      </section>

      {/* Signal Examples */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Signal Examples
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-score-low-bg)', border: '1px solid var(--color-score-low)' }}>
            <h4 className="text-sm font-medium text-score-low mb-2">Signal Absent</h4>
            <p className="text-sm italic" style={{ color: 'var(--color-text-mid)' }}>
              "{dimension.signal_example.absent}"
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-score-high-bg)', border: '1px solid var(--color-score-high)' }}>
            <h4 className="text-sm font-medium text-score-high mb-2">Signal Present</h4>
            <p className="text-sm italic" style={{ color: 'var(--color-text-mid)' }}>
              "{dimension.signal_example.present}"
            </p>
          </div>
        </div>
      </section>

      {/* Effect Size Visualization */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Effect Sizes by Model
        </h2>
        <DimensionEffectBar effectSizes={effectSizes} models={models} />
      </section>

      {/* Context Comparison (if B2C/B2B data available) */}
      {hasContextVariation && (
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            B2C vs B2B Context Comparison
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-soft)' }}>
            Comparing how this dimension performs across consumer and business contexts
          </p>
          <ContextComparisonBar
            b2cEffects={b2cEffects}
            b2bEffects={b2bEffects}
            models={models}
          />
        </section>
      )}

      {/* Detailed Statistics Table */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Detailed Statistics
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>Model</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>Cohen's h</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>95% CI</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>P(control)</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>P(manip)</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-soft)' }}>Trials</th>
              </tr>
            </thead>
            <tbody>
              {effectSizes
                .sort((a, b) => Math.abs(b.cohen_h) - Math.abs(a.cohen_h))
                .map((es) => {
                  const model = getModel(es.model_id);
                  return (
                    <tr
                      key={es.model_id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="py-3 px-4 font-medium">{model?.name ?? es.model_id}</td>
                      <td className={`py-3 px-4 font-mono ${es.cohen_h > 0 ? 'text-score-high' : es.cohen_h < 0 ? 'text-score-low' : ''}`}>
                        {es.cohen_h.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 font-mono" style={{ color: 'var(--color-text-mid)' }}>
                        [{es.ci_lower.toFixed(3)}, {es.ci_upper.toFixed(3)}]
                      </td>
                      <td className="py-3 px-4 font-mono">{(es.p_control * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4 font-mono">{(es.p_manipulation * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4 font-mono" style={{ color: 'var(--color-text-soft)' }}>{es.n_trials}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Copy Rules (if available) */}
      {copyRule && (
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Copy Guidance
          </h2>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>Signal Patterns</h4>
              <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--color-text-mid)' }}>
                {copyRule.signal_patterns.map((pattern, i) => (
                  <li key={i} className="text-sm">{pattern}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>Zone Guidance</h4>
              <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>{copyRule.zone_guidance}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                <h5 className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>Low Intensity (0.3)</h5>
                <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>{copyRule.intensity_guidance.low}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                <h5 className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>Medium Intensity (0.7)</h5>
                <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>{copyRule.intensity_guidance.medium}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                <h5 className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>Strong Intensity (1.0)</h5>
                <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>{copyRule.intensity_guidance.strong}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related Dimensions */}
      <RelatedDimensions
        currentDimension={dimension}
        relatedDimensions={relatedDimensions}
      />
    </div>
  );
}
