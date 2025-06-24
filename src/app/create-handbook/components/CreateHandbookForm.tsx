'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertCircle, CheckCircle2, Gift, Brain, Upload } from "lucide-react";
import { DocumentImport } from "@/components/handbook/DocumentImport";
import { createTemplateFromImportedSections, getDefaultTemplate, type HandbookSection } from "@/lib/handbook-templates";
import { handbookStorage, safeLocalStorage } from "@/lib/safe-storage";


interface CreateHandbookFormProps {
  forceNew?: boolean;
}

export function CreateHandbookForm({ forceNew = false }: CreateHandbookFormProps) {
  // console.log('🧪 CreateHandbookForm: Component is rendering!'); // Commented out to reduce console spam
  
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState<boolean | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [template, setTemplate] = useState<HandbookSection[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

  // Förenklad trial-status (alla kan skapa via trial)
  const [isCheckingTrial, setIsCheckingTrial] = useState(false);

  // Tab and import state
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [importedSections, setImportedSections] = useState<any[]>([]);
  const [isRestoringState, setIsRestoringState] = useState(false);
  const [importStatus, setImportStatus] = useState<any>({});

  // Refs för att bevara state vid fönsterbyte
  const nameRef = useRef(name);
  const subdomainRef = useRef(subdomain);
  const activeTabRef = useRef(activeTab);
  const importedSectionsRef = useRef(importedSections);
  
  // Ref för debounce timer
  const subdomainCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Uppdatera refs när state ändras
  useEffect(() => {
    nameRef.current = name;
    subdomainRef.current = subdomain;
    activeTabRef.current = activeTab;
    importedSectionsRef.current = importedSections;
  }, [name, subdomain, activeTab, importedSections]);

  // Spara formulärstate regelbundet - med debounce för att undvika för många sparningar
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (name || subdomain || importedSections.length > 0) {
        const formState = {
          name: nameRef.current,
          subdomain: subdomainRef.current,
          activeTab: activeTabRef.current,
          importedSections: importedSectionsRef.current,
          timestamp: Date.now()
        };
        
        const success = handbookStorage.saveFormState(formState);
        if (success) {
          // console.log('💾 Form state saved:', { // Commented out to reduce console spam
          //   name: formState.name,
          //   sectionsCount: formState.importedSections.length,
          //   tab: formState.activeTab
          // });
        }
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(saveTimeout);
  }, [name, subdomain, activeTab, importedSections]);

  // Återställ sparad state vid mount (endast en gång)
    useEffect(() => {
    let hasRestored = false;
    
    // Skapa en session-identifierare för att undvika att rensa data vid fönsterbyte
    const currentSession = `${window.location.href}-${Math.floor(Date.now() / (10 * 60 * 1000))}`; // 10 minuter sessions
    const lastSession = localStorage.getItem('handbook_session_id');
    const isNewSession = !lastSession || lastSession !== currentSession;
    
    // Rensa endast AI-analys om forceNew är true OCH det är en ny session
    const documentState = handbookStorage.getDocumentImportState();
    let shouldClearDocumentState = false;
    
    if (forceNew && isNewSession) {
      shouldClearDocumentState = true;
      localStorage.setItem('handbook_session_id', currentSession);
      console.log('🆕 Rensar AI-analys eftersom forceNew=true och ny session');
    } else if (documentState && documentState.timestamp) {
      const oneHour = 60 * 60 * 1000; // Öka till 1 timme
      const isOld = Date.now() - documentState.timestamp > oneHour;
      if (isOld) {
        shouldClearDocumentState = true;
        console.log('🕒 Rensar gammal AI-analys (äldre än 1 timme)');
      }
    }
    
    if (shouldClearDocumentState) {
      const clearSuccess = handbookStorage.clearDocumentImportState();
      if (clearSuccess) {
        console.log('🧹 Rensade AI-analys från localStorage');
      }
    } else if (documentState) {
      console.log('💾 Behåller befintlig AI-analys i localStorage');
    }
    
    // Om forceNew är true OCH det är en ny session, rensa form state
    if (forceNew && isNewSession) {
      console.log('🆕 [CreateHandbook] forceNew=true och ny session, rensar form cache');
      handbookStorage.clearFormState();
      // Återställ till defaultvärden
      setName('');
      setSubdomain('');
      setActiveTab('manual');
      setImportedSections([]);
      setTemplate(getDefaultTemplate());
      return;
    }
    
    const restoreFormState = () => {
      if (hasRestored) return;
      
      const savedData = handbookStorage.getFormState();
      if (savedData && savedData.state) {
        const { state, timestamp } = savedData;
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        
        // Återställ endast om det är mindre än 10 minuter sedan
        if (now - timestamp < tenMinutes) {
          console.log('🔄 Återställer formulärstate från localStorage:', state);
          hasRestored = true;
          
          setIsRestoringState(true);
          
          setTimeout(() => {
            if (state.name) setName(state.name);
            if (state.subdomain) setSubdomain(state.subdomain);
            if (state.activeTab) setActiveTab(state.activeTab);
            if (state.importedSections && state.importedSections.length > 0) {
              setImportedSections(state.importedSections);
            }
            setIsRestoringState(false);
          }, 500);
        }
      }
    };

    restoreFormState();
  }, [forceNew]); // Lyssna på forceNew-ändringar

  // Kontrollera trial-status (förenklad - alla kan skapa)
  useEffect(() => {
    if (user?.id) {
      setIsCheckingTrial(true);
      // Simulera check och tillåt alla att skapa
      setTimeout(() => {
        console.log('✅ Användare kan skapa handbok via trial-system');
        setIsCheckingTrial(false);
      }, 500);
    }
  }, [user?.id]);

  // Kontrollera subdomain när komponenten laddas om det finns ett värde
  useEffect(() => {
    if (subdomain.length >= 2 && isSubdomainAvailable === null && !isCheckingSubdomain) {
      // Vänta lite så att komponenten hinner rendera
      const timer = setTimeout(() => {
        checkSubdomainAvailability(subdomain);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [subdomain, isSubdomainAvailable, isCheckingSubdomain]);

  const checkSubdomainAvailability = async (subdomainToCheck: string) => {
    if (subdomainToCheck.length < 2) {
      setIsSubdomainAvailable(null);
      return;
    }

    setIsCheckingSubdomain(true);
    setIsSubdomainAvailable(null);

    try {
      const response = await fetch(`/api/check-subdomain-availability?subdomain=${encodeURIComponent(subdomainToCheck)}`);
      const data = await response.json();
      
      if (response.ok) {
        setIsSubdomainAvailable(data.available);
      } else {
        console.error('Error checking subdomain:', data.error);
        setIsSubdomainAvailable(null);
      }
    } catch (error) {
      console.error('Error checking subdomain:', error);
      setIsSubdomainAvailable(null);
    } finally {
      setIsCheckingSubdomain(false);
    }
  };

  // Funktion för att generera subdomain från namn
  const generateSubdomainFromName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[åä]/g, 'a')
      .replace(/[ö]/g, 'o')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    
    // Generera subdomain automatiskt om användaren inte har ändrat det manuellt
    if (newName.trim() && (subdomain === '' || subdomain === generateSubdomainFromName(name))) {
      const newSubdomain = generateSubdomainFromName(newName);
      setSubdomain(newSubdomain);
      
      // Rensa tidigare status
      if (isSubdomainAvailable !== null) {
        setIsSubdomainAvailable(null);
      }
      
      // Kontrollera tillgänglighet för det nya subdomainet
      if (newSubdomain.length >= 2) {
        if (subdomainCheckTimeoutRef.current) {
          clearTimeout(subdomainCheckTimeoutRef.current);
        }
        subdomainCheckTimeoutRef.current = setTimeout(() => {
          checkSubdomainAvailability(newSubdomain);
        }, 500);
      }
    }
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(value);
    
    // Rensa tidigare status när användaren skriver
    if (isSubdomainAvailable !== null) {
      setIsSubdomainAvailable(null);
    }
    
    // Debounce subdomain check
    if (subdomainCheckTimeoutRef.current) {
      clearTimeout(subdomainCheckTimeoutRef.current);
    }
    
    if (value.length >= 2) {
      subdomainCheckTimeoutRef.current = setTimeout(() => {
        checkSubdomainAvailability(value);
      }, 500);
    }
  };

  const handleImportComplete = useCallback((sections: any[]) => {
    console.log('📄 Import complete, received sections:', sections.length);
    
    // Kontrollera om vi redan har samma antal sektioner för att undvika onödiga uppdateringar
    if (importedSections.length === sections.length && sections.length > 0) {
      console.log('🔄 Samma antal sektioner redan importerade, hoppar över uppdatering');
      return;
    }
    
    setImportedSections(sections);
    setTemplate(createTemplateFromImportedSections(sections));
  }, [importedSections.length]);

  const handleImportStatusChange = useCallback((status: any) => {
    setImportStatus(status);
    // console.log('Import status:', status); // Commented out to reduce console spam
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('Du måste vara inloggad för att skapa en handbok');
      return;
    }

    if (!name.trim() || !subdomain.trim()) {
      setError('Både namn och adress måste fyllas i');
      return;
    }

    if (isSubdomainAvailable === false) {
      setError('Den valda adressen är inte tillgänglig');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Skapa template baserat på importerade sektioner eller använd default
      let finalTemplate = template;
      if (importedSections.length > 0) {
        finalTemplate = createTemplateFromImportedSections(importedSections);
        console.log(`🤖 [CreateHandbookForm] Skapar handbok med AI-template från ${importedSections.length} importerade sektioner`);
        console.log('🤖 [CreateHandbookForm] AI sections:', importedSections.map(s => ({ title: s.title, contentLength: s.content.length })));
        console.log('🤖 [CreateHandbookForm] Final template:', finalTemplate.map(s => ({ title: s.title, pages: s.pages.length })));
      } else {
        finalTemplate = getDefaultTemplate();
        console.log(`📝 [CreateHandbookForm] Skapar handbok med standard-template`);
      }

      const handbookData = {
        name: name.trim(),
        subdomain: subdomain.trim(),
        template: { sections: finalTemplate },
        userId: user.id
      };

      console.log('📤 Skickar handboksdata till API...');
      
      const response = await fetch('/api/trial/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handbookData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte skapa handbok');
      }

      console.log('✅ Handbok skapad framgångsrikt:', result);

      // Rensa formulärstate efter framgångsrik skapelse
      const success = handbookStorage.clearAllStates();
      if (success) {
        console.log('🗑️ Formulärstate och AI-analys rensad efter framgångsrik skapelse');
      }

      // Omdirigera till den nya handboken med path-baserad routing
      const redirectUrl = result.redirectUrl || `/${subdomain.trim()}`;
      window.location.href = redirectUrl;
      
    } catch (error) {
      console.error('❌ Fel vid skapande av handbok:', error);
      setError(error instanceof Error ? error.message : 'Ett oväntat fel inträffade');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Återställningsindikator */}
      {isRestoringState && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">Återställer ditt arbete...</p>
            <p className="text-sm text-blue-700">Vi hittade sparad data från din tidigare session.</p>
          </div>
        </div>
      )}

      {/* Huvudformulär med tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 pt-4">
            <button
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'manual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Manuell skapelse
              </div>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                AI från dokument {importedSections.length > 0 && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{importedSections.length}</span>}
              </div>
            </button>
          </nav>
        </div>

        <div className="p-4 md:p-8">
          {activeTab === 'manual' ? (
            // Manuell skapelse
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Skapa din handbok
                </h1>
                <p className="text-gray-600">
                  Skapa en digital handbok för din bostadsrättsförening med vår smarta mall.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                {/* Grundläggande information i grid på desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-900">
                      Handbokens namn
                    </label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="T.ex. Brf Solgläntan"
                      className="w-full h-10 md:h-12 text-sm md:text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="subdomain" className="block text-sm font-semibold text-gray-900">
                      Adressen till din handbok blir:
                    </label>
                    <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                      <span className="text-gray-500 px-2 md:px-3 text-sm md:text-base font-medium">handbok.org/</span>
                      <Input
                        id="subdomain"
                        type="text"
                        value={subdomain}
                        onChange={handleSubdomainChange}
                        placeholder="solgläntan"
                        className={`flex-1 h-10 md:h-12 text-sm md:text-base border-0 bg-transparent focus:ring-0 ${isSubdomainAvailable === true ? 'text-green-600' : isSubdomainAvailable === false ? 'text-red-600' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Subdomain status - full width */}
                <div className="lg:col-span-2">
                  <div className="mt-3">
                    {isCheckingSubdomain ? (
                      <div className="flex items-center text-sm text-blue-600 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Kontrollerar om adressen är tillgänglig...
                      </div>
                    ) : isSubdomainAvailable === true ? (
                      <div className="flex items-center text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
                        <CheckCircle2 size={16} className="mr-2" />
                        Denna adress är tillgänglig och kan användas
                      </div>
                    ) : isSubdomainAvailable === false ? (
                      <div className="flex items-center text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                        <AlertCircle size={16} className="mr-2" />
                        Denna adress är redan upptagen. Prova en annan.
                      </div>
                    ) : subdomain.length >= 2 ? (
                      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                        💡 Skriv minst 2 tecken för att kontrollera tillgänglighet
                      </div>
                    ) : null}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Submit knapp - alltid synlig men korrekt disabled */}
                <div className="pt-4 md:pt-6">
                  <Button
                    type="submit"
                    className={`w-full h-10 md:h-12 text-sm md:text-base font-semibold transition-all duration-200 shadow-lg ${
                      isLoading || isSubdomainAvailable === false ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white'
                    }`}
                    disabled={isLoading || isSubdomainAvailable === false}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                        <span className="hidden sm:inline">Skapar handbok...</span>
                        <span className="sm:hidden">Skapar...</span>
                      </>
                    ) : (
                      <>
                        <Gift className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                        <span className="hidden sm:inline">Starta 30 dagars gratis trial</span>
                        <span className="sm:hidden">Starta trial</span>
                      </>
                    )}
                  </Button>
                  
                  <div className="text-xs text-center mt-3 md:mt-4 px-2 space-y-1">
                    <p className="text-emerald-600 font-medium">
                      🎉 30 dagar gratis, sedan 149 kr/månad eller 1490 kr/år
                    </p>
                    <p className="text-gray-500">
                      Din handbok kommer att vara tillgänglig på{" "}
                      <span className="font-medium text-gray-700 break-all">handbok.org/{subdomain || 'din-förening'}</span>
                    </p>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            // AI-import från dokument
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Skapa handbok från befintliga dokument
                </h3>
                <p className="text-gray-600">
                  Ladda upp PDF-filer, Word-dokument eller andra filer så analyserar vår AI innehållet 
                  och skapar en strukturerad handbok automatiskt.
                </p>
              </div>

              {/* Namn och subdomain först */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name-import" className="block text-sm font-semibold text-gray-900">
                      Handbokens namn
                    </label>
                    <Input
                      id="name-import"
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="T.ex. Brf Solgläntan"
                      className="w-full h-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="subdomain-import" className="block text-sm font-semibold text-gray-900">
                      Adress till din handbok:
                    </label>
                    <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
                      <span className="text-gray-500 px-3 font-medium">handbok.org/</span>
                      <Input
                        id="subdomain-import"
                        type="text"
                        value={subdomain}
                        onChange={handleSubdomainChange}
                        placeholder="solgläntan"
                        className={`flex-1 h-12 border-0 bg-transparent focus:ring-0 ${isSubdomainAvailable === true ? 'text-green-600' : isSubdomainAvailable === false ? 'text-red-600' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Subdomain status */}
                {isCheckingSubdomain ? (
                  <div className="flex items-center text-sm text-blue-600 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Kontrollerar om adressen är tillgänglig...
                  </div>
                ) : isSubdomainAvailable === true ? (
                  <div className="flex items-center text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
                    <CheckCircle2 size={16} className="mr-2" />
                    Denna adress är tillgänglig och kan användas
                  </div>
                ) : isSubdomainAvailable === false ? (
                  <div className="flex items-center text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                    <AlertCircle size={16} className="mr-2" />
                    Denna adress är redan upptagen. Prova en annan.
                  </div>
                ) : subdomain.length >= 2 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    💡 Skriv minst 2 tecken för att kontrollera tillgänglighet
                  </div>
                ) : null}

                {/* Dokumentimport */}
                <div className="border-t pt-6">
                  <DocumentImport
                    onImportComplete={handleImportComplete}
                    onImportStatusChange={handleImportStatusChange}
                    isLoading={isLoading}
                  />
                </div>

                {/* Visa förhandsvisning endast när det finns sektioner OCH analysen är helt klar */}
                {importedSections.length > 0 && importStatus?.hasResults && !importStatus?.isAnalyzing && (
                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-gray-900">
                        AI-analys slutförd - {importedSections.length} sektioner identifierade
                      </h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {importedSections.map((section, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <h5 className="font-medium text-gray-900">{section.title}</h5>
                          <p className="text-sm text-gray-600 mt-1">
                            {section.content.substring(0, 200)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Submit knapp - endast synlig när AI-analysen är helt klar */}
                {importedSections.length > 0 && importStatus?.hasResults && !importStatus?.isAnalyzing && (
                  <div className="pt-4">
                    <Button
                      type="submit"
                      className={`w-full h-12 font-semibold transition-all duration-200 shadow-lg ${
                        isLoading || isSubdomainAvailable === false ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white'
                      }`}
                      disabled={isLoading || isSubdomainAvailable === false}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Skapar AI-handbok...
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-5 w-5" />
                          Skapa handbok med AI-innehåll
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-center mt-4 px-2 space-y-1">
                      <p className="text-emerald-600 font-medium">
                        🤖 AI skapar strukturerat innehåll från dina dokument
                      </p>
                      <p className="text-gray-500">
                        30 dagar gratis, sedan 149 kr/månad eller 1490 kr/år
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 