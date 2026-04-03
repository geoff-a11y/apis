// src/app/methodology/page.tsx — Research methodology and outputs

import { getGlobalStats, getICCResults } from '@/lib/data';

export default function MethodologyPage() {
  const stats = getGlobalStats();
  const iccResults = getICCResults();
  const confirmatoryCount = iccResults.filter((r) => r.confirmatory).length;

  return (
    <div className="space-y-8 max-w-4xl">
      <section>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Research & Methodology
        </h1>
        <p style={{ color: 'var(--color-text-mid)' }}>
          Pre-registered research outputs, methodology documentation, and data downloads.
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

      {/* Overview */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Research Overview
        </h2>
        <div className="prose prose-slate max-w-none" style={{ color: 'var(--color-text-mid)' }}>
          <p>
            APIS uses a forced-choice A/B experimental design to measure the causal
            effect of content signals on AI agent purchase recommendations. Each trial
            presents a model with two product descriptions that differ only in the
            presence or absence of a single signal dimension.
          </p>
          <p className="mt-3">
            The model is asked which product it would recommend to a human seeking
            to make a purchase. By aggregating thousands of such comparisons across
            multiple models, we can estimate the effect size of each signal dimension
            with high precision.
          </p>
        </div>
      </section>

      {/* Experimental Design */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Experimental Design
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Stimulus Construction</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Each stimulus pair consists of two product descriptions generated from
              the same base template. The manipulation version includes a specific
              content signal; the control version presents equivalent information
              without that signal. All other content is held constant.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Counterbalancing</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Presentation order (signal-present first vs. signal-absent first) is
              counterbalanced across trials to control for position effects. Product
              categories are also varied to ensure generalizability.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Sample Size</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Each model-dimension pair receives a minimum of 120 trials (60 in each
              order condition), providing statistical power to detect small effect
              sizes (Cohen's h ≥ 0.15) at α = 0.05.
            </p>
          </div>
        </div>
      </section>

      {/* Statistical Approach */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Statistical Approach
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Primary Metric: Cohen's h</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              We use Cohen's h (arcsine transformation of proportion differences) as
              our primary effect size metric. This provides a standardized measure
              comparable across dimensions with different baseline rates.
            </p>
            <div className="mt-2 p-3 rounded font-mono text-xs" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
              h = 2 × (arcsin(√p₁) - arcsin(√p₀))
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Confidence Intervals</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              95% confidence intervals are computed using bootstrap resampling
              (10,000 iterations) to account for the non-normal distribution of
              effect sizes.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Multiple Comparisons</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Benjamini-Hochberg FDR correction is applied across all hypothesis
              tests within each analysis family to control the false discovery rate.
            </p>
          </div>
        </div>
      </section>

      {/* Reliability */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Reliability Assessment
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Inter-Rater Reliability (ICC)</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Three independent judge models (Claude Opus, GPT-5.4, Gemini Pro) score
              each response. Intraclass Correlation Coefficient (ICC 2,k) is computed
              to assess agreement. Dimensions with ICC ≥ 0.70 are classified as
              confirmatory; those below are labeled exploratory.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Manipulation Checks</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              Independent raters verify that manipulation and control stimuli differ
              on the intended dimension and not on confounding factors. Dimensions
              with manipulation check pass rates below 80% are flagged for review.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>Blinding Protocol</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              All model identifiers are stripped from responses before judge scoring.
              A blinding key is generated at collection time and revealed only after
              scoring is complete.
            </p>
          </div>
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

      {/* Limitations */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Limitations
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm" style={{ color: 'var(--color-text-mid)' }}>
          <li>
            Results reflect model behavior at a specific point in time; model updates
            may change responses.
          </li>
          <li>
            Forced-choice paradigm may not capture nuanced preference gradients.
          </li>
          <li>
            Stimulus templates, while varied, may not represent all real-world
            product content patterns.
          </li>
          <li>
            Effect sizes measured in isolation; real-world content contains multiple
            interacting signals.
          </li>
          <li>
            B2C and B2B contexts are simulated; actual business decisions involve
            additional factors.
          </li>
        </ul>
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
