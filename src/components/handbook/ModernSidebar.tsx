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
  Info,
  MessageCircle,
  Calendar
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
import Link from 'next/link';

interface ModernSidebarProps {
  sections: HandbookSection[];
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onSectionSelect?: (sectionId: string) => void;
  handbookSlug?: string;
  forumEnabled?: boolean;
  editMode?: boolean;
  onEditSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onToggleSection?: (sectionId: string) => void;
  onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void;
}

// Enhanced menu items with categories
const menuCategories = {
  welcome: {
    title: "Komma igång",
    icon: Home,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
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
  { title: "Välkommen", icon: Home, keywords: ["välkommen", "översikt", "hem", "start"], color: "text-blue-600", category: "welcome" },
  { title: "Översikt", icon: BookOpen, keywords: ["översikt", "snabbfakta", "sammanfattning"], color: "text-blue-600", category: "welcome" },
  
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
  { title: "Sopsortering", icon: Recycle, keywords: ["sopsortering", "återvinning", "avfall"], color: "text-purple-600", category: "practical" },
  { title: "Parkering", icon: Car, keywords: ["parkering", "garage", "bil", "fordon"], color: "text-gray-600", category: "practical" },
  { title: "Trivsel", icon: Heart, keywords: ["trivsel", "gemenskap", "grannar"], color: "text-pink-600", category: "practical" },
  
  // Bookings
  { title: "Bokningar", icon: Calendar, keywords: ["bokningar", "bokning", "reserv"], color: "text-emerald-600", category: "practical" },
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
    const matchedCategory = Object.entries(menuCategories).find(([_, cat]) => 
      cat.keywords.some(keyword => section.title.toLowerCase().includes(keyword))
    );
    
    return {
      title: section.title,
      icon: IconComponent,
      keywords: [],
      color: matchedCategory?.[1]?.color || "text-gray-600",
      category: (matchedCategory?.[0] as keyof typeof menuCategories) || "practical"
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
    category: "practical" as keyof typeof menuCategories
  };
};

// Huvudkomponent
export function ModernSidebar({ 
  sections, 
  currentPageId, 
  onPageSelect, 
  onSectionSelect,
  handbookSlug,
  forumEnabled,
  editMode = false,
  onEditSection,
  onDeleteSection,
  onToggleSection,
  onMoveSection
}: ModernSidebarProps) {
  const { setOpenMobile } = useSidebar();

  const handleSectionClick = (sectionId: string) => {
    console.log('🎯 ModernSidebar: Section clicked:', sectionId);
    
    // Call section select callback for scrolling
    onSectionSelect?.(sectionId);
    
    // Close mobile sidebar
    setOpenMobile(false);
  };

  const categorizedSections = groupSectionsByCategory(sections);

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas" className="mt-16 border-r border-gray-200 h-[calc(100vh-4rem)]">
      <SidebarContent className="bg-gray-50/50 h-full">
        <div className="flex-1 overflow-y-auto py-4 h-full">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {[...categorizedSections.welcome, ...categorizedSections.information, ...categorizedSections.practical].map((section) => {
                  const menuItem = getMenuItemForSection(section);
                  const IconComponent = menuItem.icon;
                  const categoryKey = menuItem.category as keyof typeof menuCategories;
                  const category = menuCategories[categoryKey] || menuCategories.practical;

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
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                
                {/* Bokningar-länk - alltid synlig */}
                {handbookSlug && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link 
                        href={`/${handbookSlug}/bookings`}
                        className="group hover:bg-emerald-50 hover:border-emerald-200 transition-colors duration-200 text-sm py-3 px-3 rounded-lg cursor-pointer touch-manipulation min-h-[48px] flex items-center gap-3 w-full border border-transparent hover:border-opacity-50 text-gray-900"
                      >
                        <Calendar 
                          className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform duration-200" 
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 truncate block">
                            Bokningar
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Meddelanden-länk när aktiverat */}
                {forumEnabled && handbookSlug && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link 
                        href={`/${handbookSlug}/meddelanden`}
                        className="group hover:bg-orange-50 hover:border-orange-200 transition-colors duration-200 text-sm py-3 px-3 rounded-lg cursor-pointer touch-manipulation min-h-[48px] flex items-center gap-3 w-full border border-transparent hover:border-opacity-50 text-gray-900"
                      >
                        <MessageCircle 
                          className="h-4 w-4 text-orange-600 group-hover:scale-110 transition-transform duration-200" 
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 truncate block">
                            Meddelanden
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

// Export the trigger for convenience
export { SidebarTrigger } from "@/components/ui/sidebar";