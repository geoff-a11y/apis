'use client';

import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import {
  getStudyInfo,
  getSummary,
  getModels,
  getAllModelBreakpoints,
  getHypothesisResults,
  getPsychPricingResults,
  getMerchantRecommendations,
  rawPricingData,
} from '@/lib/pricing-data';

export default function PricingStudyPage() {
  const studyInfo = getStudyInfo();
  const summary = getSummary();
  const models = getModels();
  const modelBreakpoints = getAllModelBreakpoints();
  const hypotheses = getHypothesisResults();
  const psychPricing = getPsychPricingResults();
  const recommendations = getMerchantRecommendations();
  const categoryCliffs = rawPricingData.category_cliffs;
  const modelDivergence = rawPricingData.model_divergence;
  const positionBias = rawPricingData.position_bias;

  // Build multi-model chart data
  const multipliers = [0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 1.75, 2.0, 3.0];
  const multiModelData = multipliers.map(mult => {
    const point: Record<string, number | string> = {
      multiplier: `${mult}x`,
      rawMultiplier: mult,
    };
    models.forEach(model => {
      const curve = modelBreakpoints[model.id]?.curve;
      if (curve) {
        const dataPoint = curve.find((c: { multiplier: number }) => c.multiplier === mult);
        if (dataPoint) {
          point[model.id] = Math.round(dataPoint.selection_rate * 100);
        }
      }
    });
    return point;
  });

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
      {/* Hero Section */}
      <section className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-4" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
          Pre-registered Study
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
          {summary.headline}
        </h1>
        <p className="text-xl max-w-3xl mx-auto mb-6" style={{ color: 'var(--color-text-mid)' }}>
          {summary.finding}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8">
          <div className="text-center">
            <span className="font-display text-5xl font-bold" style={{ color: 'var(--color-accent)' }}>
              38.6pp
            </span>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-soft)' }}>spread at 3x premium</p>
          </div>
          <div className="text-center">
            <span className="font-display text-5xl font-bold" style={{ color: 'var(--color-score-high)' }}>
              59.4%
            </span>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-soft)' }}>Gemini Flash at 3x</p>
          </div>
          <div className="text-center">
            <span className="font-display text-5xl font-bold" style={{ color: 'var(--color-score-low)' }}>
              20.8%
            </span>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-soft)' }}>Claude at 3x</p>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: studyInfo.total_trials.toLocaleString(), label: 'Total Trials', sublabel: 'Confirmatory' },
          { value: studyInfo.models_tested, label: 'AI Models', sublabel: 'Cross-validated' },
          { value: studyInfo.products_tested, label: 'Products', sublabel: 'Diverse categories' },
          { value: `${Math.round(studyInfo.judge_agreement * 100)}%`, label: 'Judge Agreement', sublabel: 'High reliability' },
        ].map((metric, idx) => (
          <div key={idx} className="card p-6 text-center">
            <p className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>
              {metric.value}
            </p>
            <p className="font-medium" style={{ color: 'var(--color-text)' }}>{metric.label}</p>
            <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>{metric.sublabel}</p>
          </div>
        ))}
      </section>

      {/* The Price Cliff Chart - Multi-model */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Model Divergence at High Premiums
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          Models show similar behavior up to 1.5x, then diverge dramatically. Gemini Flash maintains brand preference
          even at extreme premiums, while Claude drops to 20.8% at 3x.
        </p>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={multiModelData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="multiplier"
                tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickFormatter={(value) => `${value}%`}
                label={{ value: 'Brand Selection Rate', angle: -90, position: 'insideLeft', fill: 'var(--color-text-mid)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  const model = models.find(m => m.id === name);
                  return [`${value}%`, model?.name || name];
                }}
                labelFormatter={(label) => `Price: ${label} of generic`}
              />
              <Legend
                formatter={(value) => {
                  const model = models.find(m => m.id === value);
                  return model?.name || value;
                }}
              />
              <ReferenceLine
                x="2.0x"
                stroke="var(--color-text-soft)"
                strokeDasharray="5 5"
              />
              {models.map((model) => (
                <Line
                  key={model.id}
                  type="monotone"
                  dataKey={model.id}
                  stroke={model.color}
                  strokeWidth={2}
                  dot={{ fill: model.color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: model.color }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
            <strong>Key finding:</strong> At 3x premium, selection rates range from 20.8% (Claude) to 59.4% (Gemini Flash) —
            a 38.6 percentage point spread (p&lt;0.0001). Model-specific optimization may be necessary.
          </p>
        </div>
      </section>

      {/* Model Personality Profiles */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Model Personality Profiles
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          Each AI model exhibits distinct price sensitivity patterns. Selection rates at 3x premium reveal dramatic differences.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {models.map((model) => {
            const data = modelBreakpoints[model.id];
            const selectionAt3x = modelDivergence.at_3x[model.id as keyof typeof modelDivergence.at_3x];
            return (
              <div
                key={model.id}
                className="p-5 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg)', borderLeft: `4px solid ${model.color}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{model.name}</p>
                    <p className="text-sm font-medium" style={{ color: model.color }}>
                      "{data?.profile || 'Unknown'}"
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: model.color }}>
                      {selectionAt3x !== undefined ? `${Math.round(selectionAt3x * 100)}%` : 'N/A'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>at 3x premium</p>
                  </div>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
                  {data?.description || 'No description available'}
                </p>
                {data?.mean_breakpoint && (
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-soft)' }}>
                    Cliff at {data.mean_breakpoint}x
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Category-Specific Cliffs */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Category-Specific Price Thresholds
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          Different product categories trigger price sensitivity at different thresholds.
          Commodities cliff earlier (1.2x) while electronics tolerate higher premiums (1.5x).
        </p>

        {/* Two charts side by side */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Cliff Point Chart */}
          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
              Price Cliff Point by Category
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryCliffs.map(c => ({
                    product: c.product.split(':')[1]?.trim() || c.product,
                    cliff: c.cliff_point,
                    category: c.category,
                    drop: Math.round(c.drop_size * 100),
                  }))}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    domain={[1, 1.6]}
                    tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickFormatter={(value) => `${value}x`}
                  />
                  <YAxis
                    type="category"
                    dataKey="product"
                    tick={{ fill: 'var(--color-text-mid)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    width={95}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}x`, 'Cliff point']}
                  />
                  <Bar dataKey="cliff" radius={[0, 4, 4, 0]} name="Cliff Point">
                    {categoryCliffs.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.cliff_point <= 1.2 ? '#ef4444' : entry.cliff_point <= 1.3 ? '#f59e0b' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drop Size Chart */}
          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
              Selection Drop at Cliff (%)
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryCliffs.map(c => ({
                    product: c.product.split(':')[1]?.trim() || c.product,
                    drop: Math.round(c.drop_size * 100),
                    category: c.category,
                  }))}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    domain={[0, 50]}
                    tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="product"
                    tick={{ fill: 'var(--color-text-mid)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    width={95}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Selection drop']}
                  />
                  <Bar dataKey="drop" radius={[0, 4, 4, 0]} fill="var(--color-accent)" name="Drop Size" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Category analysis cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)', borderLeft: '4px solid #ef4444' }}>
            <p className="text-sm font-medium mb-1" style={{ color: '#ef4444' }}>Commodities — 1.2x cliff</p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-soft)' }}>
              Detergent, protein powder, running shoes
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
              <strong>47% average drop</strong> — AI applies strict value calculation to commodity goods
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)', borderLeft: '4px solid #22c55e' }}>
            <p className="text-sm font-medium mb-1" style={{ color: '#22c55e' }}>Premium Tolerant — 1.5x cliff</p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-soft)' }}>
              Air fryer, moisturizer
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
              <strong>29% average drop</strong> — Brand equity provides more protection in electronics/skincare
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-accent)' }}>Implication</p>
            <p className="text-xs" style={{ color: 'var(--color-text-mid)' }}>
              Commodity brands must price within 20% of generic. Electronics/skincare can stretch to 50% premium before losing AI recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* Position Bias */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Position Bias: First Listed Wins
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          Being listed first in AI comparisons provides a measurable selection advantage — the primacy effect.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Position comparison chart */}
          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
              Brand Selection by List Position
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      position: 'First Position',
                      rate: Math.round(positionBias.branded_first_selection * 100),
                      label: 'Brand listed first'
                    },
                    {
                      position: 'Second Position',
                      rate: Math.round(positionBias.branded_second_selection * 100),
                      label: 'Brand listed second'
                    },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="position"
                    tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Selection rate']}
                  />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} name="Selection Rate">
                    <Cell fill="#22c55e" />
                    <Cell fill="var(--color-text-muted)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats and analysis */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
                <p className="text-3xl font-bold mb-1" style={{ color: '#22c55e' }}>
                  {Math.round(positionBias.branded_first_selection * 100)}%
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Listed First</p>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
                <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {Math.round(positionBias.branded_second_selection * 100)}%
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Listed Second</p>
              </div>
            </div>

            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
              <p className="text-4xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>
                +{positionBias.difference_pp}pp
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Primacy Advantage</p>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>Chi-square</span>
                <span className="font-mono text-sm" style={{ color: 'var(--color-text)' }}>{positionBias.chi_square}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text-mid)' }}>p-value</span>
                <span className="font-mono text-sm font-medium" style={{ color: '#22c55e' }}>&lt;0.0001</span>
              </div>
            </div>

            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              <strong>Implication:</strong> {positionBias.finding}. Optimize your structured data and third-party listings to appear first in AI-generated comparisons.
            </p>
          </div>
        </div>
      </section>

      {/* Key Insights */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Key Findings
        </h2>
        <div className="space-y-3">
          {summary.key_insights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                {idx + 1}
              </div>
              <p style={{ color: 'var(--color-text-mid)' }}>{insight}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Psychological Pricing */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Psychological Pricing: Zero Effect
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          We tested 5 price formats. AI agents are completely immune to charm pricing tactics.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3" style={{ color: 'var(--color-text)' }}>Formats Tested</h3>
            <div className="space-y-2">
              {psychPricing.formats_tested.map((format) => (
                <div key={format} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
                  <span style={{ color: 'var(--color-text-mid)' }}>
                    {format === 'charm_99' && '$X.99 (charm pricing)'}
                    {format === 'round_00' && '$X.00 (round numbers)'}
                    {format === 'near_95' && '$X.95 (near-round)'}
                    {format === 'mid_odd_49' && '$X.49 (odd mid-point)'}
                    {format === 'ref_plus1' && '$X+1 (reference +1)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="p-6 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
              <p className="text-5xl font-bold mb-2" style={{ color: 'var(--color-score-high)' }}>100%</p>
              <p className="font-medium" style={{ color: 'var(--color-text)' }}>Selection rate for all formats</p>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-soft)' }}>
                {psychPricing.finding}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hypothesis Testing Summary */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Hypothesis Testing Results
          </h2>
          <Link
            href="/apis/pricing/methodology"
            className="text-sm hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            Full methodology →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>ID</th>
                <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>Hypothesis</th>
                <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>Status</th>
                <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: 'var(--color-text-soft)' }}>p-value</th>
              </tr>
            </thead>
            <tbody>
              {hypotheses.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="py-3 px-2 font-mono text-sm" style={{ color: 'var(--color-text-mid)' }}>{h.id}</td>
                  <td className="py-3 px-2" style={{ color: 'var(--color-text)' }}>
                    <span className="font-medium">{h.name}</span>
                    <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>{h.description}</p>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={getStatusStyle(h.status)}
                    >
                      {h.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono text-sm" style={{ color: 'var(--color-text-mid)' }}>
                    {h.p_value !== null ? (h.p_value < 0.001 ? '<0.001' : h.p_value.toFixed(3)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Merchant Recommendations */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Pricing Strategy for AI Commerce
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          Based on our findings, here are 5 actionable recommendations for merchants.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.slice(0, 5).map((rec) => (
            <div key={rec.number} className="p-5 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                >
                  {rec.number}
                </div>
                <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>{rec.title}</h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>{rec.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card p-8 text-center" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          How Does Your Product Score?
        </h2>
        <p className="mb-6 max-w-xl mx-auto" style={{ color: 'var(--color-text-mid)' }}>
          Use our Machine Likeability Score calculator to see how AI agents evaluate your product page
          and get personalized recommendations.
        </p>
        <Link href="/score" className="btn-primary inline-block">
          Calculate Your Score
        </Link>
      </section>

      {/* Methodology Link */}
      <section className="text-center">
        <p className="mb-4" style={{ color: 'var(--color-text-mid)' }}>
          Want the full details? Read about our study design, statistical methods, and data.
        </p>
        <Link
          href="/apis/pricing/methodology"
          className="btn-secondary inline-block"
        >
          View Full Methodology
        </Link>
        <p className="mt-4 text-sm" style={{ color: 'var(--color-text-soft)' }}>
          OSF Pre-registration: <a href={`https://${studyInfo.osf_registration}`} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--color-accent)' }}>{studyInfo.osf_registration}</a>
        </p>
      </section>
    </div>
  );
}
