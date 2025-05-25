import React, { useState } from 'react';
import { Section, Page } from '@/lib/templates/complete-brf-handbook';
import { Calendar, Clock, Edit3, Plus } from 'lucide-react';
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

// Default welcome content for when no page is selected
const getWelcomeContent = () => {
  return `
# Välkommen till din digitala handbok

Den här handboken innehåller all viktig information om ditt boende och föreningen. Navigera genom menyn till vänster för att hitta specifik information.

## Vad du hittar här

### 🏠 Allmän information
Grundläggande information om föreningen, byggnaden och ditt boende.

### 💰 Ekonomi
Information om avgifter, budgetar och ekonomisk förvaltning.

### 🔧 Underhåll
Rutiner för underhåll, reparationer och vem du ska kontakta.

### 📋 Regler
Ordningsregler, föreningsstadgar och andra viktiga bestämmelser.

### 📞 Kontakt
Kontaktuppgifter till styrelse, förvaltare och andra viktiga personer.

---

*Denna handbok uppdateras kontinuerligt för att säkerställa att informationen alltid är aktuell.*
  `;
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
      <main className="h-[calc(100vh-4rem)] bg-white overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 min-h-full">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Inga sektioner hittades</h1>
            <p className="text-gray-600">Handboken kunde inte laddas korrekt.</p>
            {isEditMode && (
              <p className="text-blue-600 mt-4">Använd sidomenyn för att lägga till din första sektion.</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[calc(100vh-4rem)] bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Handbook Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Bostadsrättsföreningen Ekstugan 15</h1>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Uppdaterad {new Date().toLocaleDateString('sv-SE')}</span>
            </div>
          </div>
        </header>

        {/* All Sections */}
        <div className="space-y-16">
          {/* Edit mode indicator */}
          {isEditMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Redigeringsläge aktivt</h3>
                  <p className="text-xs text-blue-600">Klicka på text för att redigera. Hover över sektioner för att se edit-knappar.</p>
                </div>
              </div>
            </div>
          )}
          
          {sections.map((section, sectionIndex) => (
            <section 
              key={section.id} 
              id={`section-${section.id}`}
              className="scroll-mt-20"
            >
              {/* Section Header */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {sectionIndex + 1}
                  </div>
                  <div className="flex-1">
                    {isEditMode && onUpdateSection ? (
                      <div className="space-y-2">
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
                          className="text-gray-600"
                        />
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">{section.title}</h2>
                        <p className="text-gray-600 mt-1">{section.description}</p>
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
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Lägg till sida
                    </Button>
                  )}
                </div>
                <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-300 rounded-full w-24"></div>
              </div>

              {/* Section Pages */}
              <div className="space-y-12">
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
                      <div className="mb-6">
                        {isEditMode && onUpdatePage ? (
                          <InlineEdit
                            value={page.title}
                            onSave={(value: string) => onUpdatePage(page.id, { title: value })}
                            placeholder="Sidtitel"
                            className="text-2xl font-semibold text-gray-800"
                          />
                        ) : (
                          <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                            {page.title}
                          </h3>
                        )}
                        {page.lastUpdated && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>Uppdaterad {page.lastUpdated}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Page Content */}
                    <div className={`prose prose-gray max-w-none mb-8 ${isEditMode ? 'relative group' : ''}`}>
                      {isEditMode && onUpdatePage && (
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-100 rounded-full p-1">
                          <Edit3 className="w-3 h-3 text-blue-600" />
                        </div>
                      )}
                      {isEditMode && onUpdatePage ? (
                        <InlineEdit
                          type="textarea"
                          value={page.content || ''}
                          onSave={(value: string) => onUpdatePage(page.id, { content: value })}
                          placeholder="Sidinnehåll (Markdown stöds)"
                          multiline={true}
                          rows={8}
                          className="prose prose-gray max-w-none"
                        />
                      ) : (
                        <div className={isEditMode ? 'hover:bg-blue-50/30 hover:border-blue-200 border border-transparent rounded-lg p-3 transition-all cursor-pointer' : ''}>
                          <MarkdownRenderer content={page.content} />
                        </div>
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

                    {/* Page separator - only if not last page in section */}
                    {pageIndex < (section.pages?.length || 0) - 1 && (
                      <div className="border-t border-gray-200 pt-8 mt-8"></div>
                    )}
                  </article>
                ))}

                {/* Add page prompt if no pages in section and in edit mode */}
                {isEditMode && (!section.pages || section.pages.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">Inga sidor i denna sektion</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        setShowAddPageDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Lägg till första sidan
                    </Button>
                  </div>
                )}
              </div>

              {/* Section separator - only if not last section */}
              {sectionIndex < sections.length - 1 && (
                <div className="mt-16 pt-8 border-t-2 border-gray-100"></div>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-12 border-t border-gray-200 text-center text-gray-500">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <span>📞</span>
              <span>Akut: 08-123 456 78</span>
              <span className="mx-4">•</span>
              <span>📧</span>
              <span>styrelsen@ekstugan15.se</span>
            </div>
            <p className="text-sm">
              Denna handbok uppdateras kontinuerligt för att säkerställa att informationen alltid är aktuell.
            </p>
            <p className="text-xs">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>
          </div>
        </footer>

        {/* Add Page Dialog */}
        <Dialog open={showAddPageDialog} onOpenChange={setShowAddPageDialog}>
          <DialogContent>
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
                  placeholder="Titel på sidan"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Innehåll (valfritt)</label>
                <Textarea
                  placeholder="Sidinnehåll (Markdown stöds)"
                  value={newPageContent}
                  onChange={(e) => setNewPageContent(e.target.value)}
                  className="min-h-[100px]"
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