"use client";

import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface ClientErrorBoundaryProps {
  children: React.ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Något gick fel</h2>
        <p className="text-gray-600 mb-6">
          Ett oväntat fel inträffade. Försök ladda om sidan.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Försök igen
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">Teknisk information</summary>
            <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">{error.message}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

export function ClientErrorBoundary({ children }: ClientErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
} 