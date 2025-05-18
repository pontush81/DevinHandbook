'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ContactForm from './ContactForm';

export default function ContactClient() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  const handleFormSubmit = (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    console.log('Form data:', formData);
    setFormSubmitted(true);
  };
  
  return (
    <>
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
    </>
  );
} 