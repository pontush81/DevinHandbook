'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HandbookHeader } from './handbook/HandbookHeader';
import { ModernSidebar, SidebarTrigger } from './handbook/ModernSidebar';
import { ContentArea } from './handbook/ContentArea';
import { HandbookSection as Section, HandbookPage as Page } from '@/types/handbook';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainFooter } from '@/components/layout/MainFooter';
import { MembersManager } from '@/components/handbook/MembersManager';

interface ModernHandbookClientProps {
  initialData: {
    id: string;
    title: string;
    subtitle?: string;
    sections: Section[];
    theme?: {
      primary_color?: string;
      secondary_color?: string;
      logo_url?: string | null;
    };
  };
  defaultEditMode?: boolean;
}

export const ModernHandbookClient: React.FC<ModernHandbookClientProps> = ({ 
  initialData,
  defaultEditMode = false
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const [handbookData, setHandbookData] = useState(initialData);
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(undefined);
  const [isEditMode, setIsEditMode] = useState(defaultEditMode);
  const [editView, setEditView] = useState<'content' | 'members' | 'structure'>('content'); // Växla mellan innehåll och medlemmar
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Add missing state variables for dialog management
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [openSectionDialog, setOpenSectionDialog] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [openDeleteSectionDialog, setOpenDeleteSectionDialog] = useState(false);

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
      console.log('🔍 [ModernHandbookClient] Checking edit permissions...', {
        authLoading,
        user: !!user,
        userId: user?.id,
        userEmail: user?.email,
        handbookId: initialData.id,
        timestamp: new Date().toISOString()
      });
      
      if (authLoading) {
        console.log('⏳ [ModernHandbookClient] Auth is still loading, waiting...');
        return;
      }
      
      // DEVELOPMENT OVERRIDE: Force edit permissions for testing
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 [ModernHandbookClient] DEVELOPMENT MODE: Forcing edit permissions for testing');
        setCanEdit(true);
        setIsLoading(false);
        return;
      }
      
      // Require user to be logged in
      if (!user) {
        console.log('❌ [ModernHandbookClient] No user found, setting canEdit to false');
        setCanEdit(false);
        setIsLoading(false);
        return;
      }
      
      console.log('✅ [ModernHandbookClient] User found:', {
        id: user.id,
        email: user.email
      });

      try {
        console.log('🔍 [ModernHandbookClient] Checking handbook admin permissions...');
        // Check if user is admin for this handbook
        const { data: memberData, error } = await supabase
          .from('handbook_members')
          .select('role')
          .eq('handbook_id', initialData.id)
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('❌ [ModernHandbookClient] Error checking handbook admin permissions:', error);
          setCanEdit(false);
        } else {
          const isAdmin = !!memberData;
          console.log('📋 [ModernHandbookClient] Handbook admin check:', {
            handbookId: initialData.id,
            userId: user.id,
            isAdmin,
            memberData
          });
          setCanEdit(isAdmin);
        }
      } catch (error) {
        console.error('❌ [ModernHandbookClient] Error checking edit permissions:', error);
        setCanEdit(false);
      } finally {
        console.log('🏁 [ModernHandbookClient] Setting isLoading to false');
        setIsLoading(false);
      }
    };

    checkEditPermissions();
    
    // Backup timeout: If auth is still loading after 5 seconds, assume no auth and proceed
    const timeoutId = setTimeout(() => {
      if (authLoading) {
        console.log('⏰ [ModernHandbookClient] Auth loading timeout - forcing development permissions');
        if (process.env.NODE_ENV === 'development') {
          setCanEdit(true);
        } else {
          setCanEdit(false);
        }
        setIsLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
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

  // Update section - Include API call to Supabase
  const updateSection = async (sectionId: string, updates: Partial<Section>) => {
    try {
      console.log('[ModernHandbookClient] Updating section in Supabase:', { sectionId, updates });

      // Make API call to update in Supabase
      const response = await fetch(`/api/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to update section');
      }

      const updatedSection = await response.json();
      console.log('[ModernHandbookClient] Section updated in Supabase:', updatedSection);

      // Update local state with the response from Supabase
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.map(section =>
          section.id === sectionId ? { ...section, ...updatedSection } : section
        )
      }));
      
      console.log('[ModernHandbookClient] Local state updated successfully');
    } catch (error) {
      console.error('[ModernHandbookClient] Error updating section:', error);
      throw error; // Re-throw so AllSectionsView can handle the error
    }
  };

  // Update page - Include API call to Supabase
  const updatePage = async (pageId: string, updates: Partial<Page>) => {
    try {
      console.log('[ModernHandbookClient] Updating page in Supabase:', { pageId, updates });

      // Make API call to update in Supabase
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to update page');
      }

      const updatedPage = await response.json();
      console.log('[ModernHandbookClient] Page updated in Supabase:', updatedPage);

      // Update local state with the response from Supabase
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.map(section => ({
          ...section,
          pages: (section.pages || []).map(page =>
            page.id === pageId ? { ...page, ...updatedPage } : page
          )
        }))
      }));
      
      console.log('[ModernHandbookClient] Local page state updated successfully');
    } catch (error) {
      console.error('[ModernHandbookClient] Error updating page:', error);
      throw error; // Re-throw so SinglePageView/AllSectionsView can handle the error
    }
  };

  // Add new section - Make API call to create the section properly
  const addSection = async (newSection: Section) => {
    try {
      console.log('[ModernHandbookClient] Adding section to state:', newSection);
      console.log('[ModernHandbookClient] Current sections before adding:', handbookData.sections.map(s => ({ id: s.id, title: s.title })));

      // Validate the section has required fields
      if (!newSection.id) {
        const errorMsg = 'Section missing ID - cannot add to state without database ID';
        console.error('[ModernHandbookClient]', errorMsg, newSection);
        throw new Error(errorMsg);
      }

      // Check if section already exists to avoid duplicates
      const existingSection = handbookData.sections.find(s => s.id === newSection.id);
      if (existingSection) {
        console.warn('[ModernHandbookClient] Section already exists in state:', newSection.id);
        return; // Don't add duplicate
      }

      // Ensure the section has the proper structure with pages array
      const fullSection = {
        ...newSection,
        pages: newSection.pages || [], // Ensure pages array exists
        is_public: newSection.is_public !== undefined ? newSection.is_public : true,
        is_published: newSection.is_published !== undefined ? newSection.is_published : true,
        icon: newSection.icon || 'BookOpen' // Default icon if missing
      };

      console.log('[ModernHandbookClient] Prepared section for state:', fullSection);

      // Update local state with the complete section
      setHandbookData(prev => {
        const newState = {
          ...prev,
          sections: [...prev.sections, fullSection]
        };
        console.log('[ModernHandbookClient] New state will have sections:', newState.sections.map(s => ({ id: s.id, title: s.title })));
        return newState;
      });

      console.log('[ModernHandbookClient] Section added to local state successfully:', fullSection.id);
    } catch (error) {
      console.error('[ModernHandbookClient] Error adding section to local state:', error);
      throw error; // Re-throw so ContentArea can handle the error
    }
  };

  // Add new page
  const addPage = async (sectionId: string, pageData: Partial<Page>) => {
    try {
      console.log('[ModernHandbookClient] Adding page to section:', { sectionId, pageData });
      console.log('[ModernHandbookClient] Current handbook sections:', handbookData.sections.map(s => ({ 
        id: s.id, 
        title: s.title,
        pagesCount: s.pages?.length || 0 
      })));

      const section = handbookData.sections.find(s => s.id === sectionId);
      if (!section) {
        const errorMsg = `Section not found: ${sectionId}. Available sections: ${handbookData.sections.map(s => `${s.id} (${s.title})`).join(', ')}`;
        console.error('[ModernHandbookClient]', errorMsg);
        
        // Try to refresh the handbook data from the server to see if the section exists there
        console.log('[ModernHandbookClient] Attempting to refresh handbook data to find missing section...');
        try {
          const response = await fetch(`/api/handbooks/${handbookData.id}`);
          if (response.ok) {
            const freshHandbookData = await response.json();
            console.log('[ModernHandbookClient] Fresh data from server:', {
              sections: freshHandbookData.sections?.map(s => ({ id: s.id, title: s.title })) || []
            });
            
            // Adapt the fresh data to the expected structure (same as in the parent component)
            const adaptedData = {
              id: freshHandbookData.id,
              title: freshHandbookData.title || '',
              subtitle: freshHandbookData.subtitle || '',
              sections: (freshHandbookData.sections || []).map((section: any) => ({
                id: section.id,
                title: section.title,
                description: section.description,
                order_index: section.order_index,
                handbook_id: section.handbook_id,
                is_public: section.is_public,
                is_published: section.is_published,
                icon: section.icon,
                pages: (section.pages || []).map((page: any) => ({
                  id: page.id,
                  title: page.title,
                  content: page.content,
                  slug: page.slug,
                  order_index: page.order_index,
                  section_id: page.section_id,
                  is_published: page.is_published,
                  created_at: page.created_at,
                  updated_at: page.updated_at
                }))
              }))
            };
            
            const sectionInFreshData = adaptedData.sections.find(s => s.id === sectionId);
            if (sectionInFreshData) {
              console.log('[ModernHandbookClient] Found section in fresh data! Updating local state and retrying...');
              setHandbookData(adaptedData);
              
              // Wait a bit for state to update, then retry
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Don't call recursively, instead check the updated section directly
              const updatedSection = adaptedData.sections.find(s => s.id === sectionId);
              if (!updatedSection) {
                throw new Error('Section still not found after refresh');
              }
              
              // Continue with the page creation using the fresh section
              console.log('[ModernHandbookClient] Proceeding with fresh section data:', updatedSection);
              
              // Generate slug from title
              const slug = pageData.title
                ?.toLowerCase()
                .replace(/[^a-z0-9\s-åäöÅÄÖ]/g, '') // Allow Swedish characters
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim() || 'ny-sida';

              const newPageData = {
                title: pageData.title || 'Ny sida',
                content: pageData.content || '',
                order_index: updatedSection.pages.length,
                section_id: sectionId,
                slug: slug,
                is_published: true,
                table_of_contents: true
              };

              console.log('[ModernHandbookClient] Sending page data to API:', newPageData);

              const pageResponse = await fetch('/api/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPageData)
              });

              if (!pageResponse.ok) {
                let errorDetails = '';
                try {
                  const errorData = await pageResponse.json();
                  errorDetails = errorData.details || errorData.error || 'Unknown error';
                  console.error('[ModernHandbookClient] API Error Response (JSON):', errorData);
                } catch {
                  errorDetails = await pageResponse.text();
                  console.error('[ModernHandbookClient] API Error Response (Text):', errorDetails);
                }
                
                const errorMsg = `Failed to create page: ${pageResponse.status} ${pageResponse.statusText} - ${errorDetails}`;
                console.error('[ModernHandbookClient] API Error:', errorMsg);
                throw new Error(errorMsg);
              }

              const newPage = await pageResponse.json();
              console.log('[ModernHandbookClient] Page created successfully:', newPage);

              // Update local state with the new page
              setHandbookData(prev => ({
                ...prev,
                sections: prev.sections.map(section =>
                  section.id === sectionId
                    ? { ...section, pages: [...section.pages, newPage] }
                    : section
                )
              }));

              return newPage;
            }
          }
        } catch (refreshError) {
          console.error('[ModernHandbookClient] Failed to refresh handbook data:', refreshError);
        }
        
        throw new Error(errorMsg);
      }

      // Generate slug from title
      const slug = pageData.title
        ?.toLowerCase()
        .replace(/[^a-z0-9\s-åäöÅÄÖ]/g, '') // Allow Swedish characters
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() || 'ny-sida';

      const newPageData = {
        title: pageData.title || 'Ny sida',
        content: pageData.content || '',
        order_index: section.pages.length,
        section_id: sectionId,
        slug: slug,
        is_published: true,
        table_of_contents: true
      };

      console.log('[ModernHandbookClient] Sending page data to API:', newPageData);

      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPageData)
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = errorData.details || errorData.error || 'Unknown error';
          console.error('[ModernHandbookClient] API Error Response (JSON):', errorData);
        } catch {
          errorDetails = await response.text();
          console.error('[ModernHandbookClient] API Error Response (Text):', errorDetails);
        }
        
        const errorMsg = `Failed to create page: ${response.status} ${response.statusText} - ${errorDetails}`;
        console.error('[ModernHandbookClient] API Error:', errorMsg);
        throw new Error(errorMsg);
      }

      const newPage = await response.json();
      console.log('[ModernHandbookClient] Page created successfully:', newPage);

      // Update local state
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.map(section =>
          section.id === sectionId
            ? { ...section, pages: [...section.pages, newPage] }
            : section
        )
      }));

      return newPage;

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error('[ModernHandbookClient] Error adding page:', {
        error: errorMsg,
        sectionId,
        pageData,
        availableSections: handbookData.sections.map(s => ({ id: s.id, title: s.title })),
        stack: error.stack
      });
      // Re-throw the error so ContentArea can handle it
      throw error;
    }
  };

  // Delete page
  const deletePage = async (pageId: string, sectionId: string) => {
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      // Update local state by removing the page from its section
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.map(section =>
          section.id === sectionId
            ? { ...section, pages: section.pages.filter(page => page.id !== pageId) }
            : section
        )
      }));

      // If the deleted page was currently selected, clear the selection
      if (currentPageId === pageId) {
        setCurrentPageId(undefined);
      }
    } catch (error) {
      console.error('Error deleting page:', error);
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

  // Get visible sections based on edit mode and section properties
  const getVisibleSections = (sections: Section[]) => {
    if (isEditMode) {
      // In edit mode, show ALL sections regardless of visibility status
      console.log('[getVisibleSections] Edit mode: showing all sections');
      return sections;
    }
    
    // For normal view mode, filter by both is_public AND is_published
    const filtered = sections.filter(section => {
      const isVisible = section.is_public !== false && section.is_published !== false;
      console.log(`[getVisibleSections] Section "${section.title}": is_public=${section.is_public}, is_published=${section.is_published}, visible=${isVisible}`);
      return isVisible;
    });
    
    console.log(`[getVisibleSections] Normal mode: showing ${filtered.length}/${sections.length} sections`);
    return filtered;
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
    // Reset till innehållsvy när man avslutar redigeringsläget
    if (isEditMode) {
      setEditView('content');
    }
  };

  // Add missing handleToggleSection function
  const handleToggleSection = async (sectionId: string, isPublished: boolean) => {
    try {
      console.log('🔄 Toggling section visibility:', { sectionId, isPublished });
      
      // Update in database
      const { error } = await supabase
        .from('sections')
        .update({ is_published: isPublished })
        .eq('id', sectionId);

      if (error) {
        console.error('❌ Error updating section visibility:', error);
        return;
      }

      // Update local state
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.map(section =>
          section.id === sectionId 
            ? { ...section, is_published: isPublished }
            : section
        )
      }));

      console.log('✅ Section visibility updated successfully');
    } catch (error) {
      console.error('❌ Error in handleToggleSection:', error);
    }
  };

  // Get theme colors with fallbacks
  const primaryColor = handbookData.theme?.primary_color || '#3498db';
  const secondaryColor = handbookData.theme?.secondary_color || '#2c3e50';

  if (isLoading || authLoading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderBottomColor: primaryColor }}
          ></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  if (!handbookData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderBottomColor: primaryColor }}
          ></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Full viewport container with proper mobile flex layout */}
      <div className="h-screen w-full flex flex-col overflow-hidden">
        {/* Header - Using new HandbookHeader with edit functionality */}
        <HandbookHeader 
          handbookTitle={handbookData.title}
          canEdit={canEdit}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          theme={handbookData.theme}
        />

        {/* Main layout container - takes remaining space, mobile optimized */}
        <div className="flex flex-1 min-h-0 overflow-hidden touch-pan-y">
          {/* Sidebar - Fixed width sidebar */}
          <ModernSidebar
            sections={visibleSections}
            currentPageId={currentPageId}
            onPageSelect={setCurrentPageId}
            onSectionSelect={(sectionId) => {
              console.log('🎯 Section selected for scrolling:', sectionId);
              
              // Clear any selected page to show full overview
              setCurrentPageId(undefined);
              
              // Scroll to the section within the content container
              setTimeout(() => {
                const sectionElement = document.getElementById(`section-${sectionId}`);
                const scrollContainer = document.querySelector('.main-content-scrollable');
                
                if (sectionElement && scrollContainer) {
                  console.log('📍 Scrolling to section:', sectionId);
                  
                  // Calculate offset for header within the scroll container
                  const containerRect = scrollContainer.getBoundingClientRect();
                  const sectionRect = sectionElement.getBoundingClientRect();
                  const scrollTop = scrollContainer.scrollTop;
                  const targetPosition = scrollTop + (sectionRect.top - containerRect.top) - 20;
                  
                  scrollContainer.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                  });
                } else {
                  console.warn('🚨 Could not find scroll container or section element');
                }
              }, 100);
            }}
            editMode={isEditMode}
            onEditSection={(sectionId) => {
              const section = visibleSections.find(s => s.id === sectionId);
              if (section) {
                setEditingSection(section);
                setOpenSectionDialog(true);
              }
            }}
            onDeleteSection={(sectionId) => {
              const section = visibleSections.find(s => s.id === sectionId);
              if (section) {
                setSectionToDelete(section);
                setOpenDeleteSectionDialog(true);
              }
            }}
            onToggleSection={(sectionId) => {
              const section = visibleSections.find(s => s.id === sectionId);
              if (section) {
                handleToggleSection(sectionId, !section.is_published);
              }
            }}
            onMoveSection={moveSection}
          />

          {/* Main content area */}
          <SidebarInset className="flex-1 min-h-0">
            {/* Main content - Mobile optimized scrollable container */}
            <div className="main-content-scrollable flex flex-col">
              <div className="flex-1 min-h-0">
                {/* Edit mode navigation tabs */}
                {isEditMode && canEdit && (
                  <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-1">
                      <button
                        onClick={() => setEditView('content')}
                        className={`flex-1 sm:flex-none px-3 sm:px-4 py-3 sm:py-2 text-sm font-medium rounded-md transition-colors touch-manipulation ${
                          editView === 'content'
                            ? 'text-white border'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        style={editView === 'content' ? {
                          backgroundColor: primaryColor,
                          borderColor: primaryColor
                        } : {}}
                      >
                        📝 Redigera innehåll
                      </button>
                      <button
                        onClick={() => setEditView('structure')}
                        className={`flex-1 sm:flex-none px-3 sm:px-4 py-3 sm:py-2 text-sm font-medium rounded-md transition-colors touch-manipulation ${
                          editView === 'structure'
                            ? 'text-white border'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        style={editView === 'structure' ? {
                          backgroundColor: primaryColor,
                          borderColor: primaryColor
                        } : {}}
                      >
                        🏗️ Hantera struktur
                      </button>
                    </div>
                  </div>
                )}

                {/* Main content with proper mobile-optimized flex properties */}
                <ContentArea
                  sections={visibleSections}
                  currentPageId={currentPageId}
                  isEditMode={isEditMode}
                  handbookId={handbookData.id}
                  onUpdateSection={updateSection}
                  onUpdatePage={updatePage}
                  onAddPage={addPage}
                  onDeletePage={deletePage}
                  onAddSection={addSection}
                  onMoveSection={moveSection}
                  onDeleteSection={deleteSection}
                  onExitEditMode={() => setIsEditMode(false)}
                />
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}; 