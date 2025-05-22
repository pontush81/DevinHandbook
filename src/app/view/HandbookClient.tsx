"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Menu, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface HandbookPage {
  id: string;
  title: string;
  content: string;
}

interface Section {
  id: string;
  title: string;
  description: string;
  pages: HandbookPage[];
}

interface Handbook {
  id: string;
  name: string;
  sections: Section[];
}

function useActiveSection(sectionIds: string[]) {
  const [active, setActive] = useState<string | null>(null);
  
  useEffect(() => {
    function onScroll() {
      let found = null;
      for (const id of sectionIds) {
        const el = document.getElementById(`section-${id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < 120) found = id;
        }
      }
      setActive(found || sectionIds[0] || null);
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionIds]);
  
  return active;
}

export default function HandbookClient({ handbook }: { handbook: Handbook }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const sectionIds = handbook.sections?.map((s) => s.id) || [];
  const activeSection = useActiveSection(sectionIds);
  
  // Kontrollera om användaren är admin för denna handbok
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !handbook.id) return;
      
      try {
        const { data, error } = await supabase
          .from('handbook_members')
          .select('role')
          .eq('handbook_id', handbook.id)
          .eq('user_id', user.id)
          .single();
          
        if (!error && data && data.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Fel vid kontroll av adminrättigheter:', error);
      }
    };
    
    checkAdminStatus();
  }, [user, handbook.id]);

  return (
    <MainLayout 
      variant="app" 
      showAuth={false} 
      sections={handbook.sections.map((s) => ({ id: s.id, title: s.title }))}
    >
      {/* Admin-knapp som visas för behöriga användare */}
      {isAdmin && (
        <div className="sticky top-0 z-50 w-full bg-white shadow-sm border-b">
          <div className="container flex h-14 max-w-screen-2xl items-center">
            <div className="flex flex-1 items-center justify-between">
              <div></div> {/* Tom div för att skapa space-between */}
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1" 
                onClick={() => window.location.href = `/admin?handbook=${handbook.id}`}
              >
                <Settings className="h-4 w-4" />
                <span>Administrera</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 container max-w-6xl py-8">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-64 sticky top-24 h-fit">
            <nav className="space-y-1">
              {handbook.sections?.map((section) => (
                <a
                  key={section.id}
                  href={`#section-${section.id}`}
                  className={`block py-2 px-3 text-base transition-colors rounded-md ${
                    activeSection === section.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>
          {/* Main content */}
          <main className="flex-1 min-w-0">
            {handbook.sections?.map((section) => (
              <section
                key={section.id}
                id={`section-${section.id}`}
                className="mb-16 scroll-mt-24"
              >
                <h2 className="text-2xl font-semibold mb-6">{section.title}</h2>
                <div className="prose max-w-none mb-8">
                  <ReactMarkdown>{section.description}</ReactMarkdown>
                </div>
                <div className="space-y-12">
                  {section.pages?.map((page) => (
                    <article key={page.id} className="prose max-w-none">
                      <h3 className="text-xl font-medium mb-4">{page.title}</h3>
                      <ReactMarkdown>{page.content}</ReactMarkdown>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </MainLayout>
  );
} 