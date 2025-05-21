"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MainLayout } from '@/components/layout/MainLayout';

interface Page {
  id: string;
  title: string;
  content: string;
  order_index: number;
  section_id: string;
  is_published?: boolean;
}

interface Section {
  id: string;
  title: string;
  description: string;
  order_index: number;
  pages: Page[];
  is_published?: boolean;
}

interface Handbook {
  id: string;
  name: string;
  sections: Section[];
}

interface HomeHandbookClientProps {
  handbook: Handbook;
}

const HomeHandbookClient: React.FC<HomeHandbookClientProps> = ({ handbook }) => {
  return (
    <MainLayout 
      variant="app" 
      showAuth={false} 
      sections={handbook.sections.map((s) => ({ id: s.id, title: s.title }))}
    >
      <main className="w-full max-w-5xl mx-auto px-6 py-8">
        {handbook.sections.map((section: Section) => (
          <section key={section.id} id={`section-${section.id}`} className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">{section.title}</h2>
            <div className="prose max-w-none">
              <ReactMarkdown>{section.description}</ReactMarkdown>
            </div>
            {section.pages.map((page: Page) => (
              <div key={page.id} className="mt-8">
                <h3 className="text-xl font-medium mb-4">{page.title}</h3>
                <div className="prose max-w-none">
                  <ReactMarkdown>{page.content}</ReactMarkdown>
                </div>
              </div>
            ))}
          </section>
        ))}
      </main>
    </MainLayout>
  );
};

export default HomeHandbookClient; 