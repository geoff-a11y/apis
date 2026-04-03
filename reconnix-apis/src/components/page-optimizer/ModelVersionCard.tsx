'use client';

import { useState } from 'react';

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

interface Model {
  id: string;
  name: string;
  color: string;
  fingerprint_description?: string;
}

interface ModelVersionCardProps {
  version: OptimizedVersion;
  model: Model;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded transition-colors flex items-center gap-1"
      style={{
        backgroundColor: copied ? 'var(--color-score-high)' : 'var(--color-surface)',
        color: copied ? 'white' : 'var(--color-text-mid)',
      }}
      title={`Copy ${label}`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

export default function ModelVersionCard({ version, model }: ModelVersionCardProps) {
  const [showStructuredData, setShowStructuredData] = useState(false);

  const featuresText = version.copy.features.join('\n');
  const structuredDataText = JSON.stringify(version.structured_data, null, 2);

  return (
    <div
      className="card p-6 space-y-6"
      style={{ borderLeft: `4px solid ${model.color}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold mb-1" style={{ color: model.color }}>
            {version.model_name} Optimized
          </h3>
          <p className="text-sm italic" style={{ color: 'var(--color-text-mid)' }}>
            "{version.rationale}"
          </p>
        </div>
      </div>

      {/* Key changes */}
      <div className="flex flex-wrap gap-2">
        {version.key_changes.map((change, idx) => (
          <span
            key={idx}
            className="text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            {change}
          </span>
        ))}
      </div>

      {/* Title section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>TITLE</p>
          <CopyButton text={version.copy.title} label="title" />
        </div>
        <p className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
          {version.copy.title}
        </p>
      </div>

      {/* Description section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>DESCRIPTION</p>
          <CopyButton text={version.copy.description} label="description" />
        </div>
        <p style={{ color: 'var(--color-text-mid)' }}>
          {version.copy.description}
        </p>
      </div>

      {/* Features section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>FEATURES</p>
          <CopyButton text={featuresText} label="features" />
        </div>
        <ul className="space-y-2">
          {version.copy.features.map((feature, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2"
              style={{ color: 'var(--color-text-mid)' }}
            >
              <span style={{ color: model.color }}>•</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Structured data section (collapsible) */}
      <div className="space-y-2">
        <button
          onClick={() => setShowStructuredData(!showStructuredData)}
          className="flex items-center gap-2 text-sm font-medium w-full justify-between p-3 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 transition-transform ${showStructuredData ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            STRUCTURED DATA (JSON-LD)
          </div>
          {showStructuredData && <CopyButton text={structuredDataText} label="structured data" />}
        </button>

        {showStructuredData && (
          <div
            className="p-4 rounded-lg overflow-x-auto"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            <pre
              className="text-xs font-mono whitespace-pre-wrap"
              style={{ color: 'var(--color-text-mid)' }}
            >
              {structuredDataText}
            </pre>
          </div>
        )}
      </div>

      {/* Copy all button */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={async () => {
            const allContent = `# ${version.model_name} Optimized Content

## Title
${version.copy.title}

## Description
${version.copy.description}

## Features
${version.copy.features.map(f => `- ${f}`).join('\n')}

## Structured Data
\`\`\`json
${structuredDataText}
\`\`\`
`;
            await navigator.clipboard.writeText(allContent);
          }}
          className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: model.color,
            color: 'white',
          }}
        >
          Copy All Content for {version.model_name}
        </button>
      </div>
    </div>
  );
}
