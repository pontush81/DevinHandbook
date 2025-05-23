import React from 'react';
import { Section, Page } from '@/lib/templates/handbook-template';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuickActions } from './QuickActions';

interface ContentAreaProps {
  section?: Section;
  page?: Page;
  sections: Section[];
  onPageChange: (pageId: string) => void;
  onSectionChange: (sectionId: string) => void;
}

export const ContentArea: React.FC<ContentAreaProps> = ({
  section,
  page,
  sections,
  onPageChange,
  onSectionChange
}) => {
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

              <QuickActions onSectionChange={onSectionChange} sections={sections} />

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