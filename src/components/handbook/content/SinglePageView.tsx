import React from 'react';
import { HandbookPage as Page } from '@/types/handbook';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SinglePageViewProps {
  page: Page;
  isEditMode?: boolean;
  onUpdatePage?: (pageId: string, updates: Partial<Page>) => void;
}

export function SinglePageView({ 
  page, 
  isEditMode = false, 
  onUpdatePage 
}: SinglePageViewProps) {
  if (!page) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar sida...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
              {page.title}
            </CardTitle>
            {page.lastUpdated && (
              <CardDescription className="flex items-center text-gray-500 mt-2">
                <Calendar className="w-4 h-4 mr-2" />
                Senast uppdaterad: {page.lastUpdated}
              </CardDescription>
            )}
            {page.estimatedReadTime && (
              <CardDescription className="flex items-center text-gray-500 mt-1">
                <Clock className="w-4 h-4 mr-2" />
                {page.estimatedReadTime} min läsning
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose prose-blue max-w-none">
              {isEditMode ? (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-700">
                      🚧 EditorJS-integration kommer snart! Just nu visas innehållet som HTML.
                    </p>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: page.content }} />
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: page.content }} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 