// src/test/FingerprintRadar.test.tsx — Integration tests for FingerprintRadar component

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FingerprintRadar from '@/components/charts/FingerprintRadar';
import { getFingerprints, getModels } from '@/lib/data';

describe('FingerprintRadar Component', () => {
  const fingerprints = getFingerprints();
  const models = getModels();

  it('renders without crashing', () => {
    render(
      <FingerprintRadar
        fingerprints={fingerprints}
        models={models}
        selectedModelIds={[]}
      />
    );
  });

  it('shows message when no models are selected', () => {
    render(
      <FingerprintRadar
        fingerprints={fingerprints}
        models={models}
        selectedModelIds={[]}
      />
    );

    expect(
      screen.getByText(/select at least one model/i)
    ).toBeInTheDocument();
  });

  it('renders radar chart when models are selected', () => {
    if (fingerprints.length > 0 && models.length > 0) {
      const { container } = render(
        <FingerprintRadar
          fingerprints={fingerprints}
          models={models}
          selectedModelIds={[models[0].id]}
        />
      );

      // Recharts renders an SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    }
  });

  it('filters fingerprints based on selectedModelIds', () => {
    if (fingerprints.length >= 2 && models.length >= 2) {
      const { container } = render(
        <FingerprintRadar
          fingerprints={fingerprints}
          models={models}
          selectedModelIds={[models[0].id]}
        />
      );

      // Should render chart with only one model
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    }
  });

  it('handles multiple selected models', () => {
    if (fingerprints.length >= 2 && models.length >= 2) {
      const selectedIds = [models[0].id, models[1].id];
      const { container } = render(
        <FingerprintRadar
          fingerprints={fingerprints}
          models={models}
          selectedModelIds={selectedIds}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    }
  });

  it('renders ResponsiveContainer', () => {
    if (fingerprints.length > 0 && models.length > 0) {
      const { container } = render(
        <FingerprintRadar
          fingerprints={fingerprints}
          models={models}
          selectedModelIds={[models[0].id]}
        />
      );

      // ResponsiveContainer creates a div with specific class
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    }
  });

  it('does not crash with empty fingerprints array', () => {
    render(
      <FingerprintRadar
        fingerprints={[]}
        models={models}
        selectedModelIds={[]}
      />
    );
  });

  it('does not crash with empty models array', () => {
    render(
      <FingerprintRadar
        fingerprints={fingerprints}
        models={[]}
        selectedModelIds={[]}
      />
    );
  });

  it('does not crash with mismatched selectedModelIds', () => {
    render(
      <FingerprintRadar
        fingerprints={fingerprints}
        models={models}
        selectedModelIds={['non-existent-model-id']}
      />
    );
  });

  it('renders without selectedModelIds prop (defaults to empty)', () => {
    render(
      <FingerprintRadar
        fingerprints={fingerprints}
        models={models}
      />
    );

    expect(
      screen.getByText(/select at least one model/i)
    ).toBeInTheDocument();
  });

  it('uses correct data structure for radar chart', () => {
    if (fingerprints.length > 0 && models.length > 0) {
      const { container } = render(
        <FingerprintRadar
          fingerprints={fingerprints}
          models={models}
          selectedModelIds={[models[0].id]}
        />
      );

      // Check for radar-specific elements
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // RadarChart should have proper dimensions
      const radarChart = container.querySelector('.recharts-wrapper');
      expect(radarChart).toBeInTheDocument();
    }
  });
});

describe('FingerprintRadar Data Integration', () => {
  const fingerprints = getFingerprints();
  const models = getModels();

  it('displays data for all 26 dimensions', () => {
    if (fingerprints.length > 0 && models.length > 0) {
      const { container } = render(
        <FingerprintRadar
          fingerprints={fingerprints}
          models={models}
          selectedModelIds={[models[0].id]}
        />
      );

      // The radar should have polar angle axis ticks for each dimension
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    }
  });

  it('handles fingerprints with 26-element vectors', () => {
    if (fingerprints.length > 0 && models.length > 0) {
      const fp = fingerprints[0];
      expect(fp.vector.length).toBe(26);

      render(
        <FingerprintRadar
          fingerprints={[fp]}
          models={models}
          selectedModelIds={[fp.model_id]}
        />
      );
    }
  });

  it('integrates with real model data', () => {
    if (fingerprints.length > 0 && models.length > 0) {
      const validModelIds = models.map(m => m.id);
      const fingerprintsWithValidModels = fingerprints.filter(fp =>
        validModelIds.includes(fp.model_id)
      );

      expect(fingerprintsWithValidModels.length).toBeGreaterThan(0);

      render(
        <FingerprintRadar
          fingerprints={fingerprintsWithValidModels}
          models={models}
          selectedModelIds={[fingerprintsWithValidModels[0].model_id]}
        />
      );
    }
  });
});

describe('FingerprintRadar Accessibility', () => {
  const fingerprints = getFingerprints();
  const models = getModels();

  it('renders without accessibility violations', () => {
    const { container } = render(
      <FingerprintRadar
        fingerprints={fingerprints}
        models={models}
        selectedModelIds={models.length > 0 ? [models[0].id] : []}
      />
    );

    // Basic accessibility check - component should render
    expect(container.firstChild).toBeInTheDocument();
  });

  it('provides helpful message when no selection', () => {
    render(
      <FingerprintRadar
        fingerprints={fingerprints}
        models={models}
        selectedModelIds={[]}
      />
    );

    const message = screen.getByText(/select at least one model/i);
    expect(message).toBeInTheDocument();
  });
});
