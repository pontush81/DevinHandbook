'use client';

import Link from 'next/link';

interface MainFooterProps {
  variant?: 'landing' | 'app';
}

export function MainFooter({ variant = 'landing' }: MainFooterProps) {
  return (
    <footer className="bg-white py-8 border-t border-gray-100" aria-label="Sidfot">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0">
          <div className="text-center md:text-left">
            <Link 
              href="/landing" 
              className="text-lg font-medium text-gray-900 hover:text-gray-700 transition-colors"
              aria-label="Handbok.org startsida"
            >
              Handbok.org
            </Link>
          </div>
          
          {variant === 'landing' && (
            <nav className="flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-2 text-center" aria-label="Sidfotsnavigation">
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap">
                Integritetspolicy
              </Link>
              <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap">
                Användarvillkor
              </Link>
              <Link href="/cookie-policy" className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap">
                Cookiepolicy
              </Link>
              <Link href="/cookie-settings" className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap">
                Cookie-inställningar
              </Link>
              <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap">
                Kontakt
              </Link>
            </nav>
          )}
          
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Handbok.org. Alla rättigheter förbehållna.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 