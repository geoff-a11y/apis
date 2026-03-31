// src/app/research/page.tsx — Research outputs and data downloads

import { getGlobalStats, getConfirmatoryDimensions, getICCResults } from '@/lib/data';

export default function ResearchPage() {
  const stats = getGlobalStats();
  const confirmatoryDims = getConfirmatoryDimensions();
  const iccResults = getICCResults();

  const confirmatoryCount = iccResults.filter((r) => r.confirmatory).length;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Research
        </h1>
        <p className="max-w-2xl" style={{ color: 'var(--color-text-mid)' }}>
          Pre-registered research outputs, data downloads, and methodology documentation.
          All data is available under CC-BY 4.0 license.
        </p>
      </section>

      {/* Pre-registration badge */}
      <section
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-score-high)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-score-high)' }}>
              Pre-Registered Study
            </h2>
            <p style={{ color: 'var(--color-text-mid)' }}>
              This research was pre-registered on OSF before data collection began.
            </p>
          </div>
          <a
            href={stats.osf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary ml-auto"
          >
            View on OSF
          </a>
        </div>
      </section>

      {/* Key stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{stats.models}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>Models Tested</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{stats.dimensions}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>Dimensions</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{confirmatoryCount}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>Confirmatory (ICC ≥ 0.70)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--color-score-high)' }}>{stats.trials.toLocaleString()}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>Total Trials</p>
        </div>
      </section>

      {/* Data downloads */}
      <section className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-accent)' }}>
          Data Downloads
        </h2>
        <div className="space-y-3">
          {[
            { name: 'Effect Sizes (CSV)', file: 'effect_sizes.csv', size: '~50KB' },
            { name: 'Behavioral Fingerprints (JSON)', file: 'behavioral_fingerprints.json', size: '~10KB' },
            { name: 'ICC Results (CSV)', file: 'icc_results.csv', size: '~5KB' },
            { name: 'Interaction Coefficients (JSON)', file: 'interaction_coefficients.json', size: '~20KB' },
            { name: 'Full Dataset (ZIP)', file: 'apis_full_dataset.zip', size: '~5MB' },
          ].map((dl) => (
            <div
              key={dl.file}
              className="flex items-center justify-between p-4 rounded-lg transition-colors"
              style={{
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)'
              }}
            >
              <div>
                <h3 className="font-medium" style={{ color: 'var(--color-accent)' }}>{dl.name}</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>{dl.size}</p>
              </div>
              <button className="badge badge-neutral hover:bg-[var(--color-accent)] hover:text-white transition-colors cursor-pointer">
                Download
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Citation */}
      <section className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Citation
        </h2>
        <div
          className="p-4 rounded-lg font-mono text-sm"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-mid)'
          }}
        >
          <p>
            Reconnix. (2026). APIS: AI Purchase Intelligence System - Empirical
            measurement of AI agent purchase psychology. OSF Pre-registration.
            https://osf.io/{stats.osf_id}
          </p>
        </div>
        <button className="badge badge-accent mt-4 hover:opacity-80 transition-opacity cursor-pointer">
          Copy BibTeX
        </button>
      </section>

      {/* Related work */}
      <section className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Related Work
        </h2>
        <div className="space-y-4">
          <div
            className="p-4 rounded-lg"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>Filandrianos et al. (2025)</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-mid)' }}>
              "LLMs as Shoppers: What Drives Recommendations?" — Foundation study
              establishing that LLMs exhibit consistent preferences for certain
              content signals in purchase recommendations.
            </p>
          </div>
          <div
            className="p-4 rounded-lg"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>ACES Framework (2025)</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-mid)' }}>
              Anthropic's model evaluation framework demonstrating that LLM
              behaviors can be empirically measured and compared across dimensions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
