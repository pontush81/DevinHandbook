import { Suspense } from "react";
import SuccessClient from "./client";

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    }>
      <SuccessClient />
    </Suspense>
  );
}
