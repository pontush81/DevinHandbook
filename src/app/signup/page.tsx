"use client";

import { Suspense } from "react";
import SignupClient from "./signup-client";

// Wrapper-komponent med Suspense
export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div>Laddar...</div>
      </div>
    }>
      <SignupClient />
    </Suspense>
  );
}
