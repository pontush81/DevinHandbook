'use client';

import React, { useState } from 'react';
import { TrialStatusBar } from '@/components/trial/TrialStatusBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestTrialPage() {
  const [testUserId] = useState('123e4567-e89b-12d3-a456-426614174000');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Trial Status Bar Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-600">
              Denna sida testar trial-statusbaren i olika tillstånd. 
              Logga in för att se trial-status för din användare.
            </p>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Demo Trial Status Bar</h3>
              <TrialStatusBar 
                userId={testUserId}
                className="border"
                onUpgrade={() => {
                  alert('Uppgradering klickad!');
                }}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Vad händer:</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Om användaren har en aktiv trial: Grön bar med dagar kvar</li>
                <li>Om trial snart går ut (≤3 dagar): Gul varningsbar</li>
                <li>Om trial har gått ut: Röd varningsbar</li>
                <li>Om ingen trial: Inget visas</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Uppdatera sidan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 