"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from 'lucide-react';

interface Handbook {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  published: boolean;
  owner_id: string;
  organization_name?: string;
}

interface HandbooksTableProps {
  handbooks: Handbook[];
  onDataChange: () => void;
}

export function HandbooksTable({ handbooks, onDataChange }: HandbooksTableProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; handbook: Handbook | null }>({
    isOpen: false,
    handbook: null
  });

  const revalidateHandbook = async (slug: string) => {
    try {
      setIsProcessing(slug);
      setError(null);
      
      const response = await fetch('/api/admin/revalidate-handbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Kunde inte uppdatera cache');
      }
      
      // Show temporary success message
      setError(`Cache för handbok.org/${slug} har uppdaterats`);
      setTimeout(() => setError(null), 3000);
    } catch (err: unknown) {
      console.error("Error revalidating handbook:", err);
      setError(err instanceof Error ? err.message : "Kunde inte uppdatera cache");
    } finally {
      setIsProcessing(null);
    }
  };
  
  const toggleHandbookPublished = async (id: string, published: boolean) => {
    try {
      setIsProcessing(id);
      setError(null);
      
      const response = await fetch('/api/admin/toggle-handbook-published', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, published }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Kunde inte ändra publiceringstatus');
      }
      
      // Refresh data after update
      onDataChange();
    } catch (err: unknown) {
      console.error("Error toggling handbook published status:", err);
      setError(err instanceof Error ? err.message : "Kunde inte ändra publiceringstatus");
    } finally {
      setIsProcessing(null);
    }
  };

  const deleteHandbook = async (handbook: Handbook) => {
    try {
      setIsProcessing(handbook.id);
      setError(null);
      
      const response = await fetch('/api/admin/delete-handbook', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handbookId: handbook.id }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Kunde inte radera handbok');
      }
      
      // Show success message
      setError(`Handbok "${handbook.title}" har raderats permanent`);
      setTimeout(() => setError(null), 5000);
      
      // Refresh data after deletion
      onDataChange();
    } catch (err: unknown) {
      console.error("Error deleting handbook:", err);
      setError(err instanceof Error ? err.message : "Kunde inte radera handbok");
    } finally {
      setIsProcessing(null);
      setDeleteDialog({ isOpen: false, handbook: null });
    }
  };

  const handleDeleteClick = (handbook: Handbook) => {
    setDeleteDialog({ isOpen: true, handbook });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.handbook) {
      deleteHandbook(deleteDialog.handbook);
    }
  };

  return (
    <>
      {error && (
        <Alert variant={error.includes('har raderats') || error.includes('har uppdaterats') ? 'default' : 'destructive'} className="mb-4">
          {error}
        </Alert>
      )}
    
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Namn
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Skapad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ägare
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Åtgärder
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {handbooks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Inga handböcker hittades
                </td>
              </tr>
            ) : (
              handbooks.map((handbook) => (
                <tr key={handbook.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {handbook.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    handbok.org/{handbook.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(handbook.created_at).toLocaleDateString("sv-SE")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Badge variant={handbook.published ? 'success' : 'secondary'}>
                      {handbook.published ? "Publicerad" : "Utkast"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {handbook.owner_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      <a
                        href={`/handbook/${handbook.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black hover:underline"
                      >
                        Visa
                      </a>
                      <Link
                        href={`/${handbook.slug}?edit=true`}
                        className="text-black hover:underline"
                      >
                        Redigera
                      </Link>
                      <Button
                        onClick={() => revalidateHandbook(handbook.slug)}
                        disabled={isProcessing === handbook.slug}
                        className="text-black hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing === handbook.slug ? 'Uppdaterar...' : 'Uppdatera cache'}
                      </Button>
                      <Button
                        onClick={() => toggleHandbookPublished(handbook.id, !handbook.published)}
                        disabled={isProcessing === handbook.id}
                        className={`${handbook.published ? 'text-red-600' : 'text-green-600'} hover:underline disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isProcessing === handbook.id 
                          ? (handbook.published ? 'Avpublicerar...' : 'Publicerar...') 
                          : (handbook.published ? 'Avpublicera' : 'Publicera')}
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(handbook)}
                        disabled={isProcessing === handbook.id}
                        className="text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{isProcessing === handbook.id ? 'Raderar...' : 'Radera'}</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => 
        setDeleteDialog({ isOpen: open, handbook: open ? deleteDialog.handbook : null })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera handbok permanent</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera handboken <strong>"{deleteDialog.handbook?.title}"</strong>?
              <br />
              <br />
              <span className="text-red-600 font-medium">
                Detta kommer att permanent radera:
              </span>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Handboken och all metadata</li>
                <li>Alla sektioner i handboken</li>
                <li>Alla sidor och innehåll</li>
                <li>Alla medlemskap och behörigheter</li>
                <li>All trial-data kopplad till handboken</li>
              </ul>
              <br />
              <span className="text-red-600 font-medium">
                Denna åtgärd kan INTE ångras!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Ja, radera permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 