import React from "react";
import HandbookHeaderClient from '@/components/HandbookHeaderClient';

export default function CreateHandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <HandbookHeaderClient />
      <main>
        {children}
      </main>
    </div>
  );
}
