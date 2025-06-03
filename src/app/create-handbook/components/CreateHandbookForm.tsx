import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, CheckCircle2, Loader2, Gift } from "lucide-react";

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
  const [isEligibleForTrialState, setIsEligibleForTrialState] = useState<boolean>(false);
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [isCheckingTrial, setIsCheckingTrial] = useState(true);

  // Kontrollera trial-status när komponenten laddas
  useEffect(() => {
    async function checkTrialEligibility() {
      if (!user) return;
      
      setIsCheckingTrial(true);
      try {
        // Använd API-endpoint istället för direkt databasanrop
        const response = await fetch(`/api/trial/check-status?userId=${user.id}`);
        
        if (response.ok) {
          const status = await response.json();
          setTrialStatus(status);
          
          // Användaren är berättigad till trial om de inte har använt det än
          // eller om de är i en aktiv trial
          const eligible = !status.hasUsedTrial || status.isInTrial;
          setIsEligibleForTrialState(eligible);
        } else {
          console.error('Failed to fetch trial status');
          // Default till att inte vara berättigad vid fel
          setIsEligibleForTrialState(false);
          setTrialStatus(null);
        }
      } catch (error) {
        console.error('Error checking trial eligibility:', error);
        // Default till att inte vara berättigad vid fel
        setIsEligibleForTrialState(false);
        setTrialStatus(null);
      } finally {
        setIsCheckingTrial(false);
      }
    }
    
    checkTrialEligibility();
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
          sections: [
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

      // Om användaren är berättigad till trial, använd trial-endpoint
      if (isEligibleForTrialState) {
        const response = await fetch('/api/trial/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ handbookData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Kunde inte starta trial');
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

  if (isCheckingTrial) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span>Kontrollerar trial-status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trial eller Price display */}
      {isEligibleForTrialState ? (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
          <div className="space-y-3">
            <div className="flex items-center">
              <Gift className="mr-2 h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">30 dagars gratis trial!</span>
            </div>
            <div className="text-sm text-green-700">
              Som ny användare får du prova vår tjänst gratis i 30 dagar. Ingen betalning krävs nu.
            </div>
            <div className="text-xs text-green-600">
              Efter trial-perioden kan du välja att fortsätta för {price.toFixed(2)} kr/år
            </div>
          </div>
        </div>
      ) : (
      <div className="bg-gray-50 p-6 rounded-lg border">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">Digital handbok</span>
            <span className="font-semibold">{price.toFixed(2)} kr</span>
          </div>
          <div className="flex justify-between text-gray-500 text-sm">
            <span>Årsabonnemang</span>
            <span>per förening</span>
          </div>
          <div className="border-t my-3"></div>
          <div className="flex justify-between font-semibold">
            <span>Totalt</span>
            <span>{price.toFixed(2)} kr</span>
          </div>
        </div>
        
        {isTestMode === true && (
          <div className="mt-4 bg-yellow-100 text-yellow-800 p-2 rounded text-sm">
            🧪 Testläge aktivt - använd kortnummer 4242 4242 4242 4242 för test
          </div>
        )}
        {!isTestMode && price < 10 && (
          <div className="bg-blue-100 text-blue-800 p-2 rounded text-sm mt-4">
            ⚠️ OBS! Detta är ett minimalt testbelopp för verifiering av betalflödet ({price.toFixed(2)} kr)
          </div>
        )}
      </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Handbokens namn
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="T.ex. Brf Solgläntan"
            className="w-full"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-1">
            Adressen till din handbok blir:
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 mr-1">handbok.org/handbook/</span>
            <Input
              id="subdomain"
              type="text"
              value={subdomain}
              onChange={handleSubdomainChange}
              placeholder="solgläntan"
              className={`w-full ${isSubdomainAvailable === true ? 'border-green-500' : isSubdomainAvailable === false ? 'border-red-500' : ''}`}
              disabled={isLoading}
            />
          </div>
          
          <div className="mt-2">
            {isCheckingSubdomain ? (
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 p-2 rounded">
                <Loader2 size={14} className="mr-2 animate-spin" />
                🔍 Kontrollerar om adressen är tillgänglig...
              </div>
            ) : isSubdomainAvailable === true ? (
              <div className="flex items-center text-sm text-green-600 bg-green-50 p-2 rounded">
                <CheckCircle2 size={14} className="mr-2" />
                ✅ Denna adress är tillgänglig och kan användas
              </div>
            ) : isSubdomainAvailable === false ? (
              <div className="flex items-center text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                <AlertCircle size={14} className="mr-2" />
                ❌ Denna adress är redan upptagen. Prova en annan.
              </div>
            ) : subdomain.length >= 2 ? (
              <div className="text-sm text-gray-500 p-2">
                💡 Skriv minst 2 tecken för att kontrollera tillgänglighet
              </div>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          className={`w-full text-white ${isEligibleForTrialState ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          disabled={isLoading || isSubdomainAvailable === false}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEligibleForTrialState ? 'Startar gratis trial...' : 'Förbereder betalning...'}
            </>
          ) : isEligibleForTrialState ? (
            <>
              <Gift className="mr-2 h-4 w-4" />
              Starta 30 dagars gratis trial
            </>
          ) : (
            'Gå vidare till betalning (2490 kr/år)'
          )}
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          Efter {isEligibleForTrialState ? 'trial-start' : 'betalning'} kommer din handbok att vara tillgänglig på{" "}
          <span className="font-medium">handbok.org/handbook/{subdomain || 'din-förening'}</span>
        </p>
      </form>
    </div>
  );
} 