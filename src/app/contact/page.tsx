'use client';

import Link from 'next/link';
import { useState } from 'react';
import ContactForm from './ContactForm';

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  const handleFormSubmit = (formData: any) => {
    console.log('Form data:', formData);
    setFormSubmitted(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/landing" className="text-2xl font-bold text-blue-600">Handbok.org</Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="/landing#features" className="text-gray-700 hover:text-blue-600">Funktioner</Link>
            <Link href="/landing#pricing" className="text-gray-700 hover:text-blue-600">Pris</Link>
            <Link href="/landing#faq" className="text-gray-700 hover:text-blue-600">Vanliga frågor</Link>
            <Link href="/contact" className="text-blue-600 font-medium">Kontakt</Link>
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

      <main className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Kontakta oss
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Har du frågor eller funderingar? Vi hjälper dig gärna!
            </p>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {formSubmitted ? (
                <div className="text-center py-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tack för ditt meddelande!</h2>
                  <p className="text-gray-600 mb-6">Vi återkommer till dig så snart som möjligt.</p>
                  <Link 
                    href="/landing" 
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Tillbaka till startsidan
                  </Link>
                </div>
              ) : (
                <ContactForm onSubmit={handleFormSubmit} />
              )}
            </div>
          </div>
          
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">Kontaktuppgifter</h3>
                <div className="mt-5 space-y-3">
                  <p className="text-sm text-gray-500">
                    <strong>E-post:</strong> info@handbok.org
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Telefon:</strong> 08-123 45 67
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Adress:</strong> Exempelgatan 123, 123 45 Stockholm
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">Supporthours</h3>
                <div className="mt-5 space-y-3">
                  <p className="text-sm text-gray-500">
                    <strong>Vardagar:</strong> 08:00 - 17:00
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Helger:</strong> Stängt
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    Vi strävar efter att svara på alla förfrågningar inom 24 timmar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
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