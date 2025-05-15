"use client";

import React, { useState } from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import ReactMarkdown from "react-markdown";

export function WizardStepFour() {
  const { name, subdomain, template } = useHandbookStore();
  const [activeSection, setActiveSection] = useState<string | null>(
    template.sections.find(s => s.isActive)?.id || null
  );
  
  const activeSections = template.sections.filter(section => section.isActive);
  const currentSection = template.sections.find(s => s.id === activeSection);
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Förhandsgranska din handbok</h2>
        <p className="text-gray-500">
          Så här kommer din handbok att se ut när den är publicerad på{" "}
          <span className="font-semibold">https://{subdomain}.handbok.org</span>
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border rounded-lg p-4">
        {/* Header */}
        <div className="md:col-span-4 border-b pb-4">
          <h1 className="text-3xl font-bold">{name}</h1>
          <p className="text-gray-500">Digital handbok</p>
        </div>
        
        {/* Sidebar */}
        <div className="md:col-span-1 border-r pr-4">
          <h3 className="font-medium mb-4">Innehåll</h3>
          <nav className="space-y-1">
            {activeSections.map((section) => (
              <div 
                key={section.id}
                className={`p-2 text-sm cursor-pointer rounded ${
                  activeSection === section.id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.title}
              </div>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="md:col-span-3">
          {currentSection && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">{currentSection.title}</h2>
              <p className="text-gray-500">{currentSection.description}</p>
              
              <div className="space-y-8">
                {currentSection.pages.map((page) => (
                  <div key={page.id} className="space-y-2">
                    <h3 className="text-xl font-medium">{page.title}</h3>
                    <div className="prose prose-sm">
                      <ReactMarkdown>{page.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
