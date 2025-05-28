'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './handbook/Header';
import { Sidebar } from './handbook/Sidebar';
import { ContentArea } from './handbook/ContentArea';
import { HandbookSection as Section, HandbookPage as Page } from '@/types/handbook';
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

  // Search state
  const [searchResults, setSearchResults] = useState<Array<{
    pageId: string;
    pageTitle: string;
    sectionTitle: string;
    snippet: string;
  }>>([]);

  // Auth context
  const { user, isLoading: authLoading } = useAuth();

  // Temporary development override - show edit buttons for any logged-in user
  const canEditOverride = process.env.NODE_ENV === 'development' && !!user;
  const effectiveCanEdit = canEditOverride || canEdit;

  console.log('🎯 ModernHandbookClient render state:', {
    user: !!user,
    authLoading,
    canEdit,
    canEditOverride,
    effectiveCanEdit,
    isEditMode,
    environment: process.env.NODE_ENV
  });

  // Check if user can edit this handbook
  useEffect(() => {
    const checkEditPermissions = async () => {
      console.log('🔍 Checking edit permissions...', {
        authLoading,
        user: !!user,
        userId: user?.id,
        userEmail: user?.email,
        environment: process.env.NODE_ENV,
        handbookId: initialData.id
      });
      
      if (authLoading) {
        console.log('⏳ Auth is still loading, waiting...');
        return;
      }
      
      // Require user to be logged in even in development
      if (!user) {
        console.log('❌ No user found, setting canEdit to false');
        setCanEdit(false);
        setIsLoading(false);
        return;
      }
      
      console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      });
      
      // Development mode - allow logged-in users to edit
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: allowing edit for logged-in user');
        setCanEdit(true);
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 Checking handbook ownership...');
        // Check if user owns this handbook or has edit permissions
        const { data: handbook, error } = await supabase
          .from('handbooks')
          .select('owner_id')
          .eq('id', initialData.id)
          .single();

        if (error) {
          console.error('❌ Error checking handbook permissions:', error);
          setCanEdit(false);
        } else {
          const canUserEdit = handbook.owner_id === user.id;
          console.log('📋 Handbook ownership check:', {
            handbookOwnerId: handbook.owner_id,
            currentUserId: user.id,
            canEdit: canUserEdit
          });
          setCanEdit(canUserEdit);
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
    if (effectiveCanEdit) {
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
    if (effectiveCanEdit) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <Header
        onToggleSidebar={toggleSidebar}
        onCloseSidebar={closeSidebar}
        handbookTitle={handbookData.title}
        handbookSubtitle={handbookData.subtitle}
        sidebarOpen={sidebarOpen}
        canEdit={effectiveCanEdit}
        isEditMode={isEditMode}
        onToggleEditMode={toggleEditMode}
        onSearch={handleSearch}
        searchResults={searchResults}
      />

      {/* Main layout */}
      <div className="flex">
        {/* Sidebar - only takes space on desktop */}
        <div className="hidden lg:block">
          <Sidebar
            sections={visibleSections}
            currentPageId={currentPageId || ''}
            onPageSelect={handlePageSelect}
            isOpen={sidebarOpen}
            onClose={closeSidebar}
            showMobileHeader={false}
            canEdit={effectiveCanEdit}
            onAddSection={addSection}
          />
        </div>

        {/* Mobile sidebar overlay */}
        <div className="lg:hidden">
          <Sidebar
            sections={visibleSections}
            currentPageId={currentPageId || ''}
            onPageSelect={handlePageSelect}
            isOpen={sidebarOpen}
            onClose={closeSidebar}
            showMobileHeader={true}
            canEdit={effectiveCanEdit}
            onAddSection={addSection}
          />
        </div>

        {/* Main content */}
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
    </div>
  );
}; 