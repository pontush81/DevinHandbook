'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { fetchWithAuth } from '@/lib/supabase';

interface DebugStep {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function JoinProcessDebugger() {
  const [joinCode, setJoinCode] = useState('IFR-306-LTC');
  const [steps, setSteps] = useState<DebugStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addStep = (step: string, status: 'pending' | 'success' | 'error', message: string, details?: any) => {
    setSteps(prev => [...prev, { step, status, message, details }]);
  };

  const runFullJoinTest = async () => {
    setIsRunning(true);
    setSteps([]);

    try {
      // Step 1: Validate join code
      addStep('1', 'pending', 'Validerar join-kod...');
      const validateResponse = await fetch(`/api/handbook/join?code=${encodeURIComponent(joinCode)}`);
      const validateData = await validateResponse.json();
      
      if (validateResponse.ok && validateData.success) {
        addStep('1', 'success', `Join-kod tillhör handbok: "${validateData.handbook.title}"`, validateData);
      } else {
        addStep('1', 'error', validateData.message || 'Join-kod validation misslyckades', validateData);
        setIsRunning(false);
        return;
      }

      // Step 2: Check current authentication
      addStep('2', 'pending', 'Kontrollerar autentisering...');
      try {
        const authResponse = await fetch('/api/debug/auth');
        const authData = await authResponse.json();
        
        if (authData.session?.hasSession) {
          addStep('2', 'success', `Inloggad som: ${authData.session.userEmail}`, authData);
        } else {
          addStep('2', 'error', 'Inte inloggad - join kommer att misslyckas', authData);
        }
      } catch (authError) {
        addStep('2', 'error', 'Kunde inte kontrollera autentisering', authError);
      }

      // Step 3: Try regular join (will likely fail due to authentication)
      addStep('3', 'pending', 'Försöker regular join...');
      try {
        const joinResponse = await fetch('/api/handbook/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ joinCode }),
        });
        const joinData = await joinResponse.json();
        
        if (joinResponse.ok && joinData.success) {
          addStep('3', 'success', `Regular join lyckades: ${joinData.message}`, joinData);
        } else {
          addStep('3', 'error', `Regular join misslyckades: ${joinData.message}`, joinData);
        }
      } catch (joinError) {
        addStep('3', 'error', 'Regular join kraschade', joinError);
      }

      // Step 4: Try with Bearer token authentication
      addStep('4', 'pending', 'Försöker med Bearer token...');
      try {
        const bearerJoinResponse = await fetchWithAuth('/api/handbook/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ joinCode }),
        });
        const bearerJoinData = await bearerJoinResponse.json();
        
        if (bearerJoinResponse.ok && bearerJoinData.success) {
          addStep('4', 'success', `Bearer token join lyckades: ${bearerJoinData.message}`, bearerJoinData);
        } else {
          addStep('4', 'error', `Bearer token join misslyckades: ${bearerJoinData.message}`, bearerJoinData);
        }
      } catch (bearerError) {
        addStep('4', 'error', 'Bearer token join kraschade', bearerError);
      }

      // Step 5: Check if user was actually added to handbook
      addStep('5', 'pending', 'Kontrollerar om användaren lades till...');
      try {
        // This would require admin privileges to check
        addStep('5', 'success', 'Test slutfört - kontrollera medlemslistan manuellt');
      } catch (checkError) {
        addStep('5', 'error', 'Kunde inte kontrollera medlemsstatus', checkError);
      }

    } catch (error) {
      addStep('error', 'error', 'Oväntat fel under test', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Join Process Debugger</CardTitle>
        <CardDescription>
          Testar hela join-processen steg för steg för att identifiera var problemet ligger
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Join-kod (t.ex. IFR-306-LTC)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={runFullJoinTest}
            disabled={isRunning || !joinCode}
          >
            {isRunning ? 'Testar...' : 'Kör Full Test'}
          </Button>
        </div>

        {steps.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Test Resultat:</h3>
            {steps.map((step, index) => (
              <Alert key={index} className={step.status === 'error' ? 'border-red-200 bg-red-50' : 
                                           step.status === 'success' ? 'border-green-200 bg-green-50' : 
                                           'border-blue-200 bg-blue-50'}>
                <AlertDescription className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStepIcon(step.status)}</span>
                    <span className="font-medium">Steg {step.step}:</span>
                    <span>{step.message}</span>
                  </div>
                  {step.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600">Visa detaljer</summary>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(step.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription>
            <strong>💡 Vad testet gör:</strong>
            <ol className="mt-2 ml-4 list-decimal text-sm space-y-1">
              <li>Validerar join-koden och ser vilken handbok den tillhör</li>
              <li>Kontrollerar din nuvarande autentisering</li>
              <li>Försöker gå med i handboken med vanlig autentisering</li>
              <li>Försöker gå med med Bearer token som backup</li>
              <li>Slutkontroll av resultatet</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 