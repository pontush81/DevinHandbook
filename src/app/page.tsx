"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import AutoSuggestHandbookSearch from '@/components/AutoSuggestHandbookSearch';
import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const dynamic = 'force-dynamic';

// Pilotkund-formulär komponent
function PilotRequestForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/pilot-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ett fel uppstod');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod. Försök igen senare.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">Tack för ditt intresse!</h3>
        <p className="text-green-700">Vi har mottagit din förfrågan och kommer att kontakta dig inom 24 timmar.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-2xl mx-auto" suppressHydrationWarning>
      <h3 className="text-xl font-semibold mb-6 text-gray-900 text-center">Ansök som pilotkund</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Namn *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ditt namn"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            E-post *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="din@email.se"
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
          Organisation/Förening *
        </label>
        <input
          type="text"
          id="organization"
          name="organization"
          required
          value={formData.organization}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="BRF Solgläntan"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Meddelande (valfritt)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          value={formData.message}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Berätta gärna om era behov och förväntningar..."
        />
      </div>

      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
      >
        {isSubmitting ? 'Skickar...' : '🚀 Skicka ansökan'}
      </Button>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Vi hör av oss inom 24 timmar • Inga förpliktelser
      </p>
    </form>
  );
}

// SEO-vänlig FAQ-komponent
function SEOFriendlyFAQ({ faqs }: { 
  faqs: Array<{ 
    question: string; 
    answer: string; 
    category?: string;
    keywords?: string[];
    priority?: number;
  }> 
}) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div key={index} id={`faq-${index + 1}`} className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => toggleItem(index)}
            aria-expanded={openItems.has(index)}
          >
            <div className="pr-4">
              {/* Removed blue category boxes as requested */}
              {/* {faq.category && (
                <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mb-2">
                  {faq.category}
                </span>
              )} */}
              <h3 className="text-lg font-semibold text-gray-900">
                {faq.question}
              </h3>
            </div>
            <ChevronDownIcon 
              className={`h-5 w-5 text-gray-500 transition-transform flex-shrink-0 ${
                openItems.has(index) ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          {/* Innehåll alltid i DOM för SEO, men visuellt dolt */}
          <div 
            className={`overflow-hidden transition-all duration-200 ${
              openItems.has(index) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 pb-6 text-gray-600 leading-relaxed faq-answer">
              {faq.answer}
            </div>
          </div>
          
          {/* Dolt innehåll för sökmotorer - alltid synligt för crawlers */}
          <div className="sr-only">
            {faq.answer}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { user, isLoading } = useAuth();

  const faqs = [
    {
      question: "Vad är en digital bostadsrättsföreningshandbok?",
      answer: "En digital handbok för bostadsrättsföreningar är en webbaserad plattform där viktig information om föreningen samlas. T.ex stadgar, regler, kontaktuppgifter och annan information som medlemmar behöver ha tillgång till.",
      category: "Grundläggande",
      keywords: ["digital handbok", "bostadsrättsförening", "webbaserad plattform", "föreningsinformation"],
      priority: 1
    },
    {
      question: "Hur skapar jag en handbok för min förening?",
      answer: "Det är enkelt! Klicka på 'Skapa konto & handbok' om du är ny användare, eller 'Skapa ny handbok' om du redan har ett konto. Följ den guidade processen, ange föreningens namn och välj ett unikt namn. Du får 30 dagar gratis trial, sedan kan du välja att betala för att fortsätta.",
      category: "Komma igång",
      keywords: ["skapa handbok", "registrering", "30 dagar gratis", "trial"],
      priority: 2
    },
    {
      question: "Vad kostar tjänsten?",
      answer: "Vi håller på att sätta ett rättvist pris som passar alla typer av bostadsrättsföreningar. Priset kommer att meddelas inom kort.",
      category: "Prissättning",
              keywords: ["pris", "kostnad", "rättvist pris", "årskostnad", "kommer snart"],
      priority: 3
    },
    {
      question: "Kan jag prova innan jag betalar?",
      answer: "Ja! Vi har en 30-dagars prova-på period",
      category: "Prissättning",
      keywords: ["gratis provperiod", "pengarna tillbaka", "30 dagar", "garanti"],
      priority: 4
    },
    {
      question: "Kan jag skapa flera handböcker?",
      answer: "Ja! Du kan skapa så många handböcker du vill. Varje handbok har sin egen 30-dagars trial och betalas separat. Detta är perfekt om du är involverad i flera föreningar eller vill testa olika uppsättningar.",
      category: "Användning",
      keywords: ["flera handböcker", "multiple", "separat betalning", "olika föreningar"],
      priority: 5
    },
    {
      question: "Hur kommer medlemmarna åt handboken?",
      answer: "Medlemmarna besöker enkelt handboken via adressen handbok.org/föreningsnamn. Ingen inloggning behövs, men känsligt innehåll kan lösenordsskyddas.",
      category: "Användning",
      keywords: ["tillgång", "URL", "handbok.org", "inloggning", "lösenordsskydd"],
      priority: 6
    }
  ];

  return (
    <MainLayout variant="landing" showHeader={true} noWhiteTop={false}>
      {/* Under utveckling banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-amber-700 font-medium text-sm">
                🚧 Under utveckling
              </span>
            </div>
            <span className="text-amber-600 text-sm">
              • Tjänsten är fortfarande i utvecklingsfas
            </span>
          </div>
        </div>
      </div>

      {/* Hero section */}
      <section className="pt-8 pb-12 md:pt-12 md:pb-16 lg:pt-16 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                Digital handbok för din bostadsrättsförening
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mb-6 md:mb-8 leading-relaxed">
                Skapa en professionell digital handbok 
                som alltid är uppdaterad och tillgänglig för alla medlemmar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" asChild>
                  {user ? (
                    <Link href="/create-handbook?new=true">🚀 Skapa ny handbok</Link>
                  ) : (
                    <Link href="/signup">Skapa konto & handbok</Link>
                  )}
                </Button>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300" asChild>
                  <Link href="#pilot-signup">🚀 Bli pilotkund</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl mt-8 md:mt-0">
              <div className="relative h-48 sm:h-64 md:h-96 bg-white border border-gray-200">
                <div className="absolute inset-0">
                  {/* Header mockup */}
                  <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="bg-gray-100 rounded px-3 py-1 text-xs text-gray-600">
                        handbok.org/solgläntan
                      </div>
                    </div>
                  </div>
                  
                  {/* App header mockup */}
                  <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">🏠</div>
                      <span className="font-semibold text-gray-900 text-sm">Brf Solgläntan</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-gray-100 rounded-full px-3 py-1 text-xs text-gray-500 flex items-center">
                        <span className="mr-1">🔍</span>
                        <span>Sök...</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Main content area */}
                  <div className="flex h-full">
                    {/* Sidebar mockup */}
                    <div className="w-48 bg-gray-50 border-r border-gray-200 p-3">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 p-2 bg-blue-100 rounded-lg">
                          <span className="text-blue-600 text-xs">📋</span>
                          <div>
                            <div className="text-xs font-medium text-blue-900">Stadgar & Regler</div>
                            <div className="text-xs text-blue-600">Grundläggande info</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <span className="text-gray-600 text-xs">👥</span>
                          <div>
                            <div className="text-xs font-medium text-gray-700">Kontakter</div>
                            <div className="text-xs text-gray-500">Kontakter</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <span className="text-gray-600 text-xs">💰</span>
                          <div>
                            <div className="text-xs font-medium text-gray-700">Ekonomi</div>
                            <div className="text-xs text-gray-500">Avgifter & budget</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content area mockup */}
                    <div className="flex-1 p-4 bg-gray-50">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-blue-600">📋</span>
                          <h3 className="font-semibold text-gray-900 text-sm">Stadgar & Regler</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-200 rounded w-full"></div>
                          <div className="h-2 bg-gray-200 rounded w-4/5"></div>
                          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="bg-blue-50 rounded p-2">
                            <div className="text-xs font-medium text-blue-900">Snabbinfo</div>
                            <div className="text-xs text-blue-600 mt-1">Viktiga regler</div>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <div className="text-xs font-medium text-green-900">Kontakt</div>
                            <div className="text-xs text-green-600 mt-1">08-123 45 67</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search section */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 md:mb-4">
              Är din förening redan med?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 text-center">
              Sök efter din bostadsrättsförening för att få direkt tillgång till er digitala handbok.
            </p>
          </div>
          
          <div className="max-w-xl mx-auto">
            <AutoSuggestHandbookSearch hideHeader={false} />
          </div>
          
          <div className="text-center mt-8">
            <p className="text-gray-600 text-sm mb-4">
              Saknas din förening?
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/create-handbook?new=true">
                🚀 Skapa en handbok här
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Fördelar med en digital handbok</h2>
            <p className="mt-3 md:mt-4 text-base sm:text-lg text-gray-600 text-center">
              Enkel tillgång till viktig information för alla medlemmar i föreningen
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="rounded-lg p-6 shadow">
              <div className="h-12 w-12 rounded-md flex items-center justify-center mb-4 bg-muted">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Tillgänglig dygnet runt</h3>
              <p>
                Medlemmarna har tillgång till all information dygnet runt, från vilken enhet som helst.
              </p>
            </div>
            
            <div className="rounded-lg p-6 shadow">
              <div className="h-12 w-12 rounded-md flex items-center justify-center mb-4 bg-muted">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Alltid uppdaterad</h3>
              <p>
                Uppdatera informationen enkelt. Medlemmarna ser alltid den senaste versionen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Transparent och rättvis prissättning</h2>
            <p className="mt-3 md:mt-4 text-base sm:text-lg text-gray-600 text-center">
              Vi arbetar för att sätta ett pris som fungerar för alla föreningar, stora som små.
            </p>
          </div>
          
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-8 bg-blue-600 sm:p-10 sm:pb-6">
                <div className="flex justify-center">
                  <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-white text-blue-600">
                    Årsabonnemang
                  </span>
                </div>
                <div className="mt-4 flex justify-center">
                  <span className="text-5xl font-extrabold text-white">Kommer snart</span>
                  <span className="ml-1 text-xl font-semibold text-blue-100 self-end"></span>
                </div>
                <p className="mt-4 text-lg text-center text-blue-100">
                  Vi sätter ett rättvist pris som passar alla
                </p>
              </div>
              <div className="px-6 pt-6 pb-8 bg-white sm:p-10">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base">
                      <span className="font-medium">Egen URL</span> - handbok.org/föreningsnamn
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base">
                      <span className="font-medium">Obegränsat innehåll</span> - lägg in så mycket information ni behöver
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base">
                      <span className="font-medium">Automatisk säkerhetskopiering</span> - dina data är alltid säkra
                    </p>
                  </li>
                </ul>
                <div className="mt-8">
                  <Link
                    href="/create-handbook"
                    className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Testa gratis nu
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pilot Customer Section */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-blue-50 to-indigo-50" id="pilot-signup">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Vill du vara pilotkund?
            </h2>
            <div className="flex justify-center">
              <p className="text-gray-600 text-base md:text-lg max-w-2xl text-center">
                Som pilotkund får du tillgång till vår plattform i förväg och kan påverka utvecklingen.
              </p>
            </div>
          </div>
          
          {/* Pilotkund-formulär */}
          <PilotRequestForm />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 md:mb-12">Vanliga frågor</h2>
          
          {/* SEO-optimerad FAQ - allt innehåll synligt för sökmotorer */}
          <SEOFriendlyFAQ faqs={faqs} />
          
          {/* Förbättrad Schema.org strukturerade data för optimal SEO */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "name": "Vanliga frågor om Handbok.org - Digital handbok för bostadsrättsföreningar",
                "description": "Få svar på vanliga frågor om hur du skapar och använder digitala handböcker för bostadsrättsföreningar.",
                "url": "https://handbok.org/#faq",
                "inLanguage": "sv-SE",
                "datePublished": "2024-01-01",
                "dateModified": new Date().toISOString().split('T')[0],
                "publisher": {
                  "@type": "Organization",
                  "name": "Handbok.org",
                  "url": "https://handbok.org",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://handbok.org/logo.png"
                  }
                },
                "author": {
                  "@type": "Organization", 
                  "name": "Handbok.org",
                  "url": "https://handbok.org"
                },
                "mainEntity": faqs.map((faq, index) => ({
                  "@type": "Question",
                  "name": faq.question,
                  "text": faq.question,
                  "answerCount": 1,
                  "upvoteCount": Math.max(10 - index * 2, 1),
                  "dateCreated": "2024-01-01",
                  "author": {
                    "@type": "Organization",
                    "name": "Handbok.org"
                  },
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": faq.answer,
                    "dateCreated": "2024-01-01",
                    "upvoteCount": Math.max(8 - index, 1),
                    "url": `https://handbok.org/#faq-${index + 1}`,
                    "author": {
                      "@type": "Organization",
                      "name": "Handbok.org"
                    }
                  },
                  "keywords": faq.keywords?.join(", "),
                  "about": {
                    "@type": "Thing",
                    "name": faq.category
                  }
                })),
                "breadcrumb": {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Hem",
                      "item": "https://handbok.org"
                    },
                    {
                      "@type": "ListItem", 
                      "position": 2,
                      "name": "Vanliga frågor",
                      "item": "https://handbok.org/#faq"
                    }
                  ]
                },
                "speakable": {
                  "@type": "SpeakableSpecification",
                  "cssSelector": ["h2", "h3", ".faq-answer"]
                }
              })
            }}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
              Redo att förenkla informationsdelningen?
            </h2>
            <p className="mt-3 md:mt-4 text-base sm:text-lg leading-6">
              Skapa er digitala handbok på mindre än 10 minuter.
            </p>
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <div className="inline-flex rounded-md shadow">
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white" asChild>
                  <Link href="/create-handbook?new=true">
                    Skapa handbok nu
                  </Link>
                </Button>
              </div>
              <div className="inline-flex">
                <Button variant="secondary" className="w-full sm:w-auto" asChild>
                  <Link href="/contact">
                    Kontakta oss
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Login Link */}
      <div className="text-center pb-8">
        <p className="text-sm text-gray-600">
          Har du redan ett konto?{" "}
          <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
            Logga in här
          </a>
        </p>
      </div>
    </MainLayout>
  );
}
