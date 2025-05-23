"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import FileUploader from "@/components/file-upload/FileUploader";
import ReactMarkdown from "react-markdown";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { MainLayout } from '@/components/layout/MainLayout';
import { MembersManager } from '@/components/handbook/MembersManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Handbook {
  id: string;
  title: string;
  subdomain: string;
  created_at: string;
  published: boolean;
}

interface Section {
  id: string;
  title: string;
  description: string;
  order_index: number;
  handbook_id: string;
  pages: Page[];
}

interface Page {
  id: string;
  title: string;
  content: string;
  slug: string;
  order_index: number;
  section_id: string;
}

interface Document {
  id: string;
  name: string;
  file_path: string;
  handbook_id: string;
  section_id: string | null;
}

interface NewSectionData {
  title: string;
  description: string;
}

interface NewPageData {
  title: string;
  content: string;
}

export default function EditHandbookClient({
  id,
}: {
  id: string;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [handbook, setHandbook] = useState<Handbook | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [newSectionData, setNewSectionData] = useState<NewSectionData>({ title: '', description: '' });
  const [newPageData, setNewPageData] = useState<NewPageData>({ title: '', content: '' });
  const [isCreating, setIsCreating] = useState(false);

  // Function to generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')  // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Replace multiple hyphens with single hyphen
      .trim()
      .substring(0, 50);             // Limit length
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const fetchHandbookData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      
      const { data: handbookData, error: handbookError } = await supabase
        .from("handbooks")
        .select("*")
        .eq("id", id)
        .eq("owner_id", user?.id)
        .single();
      
      if (handbookError) throw handbookError;
      if (!handbookData) {
        router.push("/dashboard");
        return;
      }
      
      setHandbook(handbookData);
      
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select("*")
        .eq("handbook_id", id)
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
      
      if (sectionsWithPages.length > 0) {
        setSelectedSectionId(sectionsWithPages[0].id);
        
        if (sectionsWithPages[0].pages.length > 0) {
          setSelectedPageId(sectionsWithPages[0].pages[0].id);
          setEditingContent(sectionsWithPages[0].pages[0].content);
        }
      }
      
      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .eq("handbook_id", id);
      
      if (documentsError) throw documentsError;
      
      setDocuments(documentsData || []);
    } catch (err: unknown) {
      console.error("Error fetching handbook data:", err);
      setError("Kunde inte hämta handboksdata. Försök igen senare.");
    } finally {
      setIsLoadingData(false);
    }
  }, [id, router, user?.id]);

  useEffect(() => {
    if (user) {
      fetchHandbookData();
    }
  }, [user, id, fetchHandbookData]);

  const handleSavePage = async () => {
    if (!selectedPageId) return;
    
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const { error } = await supabase
        .from("pages")
        .update({ content: editingContent })
        .eq("id", selectedPageId);
      
      if (error) throw error;
      
      setSuccessMessage("Sidan har sparats");
      
      setSections((prevSections) =>
        prevSections.map((section) => ({
          ...section,
          pages: section.pages.map((page) =>
            page.id === selectedPageId
              ? { ...page, content: editingContent }
              : page
          ),
        }))
      );
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: unknown) {
      console.error("Error saving page:", err);
      setError("Kunde inte spara sidan. Försök igen senare.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPage = (sectionId: string, pageId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    const page = section?.pages.find((p) => p.id === pageId);
    
    if (page) {
      setSelectedSectionId(sectionId);
      setSelectedPageId(pageId);
      setEditingContent(page.content);
      setIsPreview(false);
    }
  };

  const handleFileUpload = async (filePath: string, fileName: string) => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from("documents")
        .insert({
          name: fileName,
          file_path: filePath,
          handbook_id: id,
          section_id: selectedSectionId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setDocuments((prev) => [...prev, data]);
      
      const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/handbook_files/${filePath}`;
      const markdownLink = `[${fileName}](${fileUrl})`;
      setEditingContent((prev) => prev + "\n\n" + markdownLink);
    } catch (err: unknown) {
      console.error("Error saving document:", err);
      setError("Kunde inte spara dokumentet. Försök igen senare.");
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionData.title.trim()) {
      setError('Sektionsnamn är obligatoriskt');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const maxOrder = Math.max(...sections.map(s => s.order_index), 0);
      
      const { data, error: createError } = await supabase
        .from('sections')
        .insert({
          title: newSectionData.title,
          description: newSectionData.description,
          order_index: maxOrder + 1,
          handbook_id: id
        })
        .select()
        .single();

      if (createError) throw createError;

      const newSection = { ...data, pages: [] };
      setSections(prev => [...prev, newSection]);
      setNewSectionData({ title: '', description: '' });
      setShowNewSectionModal(false);
      setSuccessMessage('Sektion skapad framgångsrikt!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error creating section:', err);
      setError('Kunde inte skapa sektion. Försök igen senare.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna sektion? Alla sidor i sektionen kommer också att tas bort.')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);

      if (deleteError) throw deleteError;

      setSections(prev => prev.filter(s => s.id !== sectionId));
      
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
        setSelectedPageId(null);
        setEditingContent('');
      }

      setSuccessMessage('Sektion borttagen framgångsrikt!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error deleting section:', err);
      setError('Kunde inte ta bort sektion. Försök igen senare.');
    }
  };

  const handleCreatePage = async () => {
    if (!selectedSectionId) {
      setError('Välj en sektion först');
      return;
    }

    if (!newPageData.title.trim()) {
      setError('Sidtitel är obligatorisk');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const section = sections.find(s => s.id === selectedSectionId);
      const maxOrder = Math.max(...(section?.pages.map(p => p.order_index) || []), 0);
      
      const { data, error: createError } = await supabase
        .from('pages')
        .insert({
          title: newPageData.title,
          content: newPageData.content,
          slug: generateSlug(newPageData.title),
          order_index: maxOrder + 1,
          section_id: selectedSectionId
        })
        .select()
        .single();

      if (createError) throw createError;

      setSections(prev => prev.map(s => 
        s.id === selectedSectionId 
          ? { ...s, pages: [...s.pages, data] }
          : s
      ));

      setNewPageData({ title: '', content: '' });
      setShowNewPageModal(false);
      setSuccessMessage('Sida skapad framgångsrikt!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error creating page:', err);
      setError('Kunde inte skapa sida. Försök igen senare.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna sida?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (deleteError) throw deleteError;

      setSections(prev => prev.map(s => ({
        ...s,
        pages: s.pages.filter(p => p.id !== pageId)
      })));

      if (selectedPageId === pageId) {
        setSelectedPageId(null);
        setEditingContent('');
      }

      setSuccessMessage('Sida borttagen framgångsrikt!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error deleting page:', err);
      setError('Kunde inte ta bort sida. Försök igen senare.');
    }
  };

  const handleMoveSectionUp = async (sectionId: string) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex <= 0) return;

    const currentSection = sections[sectionIndex];
    const previousSection = sections[sectionIndex - 1];

    try {
      // Swap orders
      await Promise.all([
        supabase.from('sections').update({ order_index: previousSection.order_index }).eq('id', currentSection.id),
        supabase.from('sections').update({ order_index: currentSection.order_index }).eq('id', previousSection.id)
      ]);

      // Update local state
      const newSections = [...sections];
      [newSections[sectionIndex - 1], newSections[sectionIndex]] = [newSections[sectionIndex], newSections[sectionIndex - 1]];
      setSections(newSections);
    } catch (err: unknown) {
      console.error('Error moving section:', err);
      setError('Kunde inte flytta sektion. Försök igen senare.');
    }
  };

  const handleMoveSectionDown = async (sectionId: string) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex >= sections.length - 1) return;

    const currentSection = sections[sectionIndex];
    const nextSection = sections[sectionIndex + 1];

    try {
      // Swap orders
      await Promise.all([
        supabase.from('sections').update({ order_index: nextSection.order_index }).eq('id', currentSection.id),
        supabase.from('sections').update({ order_index: currentSection.order_index }).eq('id', nextSection.id)
      ]);

      // Update local state
      const newSections = [...sections];
      [newSections[sectionIndex], newSections[sectionIndex + 1]] = [newSections[sectionIndex + 1], newSections[sectionIndex]];
      setSections(newSections);
    } catch (err: unknown) {
      console.error('Error moving section:', err);
      setError('Kunde inte flytta sektion. Försök igen senare.');
    }
  };

  // --- Permissions-komponent ---
  const PermissionsSection: React.FC<{ handbookId: string }> = ({ handbookId }) => {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<'editor' | 'viewer'>("editor");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchPermissions = useCallback(async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("handbook_permissions")
        .select("id, role, owner_id, profiles: owner_id (email)")
        .eq("handbook_id", handbookId);
      if (error) setError("Kunde inte hämta behörigheter");
      setPermissions(data || []);
      setLoading(false);
    }, [handbookId]);

    useEffect(() => {
      fetchPermissions();
    }, [fetchPermissions]);

    const handleInvite = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      setLoading(true);
      const res = await fetch("/api/handbook/add-permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, email, role }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Redaktör/läsare tillagd!");
        setEmail("");
        fetchPermissions();
      } else {
        setError(data.message || "Kunde inte lägga till redaktör/läsare");
      }
      setLoading(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    };

    const handleRemove = async (userId: string) => {
      setError(null);
      setSuccess(null);
      setLoading(true);
      const res = await fetch("/api/handbook/remove-permission", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, userId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Behörighet borttagen!");
        fetchPermissions();
      } else {
        setError(data.message || "Kunde inte ta bort behörighet");
      }
      setLoading(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    };

    const handleRoleChange = async (userId: string, newRole: 'editor' | 'viewer') => {
      setUpdatingId(userId);
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/handbook/update-permission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, userId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Roll uppdaterad!");
        fetchPermissions();
      } else {
        setError(data.message || "Kunde inte uppdatera roll");
      }
      setUpdatingId(null);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    };

    return (
      <section className="mt-12 p-6 bg-white rounded-xl shadow border">
        <h3 className="text-lg font-semibold mb-2">Redaktörer & behörigheter</h3>
        {success && <div className="mb-2 p-2 bg-green-100 text-green-700 rounded">{success}</div>}
        {error && <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleInvite} className="flex gap-2 items-center mb-4">
          <Input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Redaktör</SelectItem>
              <SelectItem value="viewer">Läsare</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={loading}>Bjud in</Button>
        </form>
        <div>
          <h4 className="font-medium mb-1">Nuvarande behörigheter:</h4>
          {loading ? (
            <div>Laddar...</div>
          ) : permissions.length === 0 ? (
            <div>Inga redaktörer/läsare tillagda ännu.</div>
          ) : (
            <ul className="divide-y">
              {permissions.map((perm) => (
                <li key={perm.id} className="py-2 flex justify-between items-center">
                  <span>{perm.profiles?.email || perm.owner_id}</span>
                  <Select
                    value={perm.role}
                    onValueChange={value => handleRoleChange(perm.owner_id, value as 'editor' | 'viewer')}
                    disabled={updatingId === perm.owner_id}
                  >
                    <SelectTrigger className="ml-2 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Redaktör</SelectItem>
                      <SelectItem value="viewer">Läsare</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleRemove(perm.owner_id)}
                    className="ml-4 text-xs text-red-600 hover:underline"
                    disabled={loading}
                    variant="link"
                  >
                    Ta bort
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  };
  // --- SLUT permissions-komponent ---

  if (isLoading || isLoadingData) {
    return (
      <MainLayout variant="app" showAuth={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </MainLayout>
    );
  }

  if (!handbook) {
    return (
      <MainLayout variant="app" showAuth={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Handbok hittades inte</h1>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
            >
              Tillbaka till dashboard
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout variant="app" showAuth={false}>
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{handbook.title}</h1>
            <p className="text-gray-500 text-sm">
              {handbook.subdomain}.handbok.org
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href={`https://${handbook.subdomain}.handbok.org`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-black"
            >
              Visa publicerad handbok
            </a>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
            >
              Tillbaka till dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="content">Innehåll</TabsTrigger>
            <TabsTrigger value="members">Medlemmar</TabsTrigger>
            <TabsTrigger value="settings">Inställningar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Sektioner och sidor</h2>
                  <Button
                    onClick={() => setShowNewSectionModal(true)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    + Ny sektion
                  </Button>
                </div>
                
                {error && (
                  <div className="bg-red-100 text-red-700 p-2 rounded mb-4">
                    {error}
                  </div>
                )}
                
                {successMessage && (
                  <div className="bg-green-100 text-green-700 p-2 rounded mb-4">
                    {successMessage}
                  </div>
                )}
                
                <div className="space-y-4">
                  {sections.map((section, sectionIndex) => (
                    <div key={section.id} className="space-y-2 border-l-2 border-gray-200 pl-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium border-b pb-1 flex-1">
                          {section.title}
                        </div>
                        <div className="flex gap-1 ml-2">
                          {sectionIndex > 0 && (
                            <button
                              onClick={() => handleMoveSectionUp(section.id)}
                              className="text-xs text-gray-500 hover:text-gray-700 p-1"
                              title="Flytta upp"
                            >
                              ↑
                            </button>
                          )}
                          {sectionIndex < sections.length - 1 && (
                            <button
                              onClick={() => handleMoveSectionDown(section.id)}
                              className="text-xs text-gray-500 hover:text-gray-700 p-1"
                              title="Flytta ner"
                            >
                              ↓
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSection(section.id)}
                            className="text-xs text-red-500 hover:text-red-700 p-1"
                            title="Ta bort sektion"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <ul className="pl-4 space-y-1">
                        {section.pages.map((page) => (
                          <li key={page.id} className="flex items-center justify-between">
                            <button
                              className={`flex-1 text-left px-2 py-1 rounded ${
                                selectedPageId === page.id
                                  ? "bg-black text-white"
                                  : "hover:bg-gray-100"
                              }`}
                              onClick={() =>
                                handleSelectPage(section.id, page.id)
                              }
                            >
                              {page.title}
                            </button>
                            <button
                              onClick={() => handleDeletePage(page.id)}
                              className="text-xs text-red-500 hover:text-red-700 p-1 ml-2"
                              title="Ta bort sida"
                            >
                              🗑️
                            </button>
                          </li>
                        ))}
                        <li>
                          <button
                            onClick={() => {
                              setSelectedSectionId(section.id);
                              setShowNewPageModal(true);
                            }}
                            className="text-xs text-green-600 hover:text-green-800 px-2 py-1 border border-dashed border-green-300 rounded w-full"
                          >
                            + Lägg till sida
                          </button>
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="lg:col-span-2 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                {selectedPageId ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">
                        {
                          sections
                            .find((s) => s.id === selectedSectionId)
                            ?.pages.find((p) => p.id === selectedPageId)?.title
                        }
                      </h2>
                      <div className="space-x-2">
                        <Button
                          onClick={() => setIsPreview(!isPreview)}
                          variant="outline"
                        >
                          {isPreview ? "Redigera" : "Förhandsgranska"}
                        </Button>
                        <Button
                          onClick={handleSavePage}
                          disabled={isSaving}
                        >
                          {isSaving ? "Sparar..." : "Spara"}
                        </Button>
                      </div>
                    </div>
                    
                    {isPreview ? (
                      <div className="prose max-w-none">
                        <ReactMarkdown>{editingContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full h-[60vh] font-mono text-sm"
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">
                      Välj en sida från menyn till vänster för att redigera
                    </p>
                    <p className="text-sm text-gray-400">
                      Eller lägg till en ny sektion/sida för att komma igång
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal for creating new section */}
            {showNewSectionModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Skapa ny sektion</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sektionsnamn *
                      </label>
                      <Input
                        value={newSectionData.title}
                        onChange={(e) => setNewSectionData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="T.ex. Kontaktuppgifter"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Beskrivning
                      </label>
                      <Textarea
                        value={newSectionData.description}
                        onChange={(e) => setNewSectionData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Valfri beskrivning av sektionen"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewSectionModal(false);
                        setNewSectionData({ title: '', description: '' });
                      }}
                    >
                      Avbryt
                    </Button>
                    <Button
                      onClick={handleCreateSection}
                      disabled={isCreating || !newSectionData.title.trim()}
                    >
                      {isCreating ? 'Skapar...' : 'Skapa sektion'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal for creating new page */}
            {showNewPageModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4">Skapa ny sida</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sidtitel *
                      </label>
                      <Input
                        value={newPageData.title}
                        onChange={(e) => setNewPageData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="T.ex. Styrelsemedlemmar"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Innehåll (Markdown)
                      </label>
                      <Textarea
                        value={newPageData.content}
                        onChange={(e) => setNewPageData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="# Rubrik

Skriv ditt innehåll här med Markdown-formatering.

## Underrubrik
- Listpunkt 1
- Listpunkt 2"
                        rows={10}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewPageModal(false);
                        setNewPageData({ title: '', content: '' });
                      }}
                    >
                      Avbryt
                    </Button>
                    <Button
                      onClick={handleCreatePage}
                      disabled={isCreating || !newPageData.title.trim()}
                    >
                      {isCreating ? 'Skapar...' : 'Skapa sida'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="members">
            <MembersManager handbookId={id} currentUserId={user?.id || ''} />
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Inställningar</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Handbokens namn</h3>
                  <Input
                    value={handbook.title}
                    onChange={(e) => setHandbook({ ...handbook, title: e.target.value })}
                    className="max-w-md"
                  />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Dokument</h3>
                  <FileUploader handbookId={id} onUpload={handleFileUpload} />
                  
                  {documents.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Uppladdade dokument</h4>
                      <ul className="space-y-1">
                        {documents.map((doc) => (
                          <li key={doc.id} className="flex items-center justify-between">
                            <a
                              href={`${supabase.storage.getPublicUrl(doc.file_path).data.publicUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {doc.name}
                            </a>
                            <button
                              className="text-red-600 hover:underline text-sm"
                              onClick={() => {
                                // Handle document deletion
                              }}
                            >
                              Ta bort
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
