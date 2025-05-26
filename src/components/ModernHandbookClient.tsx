'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './handbook/Header';
import { Sidebar } from './handbook/Sidebar';
import { ContentArea } from './handbook/ContentArea';
import { Section, Page } from '@/lib/templates/complete-brf-handbook';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ModernHandbookClientProps {
  initialData: {
    id: string;
    title: string;
    subtitle?: string;
    sections: Section[];
  };
}

export const ModernHandbookClient: React.FC<ModernHandbookClientProps> = ({ 
  initialData 
}) => {
  // Standard responsive behavior: closed on mobile, always open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // Always open on desktop
    }
    return false; // Closed by default for SSR
  });
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(undefined);
  const [previousIsDesktop, setPreviousIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [handbookData, setHandbookData] = useState(initialData);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Auth context
  const { user, isLoading: authLoading } = useAuth();

  // Check if user can edit this handbook
  useEffect(() => {
    const checkEditPermissions = async () => {
      if (authLoading) return;
      
      // Require user to be logged in even in development
      if (!user) {
        setCanEdit(false);
        setIsLoading(false);
        return;
      }
      
      // Development mode - allow logged-in users to edit
      if (process.env.NODE_ENV === 'development') {
        setCanEdit(true);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user owns this handbook or has edit permissions
        const { data: handbook, error } = await supabase
          .from('handbooks')
          .select('owner_id')
          .eq('id', initialData.id)
          .single();

        if (error) {
          console.error('Error checking handbook permissions:', error);
          setCanEdit(false);
        } else {
          setCanEdit(handbook.owner_id === user.id);
        }
      } catch (error) {
        console.error('Error checking edit permissions:', error);
        setCanEdit(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkEditPermissions();
  }, [user, authLoading, initialData.id]);

  // Handle window resize - standard responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      const isMobile = window.innerWidth < 1024;
      
      // Only change state when actually transitioning between desktop/mobile
      if (isDesktop && !previousIsDesktop) {
        // Transitioning from mobile to desktop - open sidebar
        setSidebarOpen(true);
        setPreviousIsDesktop(true);
      } else if (isMobile && previousIsDesktop) {
        // Transitioning from desktop to mobile - close sidebar
        setSidebarOpen(false);
        setPreviousIsDesktop(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [previousIsDesktop]);

  const handlePageSelect = (pageId: string) => {
    setCurrentPageId(pageId);
    // Always close sidebar on mobile when selecting a page
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    // Only allow toggling on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const closeSidebar = () => {
    // Only allow closing on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const toggleEditMode = () => {
    if (canEdit) {
      setIsEditMode(!isEditMode);
    }
  };

  // Update section
  const updateSection = async (sectionId: string, updates: Partial<Section>) => {
    try {
      const { error } = await supabase
        .from('sections')
        .update(updates)
        .eq('id', sectionId);

      if (error) throw error;

      // Update local state
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.map(section =>
          section.id === sectionId ? { ...section, ...updates } : section
        )
      }));
    } catch (error) {
      console.error('Error updating section:', error);
    }
  };

  // Update page
  const updatePage = async (pageId: string, updates: Partial<Page>) => {
    try {
      const { error } = await supabase
        .from('pages')
        .update(updates)
        .eq('id', pageId);

      if (error) throw error;

      // Update local state
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.map(section => ({
          ...section,
          pages: section.pages.map(page =>
            page.id === pageId ? { ...page, ...updates } : page
          )
        }))
      }));
    } catch (error) {
      console.error('Error updating page:', error);
    }
  };

  // Add new section
  const addSection = async (title: string) => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .insert({
          title,
          description: '',
          order_index: handbookData.sections.length,
          handbook_id: initialData.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const newSection: Section = {
        id: data.id,
        title: data.title,
        description: data.description,
        pages: []
      };

      setHandbookData(prev => ({
        ...prev,
        sections: [...prev.sections, newSection]
      }));
    } catch (error) {
      console.error('Error adding section:', error);
    }
  };

  // Add new page
  const addPage = async (sectionId: string, title: string, content: string = '') => {
    try {
      const section = handbookData.sections.find(s => s.id === sectionId);
      if (!section) return;

      const { data, error } = await supabase
        .from('pages')
        .insert({
          title,
          content,
          order_index: section.pages.length,
          section_id: sectionId
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.map(section =>
          section.id === sectionId
            ? { ...section, pages: [...section.pages, data] }
            : section
        )
      }));
    } catch (error) {
      console.error('Error adding page:', error);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  if (!handbookData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        onToggleSidebar={toggleSidebar}
        onCloseSidebar={closeSidebar}
        handbookTitle={handbookData.title}
        handbookSubtitle={handbookData.subtitle}
        sidebarOpen={sidebarOpen}
        canEdit={canEdit}
        isEditMode={isEditMode}
        onToggleEditMode={toggleEditMode}
      />

      {/* Main layout */}
      <div className="flex bg-white">
        {/* Sidebar - only takes space on desktop */}
        <div className="hidden lg:block">
          <Sidebar
            sections={handbookData.sections}
            currentPageId={currentPageId || ''}
            onPageSelect={handlePageSelect}
            isOpen={sidebarOpen}
            onClose={closeSidebar}
            showMobileHeader={false}
            canEdit={canEdit}
            onAddSection={addSection}
          />
        </div>

        {/* Mobile sidebar overlay */}
        <div className="lg:hidden">
          <Sidebar
            sections={handbookData.sections}
            currentPageId={currentPageId || ''}
            onPageSelect={handlePageSelect}
            isOpen={sidebarOpen}
            onClose={closeSidebar}
            showMobileHeader={true}
            canEdit={canEdit}
            onAddSection={addSection}
          />
        </div>

        {/* Main content */}
        <div className="flex-1">
          <ContentArea
            sections={handbookData.sections}
            currentPageId={currentPageId}
            isEditMode={isEditMode}
            onUpdateSection={updateSection}
            onUpdatePage={updatePage}
            onAddPage={addPage}
          />
        </div>
      </div>
    </div>
  );
}; 