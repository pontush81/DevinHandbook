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
        <div className="md:col-span-1 space-y-3 border-r pr-4 border-blue-100 bg-blue-50 rounded-md md:rounded-none">
          <h3 className="font-medium text-sm mb-2 text-blue-800">Sektioner</h3>
          {template.sections
            .filter(section => section.isActive)
            .map((section) => (
              <div 
                key={section.id} 
                className={`text-sm cursor-pointer p-2 rounded transition-colors duration-150 ${
                  activeSection === section.id ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-blue-50 text-blue-700'
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
                <label className="text-sm font-medium text-blue-800">Sektionsrubrik</label>
                <input
                  type="text"
                  value={currentSection.title}
                  onChange={(e) => updateSectionTitle(currentSection.id, e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                />
                
                <label className="text-sm font-medium text-blue-800">Sektionsbeskrivning</label>
                <input
                  type="text"
                  value={currentSection.description}
                  onChange={(e) => updateSectionDescription(currentSection.id, e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                />
              </div>
              
              {/* Pages tabs */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center border-b border-blue-100">
                  {currentSection.pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setActivePage(page.id)}
                      className={`py-2 px-4 transition-colors duration-150 text-sm font-medium focus:outline-none ${
                        activePage === page.id 
                          ? 'border-b-2 border-blue-600 text-blue-900 bg-blue-50' 
                          : 'text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      {page.title}
                    </button>
                  ))}
                </div>
                
                {currentPage && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-blue-800">Sidrubrik</label>
                    <input
                      type="text"
                      value={currentPage.title}
                      onChange={(e) => updatePageTitle(currentSection.id, currentPage.id, e.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                    />
                    
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        {showPreview ? 'Visa redigerare' : 'Visa förhandsgranskning'}
                      </button>
                    </div>
                    
                    {!showPreview ? (
                      <textarea
                        value={currentPage.content}
                        onChange={(e) => updatePageContent(currentSection.id, currentPage.id, e.target.value)}
                        className="w-full h-64 px-3 py-2 border border-blue-200 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                        placeholder="Skriv innehåll här (använd Markdown för formatering)"
                      />
                    ) : (
                      <div className="w-full h-64 p-4 border border-blue-100 rounded-md overflow-auto bg-blue-50">
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
