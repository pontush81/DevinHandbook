"use client";

import React from "react";
import { SignUpForm } from "@/components/auth/SignUpForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold">Handbok.org</h1>
          </Link>
          <p className="mt-2 text-gray-600">Skapa ett konto för att hantera dina handböcker</p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">Registrera dig</h2>
          <SignUpForm />
        </div>
        
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Har du redan ett konto?{" "}
            <Link href="/login" className="text-black font-medium hover:underline">
              Logga in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
