'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './handbook/Header';
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

  // Edit mode state - use defaultEditMode prop
  const [isEditMode, setIsEditMode] = useState(defaultEditMode);
  const [handbookData, setHandbookData] = useState(initialData);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Search state
  const [searchResults, setSearchResults] = useState<Array<{
    pageId: string;
    pageTitle: string;
    sectionTitle: string;
    snippet: string;
  }>>([]);

  // Auth context
  const { user, isLoading: authLoading } = useAuth();

  console.log('🎯 ModernHandbookClient render state:', {
    user: !!user,
    authLoading,
    canEdit,
    isEditMode,
    handbookId: initialData.id
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

  // Search function
  const handleSearch = (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const results: Array<{
      pageId: string;
      pageTitle: string;
      sectionTitle: string;
      snippet: string;
    }> = [];

    const searchTerm = query.toLowerCase();

    visibleSections.forEach(section => {
      section.pages.forEach(page => {
        const titleMatch = page.title.toLowerCase().includes(searchTerm);
        const contentMatch = page.content?.toLowerCase().includes(searchTerm);

        if (titleMatch || contentMatch) {
          // Create snippet
          let snippet = '';
          if (contentMatch && page.content) {
            const contentLower = page.content.toLowerCase();
            const index = contentLower.indexOf(searchTerm);
            const start = Math.max(0, index - 50);
            const end = Math.min(page.content.length, index + searchTerm.length + 50);
            snippet = page.content.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < page.content.length) snippet = snippet + '...';
          } else if (titleMatch) {
            snippet = page.content?.substring(0, 100) || '';
            if (page.content && page.content.length > 100) snippet += '...';
          }

          results.push({
            pageId: page.id,
            pageTitle: page.title,
            sectionTitle: section.title,
            snippet: snippet.replace(/[#*]/g, '').trim() // Remove markdown formatting
          });
        }
      });
    });

    setSearchResults(results);
  };

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
      setHandbookData(prev => {
        const newSections = [...prev.sections];
        
        // Swap the sections
        [newSections[currentIndex], newSections[newIndex]] = [newSections[newIndex], newSections[currentIndex]];
        
        // Update their order_index in local state too
        newSections[currentIndex] = {
          ...newSections[currentIndex],
          order_index: currentIndex
        };
        newSections[newIndex] = {
          ...newSections[newIndex],
          order_index: newIndex
        };

        return {
          ...prev,
          sections: newSections
        };
      });

      console.log(`Moved section ${direction}:`, { currentIndex, newIndex });
    } catch (error) {
      console.error('Error moving section:', error);
    }
  };

  if (isLoading || authLoading) {
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
        {/* Header */}
        <Header
          handbookTitle={handbookData.title}
          handbookSubtitle={handbookData.subtitle}
          canEdit={canEdit}
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode(!isEditMode)}
          onSearch={handleSearch}
          searchResults={searchResults}
        />

        {/* Main layout with sidebar */}
        <div className="flex-1 flex relative">
          {/* Modern Sidebar */}
          <div className="relative z-30">
            <ModernSidebar
              sections={visibleSections}
              currentPageId={currentPageId || ''}
              onPageSelect={handlePageSelect}
              onSectionSelect={(sectionId) => {
                // Handle section selection
                setCurrentPageId(undefined);
                // Scroll to section
                setTimeout(() => {
                  const element = document.getElementById(`section-${sectionId}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
            />
          </div>
          
          {/* Main content area */}
          <SidebarInset className="flex-1 flex flex-col min-w-0">
            {/* Main content */}
            <main className="flex-1 overflow-auto w-full">
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
            </main>
            
            {/* Footer */}
            <MainFooter variant="app" />
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}; 