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
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Använd useRef för att förhindra onödiga re-renders
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const analysisResultRef = useRef<AnalysisResult | null>(null);
  
  // Synkronisera state med ref för att förhindra förlust vid re-renders
  useEffect(() => {
    analysisResultRef.current = analysisResult;
  }, [analysisResult]);
  
  // Återställ analysisResult från ref om det försvinner vid fönsterbyte
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !analysisResult && analysisResultRef.current) {
        console.log('Återställer analysresultat efter fönsterbyte');
        setAnalysisResult(analysisResultRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [analysisResult]);

  // Rapportera status-ändringar till parent
  useEffect(() => {
    if (onImportStatusChange) {
      onImportStatusChange({
        hasFile: !!file,
        isAnalyzing,
        hasResults: !!analysisResult
      });
    }
  }, [file, isAnalyzing, analysisResult, onImportStatusChange]);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelection = useCallback((selectedFile: File) => {
    // Förhindra dubbelbearbetning
    if (isProcessingRef.current) return;
    
    // Kontrollera filtyp
    const supportedFileTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    if (!supportedFileTypes.includes(selectedFile.type)) {
      setError('Filtypen stöds inte. Vänligen välj en PDF, Word-dokument eller textfil.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Filen är för stor. Maximal filstorlek är 10MB.');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setAnalysisResult(null);
  }, []);

  const analyzeDocument = useCallback(async () => {
    if (!file || isAnalyzing || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress(0);

    try {
      // Steg 1: Ladda upp fil
      setAnalysisStep('Laddar upp dokument...');
      setAnalysisProgress(20);

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Misslyckades med att ladda upp filen');
      }

      const { fileId } = await uploadResponse.json();

      // Steg 2: Extrahera text
      setAnalysisStep('Extraherar text från dokument...');
      setAnalysisProgress(50);

      const extractResponse = await fetch('/api/documents/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      if (!extractResponse.ok) {
        throw new Error('Misslyckades med textextraktion');
      }

      const { text, metadata } = await extractResponse.json();

      // Steg 3: AI-analys
      setAnalysisStep('Analyserar struktur med AI...');
      setAnalysisProgress(70);

      const analysisResponse = await fetch('/api/documents/analyze-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          metadata,
          templateType: 'brf' // Specificera att vi vill ha BRF-mappning
        }),
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        if (errorData.fallback) {
          // Speciell hantering för fallback-fall
          throw new Error(errorData.error);
        }
        throw new Error('Misslyckades med AI-analys');
      }

      const result: AnalysisResult = await analysisResponse.json();

      // Steg 4: Slutför
      setAnalysisStep('Förbereder import...');
      setAnalysisProgress(100);

      setAnalysisResult(result);

      showToast({
        title: "Analys slutförd",
        description: `Hittade ${result.sections.length} sektioner i dokumentet.`,
      });

      // Automatiskt anropa onImportComplete när analysen är klar
      // Detta eliminerar behovet av en extra knapp-klick
      console.log('🎯 [DocumentImport] Auto-importing sections after analysis completion');
      onImportComplete(result.sections);

    } catch (err) {
      console.error('Fel vid dokumentanalys:', err);
      setError(err instanceof Error ? err.message : 'Ett oväntat fel inträffade');
      showToast({
        title: "Fel vid analys",
        description: "Kunde inte analysera dokumentet. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
      setAnalysisProgress(0);
      isProcessingRef.current = false;
    }
  }, [file, isAnalyzing, onImportComplete]);

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
            Ladda upp din befintliga handbok så analyserar AI:n innehållet och skapar automatiskt sektioner enligt vår mall.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-4 md:p-6 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
              ${file ? 'border-green-500 bg-green-50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-3">
              {file ? (
                <>
                  <FileText className="h-10 w-10 md:h-12 md:w-12 text-green-600" />
                  <div className="text-center">
                    <p className="font-medium text-sm md:text-base break-all px-2">{file.name}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 md:h-12 md:w-12 text-gray-400" />
                  <div className="text-center">
                    <p className="text-base md:text-lg font-medium">
                      Dra och släpp din handbok här
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Eller klicka för att välja fil
                    </p>
                  </div>
                </>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                id="file-upload"
              />
              <Button 
                type="button"
                variant="outline" 
                className="cursor-pointer text-sm md:text-base"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing || isLoading}
              >
                Välj fil
              </Button>
              
              <div className="text-xs text-muted-foreground text-center px-2">
                Stöder PDF, Word (.docx), och textfiler upp till 10MB
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
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">{analysisStep}</span>
                  </div>
                  <Progress value={analysisProgress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {analysisResult && !isAnalyzing && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-800 text-lg">
                  <CheckCircle className="h-5 w-5" />
                  Analys slutförd
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
            {file && !analysisResult && !isAnalyzing && (
              <Button 
                type="button"
                onClick={analyzeDocument} 
                disabled={isAnalyzing || isLoading}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg ring-2 ring-blue-300 ring-opacity-50 transition-all duration-200 transform hover:scale-105"
                size="lg"
              >
                <Brain className="h-5 w-5" />
                🤖 Analysera dokument
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}); 