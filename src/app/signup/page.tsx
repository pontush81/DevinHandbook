"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">Skapa konto</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          view="sign_up"
          localization={{
            variables: {
              sign_up: {
                email_label: "E-post",
                password_label: "Lösenord",
                button_label: "Skapa konto",
                link_text: "Har du redan ett konto? Logga in"
              },
              sign_in: {
                email_label: "E-post",
                password_label: "Lösenord",
                button_label: "Logga in",
                link_text: "Har du inget konto? Skapa konto"
              },
              forgotten_password: {
                link_text: "Glömt lösenord?"
              }
            }
          }}
          redirectTo={typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined}
        />
      </div>
    </div>
  );
}
