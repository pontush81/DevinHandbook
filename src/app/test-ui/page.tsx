'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';

export default function TestUI() {
  const [host, setHost] = useState('');

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  return (
    <MainLayout variant="app" showAuth={false}>
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900">Testmiljö</h1>
            <p className="mt-4 text-lg text-gray-600">
              Denna sida används för att testa och utveckla nya funktioner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Miljöinformation</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Miljö:</strong> Test</div>
                <div><strong>Stripe-läge:</strong> Testläge</div>
                <div><strong>Branch:</strong> staging</div>
                <div><strong>Domän:</strong> {host}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 