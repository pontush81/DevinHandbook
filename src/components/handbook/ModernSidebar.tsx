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
  ChevronRight,
  Info
} from 'lucide-react';
import { HandbookSection } from '@/types/handbook';
import { getIconComponent } from '@/lib/icon-utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface ModernSidebarProps {
  sections: HandbookSection[];
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onSectionSelect?: (sectionId: string) => void;
}

// Enhanced menu items with categories
const menuCategories = {
  welcome: {
    title: "Komma igång",
    icon: Home,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    keywords: ['välkommen', 'översikt', 'intro', 'start', 'komma igång']
  },
  information: {
    title: "Information & Kontakt",
    icon: Info,
    color: "text-blue-600", 
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    keywords: ['kontakt', 'styrelse', 'information', 'telefon', 'mail']
  },
  practical: {
    title: "Praktisk information",
    icon: Wrench,
    color: "text-purple-600",
    bgColor: "bg-purple-50", 
    borderColor: "border-purple-200",
    keywords: ['regler', 'rutiner', 'praktisk', 'vardagsliga']
  }
};

const menuItems = [
  // Welcome/Overview
  { title: "Välkommen", icon: Home, keywords: ["välkommen", "översikt", "hem", "start"], color: "text-green-600", category: "welcome" },
  { title: "Översikt", icon: BookOpen, keywords: ["översikt", "snabbfakta", "sammanfattning"], color: "text-green-600", category: "welcome" },
  
  // Contact & Information  
  { title: "Kontakt", icon: Phone, keywords: ["kontakt", "telefon", "telefonnummer"], color: "text-blue-600", category: "information" },
  { title: "Styrelse", icon: Users, keywords: ["styrelse", "personer", "ledning", "ansvariga"], color: "text-blue-600", category: "information" },
  { title: "Information", icon: Info, keywords: ["information", "info", "detaljer"], color: "text-blue-600", category: "information" },
  
  // Practical
  { title: "Ekonomi", icon: DollarSign, keywords: ["ekonomi", "avgift", "kostnad", "betalning"], color: "text-purple-600", category: "practical" },
  { title: "Förvaltning", icon: Building, keywords: ["förvaltning", "administration", "hantering"], color: "text-purple-600", category: "practical" },
  { title: "Felanmälan", icon: Wrench, keywords: ["fel", "reparation", "problem", "vaktmästare"], color: "text-orange-600", category: "practical" },
  { title: "Regler", icon: FileText, keywords: ["regler", "trivsel", "ordning", "stadgar"], color: "text-purple-600", category: "practical" },
  { title: "Renovering", icon: Building, keywords: ["renovering", "underhåll", "byggnation"], color: "text-gray-600", category: "practical" },
  { title: "Sopsortering", icon: Recycle, keywords: ["sopsortering", "återvinning", "avfall"], color: "text-green-600", category: "practical" },
  { title: "Parkering", icon: Car, keywords: ["parkering", "garage", "bil", "fordon"], color: "text-gray-600", category: "practical" },
  { title: "Trivsel", icon: Heart, keywords: ["trivsel", "gemenskap", "grannar"], color: "text-pink-600", category: "practical" },
];

// Funktion för att gruppera sektioner per kategori
const groupSectionsByCategory = (sections: HandbookSection[]) => {
  const categorized = {
    welcome: [] as HandbookSection[],
    information: [] as HandbookSection[],
    practical: [] as HandbookSection[]
  };

  sections.forEach(section => {
    const sectionTitle = section.title.toLowerCase();
    let assigned = false;

    // Check welcome category
    if (menuCategories.welcome.keywords.some(keyword => sectionTitle.includes(keyword)) || section.order_index <= 2) {
      categorized.welcome.push(section);
      assigned = true;
    }
    // Check information category  
    else if (menuCategories.information.keywords.some(keyword => sectionTitle.includes(keyword))) {
      categorized.information.push(section);
      assigned = true;
    }

    // If not assigned to welcome or information, put in practical
    if (!assigned) {
      categorized.practical.push(section);
    }
  });

  return categorized;
};

// Funktion för att matcha sektion med menyalternativ
const getMenuItemForSection = (section: HandbookSection) => {
  // Om sektionen har en specifik ikon vald, använd den
  if (section.icon) {
    const IconComponent = getIconComponent(section.icon);
    const matchedCategory = Object.values(menuCategories).find(cat => 
      cat.keywords.some(keyword => section.title.toLowerCase().includes(keyword))
    );
    
    return {
      title: section.title,
      icon: IconComponent,
      keywords: [],
      color: matchedCategory?.color || "text-gray-600",
      category: matchedCategory ? Object.keys(menuCategories).find(key => menuCategories[key] === matchedCategory) : "practical"
    };
  }
  
  // Annars, använd automatisk mappning baserat på titel
  const sectionTitle = section.title.toLowerCase();
  
  return menuItems.find(item => 
    item.keywords.some(keyword => sectionTitle.includes(keyword))
  ) || {
    title: section.title,
    icon: BookOpen,
    keywords: [],
    color: "text-gray-600",
    category: "practical"
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
    console.log('🎯 Section clicked for scrolling:', sectionId);
    
    // Call section select callback for scrolling
    onSectionSelect?.(sectionId);
    setOpenMobile(false); // Stäng mobil-meny vid navigation
  };

  const categorizedSections = groupSectionsByCategory(sections);

  const renderSectionGroup = (categoryKey: keyof typeof menuCategories, sections: HandbookSection[]) => {
    if (sections.length === 0) return null;
    
    const category = menuCategories[categoryKey];
    const CategoryIcon = category.icon;

    return (
      <SidebarGroup key={categoryKey}>
        <SidebarGroupLabel className={`text-xs font-semibold uppercase tracking-wider ${category.color} flex items-center gap-2 mb-2`}>
          <CategoryIcon className="h-3 w-3" />
          {category.title}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {sections.map((section) => {
              const menuItem = getMenuItemForSection(section);
              const IconComponent = menuItem.icon;
              const pageCount = section.pages?.length || 0;

              return (
                <SidebarMenuItem key={section.id}>
                  <SidebarMenuButton
                    onClick={() => handleSectionClick(section.id)}
                    tooltip={section.description || section.title}
                    className={`group hover:${category.bgColor} hover:${category.borderColor} transition-colors duration-200 text-sm py-3 px-3 rounded-lg cursor-pointer touch-manipulation min-h-[48px] flex items-center gap-3 w-full border border-transparent hover:border-opacity-50`}
                  >
                    <IconComponent 
                      className={`h-4 w-4 ${menuItem.color} group-hover:scale-110 transition-transform duration-200`} 
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 truncate block">
                        {section.title}
                      </span>
                      {pageCount > 0 && (
                        <span className="text-xs text-gray-500">
                          {pageCount} sidor
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas" className="mt-16 border-r border-gray-200">
      <SidebarContent className="bg-gray-50/50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            Handbok Navigation
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            {sections.length} sektioner tillgängliga
          </p>
        </div>

        <div className="flex-1 overflow-auto py-4 space-y-6">
          {renderSectionGroup('welcome', categorizedSections.welcome)}
          {renderSectionGroup('information', categorizedSections.information)}  
          {renderSectionGroup('practical', categorizedSections.practical)}
        </div>

        {/* Footer with summary */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Totalt sektioner:</span>
              <span className="font-medium">{sections.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Totalt sidor:</span>
              <span className="font-medium">{sections.reduce((acc, s) => acc + (s.pages?.length || 0), 0)}</span>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

// Export the trigger for convenience
export { SidebarTrigger } from "@/components/ui/sidebar";