import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, CheckCircle2, Loader2, Gift, Upload } from "lucide-react";
import { DocumentImport } from "@/components/handbook/DocumentImport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const handleImportComplete = (sections: any[]) => {
    setImportedSections(sections);
    // Auto-fyll namn baserat på första sektionen eller dokumenttitel
    if (sections.length > 0 && !name) {
      const firstSection = sections[0];
      const suggestedName = firstSection.title.includes('handbok') 
        ? firstSection.title 
        : `${firstSection.title} Handbok`;
      setName(suggestedName);
    }
    setActiveTab('manual'); // Växla tillbaka till manual för att visa formuläret
  };

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
      // Använd importerade sektioner om de finns, annars standard-template
      const templateSections = importedSections.length > 0 
        ? importedSections.map((section, index) => ({
            title: section.title,
            description: section.content.substring(0, 200) + '...',
            order: index + 1,
            isActive: true,
            pages: [{
              title: section.title,
              content: section.content,
              order: 1,
              slug: section.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
            }]
          }))
        : [
            {
              title: "Välkommen",
              description: "Introduktion och översikt",
              order: 1,
              isActive: true,
              pages: [
                {
                  title: "Översikt",
                  content: "Välkommen till din digitala handbok! Här hittar du all viktig information om din bostadsrättsförening.",
                  order: 1,
                  slug: "oversikt"
                }
              ]
            }
          ];

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
          sections: templateSections.length > 0 ? templateSections : [
            {
              title: "Välkommen",
              description: "Introduktion och översikt",
              order: 1,
              isActive: true,
              pages: [
                {
                  title: "Översikt",
                  content: "Välkommen till din digitala handbok! Här hittar du all viktig information om din bostadsrättsförening.",
                  order: 1,
                  slug: "oversikt"
                }
              ]
            },
            {
              title: "Kontaktuppgifter",
              description: "Viktiga kontakter och information",
              order: 2,
              isActive: true,
              pages: [
                {
                  title: "Förvaltning",
                  content: "Kontaktuppgifter till förvaltningsbolaget.",
                  order: 1,
                  slug: "forvaltning"
                },
                {
                  title: "Styrelse",
                  content: "Här hittar du kontaktuppgifter till styrelsen.",
                  order: 2,
                  slug: "styrelse"
                }
              ]
            },
            {
              title: "Regler och ordningsföreskrifter",
              description: "Föreningens regler och bestämmelser",
              order: 3,
              isActive: true,
              pages: [
                {
                  title: "Ordningsföreskrifter",
                  content: "Föreningens ordningsföreskrifter och regler för boende.",
                  order: 1,
                  slug: "ordningsforeskrifter"
                }
              ]
            },
            {
              title: "Ekonomi",
              description: "Ekonomisk information och avgifter",
              order: 4,
              isActive: true,
              pages: [
                {
                  title: "Avgifter",
                  content: "Information om månadsavgifter och andra kostnader.",
                  order: 1,
                  slug: "avgifter"
                }
              ]
            },
            {
              title: "Underhåll och reparationer",
              description: "Information om underhåll och felanmälan",
              order: 5,
              isActive: true,
              pages: [
                {
                  title: "Felanmälan",
                  content: "Så här anmäler du fel och skador.",
                  order: 1,
                  slug: "felanmalan"
                }
              ]
            },
            {
              title: "Gemensamma utrymmen",
              description: "Tvättstuga, förråd och andra faciliteter",
              order: 6,
              isActive: true,
              pages: [
                {
                  title: "Tvättstuga",
                  content: "Regler och bokning av tvättstuga.",
                  order: 1,
                  slug: "tvattstuga"
                }
              ]
            }
          ]
        }
      };

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

        {/* Tabs för att välja mellan manuell och import */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'import')} className="mb-6 md:mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Skapa manuellt</span>
              <span className="sm:hidden">Manuellt</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Upload className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Importera befintlig handbok</span>
              <span className="sm:hidden">Importera</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-6">
            <DocumentImport 
              onImportComplete={handleImportComplete}
              isLoading={isLoading}
            />
            
            {importedSections.length > 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Import slutförd!</span>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  {importedSections.length} sektioner importerades från ditt dokument. 
                  Växla till "Skapa manuellt" för att slutföra handboksskapandet.
                </p>
                <div className="space-y-1">
                  {importedSections.slice(0, 3).map((section, index) => (
                    <div key={index} className="text-xs text-green-600">
                      • {section.title}
                    </div>
                  ))}
                  {importedSections.length > 3 && (
                    <div className="text-xs text-green-600">
                      ... och {importedSections.length - 3} till
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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

          <div className="pt-3 md:pt-4">
            <Button
              type="submit"
              className={`w-full h-10 md:h-12 text-sm md:text-base font-semibold ${isEligibleForProvState ? 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white shadow-lg transition-all duration-200`}
              disabled={isLoading || isSubdomainAvailable === false}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  <span className="hidden sm:inline">{isEligibleForProvState ? 'Startar prov...' : 'Förbereder betalning...'}</span>
                  <span className="sm:hidden">{isEligibleForProvState ? 'Startar...' : 'Förbereder...'}</span>
                </>
              ) : isEligibleForProvState ? (
                <>
                  <Gift className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Starta 30 dagars prov</span>
                  <span className="sm:hidden">Starta prov</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Gå vidare till betalning</span>
                  <span className="sm:hidden">Till betalning</span>
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-3 md:mt-4 px-2">
              Efter {isEligibleForProvState ? 'prov-start' : 'betalning'} kommer din handbok att vara tillgänglig på{" "}
              <span className="font-medium text-gray-700 break-all">handbok.org/{subdomain || 'din-förening'}</span>
            </p>
          </div>
        </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 