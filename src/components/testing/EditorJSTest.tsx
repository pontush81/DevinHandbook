'use client';

import React, { useState } from 'react';
import { EditorJSComponent } from '@/components/ui/EditorJSComponent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Trash2, Save, Database } from 'lucide-react';

interface OutputData {
  time?: number;
  blocks: Array<{
    id?: string;
    type: string;
    data: any;
  }>;
  version?: string;
}

const sampleContent: OutputData = {
  time: Date.now(),
  blocks: [
    {
      type: 'header',
      data: {
        text: 'EditorJS Test Sektion',
        level: 1
      }
    },
    {
      type: 'paragraph',
      data: {
        text: 'Detta är en testsektion för att validera EditorJS content-saving funktionalitet. Vi kommer att testa alla viktiga block-typer och säkerställa att data sparas och laddas korrekt.'
      }
    },
    {
      type: 'header',
      data: {
        text: 'Funktioner att testa',
        level: 2
      }
    },
    {
      type: 'list',
      data: {
        style: 'unordered',
        items: [
          'Paragraph blocks',
          'Header blocks (H1, H2, H3)',
          'Lista (unordered och ordered)',
          'Citat blocks',
          'Kod blocks',
          'Tabeller',
          'Länkar'
        ]
      }
    },
    {
      type: 'quote',
      data: {
        text: 'EditorJS är ett kraftfullt verktyg för att skapa strukturerat innehåll.',
        caption: 'Test Quote'
      }
    },
    {
      type: 'code',
      data: {
        code: 'const testFunction = () => {\n  console.log("EditorJS test!");\n  return "success";\n};'
      }
    }
  ]
};

export function EditorJSTest() {
  const [editorContent, setEditorContent] = useState<OutputData>(sampleContent);
  const [savedVersions, setSavedVersions] = useState<Array<{
    id: string;
    timestamp: string;
    content: OutputData;
    blockCount: number;
  }>>([]);
  const [saveLog, setSaveLog] = useState<Array<{
    timestamp: string;
    action: string;
    success: boolean;
    details?: string;
  }>>([]);

  const logAction = (action: string, success: boolean, details?: string) => {
    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      action,
      success,
      details
    };
    setSaveLog(prev => [logEntry, ...prev.slice(0, 19)]); // Keep last 20 entries
  };

  const handleContentChange = (data: OutputData) => {
    setEditorContent(data);
    logAction('Content Changed', true, `${data.blocks?.length || 0} blocks`);
  };

  const saveVersion = () => {
    try {
      const version = {
        id: `v_${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        content: JSON.parse(JSON.stringify(editorContent)),
        blockCount: editorContent.blocks?.length || 0
      };
      setSavedVersions(prev => [version, ...prev.slice(0, 9)]); // Keep last 10 versions
      logAction('Manual Save', true, `Saved version ${version.id}`);
    } catch (error) {
      logAction('Manual Save', false, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const loadVersion = (version: any) => {
    try {
      setEditorContent(version.content);
      logAction('Load Version', true, `Loaded ${version.id}`);
    } catch (error) {
      logAction('Load Version', false, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const clearContent = () => {
    setEditorContent({ blocks: [] });
    logAction('Clear Content', true, 'Content cleared');
  };

  const exportData = () => {
    try {
      const dataStr = JSON.stringify(editorContent, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `editorjs-export-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      logAction('Export Data', true, 'Data exported as JSON');
    } catch (error) {
      logAction('Export Data', false, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const getContentStats = () => {
    const blocks = editorContent.blocks || [];
    const stats = {
      total: blocks.length,
      headers: blocks.filter(b => b.type === 'header').length,
      paragraphs: blocks.filter(b => b.type === 'paragraph').length,
      lists: blocks.filter(b => b.type === 'list').length,
      quotes: blocks.filter(b => b.type === 'quote').length,
      code: blocks.filter(b => b.type === 'code').length,
      other: blocks.filter(b => !['header', 'paragraph', 'list', 'quote', 'code'].includes(b.type)).length
    };
    return stats;
  };

  const stats = getContentStats();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">EditorJS Content Saving Test</h1>
        <p className="text-gray-600">
          Testa och validera EditorJS content-saving funktionalitet
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>EditorJS Editor</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{stats.total} blocks</Badge>
                  <Button size="sm" onClick={saveVersion}>
                    <Save className="h-4 w-4 mr-1" />
                    Spara version
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Redigera innehåll och testa auto-save funktionalitet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditorJSComponent
                content={editorContent}
                onChange={handleContentChange}
                placeholder="Börja skriva för att testa WYSIWYG EditorJS..."
                className="min-h-[400px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Snabbåtgärder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={exportData} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exportera JSON
              </Button>
              <Button onClick={clearContent} variant="outline" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Rensa innehåll
              </Button>
            </CardContent>
          </Card>

          {/* Content Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Innehållsstatistik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Totalt: <Badge variant="secondary">{stats.total}</Badge></div>
                <div>Headers: <Badge variant="secondary">{stats.headers}</Badge></div>
                <div>Paragraf: <Badge variant="secondary">{stats.paragraphs}</Badge></div>
                <div>Listor: <Badge variant="secondary">{stats.lists}</Badge></div>
                <div>Citat: <Badge variant="secondary">{stats.quotes}</Badge></div>
                <div>Kod: <Badge variant="secondary">{stats.code}</Badge></div>
              </div>
            </CardContent>
          </Card>

          {/* Saved Versions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sparade versioner</CardTitle>
              <CardDescription>
                {savedVersions.length} av 10 versioner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedVersions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Inga sparade versioner</p>
                ) : (
                  savedVersions.map((version) => (
                    <div 
                      key={version.id}
                      className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-gray-50"
                      onClick={() => loadVersion(version)}
                    >
                      <div className="text-xs">
                        <div className="font-medium">{version.timestamp}</div>
                        <div className="text-gray-500">{version.blockCount} blocks</div>
                      </div>
                      <Database className="h-4 w-4 text-gray-400" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aktivitetslogg</CardTitle>
          <CardDescription>
            Realtidslogg över content-saving aktiviteter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-48 overflow-y-auto">
            {saveLog.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Ingen aktivitet ännu</p>
            ) : (
              <div className="space-y-1">
                {saveLog.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={entry.success ? "default" : "destructive"} className="text-xs">
                        {entry.success ? "✓" : "✗"}
                      </Badge>
                      <span className="font-medium">{entry.action}</span>
                      {entry.details && (
                        <span className="text-gray-500">- {entry.details}</span>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs">{entry.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Raw Data Inspector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Raw Data Inspector</CardTitle>
          <CardDescription>
            Visa och inspektera rådata från EditorJS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="formatted">
            <TabsList>
              <TabsTrigger value="formatted">Formaterad</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="formatted" className="mt-4">
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(editorContent, null, 2)}
                </pre>
              </div>
            </TabsContent>
            <TabsContent value="raw" className="mt-4">
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <code className="text-sm break-all">
                  {JSON.stringify(editorContent)}
                </code>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 