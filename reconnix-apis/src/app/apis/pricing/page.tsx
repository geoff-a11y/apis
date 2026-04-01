'use client';

import { useState } from 'react';
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
} from 'recharts';
import {
  getStudyInfo,
  getSummary,
  getPooledSelectionCurve,
  getModels,
  getAllModelBreakpoints,
  getHypothesisResults,
  getPsychPricingResults,
  getReasoningAnalysis,
  getMerchantRecommendations,
  getModelBreakpointChartData,
} from '@/lib/pricing-data';

export default function PricingStudyPage() {
  const studyInfo = getStudyInfo();
  const summary = getSummary();
  const selectionCurve = getPooledSelectionCurve();
  const models = getModels();
  const modelBreakpoints = getAllModelBreakpoints();
  const hypotheses = getHypothesisResults();
  const psychPricing = getPsychPricingResults();
  const reasoningAnalysis = getReasoningAnalysis();
  const recommendations = getMerchantRecommendations();
  const breakpointChartData = getModelBreakpointChartData();

  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Format selection curve for chart
  const curveData = selectionCurve.map(point => ({
    multiplier: `${point.multiplier}x`,
    rawMultiplier: point.multiplier,
    selectionRate: Math.round(point.selection_rate * 100),
    n: point.n,
  }));

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
        <div className="flex justify-center items-baseline gap-2">
          <span className="font-display text-7xl font-bold" style={{ color: 'var(--color-accent)' }}>
            {summary.mean_breakpoint}x
          </span>
          <span className="text-xl" style={{ color: 'var(--color-text-soft)' }}>
            average breakpoint
          </span>
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

      {/* The Price Cliff Chart */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          The Price Cliff
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          AI selection rate drops dramatically when branded products exceed 2x the generic price.
          All models tested show near-identical behavior.
        </p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                label={{ value: 'Selection Rate', angle: -90, position: 'insideLeft', fill: 'var(--color-text-mid)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [`${value}%`, 'Selection Rate']}
                labelFormatter={(label) => `Price: ${label} of generic`}
              />
              <ReferenceLine
                x="2.0x"
                stroke="var(--color-score-low)"
                strokeDasharray="5 5"
                label={{ value: '2x Cliff', fill: 'var(--color-score-low)', fontSize: 12, position: 'top' }}
              />
              <Line
                type="monotone"
                dataKey="selectionRate"
                stroke="var(--color-accent)"
                strokeWidth={3}
                dot={{ fill: 'var(--color-accent)', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, fill: 'var(--color-accent)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
            <strong>Key insight:</strong> At 1.5x price, AI still recommends the branded product 99.7% of the time.
            At 3x price, this drops to just 64.2%. The cliff occurs right around the 2x mark.
          </p>
        </div>
      </section>

      {/* Model Breakpoints */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Model Consensus
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          All AI models converge on nearly identical price thresholds (p=0.72, no significant difference).
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={breakpointChartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                domain={[1.5, 2.2]}
                tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickFormatter={(value) => `${value}x`}
              />
              <YAxis
                type="category"
                dataKey="model"
                tick={{ fill: 'var(--color-text-mid)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value}x`, 'Breakpoint']}
              />
              <ReferenceLine
                x={summary.mean_breakpoint}
                stroke="var(--color-text-soft)"
                strokeDasharray="5 5"
                label={{ value: `Mean: ${summary.mean_breakpoint}x`, fill: 'var(--color-text-soft)', fontSize: 11, position: 'top' }}
              />
              <Bar dataKey="breakpoint" radius={[0, 4, 4, 0]}>
                {breakpointChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {models.map((model) => {
            const data = modelBreakpoints[model.id];
            return (
              <div
                key={model.id}
                className="p-3 rounded-lg text-center"
                style={{ backgroundColor: 'var(--color-bg)', borderLeft: `3px solid ${model.color}` }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{model.name}</p>
                <p className="text-lg font-bold" style={{ color: model.color }}>
                  {data?.mean_breakpoint ? `${data.mean_breakpoint}x` : 'N/A'}
                </p>
                {data?.note && (
                  <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>{data.note}</p>
                )}
              </div>
            );
          })}
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

      {/* Reasoning Analysis */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          How AI Reasons About Price
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-mid)' }}>
          Analysis of 1,600 reasoning traces reveals how AI evaluates price-value tradeoffs.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3" style={{ color: 'var(--color-text)' }}>By Price Point</h3>
            <div className="space-y-2">
              {reasoningAnalysis.by_multiplier.map((point) => (
                <div key={point.multiplier} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>{point.multiplier}x</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span style={{ color: 'var(--color-text-mid)' }}>
                      {Math.round(point.selection_rate * 100)}% select branded
                    </span>
                    <span className="px-2 py-1 rounded" style={{
                      backgroundColor: point.quality_mention > 0.9 ? 'var(--color-score-high)' : 'var(--color-score-medium)',
                      color: 'white',
                      fontSize: '11px'
                    }}>
                      {Math.round(point.quality_mention * 100)}% mention quality
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-3" style={{ color: 'var(--color-text)' }}>By Model</h3>
            <div className="space-y-2">
              {models.map((model) => {
                const reasoning = reasoningAnalysis.by_model[model.id];
                if (!reasoning) return null;
                return (
                  <div key={model.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)', borderLeft: `3px solid ${model.color}` }}>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{model.name}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-mid)' }}>
                        {Math.round(reasoning.value_language * 100)}% value language
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm" style={{ color: 'var(--color-text-soft)' }}>
              {reasoningAnalysis.key_finding}
            </p>
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
                    {h.p_value !== null ? h.p_value.toFixed(3) : '—'}
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
