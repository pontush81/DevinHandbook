'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ContactForm from './ContactForm';

export default function ContactClient() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const handleFormSubmit = async (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ett oväntat fel uppstod');
      }

      console.log('[Contact] Meddelande skickat framgångsrikt:', result);
      setFormSubmitted(true);
    } catch (error) {
      console.error('[Contact] Fel vid skickning av meddelande:', error);
      setSubmitError(error instanceof Error ? error.message : 'Ett oväntat fel uppstod');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      {formSubmitted ? (
        <div className="text-center py-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tack för ditt meddelande!</h2>
          <p className="text-gray-600 mb-6">
            Vi har mottagit din kontaktförfrågan och kommer att återkomma till dig så snart som möjligt.
            Du får även ett bekräftelsemail på den angivna e-postadressen.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Tillbaka till startsidan
          </Link>
        </div>
      ) : (
        <div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Kontakta oss</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Har du frågor om Handbok.org eller behöver hjälp? Fyll i formuläret nedan så återkommer vi till dig så snart som möjligt.
            </p>
          </div>
          
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Fel vid skickning av meddelande
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {submitError}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <ContactForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
        </div>
      )}
    </>
  );
} 