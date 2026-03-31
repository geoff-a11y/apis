'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ContextType = 'b2c' | 'b2b' | 'pooled';

interface ContextState {
  context: ContextType;
  setContext: (context: ContextType) => void;
}

const ContextContext = createContext<ContextState | undefined>(undefined);

interface ContextProviderProps {
  children: ReactNode;
  defaultContext?: ContextType;
}

export function ContextProvider({
  children,
  defaultContext = 'pooled',
}: ContextProviderProps) {
  const [context, setContext] = useState<ContextType>(defaultContext);

  return (
    <ContextContext.Provider value={{ context, setContext }}>
      {children}
    </ContextContext.Provider>
  );
}

export function useContextState(): ContextState {
  const context = useContext(ContextContext);
  if (context === undefined) {
    throw new Error('useContextState must be used within a ContextProvider');
  }
  return context;
}

// Optional: Hook that can work with or without provider
export function useOptionalContextState(): ContextState {
  const context = useContext(ContextContext);
  const [fallbackContext, setFallbackContext] = useState<ContextType>('pooled');

  if (context === undefined) {
    return {
      context: fallbackContext,
      setContext: setFallbackContext,
    };
  }

  return context;
}
