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

  const updateInfoCard = (index: number, updates: Partial<typeof data.infoCards[0]>) => {
    const newCards = [...editData.infoCards];
    newCards[index] = { ...newCards[index], ...updates };
    updateData({ infoCards: newCards });
  };

  const updateImportantInfo = (index: number, updates: Partial<typeof data.importantInfo[0]>) => {
    const newInfo = [...editData.importantInfo];
    newInfo[index] = { ...newInfo[index], ...updates };
    updateData({ importantInfo: newInfo });
  };

  const addInfoCard = () => {
    const newCard = {
      id: `card-${Date.now()}`,
      title: "Ny rubrik",
      description: "Beskrivning av funktionen",
      icon: "BookOpen",
      color: "blue"
    };
    updateData({ infoCards: [...editData.infoCards, newCard] });
  };

  const removeInfoCard = (index: number) => {
    if (window.confirm('Är du säker på att du vill ta bort detta kort?')) {
      const newCards = editData.infoCards.filter((_, i) => i !== index);
      updateData({ infoCards: newCards });
    }
  };

  const addImportantInfo = () => {
    const newInfo = {
      id: `info-${Date.now()}`,
      title: "Ny viktig information",
      description: "Beskrivning av den viktiga informationen",
      icon: "Clock",
      color: "blue"
    };
    updateData({ importantInfo: [...editData.importantInfo, newInfo] });
  };

  const removeImportantInfo = (index: number) => {
    if (window.confirm('Är du säker på att du vill ta bort denna information?')) {
      const newInfo = editData.importantInfo.filter((_, i) => i !== index);
      updateData({ importantInfo: newInfo });
    }
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
              {/* Större textarea för bättre redigering */}
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
              <Wrench className="w-5 h-5 mr-2" />
              Rapportera fel
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-3 rounded-lg font-semibold border-2 hover:bg-gray-50">
              <Phone className="w-5 h-5 mr-2" />
              Kontakta oss
            </Button>
          </div>
        </div>
      </section>

      {/* Information Cards */}
      {(editData.showInfoCards || isEditMode) && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Snabbfakta</h2>
              {isEditMode && (
                <div className="flex items-center gap-2">
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
            {isEditMode && editData.showInfoCards && (
              <Button onClick={addInfoCard} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Lägg till kort
              </Button>
            )}
          </div>
          {editData.showInfoCards && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {editData.infoCards.map((card, index) => {
                const colors = getColorClasses(card.color);
                return (
                  <div key={card.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
                    {isEditMode && (
                      <div className="absolute top-2 right-2">
                        <Button
                          onClick={() => removeInfoCard(index)}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full shadow-sm border border-red-200"
                          title="Ta bort kort"
                        >
                          ×
                        </Button>
                      </div>
                    )}
                    <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}>
                      {getIconComponent(card.icon, `w-6 h-6 ${colors.text}`)}
                    </div>
                    {isEditMode ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={card.title}
                          onChange={(e) => updateInfoCard(index, { title: e.target.value })}
                          className="text-lg font-semibold text-gray-900 w-full bg-transparent border border-gray-300 rounded p-1"
                        />
                        <textarea
                          value={card.description}
                          onChange={(e) => updateInfoCard(index, { description: e.target.value })}
                          className="text-gray-600 text-sm w-full bg-transparent border border-gray-300 rounded p-1 resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <select
                            value={card.color}
                            onChange={(e) => updateInfoCard(index, { color: e.target.value })}
                            className="text-xs border border-gray-300 rounded p-1"
                          >
                            <option value="blue">Blå</option>
                            <option value="green">Grön</option>
                            <option value="orange">Orange</option>
                            <option value="purple">Lila</option>
                            <option value="yellow">Gul</option>
                            <option value="red">Röd</option>
                          </select>
                          <select
                            value={card.icon}
                            onChange={(e) => updateInfoCard(index, { icon: e.target.value })}
                            className="text-xs border border-gray-300 rounded p-1"
                          >
                            <option value="BookOpen">Bok</option>
                            <option value="Phone">Telefon</option>
                            <option value="Wrench">Verktyg</option>
                            <option value="DollarSign">Pengar</option>
                            <option value="Users">Personer</option>
                            <option value="Clock">Klocka</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                        <p className="text-gray-600 text-sm">{card.description}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Important Information */}
      {(editData.showImportantInfo || isEditMode) && (
        <section className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Zap className="w-6 h-6 text-yellow-500 mr-3" />
                Viktigt att veta från start
              </h2>
              {isEditMode && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showImportantInfo"
                    checked={editData.showImportantInfo}
                    onChange={(e) => updateData({ showImportantInfo: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="showImportantInfo" className="text-sm text-gray-600">
                    Visa sektion
                  </label>
                </div>
              )}
            </div>
            {isEditMode && editData.showImportantInfo && (
              <Button onClick={addImportantInfo} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Lägg till info
              </Button>
            )}
          </div>
          {editData.showImportantInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {editData.importantInfo.map((info, index) => {
                const colors = getColorClasses(info.color);
                return (
                  <div key={info.id} className="flex items-start space-x-4 relative group">
                    {isEditMode && (
                      <Button
                        onClick={() => removeImportantInfo(index)}
                        size="sm"
                        variant="ghost"
                        className="absolute top-0 right-0 h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full shadow-sm border border-red-200"
                        title="Ta bort information"
                      >
                        ×
                      </Button>
                    )}
                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      {getIconComponent(info.icon, `w-5 h-5 ${colors.text}`)}
                    </div>
                    <div className="flex-1">
                      {isEditMode ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={info.title}
                            onChange={(e) => updateImportantInfo(index, { title: e.target.value })}
                            className="font-semibold text-gray-900 w-full bg-transparent border border-gray-300 rounded p-1"
                          />
                          <textarea
                            value={info.description}
                            onChange={(e) => updateImportantInfo(index, { description: e.target.value })}
                            className="text-gray-600 text-sm w-full bg-transparent border border-gray-300 rounded p-1 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <select
                              value={info.color}
                              onChange={(e) => updateImportantInfo(index, { color: e.target.value })}
                              className="text-xs border border-gray-300 rounded p-1"
                            >
                              <option value="blue">Blå</option>
                              <option value="green">Grön</option>
                              <option value="orange">Orange</option>
                              <option value="purple">Lila</option>
                              <option value="yellow">Gul</option>
                              <option value="red">Röd</option>
                            </select>
                            <select
                              value={info.icon}
                              onChange={(e) => updateImportantInfo(index, { icon: e.target.value })}
                              className="text-xs border border-gray-300 rounded p-1"
                            >
                              <option value="Clock">Klocka</option>
                              <option value="Search">Sök</option>
                              <option value="MessageCircle">Meddelande</option>
                              <option value="Users">Personer</option>
                              <option value="BookOpen">Bok</option>
                              <option value="Wrench">Verktyg</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-semibold text-gray-900 mb-1">{info.title}</h4>
                          <p className="text-gray-600 text-sm">{info.description}</p>
                        </>
                      )}
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
  const [showAddPageDialog, setShowAddPageDialog] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [welcomeContent, setWelcomeContent] = useState<WelcomeContentData>(getDefaultWelcomeContent());
  const [isLoadingWelcomeContent, setIsLoadingWelcomeContent] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({});
  
  // Use ref to track last scrolled page to avoid unnecessary scrolling
  const lastScrolledPageRef = useRef<string | null>(null);

  // Initialize all sections as visible
  useEffect(() => {
    const initialVisibility: Record<string, boolean> = {};
    sections.forEach(section => {
      initialVisibility[section.id] = true;
    });
    setVisibleSections(initialVisibility);
  }, [sections]);

  // Load welcome content from database when handbookId changes
  useEffect(() => {
    if (handbookId) {
      loadWelcomeContent();
    }
  }, [handbookId]);

  const loadWelcomeContent = async () => {
    if (!handbookId) return;
    
    setIsLoadingWelcomeContent(true);
    try {
      const content = await getWelcomeContent(handbookId);
      if (content) {
        setWelcomeContent(content);
      } else {
        // Ingen data finns, använd default och spara den
        const defaultContent = getDefaultWelcomeContent();
        setWelcomeContent(defaultContent);
        if (isEditMode) {
          await upsertWelcomeContent(handbookId, defaultContent);
        }
      }
    } catch (error) {
      console.error('Error loading welcome content:', error);
      setWelcomeContent(getDefaultWelcomeContent());
    } finally {
      setIsLoadingWelcomeContent(false);
    }
  };

  // Save welcome content to database when it changes
  const handleWelcomeContentUpdate = async (data: WelcomeContentData) => {
    setWelcomeContent(data);
    
    if (handbookId && isEditMode) {
      try {
        const success = await upsertWelcomeContent(handbookId, data);
        if (!success) {
          console.error('Failed to save welcome content');
          // Optionally show user feedback here
        }
      } catch (error) {
        console.error('Error saving welcome content:', error);
        // Optionally show user feedback here
      }
    }
  };

  // Debug: Log sections and pages
  useEffect(() => {
    // Removed debug logging for cleaner console
  }, [sections]);

  // Optimized auto-scroll to selected page/section
  useEffect(() => {
    if (currentPageId && currentPageId !== lastScrolledPageRef.current) {
      lastScrolledPageRef.current = currentPageId;
      
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        let targetElement: HTMLElement | null = null;
        
        // Try to find the specific page first (most common case)
        targetElement = document.getElementById(`page-${currentPageId}`);
        
        // If no page found, try to find the section that contains this page
        if (!targetElement) {
          for (const section of sections) {
            if (section.pages?.some(page => page.id === currentPageId)) {
              targetElement = document.getElementById(`section-${section.id}`);
              break;
            }
          }
        }
        
        // If still no page found, try to find the section directly
        if (!targetElement) {
          targetElement = document.getElementById(`section-${currentPageId}`);
        }

        // Scroll to the target element using scrollIntoView
        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
          
          // Add a small offset after scrolling to account for header
          setTimeout(() => {
            window.scrollBy(0, -60);
          }, 300);
        }
      });
    }
  }, [currentPageId, sections]);

  const handleAddPage = () => {
    if (newPageTitle.trim() && selectedSectionId && onAddPage) {
      onAddPage(selectedSectionId, newPageTitle.trim(), newPageContent.trim());
      setNewPageTitle('');
      setNewPageContent('');
      setShowAddPageDialog(false);
      setSelectedSectionId('');
    }
  };

  const toggleSectionVisibility = (sectionId: string) => {
    setVisibleSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleDeleteSection = (sectionId: string) => {
    if (window.confirm('Är du säker på att du vill ta bort hela denna sektion? Detta kan inte ångras.')) {
      onDeleteSection?.(sectionId);
    }
  };

  if (!sections || sections.length === 0) {
    return (
      <main className="main-content">
        <div className="content-container">
          {isLoadingWelcomeContent ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Laddar välkomstinnehåll...</span>
            </div>
          ) : (
            <EditableWelcomeContent data={welcomeContent} isEditMode={isEditMode} onUpdate={handleWelcomeContentUpdate} />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="content-container">
        {/* Welcome content if no specific page is selected */}
        {!currentPageId && (
          <div className="welcome-section mb-16">
            <EditableWelcomeContent data={welcomeContent} isEditMode={isEditMode} onUpdate={handleWelcomeContentUpdate} />
          </div>
        )}

        {/* All Sections */}
        <div className="sections-container space-y-8">
          {/* Edit mode indicator */}
          {isEditMode && (
            <div className="edit-mode-banner">
              <div className="edit-mode-banner-content">
                <Edit3 className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="edit-mode-banner-title">Redigeringsläge aktivt</h3>
                  <p className="edit-mode-banner-subtitle">Klicka på text för att redigera. Hover över sektioner för att se edit-knappar.</p>
                </div>
              </div>
            </div>
          )}
          
          {sections.map((section, sectionIndex) => {
            const isSectionVisible = visibleSections[section.id] ?? true;
            
            // Only render section if it's visible OR we're in edit mode
            if (!isSectionVisible && !isEditMode) {
              return null;
            }
            
            return (
              <section 
                key={section.id} 
                id={`section-${section.id}`}
                className="scroll-mt-20 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative"
              >
                {/* Section Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {isEditMode && onUpdateSection ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-6 mb-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`show-section-${section.id}`}
                                checked={isSectionVisible}
                                onChange={() => toggleSectionVisibility(section.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`show-section-${section.id}`} className="text-sm text-gray-600">
                                Visa sektion
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`public-section-${section.id}`}
                                checked={section.is_public !== false}
                                onChange={(e) => onUpdateSection(section.id, { is_public: e.target.checked })}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <label htmlFor={`public-section-${section.id}`} className="text-sm text-gray-600">
                                Publik sektion
                              </label>
                            </div>
                          </div>
                          <InlineEdit
                            value={section.title}
                            onSave={(value: string) => onUpdateSection(section.id, { title: value })}
                            placeholder="Sektionsrubrik"
                            className="text-3xl font-bold text-gray-900"
                          />
                          <InlineEdit
                            value={section.description || ''}
                            onSave={(value: string) => onUpdateSection(section.id, { description: value })}
                            placeholder="Sektionsbeskrivning"
                            className="text-lg text-gray-600"
                          />
                        </div>
                      ) : (
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900 mb-2">{section.title}</h2>
                          {section.description && (
                            <p className="text-lg text-gray-600">{section.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Delete section button */}
                      {isEditMode && onDeleteSection && (
                        <Button
                          onClick={() => handleDeleteSection(section.id)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full shadow-sm border border-red-200"
                          title="Ta bort sektion"
                        >
                          ×
                        </Button>
                      )}
                      
                      {/* Add page button in edit mode */}
                      {isEditMode && onAddPage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSectionId(section.id);
                            setShowAddPageDialog(true);
                          }}
                          className="flex-shrink-0"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Lägg till sida
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Pages - only show if section is visible or in edit mode */}
                {(isSectionVisible || isEditMode) && (
                  <div className="p-8 space-y-12">
                    {section.pages?.map((page, pageIndex) => (
                      <article 
                        key={page.id}
                        id={`page-${page.id}`}
                        className={`
                          scroll-mt-20 
                          ${currentPageId === page.id ? 'ring-2 ring-blue-200 bg-blue-50/30 rounded-lg p-6 -m-6' : ''}
                          ${isEditMode ? 'relative group' : ''}
                        `}
                      >
                        {/* Page Header - only show if there are multiple pages in section OR if page title differs from section title */}
                        {((section.pages?.length || 0) > 1 || page.title !== section.title) && (
                          <div className="mb-6 pb-4 border-b border-gray-100">
                            {isEditMode && onUpdatePage ? (
                              <InlineEdit
                                value={page.title}
                                onSave={(value: string) => onUpdatePage(page.id, { title: value })}
                                placeholder="Sidtitel"
                                className="text-2xl font-semibold text-gray-800"
                              />
                            ) : (
                              <h3 className="text-2xl font-semibold text-gray-800">
                                {page.title}
                              </h3>
                            )}
                            {page.lastUpdated && (
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                                <Clock className="w-4 h-4" />
                                <span>Uppdaterad {page.lastUpdated}</span>
                                {page.estimatedReadTime && (
                                  <>
                                    <span>•</span>
                                    <span>{page.estimatedReadTime} min läsning</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Page Content */}
                        <div className="prose prose-lg max-w-none">
                          {isEditMode && onUpdatePage ? (
                            <InlineEdit
                              value={page.content}
                              onSave={(value: string) => onUpdatePage(page.id, { content: value })}
                              placeholder="Sidinnehåll"
                              multiline
                              className="min-h-32"
                            />
                          ) : (
                            <MarkdownRenderer content={page.content} />
                          )}
                        </div>

                        {/* Quick Actions */}
                        {page.quickActions && page.quickActions.length > 0 && (
                          <div className="mb-8">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Snabbåtgärder</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {page.quickActions.map((action) => (
                                <QuickActionCard key={action.id} action={action} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Statistics */}
                        {page.statisticCards && page.statisticCards.length > 0 && (
                          <div className="mb-8">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Statistik</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {page.statisticCards.map((card, index) => (
                                <StatisticCard key={index} card={card} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Info Cards */}
                        {page.infoCards && page.infoCards.length > 0 && (
                          <div className="mb-8">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Viktig information</h4>
                            <div className="space-y-4">
                              {page.infoCards.map((card) => (
                                <InfoCard key={card.id} card={card} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Contacts */}
                        {page.contacts && page.contacts.length > 0 && (
                          <div className="mb-8">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Kontaktpersoner</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {page.contacts.map((contact, index) => (
                                <ContactCard key={index} contact={contact} />
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Add page dialog */}
        <Dialog open={showAddPageDialog} onOpenChange={setShowAddPageDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lägg till ny sida</DialogTitle>
              <DialogDescription>
                Skapa en ny sida i den valda sektionen
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Sidtitel</label>
                <Input
                  placeholder="Ange sidtitel"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Innehåll (valfritt)</label>
                <Textarea
                  placeholder="Skriv sidinnehåll här..."
                  value={newPageContent}
                  onChange={(e) => setNewPageContent(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleAddPage} disabled={!newPageTitle.trim()}>
                  Skapa sida
                </Button>
                <Button variant="outline" onClick={() => setShowAddPageDialog(false)}>
                  Avbryt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}; 