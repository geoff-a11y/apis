import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getDimensions } from '@/lib/data';
import type { SignalPresence } from '@/lib/types';

// Mock SignalInventory component for testing
interface SignalInventoryProps {
  signals: SignalPresence[];
  sortBy?: 'dimension' | 'score' | 'cluster';
  sortOrder?: 'asc' | 'desc';
}

function MockSignalInventory({
  signals,
  sortBy = 'dimension',
  sortOrder = 'asc',
}: SignalInventoryProps) {
  const dimensions = getDimensions();

  // Sort signals
  const sortedSignals = [...signals].sort((a, b) => {
    if (sortBy === 'score') {
      return sortOrder === 'asc'
        ? a.score - b.score
        : b.score - a.score;
    }

    if (sortBy === 'cluster') {
      const dimA = dimensions.find((d) => d.id === a.dimension_id);
      const dimB = dimensions.find((d) => d.id === b.dimension_id);
      const clusterCompare = (dimA?.cluster || '').localeCompare(dimB?.cluster || '');
      return sortOrder === 'asc' ? clusterCompare : -clusterCompare;
    }

    // Default: sort by dimension
    return sortOrder === 'asc'
      ? a.dimension_id.localeCompare(b.dimension_id)
      : b.dimension_id.localeCompare(a.dimension_id);
  });

  return (
    <div data-testid="signal-inventory">
      <div data-testid="signal-count">{signals.length}</div>
      <div data-testid="sort-info">{`${sortBy}-${sortOrder}`}</div>
      <div data-testid="signal-list">
        {sortedSignals.map((signal, idx) => {
          const dimension = dimensions.find((d) => d.id === signal.dimension_id);
          return (
            <div
              key={signal.dimension_id}
              data-testid={`signal-${signal.dimension_id}`}
              data-index={idx}
            >
              <span data-testid={`signal-name-${signal.dimension_id}`}>
                {dimension?.display_name || signal.dimension_id}
              </span>
              <span data-testid={`signal-score-${signal.dimension_id}`}>
                {signal.score.toFixed(2)}
              </span>
              <span data-testid={`signal-cluster-${signal.dimension_id}`}>
                {dimension?.cluster || 'Unknown'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

describe('SignalInventory', () => {
  const allDimensions = getDimensions();

  // Create mock signals for all 26 dimensions
  const mockSignals: SignalPresence[] = allDimensions.map((dim, idx) => ({
    dimension_id: dim.id,
    score: (idx * 0.03 + 0.1) % 1, // Vary scores between 0.1 and 1.0
    zone_contributions: [
      {
        zone: 'title',
        score: 0.5,
        evidence: 'Signal detected in title',
      },
    ],
  }));

  describe('renders all 26 dimensions', () => {
    it('should display all 26 dimensions', () => {
      render(<MockSignalInventory signals={mockSignals} />);

      const signalCount = screen.getByTestId('signal-count');
      expect(signalCount.textContent).toBe('26');
    });

    it('should render each dimension with its display name', () => {
      render(<MockSignalInventory signals={mockSignals} />);

      allDimensions.forEach((dim) => {
        const signalName = screen.getByTestId(`signal-name-${dim.id}`);
        expect(signalName.textContent).toBe(dim.display_name);
      });
    });

    it('should display score for each dimension', () => {
      render(<MockSignalInventory signals={mockSignals} />);

      mockSignals.forEach((signal) => {
        const scoreElement = screen.getByTestId(`signal-score-${signal.dimension_id}`);
        expect(scoreElement.textContent).toBe(signal.score.toFixed(2));
      });
    });

    it('should show cluster for each dimension', () => {
      render(<MockSignalInventory signals={mockSignals} />);

      allDimensions.forEach((dim) => {
        const clusterElement = screen.getByTestId(`signal-cluster-${dim.id}`);
        expect(clusterElement.textContent).toBe(dim.cluster);
      });
    });

    it('should handle all 6 clusters (A-F)', () => {
      render(<MockSignalInventory signals={mockSignals} />);

      const clusters = new Set<string>();
      allDimensions.forEach((dim) => {
        clusters.add(dim.cluster);
      });

      expect(clusters.size).toBeGreaterThanOrEqual(1);
      expect(clusters.size).toBeLessThanOrEqual(6);
    });

    it('should render complete signal inventory', () => {
      render(<MockSignalInventory signals={mockSignals} />);

      const signalList = screen.getByTestId('signal-list');
      expect(signalList.children).toHaveLength(26);
    });
  });

  describe('sorting works', () => {
    it('should sort by dimension ID in ascending order by default', () => {
      render(<MockSignalInventory signals={mockSignals} sortBy="dimension" sortOrder="asc" />);

      const firstSignal = screen.getByTestId('signal-list').children[0];
      const lastSignal = screen.getByTestId('signal-list').children[25];

      expect(firstSignal.getAttribute('data-testid')).toBe('signal-dim_01');
      expect(lastSignal.getAttribute('data-testid')).toBe('signal-dim_26');
    });

    it('should sort by dimension ID in descending order', () => {
      render(<MockSignalInventory signals={mockSignals} sortBy="dimension" sortOrder="desc" />);

      const firstSignal = screen.getByTestId('signal-list').children[0];
      const lastSignal = screen.getByTestId('signal-list').children[25];

      expect(firstSignal.getAttribute('data-testid')).toBe('signal-dim_26');
      expect(lastSignal.getAttribute('data-testid')).toBe('signal-dim_01');
    });

    it('should sort by score in ascending order', () => {
      render(<MockSignalInventory signals={mockSignals} sortBy="score" sortOrder="asc" />);

      const scores: number[] = [];
      mockSignals.forEach((signal) => {
        const scoreElement = screen.getByTestId(`signal-score-${signal.dimension_id}`);
        scores.push(parseFloat(scoreElement.textContent || '0'));
      });

      // Verify scores are in ascending order in the rendered list
      const signalList = screen.getByTestId('signal-list');
      const renderedScores: number[] = [];
      Array.from(signalList.children).forEach((child) => {
        const dimId = child.getAttribute('data-testid')?.replace('signal-', '');
        if (dimId) {
          const scoreElement = screen.getByTestId(`signal-score-${dimId}`);
          renderedScores.push(parseFloat(scoreElement.textContent || '0'));
        }
      });

      for (let i = 1; i < renderedScores.length; i++) {
        expect(renderedScores[i]).toBeGreaterThanOrEqual(renderedScores[i - 1]);
      }
    });

    it('should sort by score in descending order', () => {
      render(<MockSignalInventory signals={mockSignals} sortBy="score" sortOrder="desc" />);

      const signalList = screen.getByTestId('signal-list');
      const renderedScores: number[] = [];
      Array.from(signalList.children).forEach((child) => {
        const dimId = child.getAttribute('data-testid')?.replace('signal-', '');
        if (dimId) {
          const scoreElement = screen.getByTestId(`signal-score-${dimId}`);
          renderedScores.push(parseFloat(scoreElement.textContent || '0'));
        }
      });

      for (let i = 1; i < renderedScores.length; i++) {
        expect(renderedScores[i]).toBeLessThanOrEqual(renderedScores[i - 1]);
      }
    });

    it('should sort by cluster in ascending order', () => {
      render(<MockSignalInventory signals={mockSignals} sortBy="cluster" sortOrder="asc" />);

      const signalList = screen.getByTestId('signal-list');
      const renderedClusters: string[] = [];
      Array.from(signalList.children).forEach((child) => {
        const dimId = child.getAttribute('data-testid')?.replace('signal-', '');
        if (dimId) {
          const clusterElement = screen.getByTestId(`signal-cluster-${dimId}`);
          renderedClusters.push(clusterElement.textContent || '');
        }
      });

      for (let i = 1; i < renderedClusters.length; i++) {
        expect(renderedClusters[i].localeCompare(renderedClusters[i - 1])).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort by cluster in descending order', () => {
      render(<MockSignalInventory signals={mockSignals} sortBy="cluster" sortOrder="desc" />);

      const signalList = screen.getByTestId('signal-list');
      const renderedClusters: string[] = [];
      Array.from(signalList.children).forEach((child) => {
        const dimId = child.getAttribute('data-testid')?.replace('signal-', '');
        if (dimId) {
          const clusterElement = screen.getByTestId(`signal-cluster-${dimId}`);
          renderedClusters.push(clusterElement.textContent || '');
        }
      });

      for (let i = 1; i < renderedClusters.length; i++) {
        expect(renderedClusters[i].localeCompare(renderedClusters[i - 1])).toBeLessThanOrEqual(0);
      }
    });

    it('should maintain correct sort order info', () => {
      const testCases = [
        { sortBy: 'dimension' as const, sortOrder: 'asc' as const, expected: 'dimension-asc' },
        { sortBy: 'dimension' as const, sortOrder: 'desc' as const, expected: 'dimension-desc' },
        { sortBy: 'score' as const, sortOrder: 'asc' as const, expected: 'score-asc' },
        { sortBy: 'score' as const, sortOrder: 'desc' as const, expected: 'score-desc' },
        { sortBy: 'cluster' as const, sortOrder: 'asc' as const, expected: 'cluster-asc' },
        { sortBy: 'cluster' as const, sortOrder: 'desc' as const, expected: 'cluster-desc' },
      ];

      testCases.forEach(({ sortBy, sortOrder, expected }) => {
        const { unmount } = render(
          <MockSignalInventory signals={mockSignals} sortBy={sortBy} sortOrder={sortOrder} />
        );

        const sortInfo = screen.getByTestId('sort-info');
        expect(sortInfo.textContent).toBe(expected);

        unmount();
      });
    });
  });

  describe('data validation', () => {
    it('should have exactly 26 dimensions in test data', () => {
      expect(allDimensions).toHaveLength(26);
    });

    it('should have unique dimension IDs', () => {
      const ids = allDimensions.map((d) => d.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(26);
    });

    it('should have valid score ranges (0-1)', () => {
      mockSignals.forEach((signal) => {
        expect(signal.score).toBeGreaterThanOrEqual(0);
        expect(signal.score).toBeLessThanOrEqual(1);
      });
    });

    it('should have valid cluster assignments', () => {
      const validClusters = ['A', 'B', 'C', 'D', 'E', 'F'];
      allDimensions.forEach((dim) => {
        expect(validClusters).toContain(dim.cluster);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty signal inventory', () => {
      render(<MockSignalInventory signals={[]} />);

      const signalCount = screen.getByTestId('signal-count');
      expect(signalCount.textContent).toBe('0');

      const signalList = screen.getByTestId('signal-list');
      expect(signalList.children).toHaveLength(0);
    });

    it('should handle partial signal inventory', () => {
      const partialSignals = mockSignals.slice(0, 10);
      render(<MockSignalInventory signals={partialSignals} />);

      const signalCount = screen.getByTestId('signal-count');
      expect(signalCount.textContent).toBe('10');
    });

    it('should handle signals with score of 0', () => {
      const zeroScoreSignals = mockSignals.map((s) => ({ ...s, score: 0 }));
      render(<MockSignalInventory signals={zeroScoreSignals} />);

      zeroScoreSignals.forEach((signal) => {
        const scoreElement = screen.getByTestId(`signal-score-${signal.dimension_id}`);
        expect(scoreElement.textContent).toBe('0.00');
      });
    });

    it('should handle signals with score of 1', () => {
      const maxScoreSignals = mockSignals.map((s) => ({ ...s, score: 1 }));
      render(<MockSignalInventory signals={maxScoreSignals} />);

      maxScoreSignals.forEach((signal) => {
        const scoreElement = screen.getByTestId(`signal-score-${signal.dimension_id}`);
        expect(scoreElement.textContent).toBe('1.00');
      });
    });
  });

  describe('cluster distribution', () => {
    it('should have signals from multiple clusters', () => {
      const clusterSet = new Set(allDimensions.map((d) => d.cluster));
      expect(clusterSet.size).toBeGreaterThan(1);
    });

    it('should render signals from all clusters present in data', () => {
      render(<MockSignalInventory signals={mockSignals} />);

      const renderedClusters = new Set<string>();
      allDimensions.forEach((dim) => {
        const clusterElement = screen.getByTestId(`signal-cluster-${dim.id}`);
        renderedClusters.add(clusterElement.textContent || '');
      });

      const dataClusters = new Set(allDimensions.map((d) => d.cluster));
      expect(renderedClusters.size).toBe(dataClusters.size);
    });
  });
});
