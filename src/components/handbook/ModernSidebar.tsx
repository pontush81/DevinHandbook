"use client"

import React from 'react';
import { 
  Home, 
  Users, 
  Phone, 
  DollarSign, 
  Wrench, 
  FileText, 
  Building, 
  Recycle, 
  Car,
  Heart,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { HandbookSection, HandbookPage } from '@/types/handbook';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface ModernSidebarProps {
  sections: HandbookSection[];
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onSectionSelect?: (sectionId: string) => void;
}

// Svenska menyalternativ med ikoner
const menuItems = [
  {
    title: "Välkommen",
    icon: Home,
    keywords: ["välkommen", "hem", "start", "översikt"],
    color: "text-blue-600"
  },
  {
    title: "Kontaktuppgifter och styrelse", 
    icon: Users,
    keywords: ["kontakt", "styrelse", "telefon", "email"],
    color: "text-green-600"
  },
  {
    title: "Felanmälan",
    icon: Wrench, 
    keywords: ["felanmälan", "fel", "reparation", "underhåll"],
    color: "text-orange-600"
  },
  {
    title: "Ekonomi och avgifter",
    icon: DollarSign,
    keywords: ["ekonomi", "avgift", "kostnad", "budget"],
    color: "text-purple-600"
  },
  {
    title: "Trivselregler", 
    icon: Heart,
    keywords: ["trivsel", "regler", "ordning", "gemenskap"],
    color: "text-pink-600"
  },
  {
    title: "Stadgar och årsredovisning",
    icon: FileText,
    keywords: ["stadgar", "årsredovisning", "dokument", "juridik"],
    color: "text-indigo-600"
  },
  {
    title: "Renoveringar och underhåll",
    icon: Building,
    keywords: ["renovering", "underhåll", "byggnation", "projekt"],
    color: "text-amber-600"
  },
  {
    title: "Bopärmar och regler",
    icon: BookOpen,
    keywords: ["bopärm", "regler", "information", "guide"],
    color: "text-teal-600"
  },
  {
    title: "Sopsortering och återvinning", 
    icon: Recycle,
    keywords: ["sopsortering", "återvinning", "miljö", "avfall"],
    color: "text-emerald-600"
  },
  {
    title: "Parkering och garage",
    icon: Car,
    keywords: ["parkering", "garage", "bil", "plats"],
    color: "text-slate-600"
  }
];

// Funktion för att matcha sektion med menyalternativ
const getMenuItemForSection = (section: HandbookSection) => {
  const sectionTitle = section.title.toLowerCase();
  
  return menuItems.find(item => 
    item.keywords.some(keyword => sectionTitle.includes(keyword))
  ) || {
    title: section.title,
    icon: BookOpen,
    keywords: [],
    color: "text-gray-600"
  };
};

// Huvudkomponent
export function ModernSidebar({ 
  sections, 
  currentPageId, 
  onPageSelect, 
  onSectionSelect
}: ModernSidebarProps) {
  const { setOpenMobile } = useSidebar();

  const handleSectionClick = (sectionId: string) => {
    onSectionSelect?.(sectionId);
    setOpenMobile(false); // Stäng mobil-meny vid navigation
  };

  const isSectionActive = (section: HandbookSection): boolean => {
    return section.pages?.some(page => page.id === currentPageId) || false;
  };

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas" className="mt-16">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => {
                const menuItem = getMenuItemForSection(section);
                const IconComponent = menuItem.icon;
                const isActive = isSectionActive(section);

                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => handleSectionClick(section.id)}
                      tooltip={section.description || section.title}
                      className="group hover:bg-accent hover:text-accent-foreground transition-colors duration-200 text-sm py-2 px-3 rounded-md cursor-pointer touch-manipulation min-h-[44px] flex items-center gap-3"
                    >
                      <IconComponent 
                        className={`h-4 w-4 ${menuItem.color} group-hover:scale-110 transition-transform duration-200`} 
                      />
                      <span className="font-medium">{section.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sections.length === 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="h-12 w-12 text-sidebar-muted-foreground mb-3" />
                <p className="text-sm text-sidebar-muted-foreground mb-2">
                  Inga sektioner än
                </p>
                <p className="text-xs text-sidebar-muted-foreground">
                  Innehåll kommer att visas här
                </p>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

// Export trigger för att använda i header
export { SidebarTrigger } from "@/components/ui/sidebar"; 