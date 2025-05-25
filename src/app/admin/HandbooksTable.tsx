"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

interface Handbook {
  id: string;
  title: string;
  subdomain: string;
  created_at: string;
  published: boolean;
  owner_id: string;
}

interface HandbooksTableProps {
  handbooks: Handbook[];
  onDataChange: () => void;
}

export function HandbooksTable({ handbooks, onDataChange }: HandbooksTableProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revalidateHandbook = async (subdomain: string) => {
    try {
      setIsProcessing(subdomain);
      setError(null);
      
      const response = await fetch('/api/admin/revalidate-handbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subdomain }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Kunde inte uppdatera cache');
      }
      
      // Show temporary success message
      setError(`Cache för ${subdomain}.handbok.org har uppdaterats`);
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

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
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
                Subdomän
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
                    {handbook.subdomain}.handbok.org
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
                        href={`https://${handbook.subdomain}.handbok.org`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black hover:underline"
                      >
                        Visa
                      </a>
                      <Link
                        href={`/edit-handbook/${handbook.id}`}
                        className="text-black hover:underline"
                      >
                        Redigera
                      </Link>
                      <Button
                        onClick={() => revalidateHandbook(handbook.subdomain)}
                        disabled={isProcessing === handbook.subdomain}
                        className="text-black hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing === handbook.subdomain ? 'Uppdaterar...' : 'Uppdatera cache'}
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
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
} 