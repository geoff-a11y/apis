// src/test/page-optimizer-v3-components.test.tsx — Component tests for Page Optimizer v3
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BaselineDisplay from '../components/page-optimizer-v3/BaselineDisplay';
import ImprovementSummary, { ImprovementSummaryGroup } from '../components/page-optimizer-v3/ImprovementSummary';
import ParetoExplorer from '../components/page-optimizer-v3/ParetoExplorer';
import GenerationFeedback from '../components/page-optimizer-v3/GenerationFeedback';
import WeightSliders from '../components/page-optimizer-v3/WeightSliders';
import { BaselineScore } from '../lib/baseline-scorer';

// ============================================================================
// BaselineDisplay Tests
// ============================================================================

describe('BaselineDisplay', () => {
  const mockBaseline: Partial<BaselineScore> = {
    aiScore: 50,
    seoScore: 40,
    humanScore: 60,
    totalScore: 50,
    issues: [
      { category: 'seo', severity: 'critical', message: 'Title too short' },
      { category: 'human', severity: 'major', message: 'Missing CTA' },
      { category: 'ai', severity: 'minor', message: 'Low AI signals' },
    ],
    improvementPotential: {
      ai: 50,
      seo: 60,
      human: 40,
      total: 50,
    },
  };

  it('renders three score bars', () => {
    render(<BaselineDisplay baseline={mockBaseline} />);

    expect(screen.getByText(/AI Recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/SEO Performance/i)).toBeInTheDocument();
    expect(screen.getByText(/Human Appeal/i)).toBeInTheDocument();
  });

  it('displays total score', () => {
    render(<BaselineDisplay baseline={mockBaseline} />);

    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('displays issues list when present', () => {
    render(<BaselineDisplay baseline={mockBaseline} />);

    expect(screen.getByText(/Title too short/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing CTA/i)).toBeInTheDocument();
  });

  it('shows Start Optimization button', () => {
    const onStart = vi.fn();
    render(<BaselineDisplay baseline={mockBaseline} onStart={onStart} />);

    expect(screen.getByRole('button', { name: /Start Optimization/i })).toBeInTheDocument();
  });

  it('calls onStart when button clicked', () => {
    const onStart = vi.fn();
    render(<BaselineDisplay baseline={mockBaseline} onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', { name: /Start Optimization/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<BaselineDisplay baseline={mockBaseline} onStart={vi.fn()} loading={true} />);

    expect(screen.getByText(/Analyzing/i)).toBeInTheDocument();
  });

  it('displays improvement potential', () => {
    render(<BaselineDisplay baseline={mockBaseline} />);

    expect(screen.getByText(/Improvement Potential/i)).toBeInTheDocument();
    expect(screen.getByText(/\+50 pts/)).toBeInTheDocument();
  });
});

// ============================================================================
// ImprovementSummary Tests
// ============================================================================

describe('ImprovementSummary', () => {
  it('displays before and after scores', () => {
    render(<ImprovementSummary before={62} after={84} label="AI Score" />);

    expect(screen.getByText('62')).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
  });

  it('shows positive delta with + sign', () => {
    render(<ImprovementSummary before={62} after={84} label="AI Score" />);

    expect(screen.getByText('+22')).toBeInTheDocument();
  });

  it('shows negative delta', () => {
    render(<ImprovementSummary before={80} after={65} label="AI Score" />);

    expect(screen.getByText('-15')).toBeInTheDocument();
  });

  it('shows arrow indicator', () => {
    render(<ImprovementSummary before={50} after={75} label="Test" />);

    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('handles zero delta', () => {
    render(<ImprovementSummary before={70} after={70} label="Test" />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

describe('ImprovementSummaryGroup', () => {
  it('renders all three dimension scores', () => {
    render(
      <ImprovementSummaryGroup
        baseline={{ ai: 50, seo: 40, human: 60 }}
        current={{ ai: 70, seo: 65, human: 75 }}
      />
    );

    expect(screen.getByText('AI Score')).toBeInTheDocument();
    expect(screen.getByText('SEO Score')).toBeInTheDocument();
    expect(screen.getByText('Human Score')).toBeInTheDocument();
  });

  it('shows overall improvement', () => {
    render(
      <ImprovementSummaryGroup
        baseline={{ ai: 50, seo: 50, human: 50 }}
        current={{ ai: 80, seo: 80, human: 80 }}
      />
    );

    expect(screen.getByText('Overall')).toBeInTheDocument();
  });
});

// ============================================================================
// ParetoExplorer Tests
// ============================================================================

describe('ParetoExplorer', () => {
  const mockVariants = [
    { id: '1', ai: 90, seo: 50, human: 60, nickname: 'AI Champion' as const },
    { id: '2', ai: 60, seo: 85, human: 70, nickname: 'SEO Specialist' as const },
    { id: '3', ai: 75, seo: 75, human: 78, nickname: 'Balanced Winner' as const, recommended: true },
  ];

  it('renders chart', () => {
    render(<ParetoExplorer variants={mockVariants} />);

    expect(screen.getByRole('img', { name: /chart/i })).toBeInTheDocument();
  });

  it('displays variant nicknames', () => {
    render(<ParetoExplorer variants={mockVariants} />);

    // Use getAllByText since nicknames appear in legend and cards
    expect(screen.getAllByText('AI Champion').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SEO Specialist').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Balanced Winner').length).toBeGreaterThan(0);
  });

  it('shows variant count', () => {
    render(<ParetoExplorer variants={mockVariants} />);

    expect(screen.getByText(/3 optimal variants/)).toBeInTheDocument();
  });

  it('calls onSelect when variant clicked', () => {
    const onSelect = vi.fn();
    render(<ParetoExplorer variants={mockVariants} onSelect={onSelect} />);

    // Click on variant card (get the button which contains AI Champion)
    const aiChampionButtons = screen.getAllByText('AI Champion');
    fireEvent.click(aiChampionButtons[aiChampionButtons.length - 1]); // Click the card, not the legend
    expect(onSelect).toHaveBeenCalledWith(mockVariants[0]);
  });

  it('shows recommended indicator', () => {
    render(<ParetoExplorer variants={mockVariants} />);

    expect(screen.getByText('REC')).toBeInTheDocument();
  });
});

// ============================================================================
// GenerationFeedback Tests
// ============================================================================

describe('GenerationFeedback', () => {
  it('renders textarea for feedback', () => {
    render(<GenerationFeedback onSubmit={vi.fn()} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders Run Generation button', () => {
    render(<GenerationFeedback onSubmit={vi.fn()} generation={6} />);

    expect(screen.getByRole('button', { name: /Run Generation 6/i })).toBeInTheDocument();
  });

  it('calls onSubmit with feedback text', () => {
    const onSubmit = vi.fn();
    render(<GenerationFeedback onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Add more urgency to the headline' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run/i }));

    expect(onSubmit).toHaveBeenCalledWith('Add more urgency to the headline');
  });

  it('disables button when feedback is empty', () => {
    render(<GenerationFeedback onSubmit={vi.fn()} />);

    const button = screen.getByRole('button', { name: /Run/i });
    expect(button).toBeDisabled();
  });

  it('shows remaining runs count', () => {
    render(<GenerationFeedback onSubmit={vi.fn()} userGuidedCount={1} />);

    expect(screen.getByText(/2 runs remaining/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<GenerationFeedback onSubmit={vi.fn()} loading={true} generation={6} />);

    expect(screen.getByText(/Running Generation 6/i)).toBeInTheDocument();
  });

  it('shows placeholder text', () => {
    render(<GenerationFeedback onSubmit={vi.fn()} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('Example'));
  });

  it('shows feedback insights when detected', () => {
    render(<GenerationFeedback onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Add urgency and scarcity messaging' },
    });

    expect(screen.getByText(/Urgency/)).toBeInTheDocument();
    expect(screen.getByText(/Scarcity/)).toBeInTheDocument();
  });
});

// ============================================================================
// WeightSliders Tests
// ============================================================================

describe('WeightSliders', () => {
  it('renders three sliders', () => {
    render(<WeightSliders onChange={vi.fn()} />);

    expect(screen.getByLabelText(/AI Weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SEO Weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Human Weight/i)).toBeInTheDocument();
  });

  it('sliders always sum to 100%', () => {
    const onChange = vi.fn();
    render(<WeightSliders onChange={onChange} initial={{ ai: 33, seo: 34, human: 33 }} />);

    // Increase AI to 50
    fireEvent.change(screen.getByLabelText(/AI Weight/i), { target: { value: '50' } });

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.ai + lastCall.seo + lastCall.human).toBe(100);
  });

  it('renders preset buttons', () => {
    render(<WeightSliders onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Balanced/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI First/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SEO First/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Conversion/i })).toBeInTheDocument();
  });

  it('applies preset when clicked', () => {
    const onChange = vi.fn();
    render(<WeightSliders onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /AI First/i }));

    expect(onChange).toHaveBeenCalledWith({ ai: 50, seo: 25, human: 25 });
  });

  it('shows percentage values', () => {
    render(<WeightSliders onChange={vi.fn()} initial={{ ai: 50, seo: 25, human: 25 }} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('25%')).toHaveLength(2);
  });
});
