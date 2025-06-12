import React, { useState, useCallback } from 'react';
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
  Download
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ImportedSection {
  title: string;
  content: string;
  confidence: number;
  suggestedMapping?: string;
}

interface DocumentImportProps {
  onImportComplete: (sections: ImportedSection[]) => void;
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

export function DocumentImport({ onImportComplete, isLoading = false }: DocumentImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const supportedFileTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];

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

  const handleFileSelection = (selectedFile: File) => {
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
  };

  const analyzeDocument = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setError(null);

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
      setAnalysisProgress(40);

      const extractResponse = await fetch('/api/documents/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      if (!extractResponse.ok) {
        throw new Error('Misslyckades med att extrahera text');
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
        throw new Error('Misslyckades med AI-analys');
      }

      const result: AnalysisResult = await analysisResponse.json();

      // Steg 4: Slutför
      setAnalysisStep('Förbereder import...');
      setAnalysisProgress(100);

      setAnalysisResult(result);

      toast({
        title: "Analys slutförd",
        description: `Hittade ${result.sections.length} sektioner i dokumentet.`,
      });

    } catch (err) {
      console.error('Fel vid dokumentanalys:', err);
      setError(err instanceof Error ? err.message : 'Ett oväntat fel inträffade');
      toast({
        title: "Fel vid analys",
        description: "Kunde inte analysera dokumentet. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
      setAnalysisProgress(0);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleImport = () => {
    if (analysisResult) {
      onImportComplete(analysisResult.sections);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
              ${file ? 'border-green-500 bg-green-50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              {file ? (
                <>
                  <FileText className="h-12 w-12 text-green-600" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">
                      Dra och släpp din handbok här
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Eller klicka för att välja fil
                    </p>
                  </div>
                </>
              )}
              
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer">
                  Välj fil
                </Button>
              </label>
              
              <div className="text-xs text-muted-foreground">
                Stöder PDF, Word (.docx), och textfiler upp till 10MB
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Analysis Progress */}
          {isAnalyzing && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  Analys slutförd
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Dokumenttitel:</span> {analysisResult.metadata.title}
                  </div>
                  <div>
                    <span className="font-medium">Sidor:</span> {analysisResult.metadata.totalPages}
                  </div>
                  <div>
                    <span className="font-medium">Språk:</span> {analysisResult.metadata.language}
                  </div>
                  <div>
                    <span className="font-medium">Typ:</span> {analysisResult.metadata.documentType}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Identifierade sektioner ({analysisResult.sections.length}):</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analysisResult.sections.map((section, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{section.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {section.content.substring(0, 100)}...
                          </p>
                          {section.suggestedMapping && (
                            <p className="text-xs text-blue-600 mt-1">
                              → {section.suggestedMapping}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={getConfidenceColor(section.confidence)}>
                          {Math.round(section.confidence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {file && !analysisResult && (
              <Button 
                onClick={analyzeDocument} 
                disabled={isAnalyzing || isLoading}
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                Analysera dokument
              </Button>
            )}
            
            {analysisResult && (
              <Button 
                onClick={handleImport}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Importera handbok
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 