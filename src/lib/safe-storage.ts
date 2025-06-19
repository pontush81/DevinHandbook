/**
 * Säker localStorage utility som aldrig kastar fel
 */

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },

  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      return false;
    }
  },

  isAvailable: (): boolean => {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }
};

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
  }
}; 