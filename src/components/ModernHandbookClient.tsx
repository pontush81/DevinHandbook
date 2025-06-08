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
import { TrialStatusBar } from '@/components/trial/TrialStatusBar';

interface ModernHandbookClientProps {
  initialData: {
    id: string;
    title: string;
    subtitle?: string;
    handbookSlug?: string;
    forum_enabled?: boolean;
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
  const [currentPageId, setCurrentPageId] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(defaultEditMode);
  const [canEdit, setCanEdit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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

  // Check if user can edit this handbook and if they are admin
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
      
      // DEVELOPMENT OVERRIDE: Allow edit permissions for logged-in users in development
      if (process.env.NODE_ENV === 'development' && user) {
        console.log('🔧 [ModernHandbookClient] DEVELOPMENT MODE: Allowing edit permissions for logged-in user');
        setCanEdit(true);
        setIsAdmin(true);
        setIsLoading(false);
        return;
      }
      
      // Require user to be logged in
      if (!user) {
        console.log('❌ [ModernHandbookClient] No user found, setting canEdit and isAdmin to false');
        setCanEdit(false);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      
      console.log('✅ [ModernHandbookClient] User found:', {
        id: user.id,
        email: user.email
      });

      try {
        console.log('🔍 [ModernHandbookClient] Checking handbook member permissions...');
        // Check user's role for this handbook
        const { data: memberData, error } = await supabase
          .from('handbook_members')
          .select('role')
          .eq('handbook_id', initialData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ [ModernHandbookClient] Error checking handbook member permissions:', error);
          setCanEdit(false);
          setIsAdmin(false);
        } else if (memberData) {
          const userRole = memberData.role;
          const canEditContent = userRole === 'admin' || userRole === 'editor';
          const isAdminUser = userRole === 'admin';
          
          console.log('📋 [ModernHandbookClient] Handbook member check:', {
            handbookId: initialData.id,
            userId: user.id,
            userRole,
            canEditContent,
            isAdminUser,
            memberData
          });
          
          setCanEdit(canEditContent);
          setIsAdmin(isAdminUser);
        } else {
          console.log('❌ [ModernHandbookClient] User is not a member of this handbook');
          setCanEdit(false);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('❌ [ModernHandbookClient] Error checking edit permissions:', error);
        setCanEdit(false);
        setIsAdmin(false);
      } finally {
        console.log('🏁 [ModernHandbookClient] Setting isLoading to false');
        setIsLoading(false);
      }
    };

    checkEditPermissions();
    
    // Backup timeout: If auth is still loading after 5 seconds, assume no auth and proceed
    const timeoutId = setTimeout(() => {
      if (authLoading) {
        console.log('⏰ [ModernHandbookClient] Auth loading timeout');
        setCanEdit(false);
        setIsAdmin(false);
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
  const addSection = async (sectionData: Partial<Section>) => {
    try {
      console.log('[ModernHandbookClient] Creating new section:', sectionData);

      // Prepare section data for API
      const newSectionData = {
        title: sectionData.title || 'Ny sektion',
        description: sectionData.description || '',
        icon: sectionData.icon || 'BookOpen',
        order_index: handbookData.sections.length,
        handbook_id: handbookData.id,
        is_published: sectionData.is_published !== undefined ? sectionData.is_published : true,
        is_public: sectionData.is_public !== undefined ? sectionData.is_public : true
      };

      console.log('[ModernHandbookClient] Sending section data to API:', newSectionData);

      const response = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSectionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create section');
      }

      const newSection = await response.json();
      console.log('[ModernHandbookClient] Section created successfully:', newSection);

      // Ensure the section has the proper structure with pages array
      const fullSection = {
        ...newSection,
        pages: [] // New sections start with no pages
      };

      // Update local state with the new section
      setHandbookData(prev => ({
        ...prev,
        sections: [...prev.sections, fullSection]
      }));

      console.log('[ModernHandbookClient] Section added to local state successfully:', fullSection.id);

      // Scroll to the newly created section after a short delay to ensure DOM is updated
      setTimeout(() => {
        const sectionElement = document.getElementById(`section-${fullSection.id}`);
        if (sectionElement) {
          sectionElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
          console.log('[ModernHandbookClient] Scrolled to new section:', fullSection.id);
        } else {
          console.warn('[ModernHandbookClient] Could not find section element to scroll to:', `section-${fullSection.id}`);
        }
      }, 100);

    } catch (error) {
      console.error('[ModernHandbookClient] Error creating section:', error);
      alert('Det gick inte att skapa sektionen. Försök igen.');
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
              
              // Generate slug from title with collision avoidance
              let slug = pageData.title
                ?.toLowerCase()
                .replace(/[^a-z0-9\s-åäöÅÄÖ]/g, '') // Allow Swedish characters
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim() || 'ny-sida';

              // Add unique suffix if it's a generic "ny-sida" title
              if (slug.startsWith('ny-sida')) {
                const timestamp = Date.now();
                const uniqueSuffix = Math.random().toString(36).substring(2, 8);
                slug = `ny-sida-${timestamp}-${uniqueSuffix}`;
              }

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

      // Generate slug from title with collision avoidance
      let slug = pageData.title
        ?.toLowerCase()
        .replace(/[^a-z0-9\s-åäöÅÄÖ]/g, '') // Allow Swedish characters
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() || 'ny-sida';

      // Add unique suffix if it's a generic "ny-sida" title
      if (slug.startsWith('ny-sida')) {
        const timestamp = Date.now();
        const uniqueSuffix = Math.random().toString(36).substring(2, 8);
        slug = `ny-sida-${timestamp}-${uniqueSuffix}`;
      }

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
      console.log('[ModernHandbookClient] Deleting page:', { pageId, sectionId });

      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete page');
      }

      console.log('[ModernHandbookClient] Page deleted successfully from database');

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

      console.log('[ModernHandbookClient] Local state updated after page deletion');
    } catch (error) {
      console.error('[ModernHandbookClient] Error deleting page:', error);
      alert('Det gick inte att radera sidan. Försök igen.');
    }
  };

  // Delete section
  const deleteSection = async (sectionId: string) => {
    try {
      console.log('[ModernHandbookClient] Deleting section:', { sectionId });

      const response = await fetch(`/api/sections/${sectionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete section');
      }

      console.log('[ModernHandbookClient] Section deleted successfully from database');

      // Update local state
      setHandbookData(prev => ({
        ...prev,
        sections: prev.sections.filter(section => section.id !== sectionId)
      }));

      console.log('[ModernHandbookClient] Local state updated after section deletion');
    } catch (error) {
      console.error('[ModernHandbookClient] Error deleting section:', error);
      alert('Det gick inte att radera sektionen. Försök igen.');
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

  // Update handbook settings
  const updateHandbook = async (handbookId: string, updates: { forum_enabled?: boolean }) => {
    try {
      console.log('🔄 Updating handbook settings:', { handbookId, updates });
      
      // Update in database
      const { error } = await supabase
        .from('handbooks')
        .update(updates)
        .eq('id', handbookId);

      if (error) {
        console.error('❌ Error updating handbook settings:', error);
        throw error;
      }

      // Update local state
      setHandbookData(prev => ({
        ...prev,
        ...updates
      }));

      console.log('✅ Handbook settings updated successfully');
    } catch (error) {
      console.error('❌ Error in updateHandbook:', error);
      throw error;
    }
  };

  // Get theme colors with fallbacks
  const primaryColor = handbookData.theme?.primary_color || '#3498db';
  const secondaryColor = handbookData.theme?.secondary_color || '#2c3e50';

  // Create trial status bar component
  const trialStatusBar = user ? (
    <div className="w-full">
      <div className="max-w-6xl mx-auto p-3">
        <TrialStatusBar 
          userId={user.id} 
          handbookId={handbookData.id}
          className=""
          onUpgrade={() => {
            // Redirect to upgrade page
            window.open('/dashboard', '_blank');
          }}
        />
      </div>
    </div>
  ) : null;

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
      {/* Full viewport container with mobile-friendly layout */}
      <div className="h-screen w-full flex flex-col overflow-hidden md:h-screen mobile-natural-flow">
        {/* Header - Using new HandbookHeader with edit functionality */}
        <HandbookHeader 
          handbookTitle={handbookData.title}
          handbookSlug={handbookData.handbookSlug}
          canEdit={canEdit}
          isAdmin={isAdmin}
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode(!isEditMode)}
          theme={handbookData.theme}
        />

        {/* Main layout container - mobile optimized */}
        <div className="flex flex-1 min-h-0 overflow-hidden touch-pan-y mobile-scrollable">
          {/* Sidebar - Fixed width sidebar */}
          <ModernSidebar
            sections={visibleSections}
            currentPageId={currentPageId}
            onPageSelect={setCurrentPageId}
            onSectionSelect={(sectionId) => {
              console.log('🎯 Attempting to scroll to section:', sectionId);
              
              // Clear current page to show all sections
              setCurrentPageId('');
              
              // Use requestAnimationFrame to ensure DOM is updated first
              requestAnimationFrame(() => {
                setTimeout(() => {
                  const element = document.getElementById(`section-${sectionId}`);
                  console.log('🔍 Found element:', element);
                  
                  if (element) {
                    // Try to find the scrollable container
                    const scrollContainer = document.querySelector('.main-content-scrollable') || 
                                          document.querySelector('[data-radix-scroll-area-viewport]') ||
                                          document.querySelector('.content-area-scroll') ||
                                          window;
                    
                    console.log('📜 Using scroll container:', scrollContainer);
                    
                    // Get element position relative to its scroll container
                    const elementRect = element.getBoundingClientRect();
                    const headerOffset = 100; // Account for header height
                    
                    if (scrollContainer === window) {
                      // Use window scrolling
                      const offsetPosition = elementRect.top + window.pageYOffset - headerOffset;
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    } else {
                      // Use container scrolling
                      const containerRect = (scrollContainer as Element).getBoundingClientRect();
                      const relativeTop = elementRect.top - containerRect.top;
                      const currentScrollTop = (scrollContainer as Element).scrollTop;
                      const targetScrollTop = currentScrollTop + relativeTop - headerOffset;
                      
                      (scrollContainer as Element).scrollTo({
                        top: targetScrollTop,
                        behavior: 'smooth'
                      });
                    }
                    
                    // Alternative: use native scrollIntoView as fallback
                    setTimeout(() => {
                      element.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start',
                        inline: 'nearest'
                      });
                    }, 200);
                  } else {
                    console.warn('❌ Element not found for section:', sectionId);
                  }
                }, 150);
              });
            }}
            handbookSlug={handbookData.handbookSlug}
            forumEnabled={handbookData.forum_enabled}
            editMode={isEditMode}
            onEditSection={(sectionId) => {
              console.log('Edit section:', sectionId);
              // TODO: Implement section editing functionality
            }}
            onDeleteSection={(sectionId) => {
              console.log('Delete section:', sectionId);
              // TODO: Implement section deletion functionality
            }}
            onToggleSection={(sectionId) => {
              const section = visibleSections.find(s => s.id === sectionId);
              if (section) {
                handleToggleSection(sectionId, !section.is_published);
              }
            }}
            onMoveSection={moveSection}
          />

          <SidebarInset className="flex-1 min-h-0 mobile-natural-flow">
            {/* Main content - Mobile optimized scrollable container */}
            <div className="main-content-scrollable flex flex-col mobile-scroll-container">
              <div className="flex-1 min-h-0 mobile-natural-flow">
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
                  trialStatusBar={trialStatusBar}
                  handbookData={{
                    id: handbookData.id,
                    title: handbookData.title,
                    forum_enabled: handbookData.forum_enabled
                  }}
                  onUpdateHandbook={updateHandbook}
                />
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}; 