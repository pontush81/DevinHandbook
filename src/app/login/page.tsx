"use client";

import { Suspense } from "react";
import LoginClient from "./login-client";

// Wrapper-komponent med Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div>Laddar...</div>
      </div>
    }>
      <LoginClient />
    </Suspense>
  );
}
