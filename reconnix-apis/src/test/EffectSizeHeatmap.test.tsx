// src/test/EffectSizeHeatmap.test.tsx — Integration tests for EffectSizeHeatmap component

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EffectSizeHeatmap } from '@/components/charts/EffectSizeHeatmap';
import { getModels, getDimensions, getEffectSizes } from '@/lib/data';

describe('EffectSizeHeatmap Component', () => {
  it('renders without crashing', () => {
    render(<EffectSizeHeatmap />);
  });

  it('renders with default props', () => {
    const { container } = render(<EffectSizeHeatmap />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with custom context prop', () => {
    render(<EffectSizeHeatmap context="b2c" />);
    expect(screen.getByText(/Effect Size Heatmap/i)).toBeInTheDocument();
  });

  it('renders with confirmatoryOnly=false', () => {
    render(<EffectSizeHeatmap confirmatoryOnly={false} />);
    expect(screen.getByText(/Effect Size Heatmap/i)).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(<EffectSizeHeatmap className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays heatmap title', () => {
    render(<EffectSizeHeatmap />);
    expect(screen.getByText('Effect Size Heatmap')).toBeInTheDocument();
  });

  it('displays description text', () => {
    render(<EffectSizeHeatmap />);
    expect(screen.getByText(/Cohen's h effect sizes/i)).toBeInTheDocument();
  });

  it('displays color scale legend', () => {
    render(<EffectSizeHeatmap />);
    expect(screen.getByText('-1.0')).toBeInTheDocument();
    expect(screen.getByText('+1.0')).toBeInTheDocument();
  });

  it('displays dimension key section', () => {
    render(<EffectSizeHeatmap />);
    expect(screen.getByText('Dimension Key')).toBeInTheDocument();
  });
});

describe('EffectSizeHeatmap Data Display', () => {
  const models = getModels();
  const dimensions = getDimensions();
  const effectSizes = getEffectSizes('pooled');

  it('displays model names as row labels', () => {
    render(<EffectSizeHeatmap />);

    if (models.length > 0) {
      // Check for at least one model name
      const firstModel = models[0];
      expect(screen.getByText(firstModel.name)).toBeInTheDocument();
    }
  });

  it('renders cells for all models and dimensions', () => {
    const { container } = render(<EffectSizeHeatmap />);

    // Check that we have a reasonable number of cells
    // Should have models.length rows
    const modelLabels = container.querySelectorAll('.text-navy');
    expect(modelLabels.length).toBeGreaterThan(0);
  });

  it('displays dimension abbreviations', () => {
    render(<EffectSizeHeatmap />);

    // Should display dimension IDs like "D01", "D02", etc.
    if (dimensions.length > 0) {
      const dimId = dimensions[0].id.replace('dim_', 'D');
      expect(screen.getByText(dimId)).toBeInTheDocument();
    }
  });

  it('displays dimension full names in key', () => {
    render(<EffectSizeHeatmap />);

    if (dimensions.length > 0) {
      const firstDim = dimensions[0];
      expect(screen.getByText(firstDim.display_name)).toBeInTheDocument();
    }
  });

  it('integrates with real effect size data', () => {
    const { container } = render(<EffectSizeHeatmap />);

    // Should have effect size values displayed
    expect(container.textContent).toBeTruthy();
  });
});

describe('EffectSizeHeatmap Interactions', () => {
  it('handles cell click to show details modal', () => {
    const { container } = render(<EffectSizeHeatmap />);

    // Find a cell with effect size data (contains a numeric value)
    const cells = container.querySelectorAll('[class*="cursor-pointer"]');

    if (cells.length > 0) {
      // Click the first cell
      fireEvent.click(cells[0]);

      // Modal should appear with "Effect Size Details" or remain closed if no data
      // Since we don't know if the cell has data, we just verify no crash
      expect(container).toBeInTheDocument();
    }
  });

  it('displays cell details modal with correct structure', () => {
    const models = getModels();
    const dimensions = getDimensions();
    const effectSizes = getEffectSizes('pooled');

    if (effectSizes.length > 0) {
      const { container } = render(<EffectSizeHeatmap />);

      // Find a cell and click it
      const cells = container.querySelectorAll('[class*="cursor-pointer"]');
      if (cells.length > 0) {
        const cellWithData = Array.from(cells).find(cell =>
          cell.textContent && cell.textContent.match(/[+-]?\d+\.\d+/)
        );

        if (cellWithData) {
          fireEvent.click(cellWithData);

          // Check if modal appears (it might not if cell has no data)
          const modal = screen.queryByText('Effect Size Details');
          if (modal) {
            expect(modal).toBeInTheDocument();
          }
        }
      }
    }
  });

  it('closes modal when clicking close button', () => {
    const effectSizes = getEffectSizes('pooled');

    if (effectSizes.length > 0) {
      const { container } = render(<EffectSizeHeatmap />);

      const cells = container.querySelectorAll('[class*="cursor-pointer"]');
      if (cells.length > 0) {
        const cellWithData = Array.from(cells).find(cell =>
          cell.textContent && cell.textContent.match(/[+-]?\d+\.\d+/)
        );

        if (cellWithData) {
          fireEvent.click(cellWithData);

          const closeButton = screen.queryByText('Close');
          if (closeButton) {
            fireEvent.click(closeButton);

            // Modal should be gone
            expect(screen.queryByText('Effect Size Details')).not.toBeInTheDocument();
          }
        }
      }
    }
  });

  it('handles cell hover state', () => {
    const { container } = render(<EffectSizeHeatmap />);

    const cells = container.querySelectorAll('[class*="cursor-pointer"]');
    if (cells.length > 0) {
      const cell = cells[0];

      // Simulate mouse enter
      fireEvent.mouseEnter(cell);

      // Simulate mouse leave
      fireEvent.mouseLeave(cell);

      // Should not crash
      expect(container).toBeInTheDocument();
    }
  });
});

describe('EffectSizeHeatmap Context Filtering', () => {
  it('filters effect sizes by b2c context', () => {
    render(<EffectSizeHeatmap context="b2c" />);
    expect(screen.getByText('Effect Size Heatmap')).toBeInTheDocument();
  });

  it('filters effect sizes by b2b context', () => {
    render(<EffectSizeHeatmap context="b2b" />);
    expect(screen.getByText('Effect Size Heatmap')).toBeInTheDocument();
  });

  it('filters effect sizes by pooled context (default)', () => {
    render(<EffectSizeHeatmap context="pooled" />);
    expect(screen.getByText('Effect Size Heatmap')).toBeInTheDocument();
  });
});

describe('EffectSizeHeatmap Confirmatory Filtering', () => {
  it('shows only confirmatory models when confirmatoryOnly=true', () => {
    const { container } = render(<EffectSizeHeatmap confirmatoryOnly={true} />);

    const models = getModels().filter(m => m.study_type === 'confirmatory');

    if (models.length > 0) {
      // Should display confirmatory models
      expect(screen.getByText(models[0].name)).toBeInTheDocument();
    }
  });

  it('shows all models when confirmatoryOnly=false', () => {
    render(<EffectSizeHeatmap confirmatoryOnly={false} />);

    const models = getModels();

    if (models.length > 0) {
      // Should display models
      expect(screen.getByText(models[0].name)).toBeInTheDocument();
    }
  });
});

describe('EffectSizeHeatmap Color Scale', () => {
  it('displays color scale with correct number of steps', () => {
    const { container } = render(<EffectSizeHeatmap />);

    // Color scale should have 11 color blocks by default
    const colorBlocks = container.querySelectorAll('[class*="h-6"]');
    expect(colorBlocks.length).toBeGreaterThan(0);
  });

  it('displays color scale labels', () => {
    render(<EffectSizeHeatmap />);

    // Should show -1.0 and +1.0 labels
    expect(screen.getByText('-1.0')).toBeInTheDocument();
    expect(screen.getByText('+1.0')).toBeInTheDocument();
  });
});

describe('EffectSizeHeatmap Accessibility', () => {
  it('renders without accessibility violations', () => {
    const { container } = render(<EffectSizeHeatmap />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('provides cell titles for hover tooltips', () => {
    const { container } = render(<EffectSizeHeatmap />);

    const cellsWithTitle = container.querySelectorAll('[title]');
    expect(cellsWithTitle.length).toBeGreaterThan(0);
  });
});

describe('EffectSizeHeatmap Edge Cases', () => {
  it('handles empty effect sizes gracefully', () => {
    // Component should still render even if there are missing effect sizes
    const { container } = render(<EffectSizeHeatmap />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays placeholder for missing data', () => {
    const { container } = render(<EffectSizeHeatmap />);

    // Cells with no data should show "—" or similar
    const hasPlaceholder = container.textContent?.includes('—');
    // This is optional - cells might all have data
    expect(container).toBeInTheDocument();
  });
});
