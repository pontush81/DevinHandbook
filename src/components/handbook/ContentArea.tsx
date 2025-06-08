import React from 'react';
import { HandbookSection as Section, HandbookPage as Page } from '@/types/handbook';
import { SinglePageView } from './content/SinglePageView';
import { AllSectionsView } from './content/AllSectionsView';

interface ContentAreaProps {
  sections: Section[];
  currentPageId?: string;
  isEditMode?: boolean;
  isAdmin?: boolean;
  handbookId: string;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onUpdatePage?: (pageId: string, updates: Partial<Page>) => void;
  onAddPage?: (sectionId: string, page: Partial<Page>) => Promise<{ id: string } | undefined>;
  onDeletePage?: (pageId: string, sectionId: string) => void;
  onAddSection?: (section: Partial<Section>) => void;
  onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void;
  onDeleteSection?: (sectionId: string) => void;
  onExitEditMode?: () => void;
  trialStatusBar?: React.ReactNode;
  handbookData?: {
    id: string;
    title: string;
    forum_enabled?: boolean;
  };
  onUpdateHandbook?: (handbookId: string, updates: { forum_enabled?: boolean }) => void;
}

export function ContentArea({ 
  sections, 
  currentPageId, 
  isEditMode = false, 
  isAdmin = false,
  handbookId, 
  onUpdateSection, 
  onUpdatePage, 
  onAddPage, 
  onDeletePage, 
  onAddSection, 
  onMoveSection, 
  onDeleteSection, 
  onExitEditMode, 
  trialStatusBar,
  handbookData,
  onUpdateHandbook
}: ContentAreaProps) {
  
  // Guard against undefined sections
  if (!sections) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar handbok...</p>
        </div>
      </div>
    );
  }

  // Ensure sections is always an array
  const sectionsArray = sections || [];

  // Find current page if specified
  const currentPage = currentPageId ? 
    sectionsArray.flatMap(s => s.pages || []).find(p => p.id === currentPageId) : 
    null;

  console.log('[ContentArea] Navigation state:', {
    currentPageId,
    foundPage: !!currentPage,
    sectionsCount: sectionsArray.length,
    mode: currentPageId ? 'single-page' : 'all-sections'
  });

  // Navigation paradigm: Show single page OR all sections overview
  if (currentPageId && currentPage) {
    // SINGLE PAGE MODE: Show just the requested page
    return (
      <div className="content-area-scroll">
        <SinglePageView 
          page={currentPage}
          isEditMode={isEditMode}
          onUpdatePage={onUpdatePage}
          handbookId={handbookId}
        />
      </div>
    );
  } else {
    // ALL SECTIONS MODE: Show scrollable overview of all sections
    return (
      <div className="content-area-scroll">
        <AllSectionsView 
          sections={sectionsArray}
          isEditMode={isEditMode}
          isAdmin={isAdmin}
          onUpdateSection={onUpdateSection}
          onUpdatePage={onUpdatePage}
          onDeleteSection={onDeleteSection}
          onDeletePage={onDeletePage}
          onAddSection={onAddSection}
          onAddPage={onAddPage}
          trialStatusBar={trialStatusBar}
          handbookId={handbookId}
          handbookData={handbookData}
          onUpdateHandbook={onUpdateHandbook}
        />
      </div>
    );
  }
} 