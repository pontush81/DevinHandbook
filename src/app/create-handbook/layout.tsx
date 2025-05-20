import React from "react";
import HandbookHeader from '@/components/HandbookHeader';

export default function CreateHandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <HandbookHeader />
      <main>
        {children}
      </main>
    </div>
  );
}
