import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function CreateHandbookForm() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState<boolean | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean | null>(null);
  const [price, setPrice] = useState<number>(995); // Default pris i kr

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
      const { data, error } = await supabase
        .from('handbooks')
        .select('subdomain')
        .eq('subdomain', value)
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows returned, subdomain is available
        setIsSubdomainAvailable(true);
      } else if (data) {
        // Subdomain exists
        setIsSubdomainAvailable(false);
      } else {
        // Other error
        setIsSubdomainAvailable(null);
      }
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
      // Redirect to Stripe checkout instead of directly creating handbook
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
              pages: [
                {
                  title: "Översikt",
                  content: "Välkommen till din digitala handbok! Här hittar du all viktig information om din bostadsrättsförening."
                }
              ]
            },
            {
              title: "Kontaktuppgifter",
              description: "Viktiga kontakter och information",
              pages: [
                {
                  title: "Förvaltning",
                  content: "Kontaktuppgifter till förvaltningsbolaget."
                },
                {
                  title: "Styrelse",
                  content: "Här hittar du kontaktuppgifter till styrelsen."
                }
              ]
            },
            {
              title: "Regler och ordningsföreskrifter",
              description: "Föreningens regler och bestämmelser",
              pages: [
                {
                  title: "Ordningsföreskrifter",
                  content: "Föreningens ordningsföreskrifter och regler för boende."
                }
              ]
            },
            {
              title: "Ekonomi",
              description: "Ekonomisk information och avgifter",
              pages: [
                {
                  title: "Avgifter",
                  content: "Information om månadsavgifter och andra kostnader."
                }
              ]
            },
            {
              title: "Underhåll och reparationer",
              description: "Information om underhåll och felanmälan",
              pages: [
                {
                  title: "Felanmälan",
                  content: "Så här anmäler du fel och skador."
                }
              ]
            },
            {
              title: "Gemensamma utrymmen",
              description: "Tvättstuga, förråd och andra faciliteter",
              pages: [
                {
                  title: "Tvättstuga",
                  content: "Regler och bokning av tvättstuga."
                }
              ]
            }
          ]
        }
      };

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

    } catch (error) {
      console.error("Fel vid skapande av checkout-session:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Ett fel uppstod vid skapande av handbok";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Price display */}
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
            <span className="text-gray-500 mr-1">www.handbok.org/</span>
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
          
          <div className="mt-1">
            {isCheckingSubdomain ? (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 size={14} className="mr-1 animate-spin" />
                Kontrollerar tillgänglighet...
              </div>
            ) : isSubdomainAvailable === true ? (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle2 size={14} className="mr-1" />
                Denna adress är tillgänglig
              </div>
            ) : isSubdomainAvailable === false ? (
              <div className="flex items-center text-sm text-red-600">
                <AlertCircle size={14} className="mr-1" />
                Denna adress är upptagen. Vänligen välj en annan.
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading || isSubdomainAvailable === false}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Förbereder betalning...
            </>
          ) : (
            'Gå vidare till betalning (990 kr/år)'
          )}
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          Efter betalning kommer din handbok att vara tillgänglig på{" "}
          <span className="font-medium">https://www.handbok.org/{subdomain || 'din-förening'}</span>
        </p>
      </form>
    </div>
  );
} 