import React, { useState, useEffect, useMemo } from 'react';
import { defaultHandbookTemplate, sectionIcons, type Section, type Page } from '@/lib/templates/handbook-template';

// Header komponent
const Header: React.FC<{
  onToggleSidebar: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}> = ({ onToggleSidebar, onSearch, searchQuery }) => (
  <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg">
            🏠
          </div>
          <span className="text-xl font-bold text-gray-900">Gegga BRF</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            className="lg:hidden px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
            onClick={onToggleSidebar}
          >
            ☰ Meny
          </button>
          
          <div className="hidden lg:block relative">
            <input
              type="text"
              placeholder="Sök i handboken..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            📞 Kontakt
          </button>
        </div>
      </div>
    </div>
  </header>
);

// Sidebar komponent
const Sidebar: React.FC<{
  sections: Section[];
  currentSection: string;
  currentPage: string;
  searchQuery: string;
  isOpen: boolean;
  onSectionChange: (sectionId: string, pageId?: string) => void;
  onClose: () => void;
  onSearch: (query: string) => void;
}> = ({ sections, currentSection, currentPage, searchQuery, isOpen, onSectionChange, onClose, onSearch }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([currentSection]));

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    
    return sections.filter(section => 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.pages.some(page => 
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [sections, searchQuery]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      <nav className={`
        fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-80 bg-white border-r border-gray-200 
        transform transition-transform duration-300 z-50 overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Digital Handbok</h2>
          <p className="text-sm text-gray-600">Allt du behöver veta om ditt boende</p>
        </div>

        <div className="lg:hidden p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Sök i handboken..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="p-4">
          {filteredSections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const isActive = currentSection === section.id;
            
            return (
              <div key={section.id} className="mb-2">
                <button
                  className={`
                    w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors
                    ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}
                  `}
                  onClick={() => {
                    onSectionChange(section.id);
                    toggleSection(section.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{sectionIcons[section.title] || '📄'}</span>
                    <span className="font-medium text-sm">{section.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {section.pages.length > 1 && (
                      <span className={`
                        px-2 py-1 text-xs rounded-full
                        ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}
                      `}>
                        {section.pages.length}
                      </span>
                    )}
                    {section.pages.length > 1 && (
                      <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && section.pages.length > 1 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {section.pages.map((page) => (
                      <button
                        key={page.id}
                        className={`
                          w-full text-left p-2 rounded text-sm transition-colors
                          ${currentPage === page.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}
                        `}
                        onClick={() => onSectionChange(section.id, page.id)}
                      >
                        {page.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
};

// Markdown renderer komponent
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const parseMarkdown = (text: string): string => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-800 mb-3 mt-6">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-gray-700 mb-2 mt-4">$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/gim, '<em class="italic">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="text-gray-600 mb-1">$1</li>')
      .replace(/(<li.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1 mb-4">$1</ul>')
      .replace(/\n\n/gim, '</p><p class="text-gray-600 mb-4">')
      .replace(/^(?!<[h|u|l])(.+)$/gim, '<p class="text-gray-600 mb-4">$1</p>');
  };

  return (
    <div 
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
};

// Quick Actions komponent
const QuickActions: React.FC<{ onSectionChange: (sectionId: string) => void }> = ({ onSectionChange }) => {
  const actions = [
    {
      icon: '👥',
      title: 'Kontakta styrelsen',
      description: 'Hitta kontaktuppgifter till styrelsemedlemmar',
      sectionId: 'kontakt'
    },
    {
      icon: '🔧',
      title: 'Felanmälan',
      description: 'Rapportera fel och problem',
      sectionId: 'felanmälan'
    },
    {
      icon: '📅',
      title: 'Boka tvättstuga',
      description: 'Boka tid i tvättstugan',
      sectionId: 'tvättstuga'
    },
    {
      icon: '🤝',
      title: 'Trivselregler',
      description: 'Läs om föreningens regler',
      sectionId: 'trivsel'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {actions.map((action, index) => (
        <button
          key={index}
          className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:border-gray-300 transition-all duration-200 text-center group"
          onClick={() => console.log(`Navigate to ${action.sectionId}`)}
        >
          <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
            {action.icon}
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
          <p className="text-sm text-gray-600">{action.description}</p>
        </button>
      ))}
    </div>
  );
};

// Content Area komponent
const ContentArea: React.FC<{
  section?: Section;
  page?: Page;
  onPageChange: (pageId: string) => void;
  onSectionChange: (sectionId: string) => void;
}> = ({ section, page, onPageChange, onSectionChange }) => {
  if (!section) {
    return (
      <main className="flex-1 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Laddar handbok...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{section.title}</h1>
          <p className="text-lg text-gray-600 mb-6">{section.description}</p>
          
          {section.pages.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {section.pages.map((p) => (
                <button
                  key={p.id}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-colors
                    ${page?.id === p.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                  onClick={() => onPageChange(p.id)}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {page ? (
            <MarkdownRenderer content={page.content} />
          ) : (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl">ℹ️</span>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Välkommen till din digitala handbok!</h3>
                    <p className="text-blue-700">Navigera genom menyn till vänster för att hitta all information du behöver om föreningen och ditt boende.</p>
                  </div>
                </div>
              </div>

              <QuickActions onSectionChange={onSectionChange} />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-6 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">42</div>
                  <div className="text-sm text-gray-600 font-medium">Lägenheter</div>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">1987</div>
                  <div className="text-sm text-gray-600 font-medium">Byggår</div>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">5</div>
                  <div className="text-sm text-gray-600 font-medium">Våningar</div>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">98%</div>
                  <div className="text-sm text-gray-600 font-medium">Nöjdhet</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

// Huvudkomponent
const HandbookApp: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Initiera med första sektionen
  useEffect(() => {
    if (defaultHandbookTemplate.sections.length > 0) {
      const firstSection = defaultHandbookTemplate.sections[0];
      setCurrentSection(firstSection.id);
      if (firstSection.pages.length > 0) {
        setCurrentPage(firstSection.pages[0].id);
      }
    }
  }, []);

  const handleSectionChange = (sectionId: string, pageId?: string) => {
    setCurrentSection(sectionId);
    
    const section = defaultHandbookTemplate.sections.find(s => s.id === sectionId);
    if (section) {
      if (pageId) {
        setCurrentPage(pageId);
      } else if (section.pages.length > 0) {
        setCurrentPage(section.pages[0].id);
      }
    }
    
    // Stäng sidebar på mobil
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false);
    }
  };

  const getCurrentSection = (): Section | undefined => {
    return defaultHandbookTemplate.sections.find(s => s.id === currentSection);
  };

  const getCurrentPage = (): Page | undefined => {
    const section = getCurrentSection();
    return section?.pages.find(p => p.id === currentPage);
  };

  return (
    <div className="handbook-app" style={{ fontFamily: "'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif" }}>
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
      />
      
      <div className="flex">
        <Sidebar
          sections={defaultHandbookTemplate.sections}
          currentSection={currentSection}
          currentPage={currentPage}
          searchQuery={searchQuery}
          isOpen={isSidebarOpen}
          onSectionChange={handleSectionChange}
          onClose={() => setIsSidebarOpen(false)}
          onSearch={setSearchQuery}
        />
        
        <ContentArea
          section={getCurrentSection()}
          page={getCurrentPage()}
          onPageChange={(pageId) => setCurrentPage(pageId)}
          onSectionChange={handleSectionChange}
        />
      </div>
    </div>
  );
};

export default HandbookApp; 