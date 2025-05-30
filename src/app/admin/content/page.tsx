"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Save,
  Eye,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Handbook {
  id: string;
  name: string;
  subdomain: string;
  published: boolean;
  created_at: string;
}

interface Section {
  id: string;
  title: string;
  description: string;
  order_index: number;
  handbook_id: string;
  is_public?: boolean;
  is_published?: boolean;
  pages: Page[];
}

interface Page {
  id: string;
  title: string;
  content: string;
  order_index: number;
  section_id: string;
  is_published?: boolean;
}

export default function ContentManagementPage() {
  const searchParams = useSearchParams();
  const handbookId = searchParams.get('handbook');
  
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [selectedHandbook, setSelectedHandbook] = useState<Handbook | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [editingContent, setEditingContent] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Modal states
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");

  // Fetch handbooks
  const fetchHandbooks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("handbooks")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setHandbooks(data || []);
      
      // Auto-select handbook if provided in URL
      if (handbookId && data) {
        const handbook = data.find(h => h.id === handbookId);
        if (handbook) {
          setSelectedHandbook(handbook);
        }
      }
    } catch (err) {
      console.error("Error fetching handbooks:", err);
      setError("Kunde inte hämta handböcker");
    }
  }, [handbookId]);

  // Fetch sections and pages for selected handbook
  const fetchSections = useCallback(async (handbookId: string) => {
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select("*")
        .eq("handbook_id", handbookId)
        .order("order_index");
      
      if (sectionsError) throw sectionsError;
      
      const sectionsWithPages = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: pagesData, error: pagesError } = await supabase
            .from("pages")
            .select("*")
            .eq("section_id", section.id)
            .order("order_index");
          
          if (pagesError) throw pagesError;
          
          return {
            ...section,
            pages: pagesData || [],
          };
        })
      );
      
      setSections(sectionsWithPages);
      
      // Auto-select first section and page
      if (sectionsWithPages.length > 0) {
        setSelectedSection(sectionsWithPages[0]);
        if (sectionsWithPages[0].pages.length > 0) {
          const firstPage = sectionsWithPages[0].pages[0];
          setSelectedPage(firstPage);
          setEditingContent(firstPage.content || "");
          setEditingTitle(firstPage.title || "");
        }
      }
    } catch (err) {
      console.error("Error fetching sections:", err);
      setError("Kunde inte hämta sektioner");
    }
  }, []);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!selectedPage || !editingContent || isSaving) return;
    
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("pages")
        .update({ 
          content: editingContent,
          title: editingTitle 
        })
        .eq("id", selectedPage.id);
      
      if (error) throw error;
      
      setSuccess("Automatiskt sparad");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      setIsSaving(false);
    }
  }, [selectedPage, editingContent, editingTitle, isSaving]);

  // Handle content changes with auto-save
  const handleContentChange = (value: string) => {
    setEditingContent(value);
    
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    // Set new timeout for auto-save
    const timeout = setTimeout(autoSave, 2000);
    setAutoSaveTimeout(timeout);
  };

  // Create new section
  const createSection = async () => {
    if (!selectedHandbook || !newSectionTitle.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from("sections")
        .insert({
          title: newSectionTitle,
          description: newSectionDescription,
          order_index: sections.length,
          handbook_id: selectedHandbook.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await fetchSections(selectedHandbook.id);
      setShowNewSectionModal(false);
      setNewSectionTitle("");
      setNewSectionDescription("");
      setSuccess("Sektion skapad");
    } catch (err) {
      console.error("Error creating section:", err);
      setError("Kunde inte skapa sektion");
    }
  };

  // Create new page
  const createPage = async () => {
    if (!selectedSection || !newPageTitle.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from("pages")
        .insert({
          title: newPageTitle,
          content: "# " + newPageTitle + "\n\nSkriv ditt innehåll här...",
          order_index: selectedSection.pages.length,
          section_id: selectedSection.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await fetchSections(selectedHandbook!.id);
      setShowNewPageModal(false);
      setNewPageTitle("");
      setSuccess("Sida skapad");
    } catch (err) {
      console.error("Error creating page:", err);
      setError("Kunde inte skapa sida");
    }
  };

  // Delete page
  const deletePage = async (pageId: string, pageTitle: string) => {
    if (!selectedSection) return;
    
    // Don't allow deletion if it's the only page in the section
    if (selectedSection.pages.length <= 1) {
      setError("Kan inte radera den enda sidan i sektionen");
      return;
    }
    
    if (!window.confirm(`Är du säker på att du vill radera sidan "${pageTitle}"? Detta kan inte ångras.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("pages")
        .delete()
        .eq("id", pageId);
      
      if (error) throw error;
      
      // If we're deleting the currently selected page, clear the selection
      if (selectedPage?.id === pageId) {
        setSelectedPage(null);
        setEditingContent("");
        setEditingTitle("");
      }
      
      await fetchSections(selectedHandbook!.id);
      setSuccess("Sida raderad");
    } catch (err) {
      console.error("Error deleting page:", err);
      setError("Kunde inte radera sidan");
    }
  };

  useEffect(() => {
    fetchHandbooks();
  }, [fetchHandbooks]);

  useEffect(() => {
    if (selectedHandbook) {
      fetchSections(selectedHandbook.id);
    }
  }, [selectedHandbook, fetchSections]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Innehållshantering</h1>
          <p className="text-gray-500 mt-1">Redigera handböcker, sektioner och sidor</p>
        </div>
        {selectedHandbook && (
          <div className="flex space-x-3">
            <Link href={`/${selectedHandbook.subdomain}`} target="_blank">
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Förhandsgranska
              </Button>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Handbook Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Välj handbok</CardTitle>
          <CardDescription>Välj vilken handbok du vill redigera</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedHandbook?.id || ""}
            onValueChange={(value) => {
              const handbook = handbooks.find(h => h.id === value);
              setSelectedHandbook(handbook || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Välj en handbok..." />
            </SelectTrigger>
            <SelectContent>
              {handbooks.map((handbook) => (
                <SelectItem key={handbook.id} value={handbook.id}>
                  <div className="flex items-center space-x-2">
                    <span>{handbook.name}</span>
                    <Badge variant={handbook.published ? "default" : "secondary"}>
                      {handbook.published ? "Publicerad" : "Utkast"}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Handbook published status toggle */}
          {selectedHandbook && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="handbook-published"
                  checked={selectedHandbook.published}
                  onChange={async (e) => {
                    try {
                      const { error } = await supabase
                        .from('handbooks')
                        .update({ published: e.target.checked })
                        .eq('id', selectedHandbook.id);
                      
                      if (error) throw error;
                      
                      // Update local state
                      setHandbooks(prev => prev.map(h => 
                        h.id === selectedHandbook.id ? { ...h, published: e.target.checked } : h
                      ));
                      setSelectedHandbook(prev => prev ? { ...prev, published: e.target.checked } : null);
                      setSuccess(`Handbok ${e.target.checked ? 'publicerad' : 'avpublicerad'}`);
                      setTimeout(() => setSuccess(''), 3000);
                    } catch (err) {
                      console.error('Error updating handbook published status:', err);
                      setError('Kunde inte uppdatera publiceringsstatus');
                      setTimeout(() => setError(''), 5000);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label 
                  htmlFor="handbook-published"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Publicerad handbok
                </label>
                <span className="text-xs text-gray-500">
                  (Synlig på {selectedHandbook.subdomain}.handbok.org)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedHandbook && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sections Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Sektioner</CardTitle>
                <Dialog open={showNewSectionModal} onOpenChange={setShowNewSectionModal}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border border-gray-200 shadow-lg">
                    <DialogHeader>
                      <DialogTitle>Ny sektion</DialogTitle>
                      <DialogDescription>
                        Skapa en ny sektion i handboken
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Sektionsnamn"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                      />
                      <Textarea
                        placeholder="Beskrivning (valfritt)"
                        value={newSectionDescription}
                        onChange={(e) => setNewSectionDescription(e.target.value)}
                      />
                      <Button onClick={createSection} className="w-full">
                        Skapa sektion
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {sections.map((section) => (
                <div key={section.id}>
                  <Button
                    variant={selectedSection?.id === section.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedSection(section);
                      if (section.pages.length > 0) {
                        const firstPage = section.pages[0];
                        setSelectedPage(firstPage);
                        setEditingContent(firstPage.content || "");
                        setEditingTitle(firstPage.title || "");
                      } else {
                        setSelectedPage(null);
                        setEditingContent("");
                        setEditingTitle("");
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {section.title}
                  </Button>
                  
                  {/* Section public status toggle */}
                  <div className="ml-6 mt-1 mb-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`section-public-${section.id}`}
                        checked={section.is_public !== false}
                        onChange={async (e) => {
                          try {
                            const { error } = await supabase
                              .from('sections')
                              .update({ is_public: e.target.checked })
                              .eq('id', section.id);
                            
                            if (error) throw error;
                            
                            // Update local state
                            setSections(prev => prev.map(s => 
                              s.id === section.id ? { ...s, is_public: e.target.checked } : s
                            ));
                            setSuccess('Sektionens synlighet uppdaterad');
                            setTimeout(() => setSuccess(''), 3000);
                          } catch (err) {
                            console.error('Error updating section visibility:', err);
                            setError('Kunde inte uppdatera sektionens synlighet');
                            setTimeout(() => setError(''), 5000);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label 
                        htmlFor={`section-public-${section.id}`}
                        className="text-sm text-gray-600 cursor-pointer"
                      >
                        Publik sektion
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="checkbox"
                        id={`section-published-${section.id}`}
                        checked={section.is_published !== false}
                        onChange={async (e) => {
                          try {
                            const { error } = await supabase
                              .from('sections')
                              .update({ is_published: e.target.checked })
                              .eq('id', section.id);
                            
                            if (error) throw error;
                            
                            // Update local state
                            setSections(prev => prev.map(s => 
                              s.id === section.id ? { ...s, is_published: e.target.checked } : s
                            ));
                            setSuccess('Sektionens publiceringsstatus uppdaterad');
                            setTimeout(() => setSuccess(''), 3000);
                          } catch (err) {
                            console.error('Error updating section published status:', err);
                            setError('Kunde inte uppdatera sektionens publiceringsstatus');
                            setTimeout(() => setError(''), 5000);
                          }
                        }}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label 
                        htmlFor={`section-published-${section.id}`}
                        className="text-sm text-gray-600 cursor-pointer"
                      >
                        Publicerad sektion
                      </label>
                    </div>
                  </div>
                  
                  {selectedSection?.id === section.id && (
                    <div className="ml-6 mt-2 space-y-1">
                      {section.pages.map((page) => (
                        <div key={page.id} className="flex items-center group">
                          <Button
                            variant={selectedPage?.id === page.id ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1 justify-start text-sm"
                            onClick={() => {
                              setSelectedPage(page);
                              setEditingContent(page.content || "");
                              setEditingTitle(page.title || "");
                            }}
                          >
                            {page.title}
                          </Button>
                          
                          {/* Page published status checkbox */}
                          <div className="flex items-center space-x-1 mr-1">
                            <input
                              type="checkbox"
                              id={`page-published-${page.id}`}
                              checked={page.is_published !== false}
                              onChange={async (e) => {
                                try {
                                  const { error } = await supabase
                                    .from('pages')
                                    .update({ is_published: e.target.checked })
                                    .eq('id', page.id);
                                  
                                  if (error) throw error;
                                  
                                  // Update local state
                                  setSections(prev => prev.map(s => 
                                    s.id === selectedSection?.id ? {
                                      ...s,
                                      pages: s.pages.map(p => 
                                        p.id === page.id ? { ...p, is_published: e.target.checked } : p
                                      )
                                    } : s
                                  ));
                                  setSuccess('Sidans publiceringsstatus uppdaterad');
                                  setTimeout(() => setSuccess(''), 3000);
                                } catch (err) {
                                  console.error('Error updating page published status:', err);
                                  setError('Kunde inte uppdatera sidans publiceringsstatus');
                                  setTimeout(() => setError(''), 5000);
                                }
                              }}
                              className="h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                              title="Publicerad sida"
                            />
                          </div>
                          
                          {section.pages.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePage(page.id, page.title)}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600 ml-1"
                              title="Radera sida"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Dialog open={showNewPageModal} onOpenChange={setShowNewPageModal}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-sm text-gray-500">
                            <Plus className="h-3 w-3 mr-2" />
                            Ny sida
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border border-gray-200 shadow-lg">
                          <DialogHeader>
                            <DialogTitle>Ny sida</DialogTitle>
                            <DialogDescription>
                              Skapa en ny sida i {section.title}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Sidtitel"
                              value={newPageTitle}
                              onChange={(e) => setNewPageTitle(e.target.value)}
                            />
                            <Button onClick={createPage} className="w-full">
                              Skapa sida
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {selectedPage ? "Redigera sida" : "Välj en sida"}
                  </CardTitle>
                  {selectedPage && (
                    <CardDescription>
                      {selectedSection?.title} → {selectedPage.title}
                    </CardDescription>
                  )}
                </div>
                {selectedPage && (
                  <div className="flex items-center space-x-2">
                    {isSaving && (
                      <span className="text-sm text-gray-500">Sparar...</span>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? "Redigera" : "Förhandsgranska"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedPage ? (
                <div className="space-y-4">
                  <Input
                    placeholder="Sidtitel"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                  />
                  
                  <Tabs value={showPreview ? "preview" : "edit"} className="w-full">
                    <TabsList>
                      <TabsTrigger value="edit" onClick={() => setShowPreview(false)}>
                        Redigera
                      </TabsTrigger>
                      <TabsTrigger value="preview" onClick={() => setShowPreview(true)}>
                        Förhandsgranska
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="edit" className="mt-4">
                      <Textarea
                        placeholder="Skriv ditt innehåll här... (Markdown stöds)"
                        value={editingContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        className="min-h-[500px] font-mono"
                      />
                    </TabsContent>
                    
                    <TabsContent value="preview" className="mt-4">
                      <div className="border rounded-md p-4 min-h-[500px] bg-white">
                        <ReactMarkdown className="prose max-w-none">
                          {editingContent || "*Inget innehåll att visa*"}
                        </ReactMarkdown>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Välj en sida för att börja redigera</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 