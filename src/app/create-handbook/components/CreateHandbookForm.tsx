import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Schema för validering av formulärdata
const formSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Handbokens namn måste vara minst 2 tecken.",
    })
    .max(50, {
      message: "Handbokens namn får inte vara längre än 50 tecken.",
    }),
  subdomain: z
    .string()
    .min(2, {
      message: "Subdomänen måste vara minst 2 tecken.",
    })
    .max(30, {
      message: "Subdomänen får inte vara längre än 30 tecken.",
    })
    .regex(/^[a-z0-9]+$/, {
      message: "Subdomänen får endast innehålla små bokstäver och siffror.",
    }),
});

export function CreateHandbookForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState(true);
  const [isSubdomainChecking, setIsSubdomainChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);

  // Konfigurera formuläret
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subdomain: "",
    },
  });

  // Kontrollera subdomän vid ändring
  const checkSubdomain = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 2) return;
    
    setIsSubdomainChecking(true);
    
    try {
      const { data, error } = await supabase
        .from("handbooks")
        .select("subdomain")
        .eq("subdomain", subdomain)
        .maybeSingle();

      setIsSubdomainAvailable(!data);
      
      if (data) {
        form.setError("subdomain", {
          type: "manual",
          message: "Denna subdomän är redan tagen.",
        });
      } else {
        form.clearErrors("subdomain");
      }
    } catch (error) {
      console.error("Fel vid kontroll av subdomän:", error);
    } finally {
      setIsSubdomainChecking(false);
    }
  };

  // Visa animerad progress under skapande
  const simulateCreationProgress = () => {
    // Simulera framsteg på ett realistiskt sätt
    const interval = setInterval(() => {
      setCreationProgress(prev => {
        // Öka snabbt till 70%, sedan långsammare
        const increment = prev < 70 ? 15 : 5;
        const newValue = Math.min(prev + increment, 95);
        
        // Stoppa vid 95% och låt redirecten ta hand om slutet
        if (newValue >= 95) {
          clearInterval(interval);
        }
        
        return newValue;
      });
    }, 800);

    return () => clearInterval(interval);
  };

  // Skicka formuläret
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: "Du måste vara inloggad för att skapa en handbok",
        variant: "destructive",
      });
      return;
    }

    if (!isSubdomainAvailable) {
      toast({
        title: "Subdomänen är redan tagen",
        description: "Välj en annan subdomän.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    // Starta simulering av framsteg
    const clearSimulation = simulateCreationProgress();

    try {
      // Redirect to Stripe checkout instead of directly creating handbook
      const handbookData = {
        name: values.name,
        subdomain: values.subdomain,
        userId: user.id,  // Include userId here
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
        body: JSON.stringify(handbookData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte skapa checkout-session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;

    } catch (error) {
      console.error("Fel vid skapande av checkout-session:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Ett fel uppstod vid skapande av handbok";
      
      toast({
        title: "Något gick fel",
        description: errorMessage,
        variant: "destructive",
      });
      
      setIsCreating(false);
      clearSimulation(); // Stoppa simuleringen
      setCreationProgress(0);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {isCreating ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-6">
            <motion.div 
              className="text-center space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-2xl font-semibold tracking-tight">Skapar din handbok...</h3>
              <p className="text-sm text-muted-foreground">
                Vi håller på att förbereda din handbok. Detta kan ta några ögonblick.
              </p>
            </motion.div>
            
            <div className="w-full max-w-md">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: "5%" }}
                  animate={{ width: `${creationProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-center text-sm mt-2 text-muted-foreground">{creationProgress}% klart</p>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin h-4 w-4" />
              <span>Skapar innehåll och förbereder din domän...</span>
            </div>
          </div>
        ) : (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handbokens namn</FormLabel>
                  <FormControl>
                    <Input placeholder="T.ex. Brf Solen" {...field} />
                  </FormControl>
                  <FormDescription>
                    Detta är namnet på din handbok. Du kan ändra detta senare.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subdomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subdomän</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Input 
                        placeholder="förening" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          checkSubdomain(e.target.value);
                        }}
                        className={cn(
                          "rounded-r-none",
                          !isSubdomainAvailable && "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                      <div className="h-10 px-3 inline-flex items-center border border-l-0 border-input rounded-r-md bg-muted text-muted-foreground">
                        .handbok.org
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Detta blir adressen till din handbok. Kan inte ändras senare.
                    {isSubdomainChecking && <span className="ml-2 text-muted-foreground italic">Kontrollerar tillgänglighet...</span>}
                    {!isSubdomainChecking && isSubdomainAvailable && field.value.length >= 2 && (
                      <span className="ml-2 text-green-600">✓ Tillgänglig</span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isCreating || isSubdomainChecking || !isSubdomainAvailable}>
              Fortsätt till betalning (990 kr/år)
            </Button>
          </>
        )}
      </form>
    </Form>
  );
} 