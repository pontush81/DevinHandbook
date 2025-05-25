import React from 'react';
import { X, Home, Users, AlertTriangle, DollarSign, FileText, Building, Wrench, Trash2, Car, Shirt, MapPin, HelpCircle, Archive, Shield, Calendar } from 'lucide-react';
import { HandbookSection } from '../../types/handbook';

interface SidebarProps {
  sections: HandbookSection[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  showMobileHeader?: boolean;
}

const getSectionIcon = (title: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    'Välkommen': Home,
    'Kontaktuppgifter och styrelse': Users,
    'Felanmälan': AlertTriangle,
    'Ekonomi och avgifter': DollarSign,
    'Stadgar och årsredovisning': FileText,
    'Renoveringar och underhåll': Building,
    'Bopärmar och regler': Wrench,
    'Sopsortering och återvinning': Trash2,
    'Parkering och garage': Car,
    'Tvättstuga och bokningssystem': Shirt,
    'Gemensamma utrymmen': MapPin,
    'Vanliga frågor (FAQ)': HelpCircle,
    'Dokumentarkiv': Archive,
    'Säkerhet och trygghet': Shield,
    'Viktiga datum': Calendar
  };
  
  return iconMap[title] || FileText;
};

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  currentPageId,
  onPageSelect,
  isOpen,
  onClose,
  showMobileHeader = true
}) => {
  const handleSectionClick = (sectionId: string) => {
    // Scroll to the section
    const sectionElement = document.getElementById(`section-${sectionId}`);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Only close sidebar on mobile
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      {/* Mobile overlay - only show on mobile when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        w-80 bg-white border-r border-gray-200 z-50
        lg:relative lg:h-auto
        fixed lg:static top-0 left-0 h-full
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header - only show on mobile */}
        {showMobileHeader && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Innehållsförteckning</h2>
          </div>
        )}

        {/* Content */}
        <div className="p-4 h-full overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4 hidden lg:block">
            Innehållsförteckning
          </h3>
          
          <nav className="space-y-2">
            {sections.map((section, index) => {
              const IconComponent = getSectionIcon(section.title);
              
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className="w-full flex items-center space-x-3 px-3 py-3 text-left rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <IconComponent className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-400">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {section.title}
                      </h4>
                    </div>
                    {section.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {section.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}; 