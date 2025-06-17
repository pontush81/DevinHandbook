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
  
  // Spara state till localStorage när det ändras
  useEffect(() => {
    if (analysisResult) {
      const success = handbookStorage.saveDocumentImportState(analysisResult);
      if (success) {
        console.log('💾 Sparar document import state till localStorage');
      }
    }
  }, [analysisResult]);
  
  // Återställ state från localStorage vid komponentstart
  useEffect(() => {
    const savedData = handbookStorage.getDocumentImportState();
    if (savedData) {
      const { analysisResult: savedAnalysisResult, timestamp } = savedData;
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000; // 15 minuter i millisekunder
      
      // Återställ endast om det är mindre än 15 minuter sedan
      if (now - timestamp < fifteenMinutes && savedAnalysisResult) {
        console.log('🔄 Återställer document import state från localStorage');
        setAnalysisResult(savedAnalysisResult);
        analysisResultRef.current = savedAnalysisResult;
        
        // Meddela parent om återställd status
        if (onImportStatusChange) {
          onImportStatusChange({
            hasFile: true,
            isAnalyzing: false,
            hasResults: true
          });
        }
        
        // Trigga onImportComplete om det finns sektioner
        if (savedAnalysisResult.sections && savedAnalysisResult.sections.length > 0) {
          onImportComplete(savedAnalysisResult.sections);
        }
      }
    }
  }, [onImportComplete, onImportStatusChange]);
  
  // Återställ state vid fönsterbyte
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Återställ analysisResult från ref om det försvunnit
        if (!analysisResult && analysisResultRef.current) {
          console.log('🔄 Återställer analysresultat efter fönsterbyte');
          setAnalysisResult(analysisResultRef.current);
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
        console.log('🔄 Återställer analysresultat efter focus');
        setAnalysisResult(analysisResultRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [analysisResult, files]);

  // Rapportera status-ändringar till parent
  useEffect(() => {
    if (onImportStatusChange) {
      onImportStatusChange({
        hasFile: files.length > 0,
        isAnalyzing,
        hasResults: !!analysisResult
      });
    }
  }, [files, isAnalyzing, analysisResult, onImportStatusChange]);

  // Cleanup-funktion för att rensa localStorage
  const clearImportState = useCallback(() => {
    const success = handbookStorage.clearFormState();
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

      showToast({
        title: "Analys slutförd",
        description: `Hittade ${allSections.length} sektioner från ${files.length} dokument.`,
      });

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
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Brain className="h-5 w-5" />
            Smart handboksimport
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ladda upp dokument → AI skapar sektioner automatiskt
          </p>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6">
          {/* File Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-4 md:p-6 text-center transition-all duration-300 ease-in-out
              ${dragActive ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg transform' : 'border-gray-300'}
              ${files.length > 0 ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm' : ''}
              hover:border-gray-400 hover:bg-gray-50/50
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-3">
              {files.length > 0 ? (
                <>
                  <div className="relative">
                    <FileText className="h-10 w-10 md:h-12 md:w-12 text-green-600 animate-in zoom-in-50 duration-300" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in-75 duration-300 delay-150">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-medium text-sm md:text-base">
                      {files.length === 1 ? files[0].name : `${files.length} filer valda`}
                    </p>
                    {files.length === 1 ? (
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {(files[0].size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Total storlek: {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <div className="max-h-20 overflow-y-auto text-xs text-muted-foreground">
                          {files.map((file, index) => (
                            <div key={index} className="truncate">
                              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Upload className="h-10 w-10 md:h-12 md:w-12 text-gray-400 transition-all duration-300 hover:text-gray-600 hover:scale-110" />
                    {dragActive && (
                      <div className="absolute inset-0 border-2 border-primary border-dashed rounded-full animate-ping"></div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-base md:text-lg font-medium">
                      Dra filer hit eller klicka
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                      Flera filer tillåtna
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
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  className="cursor-pointer text-sm md:text-base"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing || isLoading}
                >
                  {files.length > 0 ? 'Välj fler filer' : 'Välj filer'}
                </Button>
                {files.length > 0 && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setFiles([]);
                      setAnalysisResult(null);
                      setError(null);
                    }}
                    disabled={isAnalyzing || isLoading}
                  >
                    Rensa alla
                  </Button>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground text-center px-2">
                <span className="block md:hidden">PDF, Word, bilder upp till 10MB</span>
                <span className="hidden md:block">Stöder PDF (inklusive scannade dokument med OCR), Word (.docx), textfiler och bilder (JPG, PNG, GIF, WebP) upp till 10MB per fil</span>
              </div>
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
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
              {/* Animated background particles */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-8 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
                <div className="absolute top-8 right-12 w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}></div>
                <div className="absolute bottom-6 left-16 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '2.2s' }}></div>
                <div className="absolute bottom-4 right-8 w-1 h-1 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '2.8s' }}></div>
                <div className="absolute top-12 left-1/3 w-1 h-1 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '2.3s' }}></div>
              </div>
              
              <CardContent className="pt-6 pb-6 relative z-10">
                <div className="space-y-5">
                  {/* Main status with enhanced animation */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <div className="absolute inset-0 h-6 w-6 border-2 border-blue-200 rounded-full animate-ping"></div>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-900 block">{analysisStep}</span>
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        Bearbetar innehåll...
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced progress bar with gradient and glow */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Progress 
                        value={analysisProgress} 
                        className="w-full h-3 bg-gradient-to-r from-blue-100 to-indigo-100" 
                      />
                      <div 
                        className="absolute top-0 left-0 h-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out shadow-lg"
                        style={{ 
                          width: `${analysisProgress}%`,
                          boxShadow: '0 0 10px rgba(79, 70, 229, 0.4)'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-600 font-medium">{Math.round(analysisProgress)}%</span>
                      <span className="text-blue-500">
                        {analysisProgress < 15 ? '📄 Laddar upp...' : 
                         analysisProgress < 25 ? '📝 Läser dokument...' : 
                         analysisProgress < 85 ? '🧠 AI analyserar djupt...' : 
                         '✨ Skapar sektioner...'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Multi-file indicator */}
                  {files.length > 1 && (
                    <div className="bg-white/50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">
                          Bearbetar fil {currentFileIndex + 1} av {files.length}
                        </span>
                      </div>
                      {/* File progress indicator */}
                      <div className="mt-2 flex gap-1">
                        {Array.from({ length: files.length }).map((_, index) => (
                          <div
                            key={index}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                              index < currentFileIndex ? 'bg-green-400' :
                              index === currentFileIndex ? 'bg-blue-500 animate-pulse' :
                              'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Processing steps visualization */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className={`p-2 rounded-lg transition-all duration-500 ${analysisProgress > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      <Upload className={`h-4 w-4 mx-auto mb-1 ${analysisProgress > 0 && analysisProgress < 15 ? 'animate-bounce' : ''}`} />
                      <div className="text-xs font-medium">Upload</div>
                    </div>
                    <div className={`p-2 rounded-lg transition-all duration-500 ${analysisProgress > 15 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                      <Brain className={`h-4 w-4 mx-auto mb-1 ${analysisProgress > 15 && analysisProgress < 85 ? 'animate-pulse' : ''}`} />
                      <div className="text-xs font-medium">AI-analys</div>
                    </div>
                    <div className={`p-2 rounded-lg transition-all duration-500 ${analysisProgress > 85 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                      <CheckCircle className={`h-4 w-4 mx-auto mb-1 ${analysisProgress > 85 ? 'animate-bounce' : ''}`} />
                      <div className="text-xs font-medium">Klar</div>
                    </div>
                  </div>
                  
                  {/* Fun loading messages */}
                  <div className="text-center">
                    <div className="text-xs text-blue-600 font-medium animate-pulse">
                      {analysisProgress < 20 ? '🔍 Läser igenom ditt dokument...' :
                       analysisProgress < 40 ? '📝 Extraherar text och struktur...' :
                       analysisProgress < 60 ? '🤖 AI:n analyserar innehållet...' :
                       analysisProgress < 80 ? '🎯 Identifierar sektioner...' :
                       '🎉 Snart klar!'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {analysisResult && !isAnalyzing && (
            <Card className="border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
              {/* Success celebration particles */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-4 left-8 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-6 right-12 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
                <div className="absolute bottom-8 left-16 w-1 h-1 bg-teal-400 rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
                <div className="absolute bottom-4 right-8 w-2 h-2 bg-green-300 rounded-full animate-ping" style={{ animationDelay: '0.9s' }}></div>
              </div>
              
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="flex items-center gap-3 text-green-800 text-lg">
                  <div className="relative">
                    <CheckCircle className="h-6 w-6 animate-in zoom-in-50 duration-300" />
                    <div className="absolute inset-0 h-6 w-6 bg-green-400 rounded-full animate-ping opacity-50"></div>
                  </div>
                  <span className="animate-in slide-in-from-left-2 duration-300 delay-150">
                    ✨ Analys slutförd
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium">Identifierade sektioner ({analysisResult.sections.length}):</h4>
                    <div className="group relative">
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Procentsatsen visar hur säker AI:n är på identifieringen
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analysisResult.sections.map((section, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg border shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-base break-words pr-2">{section.title}</h5>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge variant="outline" className={`${getConfidenceColor(section.confidence)}`}>
                              {Math.round(section.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                          {section.content.length > 200 
                            ? section.content.substring(0, 200) + '...' 
                            : section.content
                          }
                        </p>
                        {section.suggestedMapping && (
                          <div className="flex items-center gap-1 text-sm text-blue-600">
                            <span>→</span>
                            <span className="font-medium">{section.suggestedMapping}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            {files.length > 0 && !analysisResult && !isAnalyzing && (
              <Button 
                type="button"
                onClick={analyzeDocument} 
                disabled={isAnalyzing || isLoading}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg ring-2 ring-blue-300 ring-opacity-50 transition-all duration-200 transform hover:scale-105"
                size="lg"
              >
                <Brain className="h-5 w-5" />
                ✨ Skapa handbok med AI
                {files.length > 1 && (
                  <span className="ml-1 text-xs bg-white/20 px-2 py-1 rounded">
                    {files.length} filer
                  </span>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}); 