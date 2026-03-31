# EffectSizeHeatmap Component

A React component that displays a heatmap visualization of Cohen's h effect sizes across models and dimensions.

## Features

- **Matrix visualization**: Models (rows) × Dimensions (columns)
- **Color-coded cells**: Green for positive effects, red for negative effects, intensity by magnitude
- **Interactive cells**: Click to see detailed statistics
- **Responsive design**: Horizontal scroll on mobile devices
- **Dimension key**: Shows full dimension names below the heatmap
- **Color legend**: Visual scale from -1.0 to +1.0
- **Details modal**: Shows effect size, confidence interval, proportions, and sample size

## Usage

```tsx
import { EffectSizeHeatmap } from '@/components/charts';

// Basic usage (pooled context, confirmatory models only)
<EffectSizeHeatmap />

// With custom context
<EffectSizeHeatmap context="b2c" />

// Include exploratory models
<EffectSizeHeatmap confirmatoryOnly={false} />

// With custom styling
<EffectSizeHeatmap className="my-8" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `context` | `'b2c' \| 'b2b' \| 'pooled'` | `'pooled'` | Context filter for effect sizes |
| `confirmatoryOnly` | `boolean` | `true` | Show only confirmatory study models |
| `className` | `string` | `undefined` | Additional CSS classes |

## Data Sources

The component uses:
- `getModels()` from `@/lib/data` - List of AI models
- `getDimensions()` from `@/lib/data` - List of psychological dimensions
- `getEffectSizes(context)` from `@/lib/data` - Effect size measurements
- Color utilities from `@/lib/colors` - Effect size color mapping

## Cell Details Modal

Clicking any cell with data displays:
- Cohen's h value with magnitude label
- 95% confidence interval
- Control and manipulation proportions
- Sample size (n trials)
- Confirmatory status badge

## Color Scale

The heatmap uses a diverging color scale:
- **Green**: Positive effect (signal increases purchase likelihood)
- **Red**: Negative effect (signal decreases purchase likelihood)
- **Intensity**: Stronger colors for larger absolute effect sizes
- **Gray**: Missing data

Effect size thresholds (Cohen's conventions):
- Small: |h| ≥ 0.2
- Medium: |h| ≥ 0.5
- Large: |h| ≥ 0.8

## Responsive Behavior

- **Desktop**: Full matrix visible with rotated column headers
- **Mobile**: Horizontal scroll enabled, touch-friendly cell sizes
- **Dimension key**: Reflows to narrower grid on mobile

## Implementation Notes

- Uses CSS Grid for consistent cell sizing
- Transform rotate for dimension headers
- Modal overlay with click-outside-to-close
- Hover effects with ring and scale for better UX
- Monospace font for numerical values
