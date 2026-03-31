// src/lib/colors.ts — Color utilities for APIS webapp

/**
 * Get color for Cohen's h effect size
 * Positive = green (signal helps), Negative = red (signal hurts)
 * Intensity based on magnitude
 */
export function getEffectSizeColor(cohenH: number): string {
  const absH = Math.abs(cohenH);

  if (cohenH > 0) {
    // Positive effect - greens
    if (absH >= 0.8) return '#047857'; // emerald-700
    if (absH >= 0.5) return '#059669'; // emerald-600
    if (absH >= 0.2) return '#10b981'; // emerald-500
    return '#34d399'; // emerald-400
  } else if (cohenH < 0) {
    // Negative effect - reds
    if (absH >= 0.8) return '#b91c1c'; // red-700
    if (absH >= 0.5) return '#dc2626'; // red-600
    if (absH >= 0.2) return '#ef4444'; // red-500
    return '#f87171'; // red-400
  }

  return '#9ca3af'; // gray-400 for zero/near-zero
}

/**
 * Get background color for effect size cells (lighter versions)
 */
export function getEffectSizeBgColor(cohenH: number): string {
  const absH = Math.abs(cohenH);

  if (cohenH > 0) {
    if (absH >= 0.5) return '#d1fae5'; // emerald-100
    if (absH >= 0.2) return '#ecfdf5'; // emerald-50
    return '#f0fdf4'; // green-50
  } else if (cohenH < 0) {
    if (absH >= 0.5) return '#fee2e2'; // red-100
    if (absH >= 0.2) return '#fef2f2'; // red-50
    return '#fff5f5';
  }

  return '#f9fafb'; // gray-50
}

/**
 * Get text color class for effect size
 */
export function getEffectSizeTextClass(cohenH: number): string {
  if (cohenH > 0.1) return 'text-score-high';
  if (cohenH < -0.1) return 'text-score-low';
  return 'text-text-mid';
}

/**
 * Get semantic label for effect size magnitude
 */
export function getEffectSizeLabel(cohenH: number): string {
  const absH = Math.abs(cohenH);
  const direction = cohenH > 0 ? 'positive' : cohenH < 0 ? 'negative' : 'neutral';

  if (absH >= 0.8) return `Large ${direction}`;
  if (absH >= 0.5) return `Medium ${direction}`;
  if (absH >= 0.2) return `Small ${direction}`;
  return 'Negligible';
}

/**
 * Model colors mapping (CSS variable references)
 */
export const MODEL_COLORS: Record<string, string> = {
  gpt54: '#10A37F',
  o3: '#1A1A1A',
  gemini: '#4285F4',
  claude: '#D4A853',
  llama: '#0064E0',
  sonar: '#20808D',
};

/**
 * Cluster colors mapping
 */
export const CLUSTER_COLORS_HEX: Record<string, string> = {
  A: '#2E7CF6',
  B: '#0D7A4E',
  C: '#7C3AED',
  D: '#B45309',
  E: '#C2185B',
  F: '#0891B2',
};

/**
 * Get contrasting text color for a background
 */
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Normalize a value to 0-100 scale for fingerprint display
 */
export function normalizeToPercent(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}

/**
 * Generate color scale for heatmap legend
 */
export function generateColorScale(steps: number = 11): Array<{ value: number; color: string }> {
  const scale: Array<{ value: number; color: string }> = [];

  for (let i = 0; i < steps; i++) {
    const value = -1 + (2 * i) / (steps - 1); // -1 to 1
    scale.push({
      value: Math.round(value * 100) / 100,
      color: getEffectSizeColor(value),
    });
  }

  return scale;
}
