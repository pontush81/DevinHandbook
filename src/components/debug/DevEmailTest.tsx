'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

interface DevEmailTestProps {
  joinCode?: string;
}

export function DevEmailTest({ joinCode }: DevEmailTestProps) {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('testpassword123');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  if (!isDevelopment || !isLocalhost) {
    return null; // Only show in localhost development
  }

  const testEmailSignup = async () => {
    setIsLoading(true);
    setResult('');

    try {
      console.log('🧪 [DevEmailTest] Testing email signup with:', email);
      
      // Try to sign up with email/password
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            join_code: joinCode || undefined
          }
        }
      });

      if (error) {
        console.error('🧪 [DevEmailTest] Signup error:', error);
        setResult(`❌ Signup Error: ${error.message}`);
        return;
      }

      console.log('🧪 [DevEmailTest] Signup result:', data);
      
      if (data.user && !data.user.email_confirmed_at) {
        setResult(`📧 Email confirmation required. Check your email or use manual confirmation.`);
        
        // In development, we can try to automatically confirm the user
        if (isDevelopment) {
          setTimeout(() => {
            setResult(prev => prev + '\n🔧 Development mode: Email confirmation would normally be required.');
          }, 1000);
        }
      } else if (data.user) {
        setResult(`✅ Signup successful! User: ${data.user.email}`);
      } else {
        setResult(`⚠️ Signup completed but no user returned`);
      }

    } catch (error) {
      console.error('🧪 [DevEmailTest] Unexpected error:', error);
      setResult(`💥 Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testManualConfirm = async () => {
    setIsLoading(true);
    
    try {
      console.log('🧪 [DevEmailTest] Attempting manual confirmation for:', email);
      
      // This would require admin privileges, but we can show the process
      setResult(`🔧 Manual confirmation would be done via Supabase Admin API or Dashboard`);
      
    } catch (error) {
      setResult(`❌ Manual confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800">🧪 Development Email Test</CardTitle>
        <CardDescription>
          Test email/password signup on localhost (development only)
          {joinCode && <><br />Join code: <code className="bg-orange-100 px-1 rounded">{joinCode}</code></>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Email:</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password:</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="testpassword123"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={testEmailSignup}
            disabled={isLoading || !email || !password}
            className="flex-1"
          >
            {isLoading ? 'Testing...' : 'Test Email Signup'}
          </Button>
          <Button 
            onClick={testManualConfirm}
            disabled={isLoading}
            variant="outline"
          >
            Manual Confirm
          </Button>
        </div>

        {result && (
          <Alert>
            <AlertDescription>
              <pre className="text-xs whitespace-pre-wrap">{result}</pre>
            </AlertDescription>
          </Alert>
        )}

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-xs">
            <strong>💡 Localhost Email Issues:</strong><br />
            • Supabase may not send real emails on localhost<br />
            • Email confirmation links may not work<br />
            • Use Google OAuth for easier testing<br />
            • Or test on production environment
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 