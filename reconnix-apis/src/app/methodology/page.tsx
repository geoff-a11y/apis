// src/app/methodology/page.tsx — Research methodology documentation

export default function MethodologyPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <section>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Methodology
        </h1>
        <p style={{ color: 'var(--color-text-mid)' }}>
          Technical documentation of the APIS research methodology, including
          experimental design, statistical approach, and validation procedures.
        </p>
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
          <p>
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

      {/* Pre-registration */}
      <section className="card p-6" style={{ backgroundColor: 'var(--color-score-high-bg)', borderColor: 'var(--color-score-high)' }}>
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Pre-Registration
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-mid)' }}>
          The complete analysis plan, including all hypotheses and statistical
          procedures, was pre-registered on OSF before data collection began.
          Any analyses not specified in the pre-registration are labeled as
          exploratory.
        </p>
        <a
          href="https://osf.io/et4nf"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm py-2 px-4"
        >
          View Pre-Registration
        </a>
      </section>
    </div>
  );
}
