'use client';

import Link from 'next/link';
import {
  getStudyInfo,
  getProducts,
  getModels,
  getSubStudies,
  getHypothesisResults,
  getSummary,
} from '@/lib/pricing-data';

export default function PricingMethodologyPage() {
  const studyInfo = getStudyInfo();
  const products = getProducts();
  const models = getModels();
  const subStudies = getSubStudies();
  const hypotheses = getHypothesisResults();
  const summary = getSummary();

  // Get status badge style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { backgroundColor: 'var(--color-score-high)', color: 'white' };
      case 'NOT_FOUND':
        return { backgroundColor: 'var(--color-score-low)', color: 'white' };
      case 'PARTIAL':
        return { backgroundColor: 'var(--color-score-medium)', color: 'white' };
      default:
        return { backgroundColor: 'var(--color-border)', color: 'var(--color-text)' };
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <section>
        <Link
          href="/apis/pricing"
          className="inline-flex items-center gap-2 mb-4 transition-colors"
          style={{ color: 'var(--color-text-mid)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Findings
        </Link>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h1 className="font-display text-3xl md:text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
            Study Methodology
          </h1>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: 'var(--color-score-high)', color: 'white' }}
          >
            Pre-registered
          </span>
        </div>
        <p className="text-lg max-w-3xl" style={{ color: 'var(--color-text-mid)' }}>
          {studyInfo.title}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm" style={{ color: 'var(--color-text-soft)' }}>
          <span>OSF: <a href={`https://${studyInfo.osf_registration}`} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--color-accent)' }}>{studyInfo.osf_registration}</a></span>
          <span>|</span>
          <span>Config locked: {new Date(studyInfo.config_lock_date).toLocaleDateString()}</span>
          <span>|</span>
          <span>{studyInfo.total_trials.toLocaleString()} total trials</span>
        </div>
      </section>

      {/* Study Design Overview */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Study Design
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          This confirmatory study investigates how AI agents respond to price premiums when recommending
          products. We designed 4 sub-studies to test specific hypotheses about price sensitivity,
          psychological pricing, and the mechanisms behind the "price cliff."
        </p>

        <h3 className="font-medium mb-3" style={{ color: 'var(--color-text)' }}>Sub-studies</h3>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {subStudies.map((study) => (
            <div key={study.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                >
                  {study.id}
                </span>
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>{study.name}</span>
              </div>
              <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-mid)' }}>
                <span>{study.trials.toLocaleString()} trials</span>
                <span>{study.hypotheses.length > 0 ? `Tests: ${study.hypotheses.join(', ')}` : 'Exploratory'}</span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="font-medium mb-3" style={{ color: 'var(--color-text)' }}>Price Points Tested</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-soft)' }}>Sub-study</th>
                <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-soft)' }}>Price Multipliers</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>A: Price Sensitivity</td>
                <td className="py-2 px-3 font-mono" style={{ color: 'var(--color-text-mid)' }}>0.4x, 0.6x, 0.8x, 1.0x, 1.2x, 1.5x, 1.75x, 2.0x, 3.0x</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>B: Psychological Pricing</td>
                <td className="py-2 px-3 font-mono" style={{ color: 'var(--color-text-mid)' }}>1.0x only (5 format variations)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>C: Cliff Mechanism</td>
                <td className="py-2 px-3 font-mono" style={{ color: 'var(--color-text-mid)' }}>1.0x, 1.5x, 1.75x, 2.0x, 2.5x</td>
              </tr>
              <tr>
                <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>D: Reasoning Extraction</td>
                <td className="py-2 px-3 font-mono" style={{ color: 'var(--color-text-mid)' }}>1.5x, 1.75x, 2.0x, 3.0x</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Models Tested */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          AI Models Tested
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          We tested 4 leading frontier models from 3 major providers to ensure findings generalize
          across the AI ecosystem.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg)', borderLeft: `4px solid ${model.color}` }}
            >
              <p className="font-medium" style={{ color: 'var(--color-text)' }}>{model.name}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>{model.provider}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
            <strong>Judge scoring:</strong> All responses were scored by cross-family judges
            (Claude responses scored by GPT and Gemini, etc.) to eliminate bias.
            Judge agreement rate: <strong>{Math.round(studyInfo.judge_agreement * 100)}%</strong>
          </p>
        </div>
      </section>

      {/* Products Tested */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Products Tested
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          We selected 5 products across diverse categories to ensure findings aren't category-specific.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left py-3 px-3 text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>ID</th>
                <th className="text-left py-3 px-3 text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>Product</th>
                <th className="text-left py-3 px-3 text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>Category</th>
                <th className="text-right py-3 px-3 text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>Anchor Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="py-3 px-3 font-mono text-sm" style={{ color: 'var(--color-text-mid)' }}>{product.id}</td>
                  <td className="py-3 px-3" style={{ color: 'var(--color-text)' }}>{product.name}</td>
                  <td className="py-3 px-3" style={{ color: 'var(--color-text-mid)' }}>{product.category}</td>
                  <td className="py-3 px-3 text-right font-mono" style={{ color: 'var(--color-text-mid)' }}>${product.anchor_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Hypothesis Testing */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Hypothesis Testing Results
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          We pre-registered 10 hypotheses covering price sensitivity, psychological pricing effects,
          and mechanisms behind the price cliff.
        </p>
        <div className="space-y-4">
          {hypotheses.map((h) => (
            <div key={h.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{h.id}</span>
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>{h.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={getStatusStyle(h.status)}
                  >
                    {h.status.replace('_', ' ')}
                  </span>
                  {h.p_value !== null && (
                    <span className="font-mono text-xs" style={{ color: 'var(--color-text-soft)' }}>
                      p={h.p_value.toFixed(3)}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm mb-2" style={{ color: 'var(--color-text-mid)' }}>{h.description}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
                <strong>Evidence:</strong> {h.evidence}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Statistical Methods */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Statistical Methods
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Breakpoint Detection</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              We used piecewise linear regression to identify the price multiplier where selection
              rate drops most sharply. Models were compared using AIC (Akaike Information Criterion)
              to confirm piecewise models outperform linear alternatives.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Model Heterogeneity Testing</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Kruskal-Wallis H-test was used to assess whether breakpoints differ significantly
              across AI models. Result: no significant heterogeneity (p=0.72), indicating all
              models converge on similar price thresholds.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Confidence Intervals</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Bootstrap confidence intervals (1000 resamples) were computed for all breakpoint
              estimates. The mean breakpoint of {summary.mean_breakpoint}x has a range of
              {' '}{summary.breakpoint_range.min}x to {summary.breakpoint_range.max}x across models.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Judge Agreement</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Inter-rater reliability was assessed using ICC (Intraclass Correlation Coefficient).
              Three judges scored each response with blinded model identifiers. Overall agreement
              rate: {Math.round(studyInfo.judge_agreement * 100)}%, indicating excellent reliability.
            </p>
          </div>
        </div>
      </section>

      {/* Key Design Features */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Key Design Features
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: 'Config Locking', description: 'SHA-256 hashes of all config files verified before data collection began' },
            { title: 'Cross-family Judging', description: 'Claude responses not judged by Claude family models to eliminate bias' },
            { title: 'Position Randomization', description: 'Branded product position (first vs second) randomized across trials' },
            { title: 'Blinded Scoring', description: 'Model identifiers stripped from responses before judge evaluation' },
            { title: 'Cliff Oversampling', description: '40 trials at cliff region (1.75x-2.0x) vs 20 elsewhere for precision' },
            { title: 'Resumable Collection', description: 'Scripts check for existing data before API calls for reliability' },
          ].map((feature, idx) => (
            <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
              <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>{feature.title}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data Availability */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Data Availability
        </h2>
        <p className="mb-4" style={{ color: 'var(--color-text-mid)' }}>
          This study follows open science practices. Pre-registration, analysis scripts, and
          anonymized data are available through OSF.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href={`https://${studyInfo.osf_registration}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            OSF Pre-registration
          </a>
        </div>
      </section>

      {/* Citation */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Citation
        </h2>
        <div
          className="p-4 rounded-lg font-mono text-sm overflow-x-auto"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-mid)' }}
        >
          <pre className="whitespace-pre-wrap">
{`Agentonomics. (2026). APIS Price Sensitivity Study:
The 2x Rule for AI Commerce. OSF Preprints.
https://${studyInfo.osf_registration}`}
          </pre>
        </div>
      </section>

      {/* Back to Findings */}
      <section className="text-center">
        <Link href="/apis/pricing" className="btn-primary inline-block">
          Back to Key Findings
        </Link>
      </section>
    </div>
  );
}
