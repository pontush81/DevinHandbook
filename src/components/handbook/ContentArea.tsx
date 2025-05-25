import React from 'react';
import { Section, Page } from '@/lib/templates/complete-brf-handbook';
import { Calendar, Clock } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuickActionCard } from './QuickActionCard';
import { StatisticCard } from './StatisticCard';
import { InfoCard } from './InfoCard';
import { ContactCard } from './ContactCard';

interface ContentAreaProps {
  sections: Section[];
  currentPageId?: string;
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
  currentPageId
}) => {
  if (!sections || sections.length === 0) {
    return (
      <main className="h-[calc(100vh-4rem)] bg-white overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 min-h-full">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Inga sektioner hittades</h1>
            <p className="text-gray-600">Handboken kunde inte laddas korrekt.</p>
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
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{section.title}</h2>
                    <p className="text-gray-600 mt-1">{section.description}</p>
                  </div>
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
                    `}
                  >
                    {/* Page Header - only show if there are multiple pages in section */}
                    {(section.pages?.length || 0) > 1 && (
                      <div className="mb-6">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                          {page.title}
                        </h3>
                        {page.lastUpdated && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>Uppdaterad {page.lastUpdated}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Page Content */}
                    <div className="prose prose-gray max-w-none mb-8">
                      <MarkdownRenderer content={page.content} />
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
      </div>
    </main>
  );
}; 