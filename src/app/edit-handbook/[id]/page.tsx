"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FileUploader } from "@/components/file-upload/FileUploader";
import ReactMarkdown from "react-markdown";

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

export default function EditHandbookPage({
  params,
}: {
  params: { id: string };
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

  useEffect(() => {
    if (user) {
      fetchHandbookData();
    }
  }, [user, params.id]);

  const fetchHandbookData = async () => {
    try {
      setIsLoadingData(true);
      
      const { data: handbookData, error: handbookError } = await supabase
        .from("handbooks")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user?.id)
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
        .eq("handbook_id", params.id)
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
        .eq("handbook_id", params.id);
      
      if (documentsError) throw documentsError;
      
      setDocuments(documentsData || []);
    } catch (err: unknown) {
      console.error("Error fetching handbook data:", err);
      setError("Kunde inte hämta handboksdata. Försök igen senare.");
    } finally {
      setIsLoadingData(false);
    }
  };

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
          handbook_id: params.id,
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

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!handbook) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              className="text-sm text-gray-600 hover:text-black"
            >
              Tillbaka till dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="p-4 bg-green-50 text-green-600 rounded-md mb-6">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-medium mb-4">Innehåll</h2>
              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <h3 className="font-medium text-sm">{section.title}</h3>
                    <ul className="space-y-1 pl-4">
                      {section.pages.map((page) => (
                        <li key={page.id}>
                          <button
                            onClick={() => handleSelectPage(section.id, page.id)}
                            className={`text-sm hover:text-black w-full text-left ${
                              selectedPageId === page.id
                                ? "text-black font-medium"
                                : "text-gray-500"
                            }`}
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
          </div>

          {/* Editor */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {selectedPageId ? (
                <>
                  <div className="flex items-center justify-between border-b p-4">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setIsPreview(false)}
                        className={`text-sm ${
                          !isPreview
                            ? "text-black font-medium"
                            : "text-gray-500 hover:text-black"
                        }`}
                      >
                        Redigera
                      </button>
                      <button
                        onClick={() => setIsPreview(true)}
                        className={`text-sm ${
                          isPreview
                            ? "text-black font-medium"
                            : "text-gray-500 hover:text-black"
                        }`}
                      >
                        Förhandsgranska
                      </button>
                    </div>
                    <button
                      onClick={handleSavePage}
                      disabled={isSaving}
                      className="bg-black text-white px-4 py-1 text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Sparar..." : "Spara"}
                    </button>
                  </div>

                  <div className="p-4">
                    {isPreview ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{editingContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full h-64 p-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-black font-mono text-sm"
                          placeholder="Skriv innehåll här (Markdown-formatering stöds)"
                        />
                        
                        <div className="mt-4">
                          <h3 className="text-sm font-medium mb-2">
                            Ladda upp fil
                          </h3>
                          <FileUploader
                            handbookId={handbook.id}
                            sectionId={selectedSectionId}
                            onUploadComplete={handleFileUpload}
                          />
                        </div>
                        
                        {documents.length > 0 && (
                          <div className="mt-4">
                            <h3 className="text-sm font-medium mb-2">
                              Uppladdade filer
                            </h3>
                            <ul className="space-y-1">
                              {documents
                                .filter(
                                  (doc) =>
                                    doc.section_id === selectedSectionId ||
                                    doc.section_id === null
                                )
                                .map((doc) => (
                                  <li key={doc.id} className="text-sm">
                                    <a
                                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/handbook_files/${doc.file_path}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      {doc.name}
                                    </a>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500">
                    Välj en sida från sidomenyn för att börja redigera.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
