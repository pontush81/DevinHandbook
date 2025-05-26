import React, { useState, useEffect } from 'react';
import { Section, Page } from '@/lib/templates/complete-brf-handbook';
import { Calendar, Clock, Edit3, Plus, Wrench, Phone, BookOpen, DollarSign, Zap, Search, MessageCircle, Users } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuickActionCard } from './QuickActionCard';
import { StatisticCard } from './StatisticCard';
import { InfoCard } from './InfoCard';
import { ContactCard } from './ContactCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InlineEdit } from '@/components/ui/InlineEdit';

interface ContentAreaProps {
  sections: Section[];
  currentPageId?: string;
  isEditMode?: boolean;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onUpdatePage?: (pageId: string, updates: Partial<Page>) => void;
  onAddPage?: (sectionId: string, title: string, content?: string) => void;
}

// Modern welcome content with better UX
const getWelcomeContent = () => {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Välkommen till Ekstugan 15! 🏡
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Vi är glada att du är en del av vår gemenskap. Denna digitala handbok är din guide till allt som rör ditt boende och vår förening.
          </p>
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
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Komplett information</h3>
          <p className="text-gray-600 text-sm">Allt om föreningen, regler och rutiner på ett ställe</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Phone className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Snabb kontakt</h3>
          <p className="text-gray-600 text-sm">Kontaktuppgifter till styrelse och viktiga personer</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
            <Wrench className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Felanmälan</h3>
          <p className="text-gray-600 text-sm">Rapportera problem snabbt och enkelt</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ekonomi & avgifter</h3>
          <p className="text-gray-600 text-sm">Transparent information om föreningens ekonomi</p>
        </div>
      </section>

      {/* Important Information */}
      <section className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Zap className="w-6 h-6 text-yellow-500 mr-3" />
          Viktigt att veta från start
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Löpande uppdateringar</h4>
              <p className="text-gray-600 text-sm">Handboken uppdateras kontinuerligt med aktuell information</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Sökfunktion</h4>
              <p className="text-gray-600 text-sm">Använd sökfunktionen för att snabbt hitta det du letar efter</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Kontakta styrelsen</h4>
              <p className="text-gray-600 text-sm">Har du frågor som inte besvaras här? Kontakta oss direkt</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Delta aktivt</h4>
              <p className="text-gray-600 text-sm">Gå gärna på våra möten och aktiviteter för att stärka gemenskapen</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export const ContentArea: React.FC<ContentAreaProps> = ({
  sections,
  currentPageId,
  isEditMode = false,
  onUpdateSection,
  onUpdatePage,
  onAddPage
}) => {
  const [showAddPageDialog, setShowAddPageDialog] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');

  // Debug: Log sections and pages
  useEffect(() => {
    // Removed debug logging for cleaner console
  }, [sections]);

  // Auto-scroll to selected page/section
  useEffect(() => {
    if (currentPageId) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        let targetElement: HTMLElement | null = null;
        
        // First try to find the section that contains this page
        for (const section of sections) {
          if (section.pages?.some(page => page.id === currentPageId)) {
            targetElement = document.getElementById(`section-${section.id}`);
            break;
          }
        }
        
        // If no section found, try to find the specific page
        if (!targetElement) {
          targetElement = document.getElementById(`page-${currentPageId}`);
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
      }, 100);
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

  if (!sections || sections.length === 0) {
    return (
      <main className="main-content">
        <div className="content-container">
          {getWelcomeContent()}
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="content-container">
        {/* Welcome content if no specific page is selected */}
        {!currentPageId && (
          <div className="welcome-section">
            {getWelcomeContent()}
          </div>
        )}

        {/* All Sections */}
        <div className="sections-container">
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
          
          {sections.map((section, sectionIndex) => (
            <section 
              key={section.id} 
              id={`section-${section.id}`}
              className="scroll-mt-20 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Section Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {isEditMode && onUpdateSection ? (
                      <div className="space-y-3">
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

              {/* Section Pages */}
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
                    {/* Page Header - only show if there are multiple pages in section */}
                    {(section.pages?.length || 0) > 1 && (
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
            </section>
          ))}
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