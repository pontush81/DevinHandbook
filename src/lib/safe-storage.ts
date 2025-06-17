// Säker localStorage-hantering som hanterar "Access to storage is not allowed" fel
export const safeLocalStorage = {
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.warn(`localStorage.setItem('${key}') inte tillgängligt:`, error);
    }
    return false;
  },

  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.warn(`localStorage.getItem('${key}') inte tillgängligt:`, error);
    }
    return null;
  },

  removeItem: (key: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.warn(`localStorage.removeItem('${key}') inte tillgängligt:`, error);
    }
    return false;
  },

  // Hjälpfunktion för att rensa flera nycklar samtidigt
  removeItems: (keys: string[]): boolean => {
    let allSuccess = true;
    keys.forEach(key => {
      const success = safeLocalStorage.removeItem(key);
      if (!success) allSuccess = false;
    });
    return allSuccess;
  },

  // Kontrollera om localStorage är tillgängligt
  isAvailable: (): boolean => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      // Testa faktisk åtkomst
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
};

// Specifika funktioner för handboksdata
export const handbookStorage = {
  saveFormState: (state: any): boolean => {
    const success1 = safeLocalStorage.setItem('handbook-form-state', JSON.stringify(state));
    const success2 = safeLocalStorage.setItem('handbook-form-timestamp', Date.now().toString());
    return success1 && success2;
  },

  getFormState: (): { state: any; timestamp: number } | null => {
    const savedState = safeLocalStorage.getItem('handbook-form-state');
    const savedTimestamp = safeLocalStorage.getItem('handbook-form-timestamp');
    
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
    return safeLocalStorage.removeItems([
      'handbook-form-state',
      'handbook-form-timestamp',
      'document-import-state',
      'handbook-import-sections',
      'handbook-import-timestamp'
    ]);
  },

  saveDocumentImportState: (analysisResult: any): boolean => {
    const stateToSave = {
      analysisResult,
      timestamp: Date.now()
    };
    return safeLocalStorage.setItem('document-import-state', JSON.stringify(stateToSave));
  },

  getDocumentImportState: (): { analysisResult: any; timestamp: number } | null => {
    const savedState = safeLocalStorage.getItem('document-import-state');
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (error) {
        console.warn('Kunde inte parsa sparad document import state:', error);
        safeLocalStorage.removeItem('document-import-state');
      }
    }
    return null;
  }
}; 