'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function LandingPage() {
  const [visibleFaq, setVisibleFaq] = useState<number | null>(null);
  
  const toggleFaq = (index: number) => {
    if (visibleFaq === index) {
      setVisibleFaq(null);
    } else {
      setVisibleFaq(index);
    }
  };
  
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
      answer: "Vi har tyvärr ingen gratis provperiod, men erbjuder en 30-dagars pengarna-tillbaka-garanti om du inte är nöjd med tjänsten."
    },
    {
      question: "Hur kommer medlemmarna åt handboken?",
      answer: "Medlemmarna besöker enkelt handboken via adressen föreningsnamn.handbok.org eller via vår nya adress handbok.org/view?company=föreningsnamn. Ingen inloggning behövs, men känsligt innehåll kan lösenordsskyddas."
    }
  ];
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">Handbok.org</h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-700 hover:text-blue-600">Funktioner</a>
            <a href="#pricing" className="text-gray-700 hover:text-blue-600">Pris</a>
            <a href="#faq" className="text-gray-700 hover:text-blue-600">Vanliga frågor</a>
          </nav>
          <div>
            <Link 
              href="/create-handbook" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Skapa handbok
            </Link>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
                Digital handbok för din bostadsrättsförening
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Samla all viktig information på ett ställe. Tillgängligt för alla medlemmar, när som helst och var som helst.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/create-handbook" 
                  className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Skapa handbok nu
                </Link>
                <Link 
                  href="/demo" 
                  className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Se demo
                </Link>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl">
              <div className="relative h-64 md:h-96 bg-gray-200">
                {/* Ersätt detta med en faktisk skärmdump eller illustration av er tjänst */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <div className="bg-white p-8 rounded-lg shadow-inner w-full max-w-md">
                    <h3 className="text-xl font-semibold mb-4">Bostadsrättsföreningen Solgläntan</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center space-x-3">
                        <span className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 text-xs">✓</span>
                        </span>
                        <span>Stadgar & Regler</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 text-xs">✓</span>
                        </span>
                        <span>Styrelsen & Kontakter</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 text-xs">✓</span>
                        </span>
                        <span>Felanmälan</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 text-xs">✓</span>
                        </span>
                        <span>Medlemsinformation</span>
                      </li>
                    </ul>
                    <div className="mt-4 text-sm text-gray-500">solgläntan.handbok.org</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Fördelar med en digital handbok</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Enkel tillgång till viktig information för alla medlemmar i föreningen
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="h-12 w-12 rounded-md bg-blue-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Tillgänglig dygnet runt</h3>
              <p className="text-gray-600">
                Medlemmarna har tillgång till all information dygnet runt, från vilken enhet som helst.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="h-12 w-12 rounded-md bg-blue-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Alltid uppdaterad</h3>
              <p className="text-gray-600">
                Uppdatera informationen enkelt. Medlemmarna ser alltid den senaste versionen.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="h-12 w-12 rounded-md bg-blue-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Säkert och pålitligt</h3>
              <p className="text-gray-600">
                Känslig information kan lösenordsskyddas. All data säkerhetskopieras automatiskt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Enkelt och förutsägbart pris</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
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
                      <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base text-gray-700">
                      <span className="font-medium text-gray-900">Egen subdomän</span> - föreningsnamn.handbok.org
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base text-gray-700">
                      <span className="font-medium text-gray-900">Obegränsat innehåll</span> - lägg in så mycket information ni behöver
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base text-gray-700">
                      <span className="font-medium text-gray-900">Automatisk säkerhetskopiering</span> - dina data är alltid säkra
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base text-gray-700">
                      <span className="font-medium text-gray-900">Support</span> - vi finns här om ni behöver hjälp
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
      <section id="faq" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Vanliga frågor</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Hittar du inte svaret på din fråga? Kontakta oss på <a href="mailto:info@handbok.org" className="text-blue-600 hover:underline">info@handbok.org</a>
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto divide-y divide-gray-200">
            {faqs.map((faq, index) => (
              <div key={index} className="py-6">
                <button
                  onClick={() => toggleFaq(index)}
                  className="flex justify-between items-center w-full text-left focus:outline-none"
                >
                  <h3 className="text-lg font-medium text-gray-900">{faq.question}</h3>
                  <span className="ml-6 h-7 flex items-center">
                    <svg
                      className={`${visibleFaq === index ? '-rotate-180' : 'rotate-0'} h-6 w-6 transform transition-transform duration-200 ease-in-out text-gray-500`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {visibleFaq === index && (
                  <div className="mt-2 prose prose-sm max-w-none text-gray-600">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Redo att förenkla informationsdelningen?
            </h2>
            <p className="mt-4 text-lg leading-6 text-blue-100">
              Skapa er digitala handbok på mindre än 10 minuter. Komma igång direkt!
            </p>
            <div className="mt-8 flex justify-center">
              <div className="inline-flex rounded-md shadow">
                <Link
                  href="/create-handbook"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                >
                  Skapa handbok nu
                </Link>
              </div>
              <div className="ml-3 inline-flex">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-800 hover:bg-blue-900"
                >
                  Kontakta oss
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:justify-start">
              <h2 className="text-xl font-bold text-blue-600">Handbok.org</h2>
            </div>
            <div className="mt-8 md:mt-0">
              <p className="text-center md:text-right text-base text-gray-500">
                &copy; {new Date().getFullYear()} Handbok.org. Alla rättigheter förbehållna.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 