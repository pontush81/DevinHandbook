import React from 'react';
import { HandbookSection as Section } from '@/types/handbook';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AllSectionsViewProps {
  sections: Section[];
  isEditMode?: boolean;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onUpdatePage?: (pageId: string, updates: Partial<any>) => void;
}

export function AllSectionsView({ 
  sections, 
  isEditMode = false, 
  onUpdateSection,
  onUpdatePage 
}: AllSectionsViewProps) {
  if (!sections || sections.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar sektioner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-full">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Edit Mode Notice */}
        {isEditMode && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              📝 Du är i redigeringsläge. EditorJS-integration kommer snart!
            </p>
          </div>
        )}

        {/* Sections */}
        {sections.map((section, sectionIndex) => (
          <section 
            key={section.id} 
            id={`section-${section.id}`}
            className={`mb-8 sm:mb-12 last:mb-0 ${sectionIndex === 0 ? 'mt-0' : ''}`}
          >
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                  {section.title}
                </CardTitle>
                {section.description && (
                  <CardDescription className="text-base sm:text-lg text-gray-600 mt-2">
                    {section.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-6 sm:space-y-8">
                {section.pages.map((page, pageIndex) => (
                  <article 
                    key={page.id} 
                    className={`${pageIndex > 0 ? 'border-t pt-6 sm:pt-8' : ''}`}
                  >
                    {/* Page Title - only show if multiple pages in section */}
                    {section.pages.length > 1 && (
                      <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
                        {page.title}
                      </h3>
                    )}
                    
                    {/* Page Content */}
                    <div className="prose prose-blue max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: page.content }} />
                    </div>
                    
                    {/* Page Metadata */}
                    {page.lastUpdated && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Senast uppdaterad: {page.lastUpdated}
                        </div>
                        {page.estimatedReadTime && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {page.estimatedReadTime} min läsning
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </CardContent>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
} 