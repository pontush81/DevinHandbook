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
  name: string;
  subdomain: string;
  created_at: string;
  published: boolean;
}

interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  handbook_id: string;
  pages: Page[];
}

interface Page {
  id: string;
  title: string;
  content: string;
  order: number;
  section_id: string;
}

interface Document {
  id: string;
  name: string;
  file_path: string;
  handbook_id: string;
  section_id: string | null;
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
        .order("order");
      
      if (sectionsError) throw sectionsError;
      
      const sectionsWithPages = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: pagesData, error: pagesError } = await supabase
            .from("pages")
            .select("*")
            .eq("section_id", section.id)
            .order("order");
          
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
            <h1 className="text-2xl font-bold">{handbook.name}</h1>
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
                <h2 className="text-xl font-bold mb-4">Sektioner och sidor</h2>
                
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
                  {sections.map((section) => (
                    <div key={section.id} className="space-y-2">
                      <div className="font-medium border-b pb-1">
                        {section.title}
                      </div>
                      <ul className="pl-4 space-y-1">
                        {section.pages.map((page) => (
                          <li key={page.id}>
                            <button
                              className={`w-full text-left px-2 py-1 rounded ${
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
                          </li>
                        ))}
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
                    <p className="text-gray-500">
                      Välj en sida från menyn till vänster för att redigera
                    </p>
                  </div>
                )}
              </div>
            </div>
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
                    value={handbook.name}
                    onChange={(e) => setHandbook({ ...handbook, name: e.target.value })}
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
