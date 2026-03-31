'use client';

import React from 'react';

export type Context = 'b2c' | 'b2b' | 'pooled';

interface ContextSwitcherProps {
  value: Context;
  onChange: (context: Context) => void;
  className?: string;
  showPooled?: boolean;
}

export function ContextSwitcher({
  value,
  onChange,
  className = '',
  showPooled = true,
}: ContextSwitcherProps) {
  const allContexts: { id: Context; label: string; description: string }[] = [
    { id: 'pooled', label: 'All Data', description: 'Combined B2C and B2B data' },
    { id: 'b2c', label: 'B2C', description: 'Consumer purchase context' },
    { id: 'b2b', label: 'B2B', description: 'Business purchase context' },
  ];
  const contexts = allContexts.filter(c => showPooled || c.id !== 'pooled');

  return (
    <div className={`inline-flex ${className}`}>
      <div className="inline-flex rounded-lg p-1 gap-1" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        {contexts.map((context) => {
          const isActive = value === context.id;
          return (
            <button
              key={context.id}
              onClick={() => onChange(context.id)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--color-accent)',
                      color: 'white',
                      boxShadow: 'var(--shadow)'
                    }
                  : {
                      color: 'var(--color-text-mid)'
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text)';
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-mid)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title={context.description}
            >
              {context.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ContextBadgeProps {
  context: Context;
  className?: string;
}

export function ContextBadge({ context, className = '' }: ContextBadgeProps) {
  const labels: Record<Context, { label: string; color: string }> = {
    pooled: { label: 'Pooled Data', color: 'badge-blue' },
    b2c: { label: 'B2C Context', color: 'badge-green' },
    b2b: { label: 'B2B Context', color: 'badge-amber' },
  };

  const config = labels[context];

  return (
    <span className={`badge ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}
