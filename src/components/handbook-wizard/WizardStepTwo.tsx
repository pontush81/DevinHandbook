"use client";

import React from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";

export function WizardStepTwo() {
  const { template, toggleSectionActive } = useHandbookStore();
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Välj sektioner</h2>
        <p className="text-gray-500">
          Välj vilka sektioner som ska ingå i din handbok.
        </p>
      </div>
      
      <div className="space-y-3">
        {template.sections.map((section) => (
          <div key={section.id} className="flex flex-col sm:flex-row items-start gap-3 p-3 border border-blue-100 rounded-md bg-blue-50">
            <div className="flex items-center h-5 mt-1">
              <input
                type="checkbox"
                id={section.id}
                checked={section.isActive}
                onChange={() => toggleSectionActive(section.id)}
                className="w-4 h-4 border border-blue-300 rounded bg-blue-50 focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label 
                htmlFor={section.id} 
                className="text-sm font-medium text-blue-900 cursor-pointer"
              >
                {section.title}
              </label>
              <p className="text-xs text-blue-700">
                {section.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
