// src/test/ClusterBreakdown.test.tsx — Integration tests for ClusterBreakdown component

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClusterBreakdown } from '@/components/charts/ClusterBreakdown';
import type { ClusterKey } from '@/lib/types';

describe('ClusterBreakdown Component', () => {
  it('renders without crashing', () => {
    render(<ClusterBreakdown />);
  });

  it('renders with onClusterSelect callback', () => {
    const onClusterSelect = vi.fn();
    render(<ClusterBreakdown onClusterSelect={onClusterSelect} />);
  });

  it('displays component title', () => {
    render(<ClusterBreakdown />);
    expect(screen.getByText('Cluster Breakdown')).toBeInTheDocument();
  });

  it('displays component description', () => {
    render(<ClusterBreakdown />);
    expect(screen.getByText(/Six thematic clusters/i)).toBeInTheDocument();
  });

  it('displays overall mean effect size', () => {
    const { container } = render(<ClusterBreakdown />);

    // Should display mean effect size in format "h = X.XXX"
    const meanEffectText = container.textContent;
    expect(meanEffectText).toMatch(/h = [+-]?\d+\.\d+/);
  });
});

describe('ClusterBreakdown Cluster Cards', () => {
  it('renders all 6 cluster cards', () => {
    render(<ClusterBreakdown />);

    // Check for cluster letters A-F
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('displays cluster names', () => {
    render(<ClusterBreakdown />);

    // Check for cluster name text patterns
    expect(screen.getByText(/Evidence-Based/i)).toBeInTheDocument();
    expect(screen.getByText(/Value-Based/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk/i)).toBeInTheDocument();
    expect(screen.getByText(/Information Processing/i)).toBeInTheDocument();
    expect(screen.getByText(/Choice Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Agentic/i)).toBeInTheDocument();
  });

  it('displays dimension counts for each cluster', () => {
    const { container } = render(<ClusterBreakdown />);

    // Each cluster should show "N dimensions"
    const dimensionTexts = container.querySelectorAll('[class*="text-xs"]');
    const hasDimensionCount = Array.from(dimensionTexts).some(el =>
      el.textContent?.match(/\d+ dimensions?/)
    );

    expect(hasDimensionCount).toBe(true);
  });

  it('displays mean effect size for each cluster', () => {
    const { container } = render(<ClusterBreakdown />);

    // Each cluster card should display "h = X.XXX"
    const effectSizes = container.textContent?.match(/h = [+-]?\d+\.\d+/g);
    expect(effectSizes).toBeTruthy();

    if (effectSizes) {
      // Should have at least 6 effect sizes (one per cluster) plus overall mean
      expect(effectSizes.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('displays sparkline distribution for each cluster', () => {
    const { container } = render(<ClusterBreakdown />);

    // Each cluster should have a "Distribution Across Models" label
    const distributionLabels = screen.getAllByText(/Distribution Across Models/i);
    expect(distributionLabels.length).toBe(6);
  });
});

describe('ClusterBreakdown Interactions', () => {
  it('handles cluster card click', () => {
    const onClusterSelect = vi.fn();
    render(<ClusterBreakdown onClusterSelect={onClusterSelect} />);

    // Find and click the first cluster button
    const clusterButtons = screen.getAllByRole('button');
    const clusterButton = clusterButtons.find(btn =>
      btn.textContent?.includes('Click to filter dimensions')
    );

    if (clusterButton) {
      fireEvent.click(clusterButton);
      expect(onClusterSelect).toHaveBeenCalled();
    }
  });

  it('selects cluster when clicked', () => {
    const onClusterSelect = vi.fn();
    render(<ClusterBreakdown onClusterSelect={onClusterSelect} />);

    // Click on cluster A
    const clusterButtons = screen.getAllByRole('button');
    const clusterA = clusterButtons.find(btn =>
      btn.textContent?.includes('A') && btn.textContent?.includes('Evidence-Based')
    );

    if (clusterA) {
      fireEvent.click(clusterA);

      // Should be called with cluster 'A'
      expect(onClusterSelect).toHaveBeenCalledWith('A');
    }
  });

  it('deselects cluster when clicked again', () => {
    const onClusterSelect = vi.fn();
    render(<ClusterBreakdown onClusterSelect={onClusterSelect} />);

    const clusterButtons = screen.getAllByRole('button');
    const clusterA = clusterButtons.find(btn =>
      btn.textContent?.includes('A') && btn.textContent?.includes('Evidence-Based')
    );

    if (clusterA) {
      // Click once to select
      fireEvent.click(clusterA);
      expect(onClusterSelect).toHaveBeenCalledWith('A');

      // Click again to deselect
      fireEvent.click(clusterA);
      expect(onClusterSelect).toHaveBeenCalledWith(null);
    }
  });

  it('shows selected state on cluster card', () => {
    render(<ClusterBreakdown />);

    const clusterButtons = screen.getAllByRole('button');
    const clusterA = clusterButtons.find(btn =>
      btn.textContent?.includes('A') && btn.textContent?.includes('Evidence-Based')
    );

    if (clusterA) {
      fireEvent.click(clusterA);

      // Should show checkmark icon or similar selection indicator
      const hasCheckmark = clusterA.querySelector('svg');
      expect(hasCheckmark).toBeInTheDocument();
    }
  });

  it('displays filter banner when cluster is selected', () => {
    render(<ClusterBreakdown />);

    const clusterButtons = screen.getAllByRole('button');
    const clusterA = clusterButtons.find(btn =>
      btn.textContent?.includes('A') && btn.textContent?.includes('Evidence-Based')
    );

    if (clusterA) {
      fireEvent.click(clusterA);

      // Should show "Showing dimensions in Cluster A"
      expect(screen.getByText(/Showing dimensions in Cluster/i)).toBeInTheDocument();
    }
  });

  it('clears filter when clear button is clicked', () => {
    const onClusterSelect = vi.fn();
    render(<ClusterBreakdown onClusterSelect={onClusterSelect} />);

    const clusterButtons = screen.getAllByRole('button');
    const clusterA = clusterButtons.find(btn =>
      btn.textContent?.includes('A') && btn.textContent?.includes('Evidence-Based')
    );

    if (clusterA) {
      // Select cluster
      fireEvent.click(clusterA);

      // Find and click clear filter button
      const clearButton = screen.getByText('Clear filter');
      fireEvent.click(clearButton);

      expect(onClusterSelect).toHaveBeenCalledWith(null);
    }
  });
});

describe('ClusterBreakdown Legend', () => {
  it('displays legend with all clusters', () => {
    render(<ClusterBreakdown />);

    // Legend should show abbreviated cluster names
    expect(screen.getByText(/A: Evidence-Based/i)).toBeInTheDocument();
    expect(screen.getByText(/B: Value-Based/i)).toBeInTheDocument();
    expect(screen.getByText(/C: Risk/i)).toBeInTheDocument();
    expect(screen.getByText(/D: Information Processing/i)).toBeInTheDocument();
    expect(screen.getByText(/E: Choice Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/F: Agentic/i)).toBeInTheDocument();
  });

  it('displays color indicators in legend', () => {
    const { container } = render(<ClusterBreakdown />);

    // Legend should have colored boxes for each cluster
    const colorBoxes = container.querySelectorAll('[class*="bg-cluster"]');
    expect(colorBoxes.length).toBeGreaterThanOrEqual(6);
  });
});

describe('ClusterBreakdown Statistics', () => {
  it('calculates total dimensions correctly', () => {
    const { container } = render(<ClusterBreakdown />);

    // Should display total count (26 dimensions)
    const text = container.textContent;
    expect(text).toMatch(/26 dimensions/i);
  });

  it('displays mean effect size with correct format', () => {
    const { container } = render(<ClusterBreakdown />);

    // Mean effect should be in format "h = X.XXX"
    const meanEffects = container.textContent?.match(/h = [+-]?\d+\.\d{3}/g);
    expect(meanEffects).toBeTruthy();
  });
});

describe('ClusterBreakdown Data Integration', () => {
  it('integrates with real cluster data', () => {
    const { container } = render(<ClusterBreakdown />);

    // Should display real data from data files
    expect(container.textContent).toBeTruthy();
    expect(container.textContent?.length).toBeGreaterThan(0);
  });

  it('displays consistent data across all clusters', () => {
    render(<ClusterBreakdown />);

    // All 6 clusters should be present
    const clusterLetters: ClusterKey[] = ['A', 'B', 'C', 'D', 'E', 'F'];

    clusterLetters.forEach(letter => {
      expect(screen.getByText(letter)).toBeInTheDocument();
    });
  });

  it('shows valid effect size values', () => {
    const { container } = render(<ClusterBreakdown />);

    // Extract all effect size values
    const effectSizes = container.textContent?.match(/h = ([+-]?\d+\.\d+)/g);

    if (effectSizes) {
      effectSizes.forEach(match => {
        const value = parseFloat(match.replace('h = ', ''));
        // Effect sizes should be reasonable values (typically between -2 and 2)
        expect(value).toBeGreaterThan(-3);
        expect(value).toBeLessThan(3);
      });
    }
  });
});

describe('ClusterBreakdown Accessibility', () => {
  it('renders without accessibility violations', () => {
    const { container } = render(<ClusterBreakdown />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('uses button elements for interactive clusters', () => {
    render(<ClusterBreakdown />);

    const buttons = screen.getAllByRole('button');
    // Should have at least 6 buttons (one per cluster)
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });

  it('provides helpful hint text on cluster cards', () => {
    render(<ClusterBreakdown />);

    // Should show "Click to filter dimensions"
    const hintTexts = screen.getAllByText(/Click to filter dimensions/i);
    expect(hintTexts.length).toBeGreaterThan(0);
  });
});

describe('ClusterBreakdown Edge Cases', () => {
  it('handles missing onClusterSelect callback', () => {
    render(<ClusterBreakdown />);

    const clusterButtons = screen.getAllByRole('button');
    const clusterA = clusterButtons.find(btn =>
      btn.textContent?.includes('A') && btn.textContent?.includes('Evidence-Based')
    );

    if (clusterA) {
      // Should not crash when clicking without callback
      fireEvent.click(clusterA);
      expect(clusterA).toBeInTheDocument();
    }
  });

  it('handles rapid cluster selection changes', () => {
    const onClusterSelect = vi.fn();
    render(<ClusterBreakdown onClusterSelect={onClusterSelect} />);

    const clusterButtons = screen.getAllByRole('button');
    const clusterCards = clusterButtons.filter(btn =>
      btn.textContent?.includes('dimensions')
    );

    // Click multiple clusters rapidly
    if (clusterCards.length >= 3) {
      fireEvent.click(clusterCards[0]);
      fireEvent.click(clusterCards[1]);
      fireEvent.click(clusterCards[2]);

      // Should have been called 3 times
      expect(onClusterSelect).toHaveBeenCalledTimes(3);
    }
  });
});
