"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MainLayout } from '@/components/layout/MainLayout';
import AutoSuggestHandbookSearch from '@/components/AutoSuggestHandbookSearch';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const faqs = [
    {
      question: "Vad är en digital bostadsrättsföreningshandbok?",
      answer: "En digital handbok för bostadsrättsföreningar är en webbaserad plattform där all viktig information om föreningen samlas. Här finns stadgar, regler, kontaktuppgifter, felanmälan och annan information som medlemmar behöver ha tillgång till."
    },
    {
      question: "Hur skapar jag en handbok för min förening?",
      answer: "Det är enkelt! Klicka på 'Skapa handbok' ovan, följ den guidade processen, ange föreningens namn och välj en unik subdomän. Efter betalning kan du börja fylla din handbok med innehåll."
    },
    {
      question: "Vad kostar tjänsten?",
      answer: "Tjänsten kostar 990 kr per år för en förening, oavsett storlek. I priset ingår obegränsad lagring, egen subdomän, säkerhetskopiering och support."
    },
    {
      question: "Kan jag prova innan jag betalar?",
      answer: "Vi erbjuder en 30-dagars pengarna-tillbaka-garanti om du inte är nöjd med tjänsten. Du kan testa alla funktioner under denna period."
    },
    {
      question: "Hur kommer medlemmarna åt handboken?",
      answer: "Medlemmarna besöker enkelt handboken via adressen föreningsnamn.handbok.org eller via vår nya adress handbok.org/view?company=föreningsnamn. Ingen inloggning behövs, men känsligt innehåll kan lösenordsskyddas."
    }
  ];

  return (
    <MainLayout variant="landing" showHeader={true} noWhiteTop={false}>
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
                  <Link href="/create-handbook?new=true">Kom igång nu</Link>
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
                        www.handbok.org/solgläntan
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
                      <div className="bg-blue-100 text-blue-700 rounded px-2 py-1 text-xs font-medium">📞 Support</div>
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
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Sök efter din bostadsrättsförening för att få direkt tillgång till er digitala handbok.
            </p>
          </div>
          
          <div className="max-w-xl mx-auto">
            <AutoSuggestHandbookSearch hideHeader={false} />
          </div>
          
          <div className="text-center mt-8">
            <p className="text-gray-600 text-sm">
              Saknas din förening? 
              <Link href="/create-handbook?new=true" className="text-blue-600 hover:text-blue-700 font-medium hover:underline ml-1">
                Skapa en handbok här
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Fördelar med en digital handbok</h2>
            <p className="mt-3 md:mt-4 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto px-4">
              Enkel tillgång till viktig information för alla medlemmar i föreningen
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
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
            
            <div className="rounded-lg p-6 shadow">
              <div className="h-12 w-12 rounded-md flex items-center justify-center mb-4 bg-muted">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Säkert och pålitligt</h3>
              <p>
                Känslig information kan lösenordsskyddas. All data säkerhetskopieras automatiskt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Enkelt och förutsägbart pris</h2>
            <p className="mt-3 md:mt-4 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto px-4">
              Ingen krånglig prissättning. En fast årskostnad för obegränsad användning.
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
                  <span className="text-5xl font-extrabold text-white">990 kr</span>
                  <span className="ml-1 text-xl font-semibold text-blue-100 self-end">/år</span>
                </div>
                <p className="mt-4 text-lg text-center text-blue-100">
                  per förening, oavsett storlek
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
                      <span className="font-medium">Egen URL</span> - www.handbok.org/föreningsnamn eller föreningsnamn.handbok.org
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
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base">
                      <span className="font-medium">Support</span> - vi finns här om ni behöver hjälp
                    </p>
                  </li>
                </ul>
                <div className="mt-8">
                  <Link
                    href="/create-handbook"
                    className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Kom igång nu
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 md:mb-12">Vanliga frågor</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Vad ingår i priset på 990 kr/år?</AccordionTrigger>
              <AccordionContent>
                I priset ingår en komplett digital handbok med egen subdomän (t.ex. dinforening.handbok.org), 
                obegränsad lagring, automatiska säkerhetskopior, SSL-certifikat, och fullständig support. 
                Inga dolda kostnader eller begränsningar i antal användare.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Hur snabbt kan vi komma igång?</AccordionTrigger>
              <AccordionContent>
                Din handbok är redo att användas inom 24 timmar efter beställning. Du får inloggningsuppgifter 
                och kan börja lägga in information direkt. Vi hjälper gärna till med överföring av befintligt material.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Kan medlemmarna redigera innehållet?</AccordionTrigger>
              <AccordionContent>
                Endast administratörer (vanligtvis styrelsen) kan redigera innehållet. Medlemmarna har läsåtkomst till 
                den information som gjorts tillgänglig för dem. Du bestämmer själv vilka sektioner som ska vara 
                publika eller kräva inloggning.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Vad händer med våra dokument om vi slutar använda tjänsten?</AccordionTrigger>
              <AccordionContent>
                All din data exporteras och skickas till dig innan kontot stängs. Vi sparar även en säkerhetskopia 
                i 90 dagar så du kan återaktivera tjänsten utan att förlora information om du ångrar dig.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>Är det säkert att lagra känsliga dokument?</AccordionTrigger>
              <AccordionContent>
                Ja, vi använder bankstandard säkerhet med SSL-kryptering, regelbundna säkerhetskopior och 
                serverlagring i Sverige enligt GDPR. Du kan också sätta lösenordsskydd på känsliga sektioner.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger>Kan vi byta subdomän senare?</AccordionTrigger>
              <AccordionContent>
                Ja, du kan byta subdomän en gång per år utan extra kostnad. Kontakta vår support för att 
                genomföra ändringen. Vi hjälper till att säkerställa att övergången sker smidigt.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-7">
              <AccordionTrigger>Får vi support och hjälp?</AccordionTrigger>
              <AccordionContent>
                Ja, fullständig support ingår i priset. Vi hjälper till med installation, överföring av befintligt 
                material, utbildning av administratörer och löser tekniska problem. Kontakta oss på info@handbok.org 
                eller via telefon.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-8">
              <AccordionTrigger>Vilka URL-format kan vi använda för vår handbok?</AccordionTrigger>
              <AccordionContent>
                Vi stödjer båda URL-formaten för maximal flexibilitet: <br/>
                • <strong>Path-baserad:</strong> www.handbok.org/dinforening <br/>
                • <strong>Subdomän:</strong> dinforening.handbok.org <br/>
                Båda leder till samma handbok och fungerar lika bra. Du kan använda det format som passar er bäst 
                eller dela båda med era medlemmar.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
              Redo att förenkla informationsdelningen?
            </h2>
            <p className="mt-3 md:mt-4 text-base sm:text-lg leading-6 px-4">
              Skapa er digitala handbok på mindre än 10 minuter. Komma igång direkt!
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
