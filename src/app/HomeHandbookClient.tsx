"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Menu, BookOpen, Settings, Info, Users, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

// Hjälpfunktion för att rendera ikon baserat på sektionsnamn
const getSectionIcon = (title: string) => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('välkommen')) return <Info className="h-5 w-5 text-blue-500" />;
  if (lowerTitle.includes('kontakt') || lowerTitle.includes('styrelse')) return <Users className="h-5 w-5 text-green-500" />;
  if (lowerTitle.includes('stadgar') || lowerTitle.includes('årsredovisning')) return <FileText className="h-5 w-5 text-purple-500" />;
  if (lowerTitle.includes('regler') || lowerTitle.includes('reglerna')) return <Settings className="h-5 w-5 text-orange-500" />;
  
  // Default icon
  return <BookOpen className="h-5 w-5 text-gray-500" />;
};

const HomeHandbookClient: React.FC<HomeHandbookClientProps> = ({ handbook }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
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
  
  // Hitta välkomstsektionen (vanligtvis den första)
  const welcomeSection = handbook.sections.find(s => 
    s.title.toLowerCase().includes('välkommen') || s.order_index === 0
  );
  
  // Övriga sektioner
  const otherSections = handbook.sections.filter(s => 
    s.id !== (welcomeSection?.id || '')
  );
  
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
      
      <main className="w-full max-w-5xl mx-auto px-6 py-8">
        {/* Välkomstsektion med anpassad layout */}
        {welcomeSection && (
          <div className="mb-12">
            <h1 className="text-3xl font-bold mb-4">{welcomeSection.title}</h1>
            <div className="prose max-w-none mb-6 text-lg text-gray-700">
              <ReactMarkdown>{welcomeSection.description}</ReactMarkdown>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              {welcomeSection.pages.map((page: Page) => (
                <Card key={page.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-medium mb-3">{page.title}</h3>
                    <div className="prose max-w-none">
                      <ReactMarkdown>{page.content}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* Övriga sektioner */}
        {otherSections.map((section: Section) => (
          <section key={section.id} id={`section-${section.id}`} className="mb-12 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              {getSectionIcon(section.title)}
              <h2 className="text-2xl font-semibold">{section.title}</h2>
            </div>
            <div className="prose max-w-none mb-6">
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