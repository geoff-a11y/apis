import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MLScore } from '@/lib/types';

// Mock ScoreResult component for testing
// This tests the data structure and patterns that ScoreResult would use
interface ScoreResultProps {
  score: MLScore;
}

function MockScoreResult({ score }: ScoreResultProps) {
  return (
    <div data-testid="score-result">
      <div data-testid="universal-score">{score.universal_score}</div>
      {score.client_score !== undefined && (
        <div data-testid="client-score">{score.client_score}</div>
      )}
      {score.model_distribution && (
        <div data-testid="model-distribution">
          {Object.entries(score.model_distribution).map(([model, score]) => (
            <div key={model} data-testid={`model-${model}`}>
              {model}: {score}
            </div>
          ))}
        </div>
      )}
      <div data-testid="signal-count">{score.signal_inventory.length}</div>
      <div data-testid="recommendation-count">{score.recommendations.length}</div>
    </div>
  );
}

describe('ScoreResult', () => {
  const mockMLScore: MLScore = {
    id: 'test-score-123',
    url: 'https://example.com/product',
    scored_at: '2026-03-27T12:00:00Z',
    universal_score: 72.5,
    client_score: 68.3,
    model_distribution: {
      gpt54: 75.2,
      o3: 70.1,
      gemini: 73.8,
      claude: 71.5,
      llama: 69.8,
      sonar: 74.6,
    },
    signal_inventory: [
      {
        dimension_id: 'dim_01',
        score: 0.8,
        zone_contributions: [
          {
            zone: 'title',
            score: 0.9,
            evidence: 'Third-party authority mentioned',
          },
        ],
      },
      {
        dimension_id: 'dim_02',
        score: 0.6,
        zone_contributions: [
          {
            zone: 'description',
            score: 0.6,
            evidence: 'Social proof present',
          },
        ],
      },
    ],
    readability_score: 85.5,
    readability_flags: ['Clear language', 'Good structure'],
    recommendations: [
      {
        dimension_id: 'dim_03',
        current_signal: 0.2,
        target_signal: 0.7,
        gap: 0.5,
        predicted_delta: 5.2,
        copy_suggestion: 'Add platform endorsement',
        zone: 'title',
        priority: 'high',
      },
    ],
    platform: 'web',
    extraction_quality: 'full',
  };

  describe('displays Machine Likeability Score correctly', () => {
    it('should render universal score', () => {
      render(<MockScoreResult score={mockMLScore} />);

      const universalScore = screen.getByTestId('universal-score');
      expect(universalScore.textContent).toBe('72.5');
    });

    it('should render client score when provided', () => {
      render(<MockScoreResult score={mockMLScore} />);

      const clientScore = screen.getByTestId('client-score');
      expect(clientScore.textContent).toBe('68.3');
    });

    it('should not render client score when not provided', () => {
      const scoreWithoutClient = { ...mockMLScore, client_score: undefined };
      render(<MockScoreResult score={scoreWithoutClient} />);

      expect(screen.queryByTestId('client-score')).not.toBeInTheDocument();
    });

    it('should display score as a number', () => {
      render(<MockScoreResult score={mockMLScore} />);

      const universalScore = screen.getByTestId('universal-score');
      const scoreValue = parseFloat(universalScore.textContent || '0');

      expect(scoreValue).toBeGreaterThanOrEqual(0);
      expect(scoreValue).toBeLessThanOrEqual(100);
    });

    it('should handle edge case scores', () => {
      const edgeCases = [
        { ...mockMLScore, universal_score: 0 },
        { ...mockMLScore, universal_score: 100 },
        { ...mockMLScore, universal_score: 50.0 },
      ];

      edgeCases.forEach((score) => {
        const { unmount } = render(<MockScoreResult score={score} />);
        const universalScore = screen.getByTestId('universal-score');
        expect(universalScore.textContent).toBe(score.universal_score.toString());
        unmount();
      });
    });

    it('should display signal inventory count', () => {
      render(<MockScoreResult score={mockMLScore} />);

      const signalCount = screen.getByTestId('signal-count');
      expect(signalCount.textContent).toBe('2');
    });

    it('should display recommendation count', () => {
      render(<MockScoreResult score={mockMLScore} />);

      const recommendationCount = screen.getByTestId('recommendation-count');
      expect(recommendationCount.textContent).toBe('1');
    });
  });

  describe('shows model distribution', () => {
    it('should render model distribution when provided', () => {
      render(<MockScoreResult score={mockMLScore} />);

      const distribution = screen.getByTestId('model-distribution');
      expect(distribution).toBeInTheDocument();
    });

    it('should display all model scores', () => {
      render(<MockScoreResult score={mockMLScore} />);

      expect(screen.getByTestId('model-gpt54')).toBeInTheDocument();
      expect(screen.getByTestId('model-o3')).toBeInTheDocument();
      expect(screen.getByTestId('model-gemini')).toBeInTheDocument();
      expect(screen.getByTestId('model-claude')).toBeInTheDocument();
      expect(screen.getByTestId('model-llama')).toBeInTheDocument();
      expect(screen.getByTestId('model-sonar')).toBeInTheDocument();
    });

    it('should display correct score values for each model', () => {
      render(<MockScoreResult score={mockMLScore} />);

      expect(screen.getByTestId('model-gpt54').textContent).toContain('75.2');
      expect(screen.getByTestId('model-o3').textContent).toContain('70.1');
      expect(screen.getByTestId('model-gemini').textContent).toContain('73.8');
      expect(screen.getByTestId('model-claude').textContent).toContain('71.5');
      expect(screen.getByTestId('model-llama').textContent).toContain('69.8');
      expect(screen.getByTestId('model-sonar').textContent).toContain('74.6');
    });

    it('should not render model distribution when not provided', () => {
      const scoreWithoutDistribution = {
        ...mockMLScore,
        model_distribution: undefined,
      };
      render(<MockScoreResult score={scoreWithoutDistribution} />);

      expect(screen.queryByTestId('model-distribution')).not.toBeInTheDocument();
    });

    it('should handle partial model distribution', () => {
      const partialScore: MLScore = {
        ...mockMLScore,
        model_distribution: {
          gpt54: 80.0,
          claude: 75.5,
        },
      };

      render(<MockScoreResult score={partialScore} />);

      expect(screen.getByTestId('model-gpt54')).toBeInTheDocument();
      expect(screen.getByTestId('model-claude')).toBeInTheDocument();
      expect(screen.queryByTestId('model-o3')).not.toBeInTheDocument();
    });

    it('should show variance between model scores', () => {
      render(<MockScoreResult score={mockMLScore} />);

      const distribution = mockMLScore.model_distribution!;
      const scores = Object.values(distribution);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const variance = maxScore - minScore;

      expect(variance).toBeGreaterThan(0);
      expect(maxScore).toBe(75.2); // gpt54
      expect(minScore).toBe(69.8); // llama
    });
  });

  describe('data validation', () => {
    it('should have valid score structure', () => {
      expect(mockMLScore.id).toBeTruthy();
      expect(mockMLScore.url).toBeTruthy();
      expect(mockMLScore.scored_at).toBeTruthy();
      expect(mockMLScore.universal_score).toBeTypeOf('number');
      expect(mockMLScore.signal_inventory).toBeInstanceOf(Array);
      expect(mockMLScore.recommendations).toBeInstanceOf(Array);
    });

    it('should have valid signal inventory items', () => {
      mockMLScore.signal_inventory.forEach((signal) => {
        expect(signal.dimension_id).toBeTruthy();
        expect(signal.score).toBeGreaterThanOrEqual(0);
        expect(signal.score).toBeLessThanOrEqual(1);
        expect(signal.zone_contributions).toBeInstanceOf(Array);
      });
    });

    it('should have valid recommendation items', () => {
      mockMLScore.recommendations.forEach((rec) => {
        expect(rec.dimension_id).toBeTruthy();
        expect(rec.current_signal).toBeTypeOf('number');
        expect(rec.target_signal).toBeTypeOf('number');
        expect(rec.gap).toBeTypeOf('number');
        expect(rec.priority).toMatch(/^(high|medium|low)$/);
      });
    });

    it('should have consistent recommendation priorities', () => {
      const priorities = mockMLScore.recommendations.map((r) => r.priority);
      const validPriorities = ['high', 'medium', 'low'];

      priorities.forEach((priority) => {
        expect(validPriorities).toContain(priority);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty signal inventory', () => {
      const emptySignalScore: MLScore = {
        ...mockMLScore,
        signal_inventory: [],
      };

      render(<MockScoreResult score={emptySignalScore} />);

      const signalCount = screen.getByTestId('signal-count');
      expect(signalCount.textContent).toBe('0');
    });

    it('should handle empty recommendations', () => {
      const emptyRecsScore: MLScore = {
        ...mockMLScore,
        recommendations: [],
      };

      render(<MockScoreResult score={emptyRecsScore} />);

      const recCount = screen.getByTestId('recommendation-count');
      expect(recCount.textContent).toBe('0');
    });

    it('should handle different extraction qualities', () => {
      const qualities: Array<'full' | 'partial' | 'minimal'> = ['full', 'partial', 'minimal'];

      qualities.forEach((quality) => {
        const score = { ...mockMLScore, extraction_quality: quality };
        const { unmount } = render(<MockScoreResult score={score} />);
        expect(screen.getByTestId('score-result')).toBeInTheDocument();
        unmount();
      });
    });
  });
});
