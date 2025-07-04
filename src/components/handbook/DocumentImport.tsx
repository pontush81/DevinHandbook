import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  BookOpen,
  Download,
  Info
} from 'lucide-react';
import { showToast } from '@/components/ui/use-toast';
import { DEFAULT_HANDBOOK_TEMPLATE } from '@/lib/handbook-templates';
import { handbookStorage } from '@/lib/safe-storage';

interface ImportedSection {
  title: string;
  content: string;
  confidence: number;
  suggestedMapping?: string;
}

interface DocumentImportProps {
  onImportComplete: (sections: ImportedSection[]) => void;
  onImportStatusChange?: (status: { hasFile: boolean; isAnalyzing: boolean; hasResults: boolean }) => void;
  isLoading?: boolean;
}

interface AnalysisResult {
  sections: ImportedSection[];
  metadata: {
    title: string;
    totalPages: number;
    language: string;
    documentType: string;
  };
}

// Memoize the component to prevent unnecessary re-renders
export const DocumentImport = memo(function DocumentImport({ onImportComplete, onImportStatusChange, isLoading = false }: DocumentImportProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  
  // Använd useRef för att förhindra onödiga re-renders och bevara state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const analysisResultRef = useRef<AnalysisResult | null>(null);
  const filesRef = useRef<File[]>([]);
  
  // Synkronisera state med refs för att bevara vid fönsterbyte
  useEffect(() => {
    analysisResultRef.current = analysisResult;
  }, [analysisResult]);
  
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  
  // Spara state till localStorage när det ändras - med debounce
  useEffect(() => {
    if (analysisResult) {
      const saveTimeout = setTimeout(() => {
        const success = handbookStorage.saveDocumentImportState(analysisResult);
        if (success) {
          // console.log('💾 Sparar document import state till localStorage'); // Commented out to reduce console spam
        }
      }, 1000); // 1 sekund debounce för att undvika för många sparningar
      
      return () => clearTimeout(saveTimeout);
    }
  }, [analysisResult]);
  
  // Återställ state från localStorage vid komponentstart (endast en gång)
  useEffect(() => {
    let hasRestored = false;
    
    const restoreState = () => {
      if (hasRestored) return;
      
      const savedData = handbookStorage.getDocumentImportState();
      if (savedData) {
        const { analysisResult: savedAnalysisResult, timestamp } = savedData;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000; // Reducerat från 15 till 5 minuter
        
        // Återställ endast om det är mindre än 5 minuter sedan
        if (now - timestamp < fiveMinutes && savedAnalysisResult) {
          console.log('🔄 Återställer document import state från localStorage (ålder:', Math.round((now - timestamp) / 1000 / 60), 'minuter)');
          setAnalysisResult(savedAnalysisResult);
          analysisResultRef.current = savedAnalysisResult;
          hasRestored = true;
          
          // Meddela parent om återställd status
          if (onImportStatusChange) {
            onImportStatusChange({
              hasFile: true,
              isAnalyzing: false,
              hasResults: true
            });
          }
          
          // Trigga onImportComplete om det finns sektioner - men bara om det behövs
          if (savedAnalysisResult.sections && savedAnalysisResult.sections.length > 0) {
            // Använd setTimeout för att undvika re-render loop
            setTimeout(() => {
              onImportComplete(savedAnalysisResult.sections);
            }, 0);
          }
        } else {
          console.log('🧹 Gammal AI-analys hittad men för gammal (ålder:', Math.round((now - timestamp) / 1000 / 60), 'minuter), rensar...');
          handbookStorage.clearDocumentImportState();
        }
      }
    };
    
    restoreState();
  }, []); // Tomma dependencies för att bara köra en gång
  
  // Återställ state vid fönsterbyte
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Återställ analysisResult från ref om det försvunnit
        if (!analysisResult && analysisResultRef.current) {
          console.log('🔄 Återställer analysresultat efter fönsterbyte (från ref)');
          setAnalysisResult(analysisResultRef.current);
        }
        // Om vi inte har något i ref, försök återställa från localStorage
        else if (!analysisResult && !analysisResultRef.current) {
          const savedData = handbookStorage.getDocumentImportState();
          if (savedData && savedData.analysisResult) {
            const { analysisResult: savedAnalysisResult, timestamp } = savedData;
            const fiveMinutes = 5 * 60 * 1000;
            
            if (Date.now() - timestamp < fiveMinutes) {
              console.log('🔄 Återställer analysresultat efter fönsterbyte (från localStorage)');
              setAnalysisResult(savedAnalysisResult);
              analysisResultRef.current = savedAnalysisResult;
              
              // Trigga onImportComplete om det finns sektioner
              if (savedAnalysisResult.sections && savedAnalysisResult.sections.length > 0) {
                setTimeout(() => {
                  onImportComplete(savedAnalysisResult.sections);
                }, 0);
              }
            }
          }
        }
        
        // Återställ filer från ref om de försvunnit
        if (files.length === 0 && filesRef.current.length > 0) {
          console.log('🔄 Återställer filer efter fönsterbyte');
          setFiles(filesRef.current);
        }
      }
    };
    
    const handleFocus = () => {
      // Återställ även vid focus-event för extra säkerhet
      if (!analysisResult && analysisResultRef.current) {
        console.log('🔄 Återställer analysresultat efter focus (från ref)');
        setAnalysisResult(analysisResultRef.current);
      }
      // Om vi inte har något i ref, försök återställa från localStorage
      else if (!analysisResult && !analysisResultRef.current) {
        const savedData = handbookStorage.getDocumentImportState();
        if (savedData && savedData.analysisResult) {
          const { analysisResult: savedAnalysisResult, timestamp } = savedData;
          const fiveMinutes = 5 * 60 * 1000;
          
          if (Date.now() - timestamp < fiveMinutes) {
            console.log('🔄 Återställer analysresultat efter focus (från localStorage)');
            setAnalysisResult(savedAnalysisResult);
            analysisResultRef.current = savedAnalysisResult;
            
            // Trigga onImportComplete om det finns sektioner
            if (savedAnalysisResult.sections && savedAnalysisResult.sections.length > 0) {
              setTimeout(() => {
                onImportComplete(savedAnalysisResult.sections);
              }, 0);
            }
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [analysisResult, files]);

  // Rapportera status-ändringar till parent - med memoization för att undvika onödiga anrop
  useEffect(() => {
    if (onImportStatusChange) {
      const status = {
        hasFile: files.length > 0,
        isAnalyzing,
        hasResults: !!analysisResult
      };
      
      // Använd setTimeout för att undvika re-render loops
      const statusTimeout = setTimeout(() => {
        onImportStatusChange(status);
      }, 0);
      
      return () => clearTimeout(statusTimeout);
    }
  }, [files.length, isAnalyzing, analysisResult, onImportStatusChange]);

  // Cleanup-funktion för att rensa localStorage
  const clearImportState = useCallback(() => {
    const success = handbookStorage.clearDocumentImportState();
    if (success) {
      console.log('🧹 Rensade document import state från localStorage');
    }
  }, []);

  // Exponera cleanup-funktionen för parent-komponenter
  useEffect(() => {
    // Lägg till cleanup-funktionen på window-objektet så andra komponenter kan använda den
    (window as any).clearDocumentImportState = clearImportState;
    
    return () => {
      delete (window as any).clearDocumentImportState;
    };
  }, [clearImportState]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFileSelection(Array.from(e.dataTransfer.files));
    }
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    const supportedFileTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (!supportedFileTypes.includes(file.type)) {
      return `${file.name}: Filtypen stöds inte. Tillåtna filtyper: PDF, Word, textfiler och bilder (JPG, PNG, GIF, WebP).`;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return `${file.name}: Filen är för stor. Maximal filstorlek är 10MB.`;
    }
    
    return null;
  }, []);

  const handleMultipleFileSelection = useCallback((selectedFiles: File[]) => {
    // Förhindra dubbelbearbetning
    if (isProcessingRef.current) return;
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    selectedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      setError(errors.join('\n'));
      if (validFiles.length === 0) return;
    } else {
      setError(null);
    }
    
    setFiles(validFiles);
    setAnalysisResult(null);
    setCurrentFileIndex(0);
    
    // Rensa endast AI-analys om det är helt nya filer (inte samma filnamn)
    const existingState = handbookStorage.getDocumentImportState();
    const shouldClearState = !existingState || 
                           !existingState.analysisResult ||
                           !existingState.analysisResult.metadata ||
                           validFiles.some(file => 
                             !existingState.analysisResult.metadata.title.includes(file.name)
                           );
    
    if (shouldClearState) {
      handbookStorage.clearDocumentImportState();
      console.log('🧹 Rensade gammal AI-analys när nya filer valdes');
    } else {
      console.log('💾 Behåller befintlig AI-analys (samma filer)');
    }
  }, [validateFile]);

  const handleFileSelection = useCallback((selectedFile: File) => {
    handleMultipleFileSelection([selectedFile]);
  }, [handleMultipleFileSelection]);

  const analyzeDocument = useCallback(async () => {
    if (files.length === 0 || isAnalyzing || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress(0);
    setCurrentFileIndex(0);

    try {
      const allSections: ImportedSection[] = [];
      let combinedMetadata: any = null;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i);
        
        // Steg 1: Ladda upp fil (snabbt steg)
        setAnalysisStep(`Laddar upp dokument ${i + 1}/${files.length}: ${file.name}...`);
        setAnalysisProgress((i / files.length) * 100 * 0.1); // Minska från 30% till 10%

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Misslyckades med att ladda upp ${file.name}`);
        }

        const { fileId } = await uploadResponse.json();

        // Steg 2: Extrahera text
        setAnalysisStep(`Extraherar text från ${file.name}... (OCR för scannade dokument kan ta längre tid)`);
        setAnalysisProgress((i / files.length) * 100 * 0.1 + 15); // Justerad timing

        const extractFormData = new FormData();
        extractFormData.append('fileId', fileId);
        
        const extractResponse = await fetch('/api/documents/extract-text', {
          method: 'POST',
          body: extractFormData,
        });

        if (!extractResponse.ok) {
          const errorData = await extractResponse.json();
          if (errorData.error && errorData.error.includes('scannad PDF')) {
            throw new Error(`${file.name} verkar vara en scannad PDF. OCR-bearbetning misslyckades. Försök med en PDF som innehåller text eller ett Word-dokument.`);
          }
          throw new Error(`Misslyckades med textextraktion för ${file.name}: ${errorData.error || 'Okänt fel'}`);
        }

        const extractResult = await extractResponse.json();
        const text = extractResult.extractedText || extractResult.text || '';
        const metadata = {
          title: file.name,
          pages: extractResult.pages || 1,
          textLength: extractResult.textLength || text.length,
          extractionMethod: extractResult.success ? 'success' : 'fallback'
        };

        // Steg 3: AI-analys (längre steg med mer tid)
        setAnalysisStep(`🤖 AI analyserar ${file.name}...`);
        setAnalysisProgress((i / files.length) * 100 * 0.1 + 30); // Startar vid 30% istället för 50%

        // Reduce logging frequency to prevent render loops  
        if (i === 0 || i === files.length - 1) { // Only log first and last file
          console.log('[DocumentImport] Skickar analyze-structure-anrop:', {
            fileIndex: i + 1,
            totalFiles: files.length,
            fileName: file.name,
            documentId: fileId
          });
        }

        const analysisResponse = await fetch('/api/documents/analyze-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text, 
            metadata: {
              ...metadata,
              title: `${metadata?.title || file.name} (Dokument ${i + 1})`
            },
            templateType: 'brf',
            documentId: fileId // <-- Skicka alltid med documentId!
          }),
        });

        if (!analysisResponse.ok) {
          const errorData = await analysisResponse.json();
          console.error(`❌ [DocumentImport] Analysis failed for ${file.name}:`, errorData);
          
          // Hantera scannade PDF:er och andra fall där text inte kunde extraheras
          if (errorData.error?.includes('Inga giltiga sektioner') || 
              errorData.error?.includes('scannad PDF') ||
              errorData.error?.includes('Detta verkar vara en scannad PDF')) {
            console.log(`📄 [DocumentImport] Detected scanned PDF: ${file.name}, creating placeholder sections`);
            
            // Skapa placeholder-sektioner för scannade dokument
            const placeholderSections = DEFAULT_HANDBOOK_TEMPLATE.map(section => ({
              content: `📄 **Scannad PDF-fil:** ${file.name}

Detta dokument verkar vara en scannad PDF som innehåller bilder istället för text. 

**För att lägga till innehåll från detta dokument:**

1. **OCR-konvertering:** Använd Adobe Acrobat Pro eller liknande för att konvertera till sökbar text
2. **Google Drive:** Ladda upp PDF:en till Google Drive - den konverteras automatiskt
3. **Online OCR:** Använd verktyg som ocr.space eller onlineocr.net
4. **Manuell kopiering:** Kopiera texten manuellt från dokumentet

**Redigera denna sektion** för att lägga till det faktiska innehållet när du har konverterat dokumentet.`,
              title: files.length > 1 ? `${section.title} (${file.name})` : section.title,
              confidence: 0.2 // Låg confidence för placeholder
            }));
            
            allSections.push(...placeholderSections);
            console.log(`📄 [DocumentImport] Added ${placeholderSections.length} placeholder sections for scanned PDF: ${file.name}`);
            continue; // Fortsätt med nästa fil
          }
          
          if (errorData.fallback) {
            console.warn(`⚠️ [DocumentImport] Using fallback for ${file.name}: ${errorData.error}`);
            // Även med fallback, försök att extrahera något användbart
            if (errorData.sections && errorData.sections.length > 0) {
              const fallbackSections = errorData.sections.map((section: ImportedSection) => ({
                ...section,
                title: files.length > 1 ? `${section.title} (${file.name})` : section.title,
                confidence: 0.3 // Låg confidence för fallback
              }));
              allSections.push(...fallbackSections);
              console.log(`🔄 [DocumentImport] Added ${fallbackSections.length} fallback sections from ${file.name}`);
            }
            continue; // Hoppa över denna fil och fortsätt med nästa
          }
          throw new Error(`Misslyckades med AI-analys för ${file.name}: ${errorData.error || 'Okänt fel'}`);
        }

        const result = await analysisResponse.json();
        
        // Lägg till sektioner från denna fil
        if (result.sections && result.sections.length > 0) {
          console.log(`🔍 [DocumentImport] File ${i + 1}/${files.length} (${file.name}) produced ${result.sections.length} sections`);
          // Lägg till filnamn som prefix till sektionstitlar för att undvika konflikter
          const sectionsWithPrefix = result.sections.map((section: ImportedSection) => ({
            ...section,
            title: files.length > 1 ? `${section.title} (${file.name})` : section.title
          }));
          allSections.push(...sectionsWithPrefix);
          console.log(`🔍 [DocumentImport] Total sections so far: ${allSections.length}`);
        } else {
          console.warn(`⚠️ [DocumentImport] File ${file.name} produced no sections`);
        }

        // Spara metadata från första filen
        if (i === 0) {
          combinedMetadata = metadata;
        }
      }

      // Skapa kombinerat resultat
      const combinedResult: AnalysisResult = {
        sections: allSections,
        metadata: {
          ...combinedMetadata,
          title: files.length > 1 ? `Kombinerat dokument (${files.length} filer)` : combinedMetadata?.title || files[0]?.name || 'Okänt dokument',
          totalPages: files.length, // Använd antal filer som "sidor"
          documentType: 'combined'
        }
      };

      // Steg 4: Slutför
      setAnalysisStep('Förbereder import...');
      setAnalysisProgress(100);

      setAnalysisResult(combinedResult);

      // Automatiskt anropa onImportComplete när analysen är klar
      console.log(`🎯 [DocumentImport] Auto-importing ${allSections.length} sections from ${files.length} files after analysis completion`);
      console.log('🎯 [DocumentImport] Final sections:', allSections.map(s => s.title));
      onImportComplete(allSections);

    } catch (err) {
      console.error('Fel vid dokumentanalys:', err);
      setError(err instanceof Error ? err.message : 'Ett oväntat fel inträffade');
      showToast({
        title: "Fel vid analys",
        description: "Kunde inte analysera dokumenten. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
      setAnalysisProgress(0);
      setCurrentFileIndex(0);
      isProcessingRef.current = false;
    }
  }, [files, isAnalyzing, onImportComplete]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Brain className="h-6 w-6" />
            Skapa handbok
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Ladda upp dokument och låt AI skapa en strukturerad handbok
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* File Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ease-in-out
              ${dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-200'}
              ${files.length > 0 ? 'border-green-400 bg-green-50/30' : ''}
              hover:border-gray-300 hover:bg-gray-50/30
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-6">
              {files.length > 0 ? (
                <>
                  <div className="relative">
                    <FileText className="h-12 w-12 text-green-600" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-medium text-base">
                      {files.length === 1 ? files[0].name : `${files.length} filer valda`}
                    </p>
                    {files.length === 1 && (
                      <p className="text-sm text-muted-foreground">
                        {(files[0].size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Upload className="h-12 w-12 text-gray-400" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-lg font-medium text-gray-900">
                      Dra filer hit
                    </p>
                    <p className="text-sm text-muted-foreground">
                      eller klicka för att välja
                    </p>
                  </div>
                </>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                multiple
                onChange={(e) => e.target.files && handleMultipleFileSelection(Array.from(e.target.files))}
                id="file-upload"
              />
              
              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  className="cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing || isLoading}
                >
                  {files.length > 0 ? 'Lägg till fler' : 'Välj filer'}
                </Button>
                {files.length > 0 && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setFiles([]);
                      setAnalysisResult(null);
                      setError(null);
                    }}
                    disabled={isAnalyzing || isLoading}
                  >
                    Rensa
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                PDF, Word eller textfiler (max 10MB)
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Analysis Progress */}
          {isAnalyzing && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="pt-6 pb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 block">{analysisStep}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Progress value={analysisProgress} className="w-full h-2" />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{Math.round(analysisProgress)}%</span>
                      {files.length > 1 && (
                        <span>Fil {currentFileIndex + 1} av {files.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Button */}
          {files.length > 0 && !analysisResult && !isAnalyzing && (
            <div className="pt-2">
              <Button 
                type="button"
                onClick={analyzeDocument} 
                disabled={isAnalyzing || isLoading}
                className="w-full"
                size="lg"
              >
                <Brain className="h-4 w-4 mr-2" />
                Skapa handbok
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default DocumentImport; 