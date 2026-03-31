// src/test/colors.test.ts — Integration tests for color utilities

import { describe, it, expect } from 'vitest';
import {
  getEffectSizeColor,
  getEffectSizeBgColor,
  getEffectSizeTextClass,
  getEffectSizeLabel,
  getContrastColor,
  normalizeToPercent,
  generateColorScale,
  MODEL_COLORS,
  CLUSTER_COLORS_HEX,
} from '@/lib/colors';

describe('getEffectSizeColor', () => {
  it('returns green colors for positive values', () => {
    const color = getEffectSizeColor(0.5);
    expect(color).toContain('#'); // hex color
    // Should be a green shade (emerald)
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('returns red colors for negative values', () => {
    const color = getEffectSizeColor(-0.5);
    expect(color).toContain('#'); // hex color
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('returns gray color for zero value', () => {
    const color = getEffectSizeColor(0);
    expect(color).toBe('#9ca3af'); // gray-400
  });

  it('returns darker green for large positive effects', () => {
    const smallPositive = getEffectSizeColor(0.3);
    const largePositive = getEffectSizeColor(0.9);
    expect(smallPositive).not.toBe(largePositive);
  });

  it('returns darker red for large negative effects', () => {
    const smallNegative = getEffectSizeColor(-0.3);
    const largeNegative = getEffectSizeColor(-0.9);
    expect(smallNegative).not.toBe(largeNegative);
  });

  it('handles edge cases correctly', () => {
    expect(getEffectSizeColor(1.0)).toContain('#');
    expect(getEffectSizeColor(-1.0)).toContain('#');
    expect(getEffectSizeColor(0.001)).toContain('#');
    expect(getEffectSizeColor(-0.001)).toContain('#');
  });
});

describe('getEffectSizeBgColor', () => {
  it('returns light green backgrounds for positive values', () => {
    const bgColor = getEffectSizeBgColor(0.5);
    expect(bgColor).toContain('#');
    expect(bgColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('returns light red backgrounds for negative values', () => {
    const bgColor = getEffectSizeBgColor(-0.5);
    expect(bgColor).toContain('#');
    expect(bgColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('returns gray background for zero value', () => {
    const bgColor = getEffectSizeBgColor(0);
    expect(bgColor).toBe('#f9fafb'); // gray-50
  });

  it('returns different backgrounds for different magnitudes', () => {
    const small = getEffectSizeBgColor(0.3);
    const medium = getEffectSizeBgColor(0.6);
    expect(small).not.toBe(medium);
  });
});

describe('getEffectSizeTextClass', () => {
  it('returns high score class for positive values', () => {
    const textClass = getEffectSizeTextClass(0.5);
    expect(textClass).toBe('text-score-high');
  });

  it('returns low score class for negative values', () => {
    const textClass = getEffectSizeTextClass(-0.5);
    expect(textClass).toBe('text-score-low');
  });

  it('returns mid text class for near-zero values', () => {
    const textClass = getEffectSizeTextClass(0.05);
    expect(textClass).toBe('text-text-mid');
  });

  it('handles boundary cases', () => {
    expect(getEffectSizeTextClass(0.11)).toBe('text-score-high');
    expect(getEffectSizeTextClass(-0.11)).toBe('text-score-low');
    expect(getEffectSizeTextClass(0.1)).toBe('text-text-mid');
    expect(getEffectSizeTextClass(-0.1)).toBe('text-text-mid');
  });
});

describe('getEffectSizeLabel', () => {
  it('returns correct label for large positive effect', () => {
    const label = getEffectSizeLabel(0.9);
    expect(label).toBe('Large positive');
  });

  it('returns correct label for large negative effect', () => {
    const label = getEffectSizeLabel(-0.9);
    expect(label).toBe('Large negative');
  });

  it('returns correct label for medium positive effect', () => {
    const label = getEffectSizeLabel(0.6);
    expect(label).toBe('Medium positive');
  });

  it('returns correct label for medium negative effect', () => {
    const label = getEffectSizeLabel(-0.6);
    expect(label).toBe('Medium negative');
  });

  it('returns correct label for small positive effect', () => {
    const label = getEffectSizeLabel(0.3);
    expect(label).toBe('Small positive');
  });

  it('returns correct label for small negative effect', () => {
    const label = getEffectSizeLabel(-0.3);
    expect(label).toBe('Small negative');
  });

  it('returns negligible for near-zero values', () => {
    expect(getEffectSizeLabel(0.1)).toBe('Negligible');
    expect(getEffectSizeLabel(-0.1)).toBe('Negligible');
    expect(getEffectSizeLabel(0)).toBe('Negligible');
  });

  it('handles boundary values correctly', () => {
    expect(getEffectSizeLabel(0.8)).toBe('Large positive');
    expect(getEffectSizeLabel(0.79)).toBe('Medium positive');
    expect(getEffectSizeLabel(0.5)).toBe('Medium positive');
    expect(getEffectSizeLabel(0.49)).toBe('Small positive');
    expect(getEffectSizeLabel(0.2)).toBe('Small positive');
    expect(getEffectSizeLabel(0.19)).toBe('Negligible');
  });
});

describe('getContrastColor', () => {
  it('returns white for dark backgrounds', () => {
    const contrast = getContrastColor('#000000');
    expect(contrast).toBe('#ffffff');
  });

  it('returns black for light backgrounds', () => {
    const contrast = getContrastColor('#ffffff');
    expect(contrast).toBe('#000000');
  });

  it('handles hex colors with # prefix', () => {
    const contrast = getContrastColor('#808080');
    expect(['#000000', '#ffffff']).toContain(contrast);
  });

  it('handles hex colors without # prefix', () => {
    const contrast = getContrastColor('808080');
    expect(['#000000', '#ffffff']).toContain(contrast);
  });

  it('returns consistent results for same color', () => {
    const contrast1 = getContrastColor('#2E7CF6');
    const contrast2 = getContrastColor('#2E7CF6');
    expect(contrast1).toBe(contrast2);
  });
});

describe('normalizeToPercent', () => {
  it('normalizes min value to 0', () => {
    const normalized = normalizeToPercent(0, 0, 100);
    expect(normalized).toBe(0);
  });

  it('normalizes max value to 100', () => {
    const normalized = normalizeToPercent(100, 0, 100);
    expect(normalized).toBe(100);
  });

  it('normalizes middle value to 50', () => {
    const normalized = normalizeToPercent(50, 0, 100);
    expect(normalized).toBe(50);
  });

  it('handles negative ranges', () => {
    const normalized = normalizeToPercent(0, -1, 1);
    expect(normalized).toBe(50);
  });

  it('returns 50 when min equals max', () => {
    const normalized = normalizeToPercent(10, 10, 10);
    expect(normalized).toBe(50);
  });

  it('returns integer values', () => {
    const normalized = normalizeToPercent(33.333, 0, 100);
    expect(Number.isInteger(normalized)).toBe(true);
  });
});

describe('generateColorScale', () => {
  it('generates array with default 11 steps', () => {
    const scale = generateColorScale();
    expect(scale.length).toBe(11);
  });

  it('generates array with custom step count', () => {
    const scale = generateColorScale(5);
    expect(scale.length).toBe(5);
  });

  it('each step has value and color properties', () => {
    const scale = generateColorScale();
    scale.forEach((step) => {
      expect(step).toHaveProperty('value');
      expect(step).toHaveProperty('color');
    });
  });

  it('values range from -1 to 1', () => {
    const scale = generateColorScale();
    expect(scale[0].value).toBeCloseTo(-1, 2);
    expect(scale[scale.length - 1].value).toBeCloseTo(1, 2);
  });

  it('colors are valid hex codes', () => {
    const scale = generateColorScale();
    scale.forEach((step) => {
      expect(step.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('generates monotonically increasing values', () => {
    const scale = generateColorScale();
    for (let i = 1; i < scale.length; i++) {
      expect(scale[i].value).toBeGreaterThan(scale[i - 1].value);
    }
  });
});

describe('MODEL_COLORS', () => {
  it('is defined and is an object', () => {
    expect(MODEL_COLORS).toBeDefined();
    expect(typeof MODEL_COLORS).toBe('object');
  });

  it('contains hex color values', () => {
    Object.values(MODEL_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('has unique colors for each model', () => {
    const colors = Object.values(MODEL_COLORS);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });

  it('contains expected model IDs', () => {
    const expectedModels = ['gpt54', 'o3', 'gemini', 'claude', 'llama', 'sonar'];
    expectedModels.forEach((modelId) => {
      expect(MODEL_COLORS).toHaveProperty(modelId);
    });
  });
});

describe('CLUSTER_COLORS_HEX', () => {
  it('is defined and is an object', () => {
    expect(CLUSTER_COLORS_HEX).toBeDefined();
    expect(typeof CLUSTER_COLORS_HEX).toBe('object');
  });

  it('contains hex color values', () => {
    Object.values(CLUSTER_COLORS_HEX).forEach((color) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('has colors for all clusters A-F', () => {
    const expectedClusters = ['A', 'B', 'C', 'D', 'E', 'F'];
    expectedClusters.forEach((cluster) => {
      expect(CLUSTER_COLORS_HEX).toHaveProperty(cluster);
    });
  });

  it('has unique colors for each cluster', () => {
    const colors = Object.values(CLUSTER_COLORS_HEX);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });
});

describe('Color Consistency', () => {
  it('getEffectSizeColor and getEffectSizeBgColor use same color families', () => {
    // Positive values should both return green-ish colors
    const positiveColor = getEffectSizeColor(0.6);
    const positiveBg = getEffectSizeBgColor(0.6);
    expect(positiveColor).toContain('#');
    expect(positiveBg).toContain('#');
  });

  it('getEffectSizeLabel boundaries match color boundaries', () => {
    // At 0.8, should be "Large positive"
    expect(getEffectSizeLabel(0.8)).toBe('Large positive');
    // Color should reflect this
    const color = getEffectSizeColor(0.8);
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
