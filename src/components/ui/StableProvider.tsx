import React, { createContext, useContext, useMemo, useRef } from 'react';

interface StableProviderProps {
  children: React.ReactNode;
  values?: Record<string, any>;
}

const StableContext = createContext<Record<string, any>>({});

export function StableProvider({ children, values = {} }: StableProviderProps) {
  const stableValuesRef = useRef<Record<string, any>>({});
  
  // Only update stable values when they actually change
  const stableValues = useMemo(() => {
    const currentValues = { ...values };
    let hasChanged = false;
    
    // Check if any values have actually changed
    for (const [key, value] of Object.entries(currentValues)) {
      if (stableValuesRef.current[key] !== value) {
        hasChanged = true;
        break;
      }
    }
    
    // Check if any keys were removed
    for (const key of Object.keys(stableValuesRef.current)) {
      if (!(key in currentValues)) {
        hasChanged = true;
        break;
      }
    }
    
    if (hasChanged) {
      stableValuesRef.current = currentValues;
    }
    
    return stableValuesRef.current;
  }, [JSON.stringify(values)]); // Use JSON.stringify for deep comparison
  
  return (
    <StableContext.Provider value={stableValues}>
      {children}
    </StableContext.Provider>
  );
}

export function useStableValue<T>(key: string, defaultValue?: T): T {
  const context = useContext(StableContext);
  return context[key] ?? defaultValue;
}

export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList>(deps);
  
  // Only update callback if dependencies have changed
  const hasChanged = useMemo(() => {
    if (depsRef.current.length !== deps.length) return true;
    return deps.some((dep, index) => dep !== depsRef.current[index]);
  }, deps);
  
  if (hasChanged) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }
  
  return callbackRef.current;
}

// Prevent render loops by debouncing rapid re-renders
export function useDebounceRender(delay: number = 100) {
  const renderCountRef = useRef(0);
  const lastRenderRef = useRef(Date.now());
  
  return useMemo(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderRef.current;
    
    if (timeSinceLastRender < delay) {
      console.warn(`Rapid re-render detected (${renderCountRef.current} renders in ${timeSinceLastRender}ms)`);
      return false; // Signal that render should be debounced
    }
    
    lastRenderRef.current = now;
    return true; // Allow render
  }, [delay]);
} 