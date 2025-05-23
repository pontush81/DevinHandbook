import React from 'react';

interface QuickActionsProps {
  onSectionChange: (sectionId: string) => void;
  sections: any[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onSectionChange, sections }) => {
  const actions = [
    {
      icon: '👥',
      title: 'Kontakta styrelsen',
      description: 'Hitta kontaktuppgifter till styrelsemedlemmar',
      sectionTitle: 'Kontaktuppgifter och styrelse'
    },
    {
      icon: '🔧',
      title: 'Felanmälan',
      description: 'Rapportera fel och problem',
      sectionTitle: 'Felanmälan'
    },
    {
      icon: '📅',
      title: 'Boka tvättstuga',
      description: 'Information om bokning av tvättstuga',
      sectionTitle: 'Tvättstuga och bokningssystem'
    },
    {
      icon: '🤝',
      title: 'Trivselregler',
      description: 'Läs om föreningens regler',
      sectionTitle: 'Trivselregler'
    }
  ];

  const handleActionClick = (sectionTitle: string) => {
    const section = sections.find(s => s.title === sectionTitle);
    if (section) {
      onSectionChange(section.id);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {actions.map((action, index) => (
        <button
          key={index}
          className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:border-gray-300 transition-all duration-200 text-center group"
          onClick={() => handleActionClick(action.sectionTitle)}
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