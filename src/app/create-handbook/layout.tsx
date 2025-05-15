import React from "react";

export default function CreateHandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Handbok.org</h1>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}
