"use client";

import React, { useState } from "react";

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface UsersTableProps {
  users: User[];
  onDataChange: () => void;
}

export function UsersTable({ users, onDataChange }: UsersTableProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setUserAsAdmin = async (userId: string) => {
    try {
      setIsProcessing(userId);
      setError(null);
      
      const response = await fetch('/api/admin/set-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      const { error } = await response.json();
      
      if (error) throw new Error(error);
      
      onDataChange();
    } catch (err: unknown) {
      console.error("Error setting user as superadmin:", err);
      setError(err instanceof Error ? err.message : "Kunde inte uppdatera användarroll");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <>
      {error && (
        <div className="px-6 py-4 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}
    
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-post
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registrerad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Åtgärder
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  Inga användare hittades
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString("sv-SE")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setUserAsAdmin(user.id)}
                      disabled={isProcessing === user.id}
                      className="text-black hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing === user.id ? 'Uppdaterar...' : 'Gör till superadmin'}
                    </button>
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