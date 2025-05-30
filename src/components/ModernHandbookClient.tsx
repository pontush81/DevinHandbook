'use client';

import React, { useState, useEffect } from 'react';
import { HandbookHeader } from './handbook/HandbookHeader';
import { ModernSidebar, SidebarTrigger } from './handbook/ModernSidebar';
import { ContentArea } from './handbook/ContentArea';
import { HandbookSection as Section, HandbookPage as Page } from '@/types/handbook';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainFooter } from '@/components/layout/MainFooter';

interface ModernHandbookClientProps {
  initialData: {
    id: string;
    title: string;
    subtitle?: string;
    sections: Section[];
  };
  defaultEditMode?: boolean;
}

export const ModernHandbookClient: React.FC<ModernHandbookClientProps> = ({ 
  initialData,
  defaultEditMode = false
}) => {
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Edit mode state - use defaultEditMode prop
  const [isEditMode, setIsEditMode] = useState(defaultEditMode);
  const [handbookData, setHandbookData] = useState(initialData);
  const [canEdit, setCanEdit] = useState(false);

  // Auth context
  const { user, isLoading: authLoading } = useAuth();

  // Hydration fix - vänta tills komponenten är mounted på klienten
  useEffect(() => {
    setMounted(true);
    setIsLoading(false);
  }, []);

  console.log('🎯 ModernHandbookClient render state:', {
    user: !!user,
    authLoading,
    canEdit,
    isEditMode,
    handbookId: initialData.id,
    mounted,
    timestamp: new Date().toISOString() // Cache buster for deployment
  });

  // Check if user can edit this handbook (admin role required)
  useEffect(() => {
    const checkEditPermissions = async () => {
      console.log('🔍 Checking edit permissions...', {
        authLoading,
        user: !!user,
        userId: user?.id,
        userEmail: user?.email,
        handbookId: initialData.id
      });
      
      if (authLoading) {
        console.log('⏳ Auth is still loading, waiting...');
        return;
      }
      
      // Require user to be logged in
      if (!user) {
        console.log('❌ No user found, setting canEdit to false');
        setCanEdit(false);
        setIsLoading(false);
        return;
      }
      
      console.log('✅ User found:', {
        id: user.id,
        email: user.email
      });

      try {
        console.log('🔍 Checking handbook admin permissions...');
        // Check if user is admin for this handbook
        const { data: memberData, error } = await supabase
          .from('handbook_members')
          .select('role')
          .eq('handbook_id', initialData.id)
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('❌ Error checking handbook admin permissions:', error);
          setCanEdit(false);
        } else {
          const isAdmin = !!memberData;
          console.log('📋 Handbook admin check:', {
            handbookId: initialData.id,
            userId: user.id,
            isAdmin,
            memberData
          });
          setCanEdit(isAdmin);
        }
      } catch (error) {
        console.error('❌ Error checking edit permissions:', error);
        setCanEdit(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkEditPermissions();
  }, [user, authLoading, initialData.id]);

  // Handle page selection from search results via URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#page-')) {
        const pageId = hash.substring(6); // Remove '#page-'
        handlePageSelect(pageId);
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen for edit mode toggle from header
  useEffect(() => {
    const handleToggleEditMode = () => {
      if (canEdit) {
        console.log('🔧 Toggling edit mode from header event');
        setIsEditMode(!isEditMode);
      }
    };

    window.addEventListener('toggleEditMode', handleToggleEditMode);
    return () => window.removeEventListener('toggleEditMode', handleToggleEditMode);
  }, [canEdit, isEditMode]);

  const handlePageSelect = (pageId: string) => {
    setCurrentPageId(pageId);
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
  const addSection = async (title: string, insertIndex?: number) => {
    try {
      console.log('Adding section:', { title, insertIndex });
      
      // Calculate the correct order_index based on insertIndex
      const orderIndex = insertIndex !== undefined ? insertIndex : handbookData.sections.length;
      
      console.log('Using order_index:', orderIndex);
      
      // If we're inserting in the middle, update order_index for existing sections
      if (insertIndex !== undefined && insertIndex < handbookData.sections.length) {
        console.log('Updating order_index for existing sections...');
        
        // Update all sections that come after the insert position
        for (let i = insertIndex; i < handbookData.sections.length; i++) {
          const section = handbookData.sections[i];
          await supabase
            .from('sections')
            .update({ order_index: (section.order_index || i) + 1 })
            .eq('id', section.id);
        }
      }
      
      // Create the section first
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .insert({
          title,
          description: '',
          order_index: orderIndex,
          handbook_id: initialData.id
        })
        .select()
        .single();

      if (sectionError) {
        console.error('Error creating section:', sectionError);
        throw sectionError;
      }

      console.log('Section created:', sectionData);

      // Create a default first page for the section
      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .insert({
          title: 'Ny sida',
          content: 'Skriv innehåll här... (Markdown stöds)',
          order_index: 0,
          section_id: sectionData.id,
          slug: `ny-sida-${Date.now()}` // Generate a unique slug
        })
        .select()
        .single();

      if (pageError) {
        console.error('Error creating page:', pageError);
        throw pageError;
      }

      console.log('Page created:', pageData);

      // Update local state with complete section including the first page
      const newSection: Section = {
        id: sectionData.id,
        title: sectionData.title,
        description: sectionData.description,
        order_index: sectionData.order_index,
        handbook_id: sectionData.handbook_id,
        pages: [pageData]
      };

      setHandbookData(prev => {
        const newSections = [...prev.sections];
        
        // Update order_index for existing sections in local state
        if (insertIndex !== undefined && insertIndex < newSections.length) {
          for (let i = insertIndex; i < newSections.length; i++) {
            newSections[i] = {
              ...newSections[i],
              order_index: (newSections[i].order_index || i) + 1
            };
          }
        }
        
        // Insert the new section at the correct position
        if (insertIndex !== undefined) {
          console.log('Inserting at index:', insertIndex);
          newSections.splice(insertIndex, 0, newSection);
        } else {
          console.log('Adding at end');
          newSections.push(newSection);
        }
        
        console.log('Updated sections count:', newSections.length);
        
        return {
          ...prev,
          sections: newSections
        };
      });

      console.log('Section added successfully');
    } catch (error) {
      console.error('Error adding section:', error);
    }
  };

  // Add new page
  const addPage = async (sectionId: string, title: string, content: string = '') => {
    try {
      const section = handbookData.sections.find(s => s.id === sectionId);
      if (!section) return;

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-åäöÅÄÖ]/g, '') // Allow Swedish characters
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const { data, error } = await supabase
        .from('pages')
        .insert({
          title,
          content,
          order_index: section.pages.length,
          section_id: sectionId,
          slug: slug || 'ny-sida', // Fallback slug if title is empty
          is_published: true,
          table_of_contents: true
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

  // Delete section
  const deleteSection = async (sectionId: string) => {
    try {
      // First delete all pages in the section
      const { error: pagesError } = await supabase
        .from('pages')
        .delete()
        .eq('section_id', sectionId);

      if (pagesError) throw pagesError;

      // Then delete the section
      const { error: sectionError } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);

      if (sectionError) throw sectionError;

      // Update local state
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.filter(section => section.id !== sectionId)
      }));
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  };

  // Filter sections based on user permissions and public status
  const getVisibleSections = (sections: Section[]) => {
    // If user can edit (is admin), show all sections
    if (canEdit) {
      return sections;
    }
    
    // For regular users, only show public sections
    return sections.filter(section => section.is_public !== false);
  };

  const visibleSections = getVisibleSections(handbookData.sections);

  // Move section up or down
  const moveSection = async (sectionId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = handbookData.sections.findIndex(s => s.id === sectionId);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Check bounds
      if (newIndex < 0 || newIndex >= handbookData.sections.length) return;

      const currentSection = handbookData.sections[currentIndex];
      const targetSection = handbookData.sections[newIndex];

      // Swap order_index in database
      await supabase
        .from('sections')
        .update({ order_index: targetSection.order_index })
        .eq('id', currentSection.id);

      await supabase
        .from('sections')
        .update({ order_index: currentSection.order_index })
        .eq('id', targetSection.id);

      // Update local state
      const newSections = [...handbookData.sections];
      [newSections[currentIndex], newSections[newIndex]] = [newSections[newIndex], newSections[currentIndex]];
      
      setHandbookData(prev => ({
        ...prev,
        sections: newSections
      }));

    } catch (error) {
      console.error('Error moving section:', error);
    }
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  if (isLoading || authLoading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  if (!handbookData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex flex-col">
        {/* Header - Using new HandbookHeader with edit functionality */}
        <HandbookHeader 
          handbookTitle={handbookData.title}
          canEdit={canEdit}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
        />

        <div className="flex flex-1">
          {/* Sidebar - No top padding/margin to connect with header */}
          <ModernSidebar
            sections={visibleSections}
            currentPageId={currentPageId}
            onPageSelect={setCurrentPageId}
            onSectionSelect={(sectionId) => {
              console.log('🎯 Section selected for scrolling:', sectionId);
              
              // Clear any selected page to show full overview
              setCurrentPageId(undefined);
              
              // Scroll to the section
              setTimeout(() => {
                const sectionElement = document.getElementById(`section-${sectionId}`);
                if (sectionElement) {
                  console.log('📍 Scrolling to section:', sectionId);
                  
                  // Calculate offset for fixed header (64px header + 16px padding)
                  const headerOffset = 80;
                  const elementPosition = sectionElement.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                  
                  window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                  });
                } else {
                  console.warn('⚠️ Section element not found:', `section-${sectionId}`);
                }
              }, 100); // Small delay to ensure DOM is updated
            }}
          />

          {/* Main content area */}
          <SidebarInset className="flex-1">
            {/* Main content - Proper height for scrolling with footer space */}
            <div className="h-full w-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <ContentArea
                  sections={visibleSections}
                  currentPageId={currentPageId}
                  isEditMode={isEditMode}
                  handbookId={initialData.id}
                  onUpdateSection={updateSection}
                  onUpdatePage={updatePage}
                  onAddPage={addPage}
                  onAddSection={addSection}
                  onMoveSection={moveSection}
                  onDeleteSection={deleteSection}
                  onExitEditMode={() => setIsEditMode(false)}
                />
              </div>
              
              {/* Footer - positioned within the content area */}
              <div className="flex-shrink-0">
                <MainFooter />
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}; 