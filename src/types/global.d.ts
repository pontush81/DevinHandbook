/**
 * Globala typdeklarationer för säker lagringshantering
 */

interface SafeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

declare global {
  interface Window {
    safeStorage?: SafeStorage;
    safeLocalStorage?: SafeStorage;
  }
}

export {}; 