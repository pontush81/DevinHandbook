"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { safeLocalStorage } from "@/lib/safe-storage";

export default function DeleteUserPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletedInfo, setDeletedInfo] = useState<any>(null);

  // Helper function to create auth headers
  const createAuthHeaders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        };
      }
    } catch {}
    return { 'Content-Type': 'application/json' };
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Aggressiv rensning av auth data
      if (typeof window !== 'undefined') {
        // Rensa localStorage with safe access
        if (safeLocalStorage.isAvailable()) {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
                safeLocalStorage.removeItem(key);
              }
            }
          } catch (e) {
            console.warn('localStorage iteration failed, using fallback', e);
            const knownKeys = ['sb-auth-token', 'sb-kjsquvjzctdwgjypcjrg-auth-token', 'sb-auth'];
            knownKeys.forEach(key => safeLocalStorage.removeItem(key));
          }
        }
        
        // Rensa cookies
        if (typeof document !== 'undefined' && typeof window !== 'undefined') {
          try {
            document.cookie.split(";").forEach(cookie => {
              const eqPos = cookie.indexOf("=");
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
              if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth')) {
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
              }
            });
          } catch (e) {
            console.warn('Cookie clearing failed:', e);
          }
        }
        
        // Sätt logout-flagga
        safeLocalStorage.setItem('__logout_flag__', Date.now().toString());
      }
      
      // Omdirigera med en kort fördröjning
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?logged_out=true';
        }
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
      // Forcera omdirigering även vid fel
      if (typeof window !== 'undefined') {
        window.location.href = '/login?logged_out=true';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      // If unauthorized, try with auth header
      if (!response.ok && response.status === 401) {
        console.log('[Delete User Page] Got 401, retrying with auth headers...');
        const headers = await createAuthHeaders();
        response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers,
          body: JSON.stringify({ email }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte radera användaren');
      }

      setSuccess(true);
      setDeletedInfo(data);
    } catch (err) {
      console.error('Delete user error:', err);
      setError(err instanceof Error ? err.message : "Ett oväntat fel uppstod");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Admin - Radera användare</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logga ut
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/">Tillbaka till startsidan</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center py-12 px-6">
        <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg border border-gray-100">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Radera användare
            </h2>
            <p className="text-gray-600">
              Ange e-postadressen för användaren som ska raderas permanent
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Användare raderad!
                </h3>
                <p className="text-green-700 mb-4">
                  Användaren <strong>{deletedInfo?.deletedEmail}</strong> har raderats permanent
                </p>
                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-800">
                  <p className="font-medium mb-1">Vad som raderades:</p>
                  <p>• Användarkonto</p>
                  <p>• Användarens profil</p>
                  <p>• Alla handböcker användaren ägde</p>
                  <p>• All tillhörande data</p>
                </div>
              </div>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <a href="/signup">Skapa nytt konto</a>
                </Button>
                <Button variant="outline" className="w-full" onClick={() => {
                  setSuccess(false);
                  setEmail("");
                  setDeletedInfo(null);
                }}>
                  Radera en annan användare
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-postadress
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pontus_81@hotmail.com"
                  className="w-full"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Varning!</p>
                    <p>Detta kommer att permanent radera användaren och alla tillhörande data. Denna åtgärd kan inte ångras.</p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? "Raderar..." : "Radera användare permanent"}
              </Button>

              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Vill du istället lösa e-postverifieringen?{" "}
                  <a href="/resend-confirmation" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    Skicka nytt bekräftelsemail
                  </a>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 