/**
 * Säker localStorage utility som aldrig kastar fel
 */

// Hjälpfunktion för att kontrollera om vi är på klientsidan och localStorage är tillgängligt
const isClient = typeof window !== 'undefined';
const isStorageAvailable = (): boolean => {
  if (!isClient) return false;
  try {
    const storage = window.localStorage;
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    // localStorage är inte tillgängligt (t.ex. private browsing, security restrictions)
    console.warn('localStorage är inte tillgängligt:', e.message);
    return false;
  }
};

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (!isStorageAvailable()) return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Kunde inte läsa från localStorage (key: ${key}):`, e.message);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`Kunde inte skriva till localStorage (key: ${key}):`, e.message);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`Kunde inte ta bort från localStorage (key: ${key}):`, e.message);
      return false;
    }
  },

  clear: (): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.warn('Kunde inte rensa localStorage:', e.message);
      return false;
    }
  },

  isAvailable: (): boolean => {
    return isStorageAvailable();
  }
};

// Alias för bakåtkompatibilitet
export const safeLocalStorage = safeStorage;

// Memory fallback för när localStorage inte är tillgängligt
const memoryStorage: Record<string, string> = {};

export const universalStorage = {
  getItem: (key: string): string | null => {
    if (safeStorage.isAvailable()) {
      return safeStorage.getItem(key);
    }
    return memoryStorage[key] || null;
  },

  setItem: (key: string, value: string): boolean => {
    if (safeStorage.isAvailable()) {
      return safeStorage.setItem(key, value);
    }
    memoryStorage[key] = value;
    return true;
  },

  removeItem: (key: string): boolean => {
    if (safeStorage.isAvailable()) {
      return safeStorage.removeItem(key);
    }
    delete memoryStorage[key];
    return true;
  },

  clear: (): boolean => {
    if (safeStorage.isAvailable()) {
      return safeStorage.clear();
    }
    Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    return true;
  }
};

// Specifika funktioner för handboksdata
export const handbookStorage = {
  saveFormState: (state: any): boolean => {
    const success1 = safeStorage.setItem('handbook-form-state', JSON.stringify(state));
    const success2 = safeStorage.setItem('handbook-form-timestamp', Date.now().toString());
    return success1 && success2;
  },

  getFormState: (): { state: any; timestamp: number } | null => {
    const savedState = safeStorage.getItem('handbook-form-state');
    const savedTimestamp = safeStorage.getItem('handbook-form-timestamp');
    
    if (savedState && savedTimestamp) {
      try {
        return {
          state: JSON.parse(savedState),
          timestamp: parseInt(savedTimestamp)
        };
      } catch (error) {
        console.warn('Kunde inte parsa sparad formulärstate:', error);
        handbookStorage.clearFormState();
      }
    }
    return null;
  },

  clearFormState: (): boolean => {
    return safeStorage.removeItem('handbook-form-state') && safeStorage.removeItem('handbook-form-timestamp');
  },

  saveDocumentImportState: (analysisResult: any): boolean => {
    const stateToSave = {
      analysisResult,
      timestamp: Date.now()
    };
    return safeStorage.setItem('document-import-state', JSON.stringify(stateToSave));
  },

  getDocumentImportState: (): { analysisResult: any; timestamp: number } | null => {
    const savedState = safeStorage.getItem('document-import-state');
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (error) {
        console.warn('Kunde inte parsa sparad document import state:', error);
        safeStorage.removeItem('document-import-state');
      }
    }
    return null;
  },

  clearDocumentImportState: (): boolean => {
    return safeStorage.removeItem('document-import-state');
  },

  clearAllStates: (): boolean => {
    const success1 = handbookStorage.clearFormState();
    const success2 = handbookStorage.clearDocumentImportState();
    return success1 && success2;
  }
}; 