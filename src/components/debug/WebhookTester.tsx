'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function WebhookTester() {
  const { user } = useAuth();
  const [handbookId, setHandbookId] = useState('');
  const [planType, setPlanType] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [trialHandbooks, setTrialHandbooks] = useState<any[]>([]);

  const findTrialHandbooks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/debug/find-trial-handbooks?userId=${user.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setTrialHandbooks(data.trialHandbooks || []);
        console.log('📊 [Webhook Tester] Found trial handbooks:', data);
      } else {
        console.error('Failed to find trial handbooks:', data.error);
      }
    } catch (error) {
      console.error('Error finding trial handbooks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testWebhook = async () => {
    if (!user || !handbookId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/test-payment-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handbookId,
          userId: user.id,
          planType
        }),
      });

      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        console.log('✅ [Webhook Tester] Test successful:', data);
        alert('Webhook test completed successfully! Check console for details.');
      } else {
        console.error('❌ [Webhook Tester] Test failed:', data);
        alert(`Webhook test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      alert(`Error testing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to use webhook tester</div>;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🧪 Webhook Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button onClick={findTrialHandbooks} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Find My Trial Handbooks'}
          </Button>
        </div>

        {trialHandbooks.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Your Trial Handbooks:</h4>
            <div className="space-y-2">
              {trialHandbooks.map((handbook) => (
                <div key={handbook.id} className="p-2 border rounded">
                  <div className="font-medium">{handbook.title}</div>
                  <div className="text-sm text-gray-600">
                    ID: {handbook.id}
                  </div>
                  <div className="text-sm text-gray-600">
                    Trial ends: {new Date(handbook.trial_end_date).toLocaleString()}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setHandbookId(handbook.id)}
                    className="mt-2"
                  >
                    Use This Handbook
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Handbook ID:
          </label>
          <Input
            type="text"
            value={handbookId}
            onChange={(e) => setHandbookId(e.target.value)}
            placeholder="Enter handbook ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Plan Type:
          </label>
          <select
            value={planType}
            onChange={(e) => setPlanType(e.target.value as 'monthly' | 'yearly')}
            className="w-full p-2 border rounded"
          >
            <option value="monthly">Monthly (149 kr)</option>
            <option value="yearly">Yearly (1490 kr)</option>
          </select>
        </div>

        <Button 
          onClick={testWebhook} 
          disabled={isLoading || !handbookId}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Test Webhook Processing'}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h4 className="font-medium mb-2">Test Result:</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 