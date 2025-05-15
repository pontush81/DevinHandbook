"use client";

import React, { useState } from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import ReactMarkdown from "react-markdown";

export function WizardStepThree() {
  const { 
    template, 
    updateSectionTitle, 
    updateSectionDescription, 
    updatePageTitle, 
    updatePageContent 
  } = useHandbookStore();
  
  const [activeSection, setActiveSection] = useState<string | null>(
    template.sections.find(s => s.isActive)?.id || null
  );
  const [activePage, setActivePage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  
  const currentSection = template.sections.find(s => s.id === activeSection);
  const currentPage = currentSection?.pages.find(p => p.id === activePage);
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Redigera innehåll</h2>
        <p className="text-gray-500">
          Anpassa innehållet i din handbok.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sections sidebar */}
        <div className="md:col-span-1 space-y-3 border-r pr-4">
          <h3 className="font-medium text-sm mb-2">Sektioner</h3>
          {template.sections
            .filter(section => section.isActive)
            .map((section) => (
              <div 
                key={section.id} 
                className={`text-sm cursor-pointer p-2 rounded ${
                  activeSection === section.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setActiveSection(section.id);
                  setActivePage(section.pages[0]?.id || null);
                }}
              >
                {section.title}
              </div>
            ))}
        </div>
        
        {/* Content editor */}
        <div className="md:col-span-3 space-y-6">
          {currentSection && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium">Sektionsrubrik</label>
                <input
                  type="text"
                  value={currentSection.title}
                  onChange={(e) => updateSectionTitle(currentSection.id, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
                
                <label className="text-sm font-medium">Sektionsbeskrivning</label>
                <input
                  type="text"
                  value={currentSection.description}
                  onChange={(e) => updateSectionDescription(currentSection.id, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              {/* Pages tabs */}
              <div className="space-y-3">
                <div className="flex items-center border-b">
                  {currentSection.pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setActivePage(page.id)}
                      className={`py-2 px-4 ${
                        activePage === page.id 
                          ? 'border-b-2 border-primary font-medium' 
                          : 'text-gray-500'
                      }`}
                    >
                      {page.title}
                    </button>
                  ))}
                </div>
                
                {currentPage && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Sidrubrik</label>
                    <input
                      type="text"
                      value={currentPage.title}
                      onChange={(e) => updatePageTitle(currentSection.id, currentPage.id, e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                    
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        {showPreview ? 'Visa redigerare' : 'Visa förhandsgranskning'}
                      </button>
                    </div>
                    
                    {!showPreview ? (
                      <textarea
                        value={currentPage.content}
                        onChange={(e) => updatePageContent(currentSection.id, currentPage.id, e.target.value)}
                        className="w-full h-64 px-3 py-2 border rounded-md font-mono text-sm"
                        placeholder="Skriv innehåll här (använd Markdown för formatering)"
                      />
                    ) : (
                      <div className="w-full h-64 p-4 border rounded-md overflow-auto bg-gray-50">
                        <ReactMarkdown>{currentPage.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
