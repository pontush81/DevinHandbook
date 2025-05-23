"use client";

import React, { useState, useEffect } from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { createSubdomainFromName, validateSubdomain } from "@/lib/utils";

export function WizardStepTwo() {
  const {
    name,
    subdomain,
    setName,
    setSubdomain,
    template,
    toggleSectionActive,
  } = useHandbookStore();

  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  // Autogenerera subdomän från namn om användaren inte har ändrat subdomänfältet manuellt
  useEffect(() => {
    if (!subdomainEdited) {
      const generated = createSubdomainFromName(name);
      setSubdomain(generated);
    }
  }, [name, setSubdomain, subdomainEdited]);

  // Validera subdomän
  useEffect(() => {
    if (subdomain && !validateSubdomain(subdomain)) {
      setSubdomainError(
        "Subdomänen får endast innehålla små bokstäver, siffror och bindestreck. Den får inte börja eller sluta med bindestreck."
      );
    } else {
      setSubdomainError(null);
    }
  }, [subdomain]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Namn & subdomän</h2>
        <p className="text-gray-500">
          Välj ett namn för din handbok. Subdomänen föreslås automatiskt men kan ändras.
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-blue-800 mb-1">Namn på handbok</label>
          <input
            type="text"
            value={name}
            onChange={e => {
              setName(e.target.value);
              setSubdomainEdited(false);
            }}
            required
            className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
            placeholder="Ex: Min Förening"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-blue-800 mb-1">Handbokens adress</label>
          <div className="flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-blue-200 bg-gray-50 text-gray-500 text-sm">
              www.handbok.org/handbook/
            </span>
            <input
              type="text"
              value={subdomain}
              onChange={e => {
                setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                setSubdomainEdited(true);
              }}
              required
              className="block w-full border border-blue-200 rounded-r-md px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
              placeholder="min-forening"
              pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
              title="Subdomänen får endast innehålla små bokstäver, siffror och bindestreck. Den får inte börja eller sluta med bindestreck."
            />
          </div>
          {subdomainError && (
            <p className="mt-1 text-xs text-red-600">{subdomainError}</p>
          )}
          {!subdomainError && (
            <p className="mt-1 text-xs text-gray-500">
              Endast små bokstäver, siffror och bindestreck. Inga specialtecken eller mellanslag.
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Välj sektioner</h2>
        <p className="text-gray-500">
          Välj vilka sektioner som ska ingå i din handbok.
        </p>
      </div>
      <div className="space-y-3">
        {template.sections.map((section) => (
          <div
            key={section.id}
            className="flex flex-col sm:flex-row items-start gap-3 p-3 border border-blue-100 rounded-md bg-blue-50"
          >
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
              <p className="text-xs text-blue-700">{section.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
