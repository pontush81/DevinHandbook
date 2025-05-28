import React from "react";
import { Metadata } from 'next';
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from 'react-error-boundary';
import { headers } from 'next/headers';

function ErrorFallback({error, resetErrorBoundary}: {error: Error, resetErrorBoundary: () => void}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Något gick fel</h2>
        <p className="text-gray-600 mb-6">Ett oväntat fel inträffade när handboken laddades.</p>
        <button 
          onClick={resetErrorBoundary}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Försök igen
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">Teknisk information</summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Force dynamic rendering and disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Handbook layout error:', error, errorInfo);
      }}
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </ErrorBoundary>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Handbok - Bostadsrättsförening',
    description: 'Digital handbok för bostadsrättsförening',
  };
} 