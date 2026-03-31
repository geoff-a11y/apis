// src/test/ModelSelector.test.tsx — Integration tests for ModelSelector component

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { getModels } from '@/lib/data';
import type { Model } from '@/lib/types';

describe('ModelSelector Component', () => {
  const models = getModels();
  const mockOnSelectionChange = vi.fn();

  it('renders without crashing', () => {
    render(
      <ModelSelector
        models={models}
        onSelectionChange={mockOnSelectionChange}
      />
    );
  });

  it('renders with default multi-select mode', () => {
    render(
      <ModelSelector
        models={models}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Should show "Select All" and "Clear" buttons in multi mode
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('renders in single-select mode', () => {
    render(
      <ModelSelector
        models={models}
        mode="single"
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Should not show "Select All" button in single mode
    expect(screen.queryByText('Select All')).not.toBeInTheDocument();
  });

  it('displays all model names', () => {
    render(
      <ModelSelector
        models={models}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    models.forEach(model => {
      expect(screen.getByText(model.name)).toBeInTheDocument();
    });
  });

  it('renders with custom className', () => {
    const { container } = render(
      <ModelSelector
        models={models}
        onSelectionChange={mockOnSelectionChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders with selectedIds prop', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          selectedIds={[models[0].id]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // First model should be selected
      expect(screen.getByText(/1 of \d+ selected/i)).toBeInTheDocument();
    }
  });

  it('shows logos when showLogos is true (default)', () => {
    if (models.length > 0 && models[0].logo) {
      const { container } = render(
        <ModelSelector
          models={models}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Should render Image components (Next.js Image)
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
    }
  });

  it('hides logos when showLogos is false', () => {
    if (models.length > 0) {
      const { container } = render(
        <ModelSelector
          models={models}
          onSelectionChange={mockOnSelectionChange}
          showLogos={false}
        />
      );

      // Should have fewer or no images
      const images = container.querySelectorAll('img');
      expect(images.length).toBe(0);
    }
  });
});

describe('ModelSelector Multi-Select Mode', () => {
  const models = getModels();
  const mockOnSelectionChange = vi.fn();

  beforeEach(() => {
    mockOnSelectionChange.mockClear();
  });

  it('toggles model selection on click', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const modelButton = screen.getByText(models[0].name);
      fireEvent.click(modelButton);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([models[0].id]);
    }
  });

  it('allows selecting multiple models', () => {
    if (models.length >= 2) {
      render(
        <ModelSelector
          models={models}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const firstModelButton = screen.getByText(models[0].name);
      const secondModelButton = screen.getByText(models[1].name);

      fireEvent.click(firstModelButton);
      fireEvent.click(secondModelButton);

      // Should have been called twice
      expect(mockOnSelectionChange).toHaveBeenCalledTimes(2);

      // Last call should include both models
      const lastCall = mockOnSelectionChange.mock.calls[mockOnSelectionChange.mock.calls.length - 1];
      expect(lastCall[0]).toContain(models[0].id);
      expect(lastCall[0]).toContain(models[1].id);
    }
  });

  it('deselects model when clicked again', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const modelButton = screen.getByText(models[0].name);

      // Click to select
      fireEvent.click(modelButton);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([models[0].id]);

      // Click to deselect
      fireEvent.click(modelButton);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    }
  });

  it('selects all models when Select All is clicked', () => {
    render(
      <ModelSelector
        models={models}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(
      models.map(m => m.id)
    );
  });

  it('clears all selections when Clear is clicked', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          selectedIds={[models[0].id]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    }
  });

  it('disables Select All when all models are selected', () => {
    render(
      <ModelSelector
        models={models}
        selectedIds={models.map(m => m.id)}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const selectAllButton = screen.getByText('Select All');
    expect(selectAllButton).toBeDisabled();
  });

  it('disables Clear when no models are selected', () => {
    render(
      <ModelSelector
        models={models}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const clearButton = screen.getByText('Clear');
    expect(clearButton).toBeDisabled();
  });

  it('displays selection count', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          selectedIds={[models[0].id]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(screen.getByText(/1 of \d+ selected/i)).toBeInTheDocument();
    }
  });
});

describe('ModelSelector Single-Select Mode', () => {
  const models = getModels();
  const mockOnSelectionChange = vi.fn();

  beforeEach(() => {
    mockOnSelectionChange.mockClear();
  });

  it('selects only one model at a time', () => {
    if (models.length >= 2) {
      render(
        <ModelSelector
          models={models}
          mode="single"
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const firstModelButton = screen.getByText(models[0].name);
      const secondModelButton = screen.getByText(models[1].name);

      // Click first model
      fireEvent.click(firstModelButton);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([models[0].id]);

      // Click second model
      fireEvent.click(secondModelButton);

      // Should replace first selection with second
      const lastCall = mockOnSelectionChange.mock.calls[mockOnSelectionChange.mock.calls.length - 1];
      expect(lastCall[0]).toEqual([models[1].id]);
    }
  });

  it('deselects model when clicked again in single mode', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          mode="single"
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const modelButton = screen.getByText(models[0].name);

      // Click to select
      fireEvent.click(modelButton);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([models[0].id]);

      // Click to deselect
      fireEvent.click(modelButton);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    }
  });

  it('shows helper text in single mode when model is selected', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          mode="single"
          selectedIds={[models[0].id]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(screen.getByText(/click the selected model to deselect/i)).toBeInTheDocument();
    }
  });
});

describe('ModelSelector Visual States', () => {
  const models = getModels();
  const mockOnSelectionChange = vi.fn();

  it('shows checkmark icon for selected models', () => {
    if (models.length > 0) {
      const { container } = render(
        <ModelSelector
          models={models}
          selectedIds={[models[0].id]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Selected model button should contain an SVG checkmark
      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(btn =>
        btn.textContent?.includes(models[0].name)
      );

      if (selectedButton) {
        const checkmarkSvg = selectedButton.querySelector('svg');
        expect(checkmarkSvg).toBeInTheDocument();
      }
    }
  });

  it('applies different styles to selected models', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          selectedIds={[models[0].id]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(btn =>
        btn.textContent?.includes(models[0].name)
      );

      if (selectedButton) {
        // Selected button should have background color style
        expect(selectedButton).toHaveStyle({ backgroundColor: expect.anything() });
      }
    }
  });
});

describe('ModelSelector Data Integration', () => {
  const models = getModels();
  const mockOnSelectionChange = vi.fn();

  it('integrates with real model data', () => {

    render(
      <ModelSelector
        models={models}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Should display all real models
    models.forEach(model => {
      expect(screen.getByText(model.name)).toBeInTheDocument();
    });
  });

  it('handles empty models array gracefully', () => {
    const { container } = render(
      <ModelSelector
        models={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Should render without crashing
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles models with missing logo property', () => {
    const modelsWithoutLogos: Model[] = models.map(m => ({
      ...m,
      logo: '',
    }));

    render(
      <ModelSelector
        models={modelsWithoutLogos}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Should render model names
    modelsWithoutLogos.forEach(model => {
      expect(screen.getByText(model.name)).toBeInTheDocument();
    });
  });

  it('uses correct model colors', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          selectedIds={[models[0].id]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(btn =>
        btn.textContent?.includes(models[0].name)
      );

      if (selectedButton) {
        // Should apply model-specific color
        const bgColor = selectedButton.style.backgroundColor;
        expect(bgColor).toBeTruthy();
      }
    }
  });
});

describe('ModelSelector Accessibility', () => {
  const models = getModels();
  const mockOnSelectionChange = vi.fn();

  it('uses button elements for selectable models', () => {
    render(
      <ModelSelector
        models={models}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    // Should have buttons for each model plus control buttons
    expect(buttons.length).toBeGreaterThanOrEqual(models.length);
  });

  it('buttons are keyboard accessible', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Use getByRole to find the button containing the model name
      const modelButton = screen.getByRole('button', { name: new RegExp(models[0].name) });
      expect(modelButton.tagName).toBe('BUTTON');
    }
  });

  it('provides alt text for model logos', () => {
    if (models.length > 0 && models[0].logo) {
      const { container } = render(
        <ModelSelector
          models={models}
          onSelectionChange={mockOnSelectionChange}
          showLogos={true}
        />
      );

      const images = container.querySelectorAll('img');
      if (images.length > 0) {
        const firstImage = images[0];
        expect(firstImage).toHaveAttribute('alt');
      }
    }
  });
});

describe('ModelSelector Edge Cases', () => {
  const models = getModels();
  const mockOnSelectionChange = vi.fn();

  it('handles rapid clicks on same model', () => {
    if (models.length > 0) {
      render(
        <ModelSelector
          models={models}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const modelButton = screen.getByText(models[0].name);

      // Click multiple times rapidly
      fireEvent.click(modelButton);
      fireEvent.click(modelButton);
      fireEvent.click(modelButton);

      expect(mockOnSelectionChange).toHaveBeenCalledTimes(3);
    }
  });

  it('handles invalid selectedIds gracefully', () => {
    render(
      <ModelSelector
        models={models}
        selectedIds={['invalid-id-1', 'invalid-id-2']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Should render without crashing
    expect(screen.getByText('Select All')).toBeInTheDocument();
  });

  it('handles duplicate model IDs in selectedIds', () => {
    if (models.length > 0) {
      const duplicateIds = [models[0].id, models[0].id, models[0].id];

      render(
        <ModelSelector
          models={models}
          selectedIds={duplicateIds}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Should still render correctly
      expect(screen.getByText(models[0].name)).toBeInTheDocument();
    }
  });
});
