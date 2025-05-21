'use client';

import Link from 'next/link';

interface MainFooterProps {
  variant?: 'landing' | 'app';
}

export function MainFooter({ variant = 'landing' }: MainFooterProps) {
  return (
    <footer className={`${variant === 'landing' ? 'bg-white' : 'bg-gray-50'} border-t`} aria-label="Sidfot">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:justify-start">
            <Link 
              href="/landing" 
              className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
              aria-label="Handbok.org startsida"
            >
              Handbok.org
            </Link>
          </div>
          
          {variant === 'landing' && (
            <nav className="mt-8 md:mt-0 flex justify-center md:justify-end space-x-8" aria-label="Sidfotsnavigation">
              <Link href="/privacy" className="text-gray-500 hover:text-gray-700">
                Integritetspolicy
              </Link>
              <Link href="/terms" className="text-gray-500 hover:text-gray-700">
                Användarvillkor
              </Link>
              <Link href="/contact" className="text-gray-500 hover:text-gray-700">
                Kontakt
              </Link>
            </nav>
          )}
          
          <div className="mt-8 md:mt-0">
            <p className="text-center md:text-right text-base text-gray-500">
              &copy; {new Date().getFullYear()} Handbok.org. Alla rättigheter förbehållna.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 