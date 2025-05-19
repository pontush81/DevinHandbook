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
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border border-blue-100 rounded-lg p-4 bg-blue-50">
        {/* Header */}
        <div className="md:col-span-4 border-b border-blue-100 pb-4 mb-4">
          <h1 className="text-3xl font-bold text-blue-800">{name}</h1>
          <p className="text-blue-700">Digital handbok</p>
        </div>
        
        {/* Sidebar */}
        <div className="md:col-span-1 border-r border-blue-100 pr-4">
          <h3 className="font-medium mb-4 text-blue-800">Innehåll</h3>
          <nav className="space-y-1">
            {activeSections.map((section) => (
              <div 
                key={section.id}
                className={`p-2 text-sm cursor-pointer rounded transition-colors duration-150 ${
                  activeSection === section.id ? 'bg-blue-100 font-medium text-blue-900' : 'hover:bg-blue-50 text-blue-700'
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
              <h2 className="text-2xl font-semibold text-blue-800">{currentSection.title}</h2>
              <p className="text-blue-700">{currentSection.description}</p>
              
              <div className="space-y-8">
                {currentSection.pages.map((page) => (
                  <div key={page.id} className="space-y-2">
                    <h3 className="text-xl font-medium text-blue-700">{page.title}</h3>
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
