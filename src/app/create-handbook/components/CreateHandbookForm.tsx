import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, CheckCircle2, Loader2, Gift, Upload, Brain } from "lucide-react";
import { DocumentImport } from "@/components/handbook/DocumentImport";
import { createTemplateFromImportedSections, getDefaultTemplate } from "@/lib/handbook-templates";


export function CreateHandbookForm() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState<boolean | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean | null>(null);
  const [price, setPrice] = useState<number>(2490); // Default pris i kr
  const [isEligibleForProvState, setIsEligibleForProvState] = useState<boolean>(false);
  const [provStatus, setProvStatus] = useState<any>(null);
  const [isCheckingProv, setIsCheckingProv] = useState(true);
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [importedSections, setImportedSections] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState({ hasFile: false, isAnalyzing: false, hasResults: false });
  const [isRestoringState, setIsRestoringState] = useState(false);

  // Refs för att bevara state vid fönsterbyte
  const importedSectionsRef = useRef<any[]>([]);
  const activeTabRef = useRef<'manual' | 'import'>('manual');
  const nameRef = useRef<string>('');
  const subdomainRef = useRef<string>('');

  // Synkronisera state med refs
  useEffect(() => {
    importedSectionsRef.current = importedSections;
  }, [importedSections]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    subdomainRef.current = subdomain;
  }, [subdomain]);

  // Återställ state från refs vid fönsterbyte
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Återställ importerade sektioner om de försvunnit
        if (importedSections.length === 0 && importedSectionsRef.current.length > 0) {
          console.log('🔄 Återställer importerade sektioner efter fönsterbyte');
          setImportedSections(importedSectionsRef.current);
        }
        
        // Återställ aktiv tab om den förändrats
        if (activeTab !== activeTabRef.current) {
          console.log('🔄 Återställer aktiv tab efter fönsterbyte');
          setActiveTab(activeTabRef.current);
        }

        // Återställ namn och subdomain om de försvunnit
        if (!name && nameRef.current) {
          console.log('🔄 Återställer namn efter fönsterbyte');
          setName(nameRef.current);
        }
        
        if (!subdomain && subdomainRef.current) {
          console.log('🔄 Återställer subdomain efter fönsterbyte');
          setSubdomain(subdomainRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [importedSections, activeTab, name, subdomain]);

  // Återställ från localStorage vid komponentstart
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('handbook-form-state');
      const savedTimestamp = localStorage.getItem('handbook-form-timestamp');
      
      if (savedState && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000; // 10 minuter i millisekunder
        
        // Återställ endast om det är mindre än 10 minuter sedan
        if (now - timestamp < tenMinutes) {
          const state = JSON.parse(savedState);
          console.log('🔄 Återställer formulärstate från localStorage:', state);
          
          setIsRestoringState(true);
          
          // Återställ alla fält
          if (state.name) setName(state.name);
          if (state.subdomain) setSubdomain(state.subdomain);
          if (state.activeTab) setActiveTab(state.activeTab);
          if (state.importedSections && state.importedSections.length > 0) {
            setImportedSections(state.importedSections);
          }
          
          // Kontrollera subdomain-tillgänglighet om det finns en subdomain
          if (state.subdomain && state.subdomain.length >= 2) {
            setTimeout(() => {
              checkSubdomainAvailability(state.subdomain);
            }, 500);
          }
          
          // Dölj återställningsindikator efter en kort stund
          setTimeout(() => {
            setIsRestoringState(false);
          }, 2000);
        } else {
          // Rensa gamla data
          localStorage.removeItem('handbook-form-state');
          localStorage.removeItem('handbook-form-timestamp');
          // Rensa även gamla format
          localStorage.removeItem('handbook-import-sections');
          localStorage.removeItem('handbook-import-timestamp');
        }
      }
    } catch (error) {
      console.warn('Kunde inte återställa från localStorage:', error);
    }
  }, []);

  // Kontrollera prov-status när komponenten laddas
  useEffect(() => {
    async function checkProvEligibility() {
      if (!user) return;
      
      setIsCheckingProv(true);
      try {
        // Använd API-endpoint istället för direkt databasanrop
        const response = await fetch(`/api/trial/check-status?userId=${user.id}`);
        
        if (response.ok) {
          const status = await response.json();
          setProvStatus(status);
          
          // Användaren är berättigad till prov om de inte har använt det än
          // eller om de är i en aktiv prov
          const eligible = !status.hasUsedTrial || status.isInTrial;
          setIsEligibleForProvState(eligible);
        } else {
          console.error('Failed to fetch prov status');
          // Default till att inte vara berättigad vid fel
          setIsEligibleForProvState(false);
          setProvStatus(null);
        }
      } catch (error) {
        console.error('Error checking prov eligibility:', error);
        // Default till att inte vara berättigad vid fel
        setIsEligibleForProvState(false);
        setProvStatus(null);
      } finally {
        setIsCheckingProv(false);
      }
    }
    
    checkProvEligibility();
  }, [user]);

  // Hämta aktuellt prisbelopp och testläge från API
  useEffect(() => {
    async function fetchPriceAndMode() {
      try {
        const response = await fetch('/api/stripe/check-mode');
        const data = await response.json();
        setIsTestMode(data.isTestMode);
        
        // Hämta det faktiska prisbeloppet om det är tillgängligt
        if (data.priceAmount) {
          // Konvertera från öre till kronor för visning
          setPrice(data.priceAmount / 100);
        }
      } catch (err) {
        console.error('Error fetching stripe mode:', err);
      }
    }
    fetchPriceAndMode();
  }, []);

  // Konvertera handbokens namn till en lämplig subdomän
  const convertToSubdomain = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[åä]/g, 'a')
      .replace(/[ö]/g, 'o')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Auto-fylla subdomän när namnet ändras
  useEffect(() => {
    if (name) {
      const suggestedSubdomain = convertToSubdomain(name);
      setSubdomain(suggestedSubdomain);
      // Kontrollera automatiskt när subdomän sätts från namnet
      if (suggestedSubdomain.length >= 2) {
        setTimeout(() => {
          checkSubdomainAvailability(suggestedSubdomain);
        }, 300);
      }
    }
  }, [name]);

  // Kontrollera om subdomänen är tillgänglig
  const checkSubdomainAvailability = async (value: string) => {
    if (!value || value.length < 2) {
      setIsSubdomainAvailable(null);
      return;
    }

    setIsCheckingSubdomain(true);
    try {
      const response = await fetch(`/api/check-subdomain-availability?subdomain=${encodeURIComponent(value)}`);
      const result = await response.json();

      if (!response.ok) {
        console.error('Error checking subdomain availability:', result.error);
        setIsSubdomainAvailable(null);
        return;
      }

      setIsSubdomainAvailable(result.available);
    } catch (err) {
      console.error('Error checking subdomain:', err);
      setIsSubdomainAvailable(null);
    } finally {
      setIsCheckingSubdomain(false);
    }
  };

  // Debounced subdomain change handler
  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSubdomain(value);
    
    // Debounce the availability check
    setTimeout(() => {
      checkSubdomainAvailability(value);
    }, 500);
  };

  const handleImportComplete = useCallback((sections: any[]) => {
    console.log('🎯 [IMPORT] Import complete, received sections:', {
      count: sections.length,
      sections: sections.map(s => ({ title: s.title, contentLength: s.content?.length }))
    });
    
    setImportedSections(sections);
    console.log('🎯 [IMPORT] State updated with sections:', sections.length);
    
    // INTE växla tab automatiskt - låt användaren se resultatet i import-vyn
    // Detta gör UX:en tydligare och mindre förvirrande
    console.log('🎯 [IMPORT] Keeping user in import tab to show results');
    
    // Verifiera att state faktiskt uppdaterades
    setTimeout(() => {
      console.log('🔍 [IMPORT] Verifying state update after timeout:', {
        importedSectionsLength: sections.length,
        firstSectionTitle: sections[0]?.title
      });
    }, 100);
    
    // State sparas automatiskt via useEffect, men spara direkt också för säkerhets skull
    setTimeout(() => {
      try {
        const formState = {
          name,
          subdomain,
          activeTab, // Behåll nuvarande tab (import)
          importedSections: sections, // Use the new sections directly
          timestamp: Date.now()
        };
        
        localStorage.setItem('handbook-form-state', JSON.stringify(formState));
        localStorage.setItem('handbook-form-timestamp', Date.now().toString());
        
        console.log('💾 [IMPORT] Sparar formulärstate efter import:', {
          sectionsCount: formState.importedSections.length,
          activeTab: formState.activeTab,
          sectionTitles: formState.importedSections.map(s => s.title)
        });
      } catch (error) {
        console.warn('Kunde inte spara formulärstate:', error);
      }
    }, 100);
  }, [name, subdomain, activeTab]);

  const handleImportStatusChange = useCallback((status: { hasFile: boolean; isAnalyzing: boolean; hasResults: boolean }) => {
    setImportStatus(status);
  }, []);

  // Funktion för att spara hela formulärets state
  const saveFormState = useCallback(() => {
    try {
      const formState = {
        name,
        subdomain,
        activeTab,
        importedSections,
        timestamp: Date.now()
      };
      
      localStorage.setItem('handbook-form-state', JSON.stringify(formState));
      localStorage.setItem('handbook-form-timestamp', Date.now().toString());
      
      console.log('💾 Sparar formulärstate:', formState);
    } catch (error) {
      console.warn('Kunde inte spara formulärstate:', error);
    }
  }, [name, subdomain, activeTab, importedSections]);

  // Spara state automatiskt när något ändras
  useEffect(() => {
    // Spara endast om vi har något meningsfullt att spara
    if (name || subdomain || importedSections.length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          const formState = {
            name,
            subdomain,
            activeTab,
            importedSections,
            timestamp: Date.now()
          };
          
          localStorage.setItem('handbook-form-state', JSON.stringify(formState));
          localStorage.setItem('handbook-form-timestamp', Date.now().toString());
          
          console.log('💾 Sparar formulärstate:', formState);
        } catch (error) {
          console.warn('Kunde inte spara formulärstate:', error);
        }
      }, 1000); // Debounce med 1 sekund
      
      return () => clearTimeout(timeoutId);
    }
  }, [name, subdomain, activeTab, importedSections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Du måste vara inloggad för att skapa en handbok");
      return;
    }

    if (!name.trim()) {
      setError('Vänligen ange ett namn för handboken');
      return;
    }

    if (!subdomain.trim()) {
      setError('Vänligen ange en adress för handboken');
      return;
    }

    if (!isSubdomainAvailable) {
      setError("Subdomänen är redan tagen. Välj en annan subdomän.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Debug: Kontrollera importerade sektioner
      console.log('🔍 [SUBMIT] Checking imported sections:', {
        count: importedSections.length,
        activeTab,
        sections: importedSections.map(s => ({ title: s.title, contentLength: s.content?.length }))
      });
      
      // Debug: Kontrollera localStorage också
      try {
        const savedState = localStorage.getItem('handbook-form-state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          console.log('🔍 [SUBMIT] LocalStorage state:', {
            importedSectionsCount: parsed.importedSections?.length || 0,
            activeTab: parsed.activeTab
          });
        }
      } catch (e) {
        console.log('🔍 [SUBMIT] No localStorage state found');
      }

      // Debug: Kontrollera vilken template-logik som kommer att användas
      console.log('🔍 [SUBMIT] Template logic check:', {
        importedSectionsLength: importedSections.length,
        willUseImported: importedSections.length > 0,
        activeTab: activeTab
      });

      // Använd importerade sektioner om de finns OCH användaren är i import-läge, annars standard-template
      const shouldUseImported = importedSections.length > 0 && activeTab === 'import';
      console.log('🔍 [SUBMIT] Template decision:', {
        importedSectionsLength: importedSections.length,
        activeTab: activeTab,
        shouldUseImported: shouldUseImported
      });

      const templateSections = shouldUseImported 
        ? createTemplateFromImportedSections(importedSections)
        : getDefaultTemplate();

      console.log('📊 Template sections created:', {
        count: templateSections.length,
        usingImported: shouldUseImported,
        sections: templateSections.map(s => ({ title: s.title, pagesCount: s.pages?.length }))
      });

      const handbookData = {
        name: name,
        subdomain: subdomain,
        userId: user?.id,
        template: {
          metadata: {
            subtitle: '',
            version: '1.0',
            organization: {
              name: '',
              address: '',
              org_number: '',
              phone: '',
              email: ''
            }
          },
          sections: templateSections
        }
      };

      // Debug: Logga den slutgiltiga handbookData som skickas till API:et
      console.log('🚀 [SUBMIT] Final handbookData being sent to API:', {
        name: handbookData.name,
        subdomain: handbookData.subdomain,
        sectionsCount: handbookData.template.sections.length,
        sectionTitles: handbookData.template.sections.map(s => s.title),
        usingImportedData: importedSections.length > 0,
        firstSectionContent: handbookData.template.sections[0]?.pages?.[0]?.content?.substring(0, 100) + '...'
      });

      // Om användaren är berättigad till prov, använd prov-endpoint
      if (isEligibleForProvState) {
        const response = await fetch('/api/trial/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ handbookData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Kunde inte starta prov');
        }

        const result = await response.json();
        
        // Rensa localStorage när handboken skapas framgångsrikt
        try {
          localStorage.removeItem('handbook-form-state');
          localStorage.removeItem('handbook-form-timestamp');
          // Rensa även gamla format
          localStorage.removeItem('handbook-import-sections');
          localStorage.removeItem('handbook-import-timestamp');
        } catch (error) {
          console.warn('Kunde inte rensa localStorage:', error);
        }
        
        // Redirect till den nya handboken
        window.location.href = result.redirectUrl;
      } else {
        // Annars använd Stripe checkout
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handbookData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Kunde inte skapa checkout-session');
      }

      const { url } = await response.json();
      
      // Rensa localStorage innan redirect till Stripe
      try {
        localStorage.removeItem('handbook-form-state');
        localStorage.removeItem('handbook-form-timestamp');
        // Rensa även gamla format
        localStorage.removeItem('handbook-import-sections');
        localStorage.removeItem('handbook-import-timestamp');
      } catch (error) {
        console.warn('Kunde inte rensa localStorage:', error);
      }
      
      // Redirect to Stripe Checkout
      window.location.href = url;
      }

    } catch (error) {
      console.error("Fel vid skapande av handbok:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Ett fel uppstod vid skapande av handbok";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (isCheckingProv) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span>Kontrollerar prov-status...</span>
        </div>
      </div>
    );
  }

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

      {/* Prisvisning för icke-prov användare */}
      {!isEligibleForProvState && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Digital handbok</h3>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{price.toFixed(2)} kr</div>
                <div className="text-sm text-gray-500">per år</div>
              </div>
            </div>
            <div className="border-t border-gray-200"></div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Årsabonnemang per förening</span>
              <span className="font-medium">Totalt: {price.toFixed(2)} kr</span>
            </div>
            
            {isTestMode === true && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm flex items-center">
                <span className="mr-2">🧪</span>
                Testläge aktivt - använd kortnummer 4242 4242 4242 4242 för test
              </div>
            )}
            {!isTestMode && price < 10 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-sm flex items-center">
                <span className="mr-2">⚠️</span>
                OBS! Detta är ett minimalt testbelopp för verifiering av betalflödet ({price.toFixed(2)} kr)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Huvudformulär - Elegant white card */}
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-8">
        {/* Prov-erbjudande - Inuti den vita boxen */}
        {isEligibleForProvState && (
          <div className="mb-6 md:mb-8">
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 md:p-6">
              <div className="flex items-start space-x-3 md:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Gift className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">30 dagars prov</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mt-1 sm:mt-0 w-fit">
                      🎉 Kostnadsfritt
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2 md:mb-3 text-sm md:text-base">
                    Som ny användare får du prova vår tjänst gratis i 30 dagar. Ingen betalning krävs nu.
                  </p>
                  <div className="flex items-center text-xs md:text-sm text-gray-500">
                    <span>Efter prov-perioden: {price.toFixed(2)} kr/år</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grundläggande information först */}
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
                onChange={(e) => setName(e.target.value)}
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


          {/* Innehållsval sektion */}
          <div className="space-y-4">
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hur vill du skapa innehållet?</h3>
              <p className="text-sm text-gray-600 mb-6">
                Välj om du vill använda vår standardmall eller importera innehåll från dina egna dokument.
              </p>
              
              {/* Innehållsval knappar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Standard mall */}
                <div className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  activeTab === 'manual' && importedSections.length === 0
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  console.log('🔄 [UI] Standard template clicked, current state:', {
                    currentActiveTab: activeTab,
                    currentImportedSections: importedSections.length
                  });
                  setActiveTab('manual');
                  // Rensa importerade sektioner när användaren väljer standardmall
                  if (importedSections.length > 0) {
                    setImportedSections([]);
                    console.log('🔄 [UI] Cleared imported sections - switching to standard template');
                    
                    // Rensa även localStorage för att förhindra återställning
                    try {
                      localStorage.removeItem('handbook-form-state');
                      localStorage.removeItem('handbook-form-timestamp');
                      console.log('🔄 [UI] Cleared localStorage to prevent restoration of imported sections');
                    } catch (error) {
                      console.warn('Could not clear localStorage:', error);
                    }
                  }
                  console.log('🔄 [UI] After clearing - activeTab will be: manual, importedSections will be: 0');
                }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">Använd standardmall</h4>
                      <p className="text-sm text-gray-600">
                        Börja med vår färdiga mall för bostadsrättsföreningar med 6 grundläggande sektioner.
                      </p>
                    </div>
                  </div>
                  {activeTab === 'manual' && importedSections.length === 0 && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Import */}
                <div className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  importedSections.length > 0
                    ? 'border-green-500 bg-green-50' 
                    : activeTab === 'import'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('import')}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      importedSections.length > 0 ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      <Upload className={`h-5 w-5 ${importedSections.length > 0 ? 'text-green-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {importedSections.length > 0 ? '🎉 AI-import slutförd!' : 'Importera befintlig handbok'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {importedSections.length > 0 
                          ? `${importedSections.length} sektioner importerades från ditt dokument`
                          : 'Ladda upp din PDF eller Word-fil så analyserar AI:n innehållet automatiskt.'
                        }
                      </p>
                    </div>
                  </div>
                  {importedSections.length > 0 && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Import sektion */}
              {activeTab === 'import' && (
                <div className="border border-gray-200 rounded-xl p-4 md:p-6 lg:p-8 bg-gray-50">
                  <DocumentImport 
                    onImportComplete={handleImportComplete}
                    onImportStatusChange={handleImportStatusChange}
                    isLoading={isLoading}
                  />
                </div>
              )}


            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Visa hjälptext när användaren är i import-flödet men inte har slutfört det */}


          {/* Submit knapp - alltid synlig men korrekt disabled */}
          <div className="pt-3 md:pt-4">
            <Button
              type="submit"
              className={`w-full h-10 md:h-12 text-sm md:text-base font-semibold transition-all duration-200 shadow-lg ${
                (activeTab === 'import' && importedSections.length === 0) || isLoading || isSubdomainAvailable === false
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                  : isEligibleForProvState 
                    ? 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
              }`}
              disabled={
                isLoading || 
                isSubdomainAvailable === false || 
                (activeTab === 'import' && importedSections.length === 0)
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  <span className="hidden sm:inline">{isEligibleForProvState ? 'Startar prov...' : 'Förbereder betalning...'}</span>
                  <span className="sm:hidden">{isEligibleForProvState ? 'Startar...' : 'Förbereder...'}</span>
                </>
              ) : isEligibleForProvState ? (
                <>
                  <Gift className={`mr-2 h-4 w-4 md:h-5 md:w-5 ${(activeTab === 'import' && importedSections.length === 0) ? 'opacity-50' : ''}`} />
                  <span className="hidden sm:inline">
                    {(activeTab === 'import' && importedSections.length === 0) 
                      ? 'Slutför AI-analysen först'
                      : importedSections.length > 0 
                        ? 'Skapa handbok med AI-innehåll' 
                        : 'Starta 30 dagars prov'
                    }
                  </span>
                  <span className="sm:hidden">
                    {(activeTab === 'import' && importedSections.length === 0) 
                      ? 'Slutför analys först'
                      : importedSections.length > 0 
                        ? 'Skapa med AI' 
                        : 'Starta prov'
                    }
                  </span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {(activeTab === 'import' && importedSections.length === 0) 
                      ? 'Slutför AI-analysen först'
                      : importedSections.length > 0 
                        ? 'Skapa handbok med AI-innehåll' 
                        : 'Gå vidare till betalning'
                    }
                  </span>
                  <span className="sm:hidden">
                    {(activeTab === 'import' && importedSections.length === 0) 
                      ? 'Slutför analys först'
                      : importedSections.length > 0 
                        ? 'Skapa med AI' 
                        : 'Till betalning'
                    }
                  </span>
                </>
              )}
            </Button>
            
            <div className="text-xs text-center mt-3 md:mt-4 px-2 space-y-1">
              {importedSections.length > 0 && (
                <p className="text-green-600 font-medium">
                  🤖 Din handbok kommer att skapas med {importedSections.length} AI-analyserade sektioner
                </p>
              )}
              <p className="text-gray-500">
                Efter {isEligibleForProvState ? 'prov-start' : 'betalning'} kommer din handbok att vara tillgänglig på{" "}
                <span className="font-medium text-gray-700 break-all">handbok.org/{subdomain || 'din-förening'}</span>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 