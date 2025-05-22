/**
 * Globala typdeklarationer för säker lagringshantering
 */

interface SafeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

interface Window {
  safeStorage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
  safeLocalStorage?: SafeStorage;
  memoryStorage?: Record<string, string>;
}

export {}; 