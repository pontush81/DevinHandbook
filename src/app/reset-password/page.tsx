"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">Återställ lösenord</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              brand: '#2563eb',
              brandAccent: '#1d4ed8',
              brandButtonText: '#fff'
            }
          }}
          providers={[]}
          view="forgotten_password"
          localization={{
            variables: {
              forgotten_password: {
                email_label: "E-post",
                email_input_placeholder: "Ange din e-postadress",
                button_label: "Skicka återställningslänk",
                link_text: "Tillbaka till inloggning"
              },
              sign_in: {
                email_label: "E-post",
                email_input_placeholder: "Ange din e-postadress",
                password_label: "Lösenord",
                password_input_placeholder: "Ange ditt lösenord",
                button_label: "Logga in",
                link_text: "Har du inget konto? Skapa konto"
              },
              sign_up: {
                email_label: "E-post",
                email_input_placeholder: "Ange din e-postadress",
                password_label: "Lösenord",
                password_input_placeholder: "Ange ditt lösenord",
                button_label: "Skapa konto",
                link_text: "Har du redan ett konto? Logga in"
              }
            }
          }}
          redirectTo={typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined}
        />
      </div>
    </div>
  );
}
