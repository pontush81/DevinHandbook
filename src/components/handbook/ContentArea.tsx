import React from 'react';
import { Section, Page } from '../../types/handbook';
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
  // Find current page and section
  let currentPage: Page | undefined;
  let currentSection: Section | undefined;

  for (const section of sections) {
    const page = section.pages?.find(p => p.id === currentPageId);
    if (page) {
      currentPage = page;
      currentSection = section;
      break;
    }
  }

  // If no specific page selected, show welcome content (not cards)
  if (!currentPage || !currentSection) {
    return (
      <main className="flex-1 overflow-y-auto bg-white">
        <article className="max-w-4xl mx-auto px-6 py-8">
          {/* Welcome Page Metadata */}
          <div className="mb-8">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Uppdaterad {new Date().toLocaleDateString('sv-SE')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>3 min läsning</span>
              </div>
            </div>
          </div>

          {/* Welcome Content */}
          <div className="prose prose-gray max-w-none">
            <MarkdownRenderer content={getWelcomeContent()} />
          </div>

          {/* Quick Stats - Minimal and Integrated */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Snabbfakta</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">42</div>
                <div className="text-sm text-gray-600">Lägenheter</div>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">1987</div>
                <div className="text-sm text-gray-600">Byggår</div>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">5</div>
                <div className="text-sm text-gray-600">Våningar</div>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">98%</div>
                <div className="text-sm text-gray-600">Nöjdhet</div>
              </div>
            </div>
          </div>
        </article>
      </main>
    );
  }

  // Show actual page content
  return (
    <main className="flex-1 overflow-y-auto bg-white">
      <article className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <header className="mb-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span>{currentSection.title}</span>
            <span>•</span>
            <span className="text-gray-900">{currentPage.title}</span>
          </div>

          {/* Page Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{currentPage.title}</h1>

          {/* Metadata */}
          {(currentPage.lastUpdated || currentPage.estimatedReadTime) && (
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              {currentPage.lastUpdated && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Uppdaterad {currentPage.lastUpdated}</span>
                </div>
              )}
              {currentPage.estimatedReadTime && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{currentPage.estimatedReadTime} min läsning</span>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Page Content - Focus on content, minimal cards */}
        <div className="space-y-8">
          {/* Main Content First */}
          <div className="prose prose-gray max-w-none">
            <MarkdownRenderer content={currentPage.content} />
          </div>

          {/* Quick Actions - Only if they exist and are relevant */}
          {currentPage.quickActions && currentPage.quickActions.length > 0 && (
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Snabbåtgärder</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentPage.quickActions.map((action) => (
                  <QuickActionCard key={action.id} action={action} />
                ))}
              </div>
            </div>
          )}

          {/* Statistics - Integrated naturally */}
          {currentPage.statisticCards && currentPage.statisticCards.length > 0 && (
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistik</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentPage.statisticCards.map((card, index) => (
                  <StatisticCard key={index} card={card} />
                ))}
              </div>
            </div>
          )}

          {/* Info Cards - More like documentation sections */}
          {currentPage.infoCards && currentPage.infoCards.length > 0 && (
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Viktig information</h3>
              <div className="space-y-4">
                {currentPage.infoCards.map((card) => (
                  <InfoCard key={card.id} card={card} />
                ))}
              </div>
            </div>
          )}

          {/* Contacts - Clean contact section */}
          {currentPage.contacts && currentPage.contacts.length > 0 && (
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontaktpersoner</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {currentPage.contacts.map((contact, index) => (
                  <ContactCard key={index} contact={contact} />
                ))}
              </div>
            </div>
          )}

          {/* Last Updated Footer */}
          {currentPage.lastUpdated && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>🕒</span>
                <span>Senast uppdaterad: {currentPage.lastUpdated}</span>
              </div>
            </div>
          )}
        </div>
      </article>
    </main>
  );
}; 