# ModelSelector Component

A reusable component for selecting AI models in the APIS webapp.

## Features

- Displays models as interactive chips/buttons with brand colors
- Supports both single-select and multi-select modes
- Shows model logos (from `/public/images/model-logos/`)
- Provides "Select All" and "Clear" controls in multi-select mode
- Visual feedback with selection indicators and animations
- Fully typed with TypeScript

## Usage

### Basic Multi-Select Example

```tsx
import { ModelSelector } from '@/components/ui/ModelSelector';
import { getConfirmatoryModels } from '@/lib/data';

function MyComponent() {
  const models = getConfirmatoryModels();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <ModelSelector
      models={models}
      mode="multi"
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      showLogos={true}
    />
  );
}
```

### Single-Select Example

```tsx
import { ModelSelector } from '@/components/ui/ModelSelector';
import { getModels } from '@/lib/data';

function MyComponent() {
  const models = getModels();
  const [selectedId, setSelectedId] = useState<string>('');

  return (
    <ModelSelector
      models={models}
      mode="single"
      selectedIds={selectedId ? [selectedId] : []}
      onSelectionChange={(ids) => setSelectedId(ids[0] || '')}
      showLogos={true}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `models` | `Model[]` | Required | Array of model objects from `@/lib/data` |
| `mode` | `'single' \| 'multi'` | `'multi'` | Selection mode |
| `selectedIds` | `string[]` | `[]` | Array of currently selected model IDs |
| `onSelectionChange` | `(ids: string[]) => void` | Required | Callback when selection changes |
| `showLogos` | `boolean` | `true` | Whether to display model logos |
| `className` | `string` | `''` | Additional CSS classes |

## Styling

The component uses:
- Model-specific colors from `globals.css` (e.g., `--model-gpt54`, `--model-claude`)
- Tailwind utility classes for layout and transitions
- Custom CSS variables for consistent theming

Selected chips display in the model's brand color with white text, while unselected chips show in neutral colors with hover effects.

## Integration

Currently integrated in:
- `/src/app/compare/page.tsx` - Model comparison interface

## Model Data Structure

Expects models with this structure (from `@/lib/types`):

```typescript
interface Model {
  id: string;                    // "gpt54", "claude", etc.
  name: string;                  // "GPT-5.4"
  provider: string;              // "OpenAI"
  color: string;                 // CSS var: "var(--model-gpt54)"
  logo: string;                  // Path: "/images/model-logos/openai.svg"
  // ... other fields
}
```
