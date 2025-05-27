import React, { useState, useEffect, useRef } from 'react';
import { Section, Page } from '@/lib/templates/complete-brf-handbook';
import { Calendar, Clock, Edit3, Plus, Wrench, Phone, BookOpen, DollarSign, Zap, Search, MessageCircle, Users, X, Trash2, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuickActionCard } from './QuickActionCard';
import { StatisticCard } from './StatisticCard';
import { InfoCard } from './InfoCard';
import { ContactCard } from './ContactCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { 
  WelcomeContentData, 
  getWelcomeContent, 
  upsertWelcomeContent, 
  getDefaultWelcomeContent 
} from '@/lib/services/welcomeContentService';

interface ContentAreaProps {
  sections: Section[];
  currentPageId?: string;
  isEditMode?: boolean;
  handbookId?: string;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onUpdatePage?: (pageId: string, updates: Partial<Page>) => void;
  onAddPage?: (sectionId: string, title: string, content?: string) => void;
  onDeleteSection?: (sectionId: string) => void;
}

interface EditableWelcomeContentProps {
  data: WelcomeContentData;
  isEditMode: boolean;
  onUpdate?: (data: WelcomeContentData) => void;
}

const EditableWelcomeContent: React.FC<EditableWelcomeContentProps> = ({ 
  data, 
  isEditMode, 
  onUpdate 
}) => {
  const [editData, setEditData] = useState<WelcomeContentData>(data);

  const updateData = (updates: Partial<WelcomeContentData>) => {
    const newData = { ...editData, ...updates };
    setEditData(newData);
    onUpdate?.(newData);
  };

  const getIconComponent = (iconName: string, className: string) => {
    const iconMap: Record<string, any> = {
      BookOpen, Phone, Wrench, DollarSign, Clock, Search, MessageCircle, Users, Zap
    };
    const IconComponent = iconMap[iconName] || BookOpen;
    return <IconComponent className={className} />;
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      blue: { bg: "bg-blue-100", text: "text-blue-600" },
      green: { bg: "bg-green-100", text: "text-green-600" },
      orange: { bg: "bg-orange-100", text: "text-orange-600" },
      purple: { bg: "bg-purple-100", text: "text-purple-600" },
      yellow: { bg: "bg-yellow-100", text: "text-yellow-600" },
      red: { bg: "bg-red-100", text: "text-red-600" },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl px-8">
        <div className="max-w-3xl mx-auto">
          {isEditMode ? (
            <div className="space-y-4">
              <input
                type="text"
                value={editData.heroTitle}
                onChange={(e) => updateData({ heroTitle: e.target.value })}
                className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 w-full bg-transparent border-2 border-dashed border-gray-300 rounded p-2 text-center"
                placeholder="Huvudrubrik"
              />
              <textarea
                value={editData.heroSubtitle}
                onChange={(e) => updateData({ heroSubtitle: e.target.value })}
                className="text-xl text-gray-600 mb-8 leading-relaxed w-full bg-transparent border-2 border-dashed border-gray-300 rounded p-4 text-center resize-y min-h-[120px]"
                rows={6}
                placeholder="Underrubrik"
              />
            </div>
          ) : (
            <>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                {editData.heroTitle}
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {editData.heroSubtitle}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Information Cards */}
      {(editData.showInfoCards || isEditMode) && (
        <section className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <BookOpen className="w-6 h-6 text-green-500 mr-3" />
                Viktig information
              </h2>
              {isEditMode && (
                <div className="edit-checkbox-group flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showInfoCards"
                    checked={editData.showInfoCards}
                    onChange={(e) => updateData({ showInfoCards: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="showInfoCards" className="text-sm text-gray-600">
                    Visa sektion
                  </label>
                </div>
              )}
            </div>
          </div>
          {editData.showInfoCards && (
            <div className="info-cards-container grid grid-cols-1 md:grid-cols-2 gap-6">
              {editData.infoCards.map((card, index) => {
                const colors = getColorClasses(card.color);
                return (
                  <div key={card.id} className="bg-gray-50 rounded-lg p-6 relative group">
                    <div className="flex items-start space-x-4">
                      <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        {getIconComponent(card.icon, `w-5 h-5 ${colors.text}`)}
                      </div>
                      <div className="flex-1">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                          <p className="text-gray-600 text-sm">{card.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export const ContentArea: React.FC<ContentAreaProps> = ({
  sections,
  currentPageId,
  isEditMode = false,
  handbookId,
  onUpdateSection,
  onUpdatePage,
  onAddPage,
  onDeleteSection
}) => {
  const [welcomeContent, setWelcomeContent] = useState<WelcomeContentData>(getDefaultWelcomeContent());

  // Debug logging
  console.log('[ContentArea] Received props:', {
    sectionsCount: sections?.length || 0,
    currentPageId,
    isEditMode,
    handbookId,
    sections: sections?.map(s => ({ id: s.id, title: s.title, pagesCount: s.pages?.length || 0 }))
  });

  // Show welcome content if no sections or no specific page is selected
  if (!sections || sections.length === 0) {
    console.log('[ContentArea] No sections found, showing welcome content only');
    return (
      <main className="main-content">
        <div className="content-container">
          <EditableWelcomeContent data={welcomeContent} isEditMode={isEditMode} />
        </div>
      </main>
    );
  }

  // Find current page if specified
  const currentPage = currentPageId ? 
    sections.flatMap(s => s.pages || []).find(p => p.id === currentPageId) : 
    null;

  console.log('[ContentArea] Current page:', currentPage ? `${currentPage.title} (${currentPage.id})` : 'None');

  return (
    <main className="main-content">
      <div className="content-container">
        {currentPage ? (
          // Show specific page content
          <article className="page-article">
            <header className="page-header mb-8">
              <h1 className="page-title text-4xl font-bold text-gray-900 mb-4">
                {currentPage.title}
              </h1>
              {currentPage.description && (
                <p className="page-description text-xl text-gray-600 leading-relaxed">
                  {currentPage.description}
                </p>
              )}
            </header>
            <div className="page-content prose prose-lg max-w-none">
              <MarkdownRenderer content={currentPage.content} />
            </div>
          </article>
        ) : (
          // Show all sections overview
          <>
            {(!currentPageId || currentPageId === '') && (
              <div className="welcome-section mb-16">
                <EditableWelcomeContent data={welcomeContent} isEditMode={isEditMode} />
              </div>
            )}
            
            <div className="sections-container space-y-8">
              {sections.map((section) => (
                <section 
                  key={section.id} 
                  id={`section-${section.id}`}
                  className="section-card scroll-mt-20"
                >
                  <div className="section-header bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 p-6 rounded-t-xl">
                    <h2 className="section-title text-3xl font-bold text-gray-900 mb-2">{section.title}</h2>
                    {section.description && (
                      <p className="section-description text-lg text-gray-600">{section.description}</p>
                    )}
                  </div>

                  <div className="section-content bg-white rounded-b-xl p-6 space-y-6">
                    {section.pages && section.pages.length > 0 ? (
                      <div className="pages-content space-y-8">
                        {section.pages.map((page) => (
                          <article 
                            key={page.id}
                            id={`page-${page.id}`}
                            className="page-content-full border-l-4 border-blue-200 pl-6"
                          >
                            <header className="page-header mb-4">
                              <h3 className="page-title text-2xl font-bold text-gray-900 mb-2">
                                {page.title}
                              </h3>
                              {page.description && (
                                <p className="page-description text-lg text-gray-600 mb-4">
                                  {page.description}
                                </p>
                              )}
                            </header>
                            <div className="page-content prose prose-lg max-w-none">
                              <MarkdownRenderer content={page.content} />
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Inga sidor i denna sektion än.</p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}; 