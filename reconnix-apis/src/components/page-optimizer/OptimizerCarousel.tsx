'use client';

import { useState } from 'react';
import ModelVersionCard from './ModelVersionCard';

interface OptimizedVersion {
  model_id: string;
  model_name: string;
  rationale: string;
  copy: {
    title: string;
    description: string;
    features: string[];
  };
  structured_data: object;
  key_changes: string[];
}

interface OptimizeResult {
  id: string;
  url: string;
  original: {
    title: string;
    description: string;
    features: string[];
    existing_schema: object | null;
  };
  versions: OptimizedVersion[];
  processing_time_ms: number;
}

interface Model {
  id: string;
  name: string;
  color: string;
  fingerprint_description?: string;
}

interface OptimizerCarouselProps {
  result: OptimizeResult;
  models: Model[];
}

export default function OptimizerCarousel({ result, models }: OptimizerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  const goToPrev = () => {
    setActiveIndex((prev) => (prev === 0 ? result.versions.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === result.versions.length - 1 ? 0 : prev + 1));
  };

  const currentVersion = result.versions[activeIndex];
  const currentModel = models.find(m => m.id === currentVersion?.model_id);

  const handleExportAll = () => {
    const exportData = {
      url: result.url,
      original: result.original,
      optimized_versions: result.versions.map(v => ({
        model: v.model_name,
        copy: v.copy,
        structured_data: v.structured_data,
        key_changes: v.key_changes,
      })),
      generated_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized-content-${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    let md = `# Optimized Content for ${result.url}\n\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;
    md += `---\n\n`;
    md += `## Original Content\n\n`;
    md += `**Title:** ${result.original.title}\n\n`;
    md += `**Description:** ${result.original.description}\n\n`;
    md += `**Features:**\n${result.original.features.map(f => `- ${f}`).join('\n')}\n\n`;
    md += `---\n\n`;

    result.versions.forEach(v => {
      md += `## ${v.model_name} Optimized\n\n`;
      md += `*${v.rationale}*\n\n`;
      md += `**Title:** ${v.copy.title}\n\n`;
      md += `**Description:** ${v.copy.description}\n\n`;
      md += `**Features:**\n${v.copy.features.map(f => `- ${f}`).join('\n')}\n\n`;
      md += `**Key Changes:**\n${v.key_changes.map(c => `- ${c}`).join('\n')}\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized-content-${result.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      {/* Header with model tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {result.versions.map((version, idx) => {
            const model = models.find(m => m.id === version.model_id);
            return (
              <button
                key={version.model_id}
                onClick={() => goToSlide(idx)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeIndex === idx ? 'ring-2 ring-offset-2' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeIndex === idx ? 'var(--color-surface)' : 'var(--color-bg)',
                  color: activeIndex === idx ? 'var(--color-text)' : 'var(--color-text-mid)',
                  borderLeft: `3px solid ${model?.color || 'var(--color-border)'}`,
                }}
              >
                {version.model_name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: showOriginal ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              color: showOriginal ? 'var(--color-accent)' : 'var(--color-text-mid)',
            }}
          >
            {showOriginal ? 'Hide Original' : 'Show Original'}
          </button>

          <div className="relative group">
            <button
              className="btn-secondary text-sm flex items-center gap-2"
            >
              Export
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <button
                onClick={handleExportAll}
                className="w-full text-left px-4 py-2 text-sm hover:bg-opacity-50 rounded-t-lg"
                style={{ color: 'var(--color-text)' }}
              >
                Download as JSON
              </button>
              <button
                onClick={handleExportMarkdown}
                className="w-full text-left px-4 py-2 text-sm hover:bg-opacity-50 rounded-b-lg"
                style={{ color: 'var(--color-text)' }}
              >
                Download as Markdown
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Original content (collapsible) */}
      {showOriginal && (
        <div className="card p-6" style={{ borderLeft: '4px solid var(--color-text-soft)' }}>
          <h3 className="font-medium mb-4" style={{ color: 'var(--color-text)' }}>
            Original Content
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>TITLE</p>
              <p style={{ color: 'var(--color-text-mid)' }}>{result.original.title}</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>DESCRIPTION</p>
              <p style={{ color: 'var(--color-text-mid)' }}>{result.original.description}</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>FEATURES</p>
              <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--color-text-mid)' }}>
                {result.original.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Carousel navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrev}
          className="p-2 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {result.versions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: activeIndex === idx ? 'var(--color-accent)' : 'var(--color-border)',
                transform: activeIndex === idx ? 'scale(1.5)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <button
          onClick={goToNext}
          className="p-2 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Current version card */}
      {currentVersion && currentModel && (
        <ModelVersionCard
          version={currentVersion}
          model={currentModel}
        />
      )}

      {/* Keyboard hint */}
      <p className="text-center text-xs" style={{ color: 'var(--color-text-soft)' }}>
        Use arrow keys or swipe to navigate between models
      </p>
    </section>
  );
}
