'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { Model } from '@/lib/types';

interface ModelSelectorProps {
  models: Model[];
  mode?: 'single' | 'multi';
  selectedIds?: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  showLogos?: boolean;
  className?: string;
}

export function ModelSelector({
  models,
  mode = 'multi',
  selectedIds = [],
  onSelectionChange,
  showLogos = true,
  className = '',
}: ModelSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  const handleToggle = (modelId: string) => {
    const newSelected = new Set(selected);

    if (mode === 'single') {
      // Single select mode: clear all and select only this one
      newSelected.clear();
      if (!selected.has(modelId)) {
        newSelected.add(modelId);
      }
    } else {
      // Multi select mode: toggle selection
      if (selected.has(modelId)) {
        newSelected.delete(modelId);
      } else {
        newSelected.add(modelId);
      }
    }

    setSelected(newSelected);
    onSelectionChange(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    const allIds = models.map(m => m.id);
    setSelected(new Set(allIds));
    onSelectionChange(allIds);
  };

  const handleClear = () => {
    setSelected(new Set());
    onSelectionChange([]);
  };

  // Helper to get model color class
  const getModelColorClass = (model: Model) => {
    // Extract model ID from color var string, e.g., "var(--model-gpt54)" -> "gpt54"
    const colorVar = model.color.match(/--model-(\w+)/)?.[1] || model.id;
    return colorVar;
  };

  return (
    <div className={`space-y-4 ${className}`} role="group" aria-label="Model selection">
      {/* Control buttons for multi-select mode */}
      {mode === 'multi' && (
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-sm px-3 py-1.5 rounded border border-border bg-surface hover:bg-blue-light transition-colors text-text-mid hover:text-blue font-medium"
            disabled={selected.size === models.length}
          >
            Select All
          </button>
          <button
            onClick={handleClear}
            className="text-sm px-3 py-1.5 rounded border border-border bg-surface hover:bg-blue-light transition-colors text-text-mid hover:text-blue font-medium"
            disabled={selected.size === 0}
          >
            Clear
          </button>
          {selected.size > 0 && (
            <div className="flex items-center px-3 py-1.5 text-sm text-text-soft">
              {selected.size} of {models.length} selected
            </div>
          )}
        </div>
      )}

      {/* Model chips */}
      <div className="flex flex-wrap gap-2" role="listbox" aria-label="Available models" aria-multiselectable={mode === 'multi'}>
        {models.map((model) => {
          const isSelected = selected.has(model.id);
          const colorClass = getModelColorClass(model);

          return (
            <button
              key={model.id}
              onClick={() => handleToggle(model.id)}
              role="option"
              aria-selected={isSelected}
              aria-label={`${model.name}${isSelected ? ' (selected)' : ''}`}
              className={`
                group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full
                border-2 transition-all duration-200 font-medium text-sm
                ${isSelected
                  ? `bg-model-${colorClass} border-model-${colorClass} text-white shadow-md scale-105`
                  : `bg-surface border-border hover:border-model-${colorClass} text-text-mid hover:text-model-${colorClass}`
                }
              `}
              style={{
                backgroundColor: isSelected ? model.color : undefined,
                borderColor: isSelected ? model.color : undefined,
              }}
            >
              {/* Model logo */}
              {showLogos && (
                <div className="relative w-4 h-4 flex-shrink-0">
                  {model.logo ? (
                    <Image
                      src={model.logo}
                      alt=""
                      aria-hidden="true"
                      fill
                      className={`object-contain ${isSelected ? 'brightness-0 invert' : 'opacity-70 group-hover:opacity-100'}`}
                    />
                  ) : (
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-text-soft'}`}>
                      {model.name.charAt(0)}
                    </span>
                  )}
                </div>
              )}

              {/* Model name */}
              <span className="whitespace-nowrap">
                {model.name}
              </span>

              {/* Selection indicator */}
              {isSelected && (
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Helper text for single-select mode */}
      {mode === 'single' && selected.size > 0 && (
        <p className="text-xs text-text-soft">
          Click the selected model to deselect, or click another model to switch selection
        </p>
      )}
    </div>
  );
}
