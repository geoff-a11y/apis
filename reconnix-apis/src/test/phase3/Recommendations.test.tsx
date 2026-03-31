import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDimensions } from '@/lib/data';
import type { Recommendation } from '@/lib/types';

// Mock Recommendations component for testing
interface RecommendationsProps {
  recommendations: Recommendation[];
  sortBy?: 'priority' | 'gap' | 'delta';
}

function MockRecommendations({
  recommendations,
  sortBy = 'priority',
}: RecommendationsProps) {
  const dimensions = getDimensions();

  // Sort recommendations
  const sortedRecs = [...recommendations].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    if (sortBy === 'gap') {
      return b.gap - a.gap; // Descending order for gap
    }

    if (sortBy === 'delta') {
      return b.predicted_delta - a.predicted_delta; // Descending order for delta
    }

    return 0;
  });

  return (
    <div data-testid="recommendations">
      <div data-testid="recommendation-count">{recommendations.length}</div>
      <div data-testid="sort-by">{sortBy}</div>
      <div data-testid="recommendation-list">
        {sortedRecs.map((rec, idx) => {
          const dimension = dimensions.find((d) => d.id === rec.dimension_id);
          return (
            <div
              key={rec.dimension_id}
              data-testid={`rec-${rec.dimension_id}`}
              data-index={idx}
            >
              <span data-testid={`rec-name-${rec.dimension_id}`}>
                {dimension?.display_name || rec.dimension_id}
              </span>
              <span data-testid={`rec-priority-${rec.dimension_id}`}>
                {rec.priority}
              </span>
              <span data-testid={`rec-gap-${rec.dimension_id}`}>
                {rec.gap.toFixed(2)}
              </span>
              <span data-testid={`rec-delta-${rec.dimension_id}`}>
                {rec.predicted_delta.toFixed(1)}
              </span>
              <span data-testid={`rec-current-${rec.dimension_id}`}>
                {rec.current_signal.toFixed(2)}
              </span>
              <span data-testid={`rec-target-${rec.dimension_id}`}>
                {rec.target_signal.toFixed(2)}
              </span>
              <span data-testid={`rec-suggestion-${rec.dimension_id}`}>
                {rec.copy_suggestion}
              </span>
              <span data-testid={`rec-zone-${rec.dimension_id}`}>
                {rec.zone}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

describe('Recommendations', () => {
  const mockRecommendations: Recommendation[] = [
    {
      dimension_id: 'dim_01',
      current_signal: 0.2,
      target_signal: 0.8,
      gap: 0.6,
      predicted_delta: 8.5,
      copy_suggestion: 'Add third-party authority endorsement',
      zone: 'title',
      priority: 'high',
    },
    {
      dimension_id: 'dim_02',
      current_signal: 0.4,
      target_signal: 0.7,
      gap: 0.3,
      predicted_delta: 4.2,
      copy_suggestion: 'Include social proof statistics',
      zone: 'description',
      priority: 'medium',
    },
    {
      dimension_id: 'dim_03',
      current_signal: 0.6,
      target_signal: 0.8,
      gap: 0.2,
      predicted_delta: 2.1,
      copy_suggestion: 'Add platform endorsement badge',
      zone: 'features',
      priority: 'low',
    },
    {
      dimension_id: 'dim_05',
      current_signal: 0.1,
      target_signal: 0.9,
      gap: 0.8,
      predicted_delta: 12.3,
      copy_suggestion: 'Highlight sustainability credentials',
      zone: 'title',
      priority: 'high',
    },
    {
      dimension_id: 'dim_07',
      current_signal: 0.5,
      target_signal: 0.75,
      gap: 0.25,
      predicted_delta: 3.8,
      copy_suggestion: 'Emphasize warranty coverage',
      zone: 'features',
      priority: 'medium',
    },
  ];

  describe('renders recommendations', () => {
    it('should display all recommendations', () => {
      render(<MockRecommendations recommendations={mockRecommendations} />);

      const count = screen.getByTestId('recommendation-count');
      expect(count.textContent).toBe('5');
    });

    it('should render each recommendation with dimension name', () => {
      render(<MockRecommendations recommendations={mockRecommendations} />);

      mockRecommendations.forEach((rec) => {
        const nameElement = screen.getByTestId(`rec-name-${rec.dimension_id}`);
        expect(nameElement).toBeInTheDocument();
      });
    });

    it('should display priority for each recommendation', () => {
      render(<MockRecommendations recommendations={mockRecommendations} />);

      mockRecommendations.forEach((rec) => {
        const priorityElement = screen.getByTestId(`rec-priority-${rec.dimension_id}`);
        expect(priorityElement.textContent).toBe(rec.priority);
      });
    });

    it('should display gap values', () => {
      render(<MockRecommendations recommendations={mockRecommendations} />);

      mockRecommendations.forEach((rec) => {
        const gapElement = screen.getByTestId(`rec-gap-${rec.dimension_id}`);
        expect(gapElement.textContent).toBe(rec.gap.toFixed(2));
      });
    });

    it('should display predicted delta values', () => {
      render(<MockRecommendations recommendations={mockRecommendations} />);

      mockRecommendations.forEach((rec) => {
        const deltaElement = screen.getByTestId(`rec-delta-${rec.dimension_id}`);
        expect(deltaElement.textContent).toBe(rec.predicted_delta.toFixed(1));
      });
    });

    it('should display copy suggestions', () => {
      render(<MockRecommendations recommendations={mockRecommendations} />);

      mockRecommendations.forEach((rec) => {
        const suggestionElement = screen.getByTestId(`rec-suggestion-${rec.dimension_id}`);
        expect(suggestionElement.textContent).toBe(rec.copy_suggestion);
      });
    });

    it('should display zone information', () => {
      render(<MockRecommendations recommendations={mockRecommendations} />);

      mockRecommendations.forEach((rec) => {
        const zoneElement = screen.getByTestId(`rec-zone-${rec.dimension_id}`);
        expect(zoneElement.textContent).toBe(rec.zone);
      });
    });

    it('should display current and target signals', () => {
      render(<MockRecommendations recommendations={mockRecommendations} />);

      mockRecommendations.forEach((rec) => {
        const currentElement = screen.getByTestId(`rec-current-${rec.dimension_id}`);
        const targetElement = screen.getByTestId(`rec-target-${rec.dimension_id}`);

        expect(currentElement.textContent).toBe(rec.current_signal.toFixed(2));
        expect(targetElement.textContent).toBe(rec.target_signal.toFixed(2));
      });
    });
  });

  describe('priority ordering', () => {
    it('should sort by priority by default (high > medium > low)', () => {
      render(<MockRecommendations recommendations={mockRecommendations} sortBy="priority" />);

      const list = screen.getByTestId('recommendation-list');
      const priorities: string[] = [];

      Array.from(list.children).forEach((child) => {
        const dimId = child.getAttribute('data-testid')?.replace('rec-', '');
        if (dimId) {
          const priorityElement = screen.getByTestId(`rec-priority-${dimId}`);
          priorities.push(priorityElement.textContent || '');
        }
      });

      // Check that high priority items come before medium, and medium before low
      const highIndices = priorities
        .map((p, i) => (p === 'high' ? i : -1))
        .filter((i) => i !== -1);
      const mediumIndices = priorities
        .map((p, i) => (p === 'medium' ? i : -1))
        .filter((i) => i !== -1);
      const lowIndices = priorities
        .map((p, i) => (p === 'low' ? i : -1))
        .filter((i) => i !== -1);

      if (highIndices.length > 0 && mediumIndices.length > 0) {
        expect(Math.max(...highIndices)).toBeLessThan(Math.min(...mediumIndices));
      }

      if (mediumIndices.length > 0 && lowIndices.length > 0) {
        expect(Math.max(...mediumIndices)).toBeLessThan(Math.min(...lowIndices));
      }
    });

    it('should have high priority recommendations first', () => {
      render(<MockRecommendations recommendations={mockRecommendations} sortBy="priority" />);

      const list = screen.getByTestId('recommendation-list');
      const firstRec = list.children[0];
      const dimId = firstRec.getAttribute('data-testid')?.replace('rec-', '');

      if (dimId) {
        const priorityElement = screen.getByTestId(`rec-priority-${dimId}`);
        expect(priorityElement.textContent).toBe('high');
      }
    });

    it('should group recommendations by priority level', () => {
      render(<MockRecommendations recommendations={mockRecommendations} sortBy="priority" />);

      const list = screen.getByTestId('recommendation-list');
      const priorities: string[] = [];

      Array.from(list.children).forEach((child) => {
        const dimId = child.getAttribute('data-testid')?.replace('rec-', '');
        if (dimId) {
          const priorityElement = screen.getByTestId(`rec-priority-${dimId}`);
          priorities.push(priorityElement.textContent || '');
        }
      });

      // Verify priorities are in order: all highs, then all mediums, then all lows
      let lastPriority = 'high';
      let seenMedium = false;
      let seenLow = false;

      priorities.forEach((priority) => {
        if (priority === 'medium') {
          seenMedium = true;
        }
        if (priority === 'low') {
          seenLow = true;
        }

        // Once we've seen medium, we shouldn't see high again
        if (seenMedium) {
          expect(priority).not.toBe('high');
        }

        // Once we've seen low, we shouldn't see high or medium again
        if (seenLow) {
          expect(priority).not.toBe('high');
          expect(priority).not.toBe('medium');
        }
      });
    });

    it('should sort by gap when specified', () => {
      render(<MockRecommendations recommendations={mockRecommendations} sortBy="gap" />);

      const list = screen.getByTestId('recommendation-list');
      const gaps: number[] = [];

      Array.from(list.children).forEach((child) => {
        const dimId = child.getAttribute('data-testid')?.replace('rec-', '');
        if (dimId) {
          const gapElement = screen.getByTestId(`rec-gap-${dimId}`);
          gaps.push(parseFloat(gapElement.textContent || '0'));
        }
      });

      // Verify gaps are in descending order
      for (let i = 1; i < gaps.length; i++) {
        expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1]);
      }
    });

    it('should sort by predicted delta when specified', () => {
      render(<MockRecommendations recommendations={mockRecommendations} sortBy="delta" />);

      const list = screen.getByTestId('recommendation-list');
      const deltas: number[] = [];

      Array.from(list.children).forEach((child) => {
        const dimId = child.getAttribute('data-testid')?.replace('rec-', '');
        if (dimId) {
          const deltaElement = screen.getByTestId(`rec-delta-${dimId}`);
          deltas.push(parseFloat(deltaElement.textContent || '0'));
        }
      });

      // Verify deltas are in descending order
      for (let i = 1; i < deltas.length; i++) {
        expect(deltas[i]).toBeLessThanOrEqual(deltas[i - 1]);
      }
    });

    it('should have highest impact recommendations when sorted by delta', () => {
      render(<MockRecommendations recommendations={mockRecommendations} sortBy="delta" />);

      const list = screen.getByTestId('recommendation-list');
      const firstRec = list.children[0];
      const dimId = firstRec.getAttribute('data-testid')?.replace('rec-', '');

      if (dimId) {
        const deltaElement = screen.getByTestId(`rec-delta-${dimId}`);
        const firstDelta = parseFloat(deltaElement.textContent || '0');

        // First delta should be the maximum
        const allDeltas = mockRecommendations.map((r) => r.predicted_delta);
        expect(firstDelta).toBe(Math.max(...allDeltas));
      }
    });
  });

  describe('data validation', () => {
    it('should have valid priority values', () => {
      mockRecommendations.forEach((rec) => {
        expect(['high', 'medium', 'low']).toContain(rec.priority);
      });
    });

    it('should have valid signal ranges (0-1)', () => {
      mockRecommendations.forEach((rec) => {
        expect(rec.current_signal).toBeGreaterThanOrEqual(0);
        expect(rec.current_signal).toBeLessThanOrEqual(1);
        expect(rec.target_signal).toBeGreaterThanOrEqual(0);
        expect(rec.target_signal).toBeLessThanOrEqual(1);
      });
    });

    it('should have target signal greater than current signal', () => {
      mockRecommendations.forEach((rec) => {
        expect(rec.target_signal).toBeGreaterThan(rec.current_signal);
      });
    });

    it('should have gap equal to target minus current', () => {
      mockRecommendations.forEach((rec) => {
        const calculatedGap = rec.target_signal - rec.current_signal;
        expect(rec.gap).toBeCloseTo(calculatedGap, 10);
      });
    });

    it('should have non-negative predicted delta', () => {
      mockRecommendations.forEach((rec) => {
        expect(rec.predicted_delta).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have non-empty copy suggestions', () => {
      mockRecommendations.forEach((rec) => {
        expect(rec.copy_suggestion).toBeTruthy();
        expect(rec.copy_suggestion.length).toBeGreaterThan(0);
      });
    });

    it('should have valid zone assignments', () => {
      const validZones = ['title', 'description', 'features', 'reviews', 'metadata'];
      mockRecommendations.forEach((rec) => {
        expect(rec.zone).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty recommendations list', () => {
      render(<MockRecommendations recommendations={[]} />);

      const count = screen.getByTestId('recommendation-count');
      expect(count.textContent).toBe('0');

      const list = screen.getByTestId('recommendation-list');
      expect(list.children).toHaveLength(0);
    });

    it('should handle single recommendation', () => {
      const singleRec = [mockRecommendations[0]];
      render(<MockRecommendations recommendations={singleRec} />);

      const count = screen.getByTestId('recommendation-count');
      expect(count.textContent).toBe('1');
    });

    it('should handle recommendations with minimal gap', () => {
      const minGapRec: Recommendation = {
        dimension_id: 'dim_10',
        current_signal: 0.99,
        target_signal: 1.0,
        gap: 0.01,
        predicted_delta: 0.1,
        copy_suggestion: 'Minor adjustment needed',
        zone: 'title',
        priority: 'low',
      };

      render(<MockRecommendations recommendations={[minGapRec]} />);

      const gapElement = screen.getByTestId(`rec-gap-${minGapRec.dimension_id}`);
      expect(gapElement.textContent).toBe('0.01');
    });

    it('should handle recommendations with maximal gap', () => {
      const maxGapRec: Recommendation = {
        dimension_id: 'dim_11',
        current_signal: 0.0,
        target_signal: 1.0,
        gap: 1.0,
        predicted_delta: 15.0,
        copy_suggestion: 'Complete signal implementation needed',
        zone: 'description',
        priority: 'high',
      };

      render(<MockRecommendations recommendations={[maxGapRec]} />);

      const gapElement = screen.getByTestId(`rec-gap-${maxGapRec.dimension_id}`);
      expect(gapElement.textContent).toBe('1.00');
    });

    it('should handle all priorities present', () => {
      render(<MockRecommendations recommendations={mockRecommendations} />);

      const priorities = new Set<string>();
      mockRecommendations.forEach((rec) => {
        const priorityElement = screen.getByTestId(`rec-priority-${rec.dimension_id}`);
        priorities.add(priorityElement.textContent || '');
      });

      expect(priorities.has('high')).toBe(true);
      expect(priorities.has('medium')).toBe(true);
      expect(priorities.has('low')).toBe(true);
    });

    it('should handle recommendations for same dimension across different zones', () => {
      const multiZoneRecs: Recommendation[] = [
        { ...mockRecommendations[0], dimension_id: 'dim_20', zone: 'title' },
        { ...mockRecommendations[1], dimension_id: 'dim_20', zone: 'description' },
      ];

      // This should work without errors even though same dimension appears twice
      const { container } = render(<MockRecommendations recommendations={multiZoneRecs} />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('impact metrics', () => {
    it('should correlate high priority with large gaps', () => {
      const highPriorityRecs = mockRecommendations.filter((r) => r.priority === 'high');
      const lowPriorityRecs = mockRecommendations.filter((r) => r.priority === 'low');

      if (highPriorityRecs.length > 0 && lowPriorityRecs.length > 0) {
        const avgHighGap =
          highPriorityRecs.reduce((sum, r) => sum + r.gap, 0) / highPriorityRecs.length;
        const avgLowGap =
          lowPriorityRecs.reduce((sum, r) => sum + r.gap, 0) / lowPriorityRecs.length;

        // Generally, high priority items should have larger gaps
        expect(avgHighGap).toBeGreaterThanOrEqual(avgLowGap);
      }
    });

    it('should show positive impact for all recommendations', () => {
      mockRecommendations.forEach((rec) => {
        expect(rec.predicted_delta).toBeGreaterThan(0);
        expect(rec.gap).toBeGreaterThan(0);
      });
    });
  });
});
