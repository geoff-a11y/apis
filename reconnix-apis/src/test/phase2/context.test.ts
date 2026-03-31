import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ContextProvider, useContextState, useOptionalContextState, type ContextType } from '@/lib/context';
import React from 'react';

describe('ContextProvider', () => {
  describe('useContextState', () => {
    it('should provide initial context state', () => {
      const { result } = renderHook(() => useContextState(), {
        wrapper: ({ children }) => <ContextProvider>{children}</ContextProvider>,
      });

      expect(result.current.context).toBe('pooled');
      expect(typeof result.current.setContext).toBe('function');
    });

    it('should use custom default context when provided', () => {
      const { result } = renderHook(() => useContextState(), {
        wrapper: ({ children }) => (
          <ContextProvider defaultContext="b2c">{children}</ContextProvider>
        ),
      });

      expect(result.current.context).toBe('b2c');
    });

    it('should throw error when used outside ContextProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      expect(() => {
        renderHook(() => useContextState());
      }).toThrow('useContextState must be used within a ContextProvider');

      console.error = originalError;
    });

    it('should update context when setContext is called', () => {
      const { result } = renderHook(() => useContextState(), {
        wrapper: ({ children }) => <ContextProvider>{children}</ContextProvider>,
      });

      expect(result.current.context).toBe('pooled');

      act(() => {
        result.current.setContext('b2c');
      });

      expect(result.current.context).toBe('b2c');

      act(() => {
        result.current.setContext('b2b');
      });

      expect(result.current.context).toBe('b2b');
    });
  });

  describe('context switching between B2C and B2B', () => {
    it('should switch from pooled to b2c', () => {
      const { result } = renderHook(() => useContextState(), {
        wrapper: ({ children }) => <ContextProvider>{children}</ContextProvider>,
      });

      act(() => {
        result.current.setContext('b2c');
      });

      expect(result.current.context).toBe('b2c');
    });

    it('should switch from pooled to b2b', () => {
      const { result } = renderHook(() => useContextState(), {
        wrapper: ({ children }) => <ContextProvider>{children}</ContextProvider>,
      });

      act(() => {
        result.current.setContext('b2b');
      });

      expect(result.current.context).toBe('b2b');
    });

    it('should switch from b2c to b2b', () => {
      const { result } = renderHook(() => useContextState(), {
        wrapper: ({ children }) => (
          <ContextProvider defaultContext="b2c">{children}</ContextProvider>
        ),
      });

      expect(result.current.context).toBe('b2c');

      act(() => {
        result.current.setContext('b2b');
      });

      expect(result.current.context).toBe('b2b');
    });

    it('should switch from b2b to b2c', () => {
      const { result } = renderHook(() => useContextState(), {
        wrapper: ({ children }) => (
          <ContextProvider defaultContext="b2b">{children}</ContextProvider>
        ),
      });

      expect(result.current.context).toBe('b2b');

      act(() => {
        result.current.setContext('b2c');
      });

      expect(result.current.context).toBe('b2c');
    });

    it('should handle multiple sequential context switches', () => {
      const { result } = renderHook(() => useContextState(), {
        wrapper: ({ children }) => <ContextProvider>{children}</ContextProvider>,
      });

      const contexts: ContextType[] = ['b2c', 'b2b', 'pooled', 'b2c', 'pooled', 'b2b'];

      contexts.forEach((ctx) => {
        act(() => {
          result.current.setContext(ctx);
        });
        expect(result.current.context).toBe(ctx);
      });
    });
  });

  describe('useOptionalContextState', () => {
    it('should work without provider using fallback state', () => {
      const { result } = renderHook(() => useOptionalContextState());

      expect(result.current.context).toBe('pooled');
      expect(typeof result.current.setContext).toBe('function');
    });

    it('should update fallback state when not in provider', () => {
      const { result } = renderHook(() => useOptionalContextState());

      act(() => {
        result.current.setContext('b2c');
      });

      expect(result.current.context).toBe('b2c');
    });

    it('should use provider state when wrapped in ContextProvider', () => {
      const { result } = renderHook(() => useOptionalContextState(), {
        wrapper: ({ children }) => (
          <ContextProvider defaultContext="b2b">{children}</ContextProvider>
        ),
      });

      expect(result.current.context).toBe('b2b');

      act(() => {
        result.current.setContext('b2c');
      });

      expect(result.current.context).toBe('b2c');
    });
  });

  describe('ContextProvider state persistence', () => {
    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useContextState(), {
        wrapper: ({ children }) => <ContextProvider>{children}</ContextProvider>,
      });

      act(() => {
        result.current.setContext('b2c');
      });

      expect(result.current.context).toBe('b2c');

      rerender();

      expect(result.current.context).toBe('b2c');
    });

    it('should share state between multiple consumers', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContextProvider>{children}</ContextProvider>
      );

      const { result: result1 } = renderHook(() => useContextState(), { wrapper });
      const { result: result2 } = renderHook(() => useContextState(), { wrapper });

      act(() => {
        result1.current.setContext('b2b');
      });

      expect(result1.current.context).toBe('b2b');
      expect(result2.current.context).toBe('b2b');
    });
  });
});
