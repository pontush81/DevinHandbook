"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";

export default function ClearAuthPage() {
  const [isClearing, setIsClearing] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  const clearAllAuthData = async () => {
    setIsClearing(true);
    
    try {
      // 1. Rensa localStorage aggressivt
      if (typeof window !== 'undefined') {
        // Hitta alla auth-relaterade nycklar
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('sb-') || 
            key.includes('supabase') || 
            key.includes('auth') ||
            key.includes('session') ||
            key.includes('user') ||
            key.includes('token')
          )) {
            keysToRemove.push(key);
          }
        }
        
        console.log('🗑️ Rensar nycklar:', keysToRemove);
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // 2. Rensa sessionStorage
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (
            key.startsWith('sb-') || 
            key.includes('supabase') || 
            key.includes('auth')
          )) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        // 3. Rensa cookies
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.localhost`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=localhost`;
          }
        });
        
        // 4. Sätt logout-flagga
        localStorage.setItem('__logout_flag__', Date.now().toString());
        
        console.log('✅ All auth-data rensad');
        setIsCleared(true);
      }
    } catch (error) {
      console.error('Fel vid rensning:', error);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    // Auto-rensa vid sidladdning
    clearAllAuthData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <RefreshCw className={`h-6 w-6 text-blue-600 ${isClearing ? 'animate-spin' : ''}`} />
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Rensa Auth-data
          </h1>
          
          <p className="text-gray-600 mb-6">
            Rensar korrupta sessions och auth-data för att lösa inloggningsproblem.
          </p>
          
          {isCleared ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Auth-data rensad!</span>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = '/login'} 
                  className="w-full"
                >
                  Gå till inloggning
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/'} 
                  variant="outline"
                  className="w-full"
                >
                  Gå till startsidan
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isClearing ? (
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Rensar data...</span>
                </div>
              ) : (
                <Button 
                  onClick={clearAllAuthData}
                  disabled={isClearing}
                  className="w-full"
                >
                  Rensa auth-data
                </Button>
              )}
            </div>
          )}
          
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-yellow-800">Info</p>
                <p className="text-sm text-yellow-700">
                  Detta rensar all sparad inloggningsinformation. Du behöver logga in igen efteråt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 