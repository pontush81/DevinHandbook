"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertCircle, UserPlus, Trash2, UserCheck } from "lucide-react";

type MemberRole = "admin" | "editor" | "viewer";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

interface MembersManagerProps {
  handbookId: string;
  currentUserId: string;
}

export function MembersManager({ handbookId, currentUserId }: MembersManagerProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{message: string, isError: boolean} | null>(null);

  const showMessage = (message: string, isError: boolean = false) => {
    setStatusMessage({ message, isError });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("handbook_members")
        .select("id, user_id, role, created_at, profiles:user_id(email)")
        .eq("handbook_id", handbookId);

      if (error) throw error;

      const formattedMembers = data.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        email: member.profiles?.email || "Okänd e-post",
        role: member.role,
        created_at: member.created_at,
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error("Fel vid hämtning av medlemmar:", error);
      showMessage("Kunde inte hämta medlemmar. Försök igen senare.", true);
    } finally {
      setIsLoading(false);
    }
  }, [handbookId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/handbook/invite-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Något gick fel");
      }

      showMessage(`${email} har bjudits in som ${
        role === "admin" ? "administratör" : role === "editor" ? "redaktör" : "läsare"
      }.`);

      setEmail("");
      fetchMembers();
    } catch (error) {
      console.error("Fel vid inbjudan:", error);
      showMessage(error instanceof Error ? error.message : "Kunde inte bjuda in användaren", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, userId: string, newRole: MemberRole) => {
    if (userId === currentUserId && newRole !== "admin") {
      showMessage("Du kan inte ändra din egen roll från administratör.", true);
      return;
    }

    setUpdatingId(memberId);
    try {
      const response = await fetch("/api/handbook/update-member-role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, memberId, role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Något gick fel");
      }

      showMessage("Användarens roll har uppdaterats.");
      fetchMembers();
    } catch (error) {
      console.error("Fel vid uppdatering av roll:", error);
      showMessage(error instanceof Error ? error.message : "Kunde inte uppdatera rollen", true);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (userId === currentUserId) {
      showMessage("Du kan inte ta bort dig själv som administratör.", true);
      return;
    }

    setUpdatingId(memberId);
    try {
      const response = await fetch("/api/handbook/remove-member", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, memberId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Något gick fel");
      }

      showMessage("Användaren har tagits bort från handboken.");
      fetchMembers();
    } catch (error) {
      console.error("Fel vid borttagning av medlem:", error);
      showMessage(error instanceof Error ? error.message : "Kunde inte ta bort medlemmen", true);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold mb-4">Hantera medlemmar</h2>

      {statusMessage && (
        <div className={`mb-4 p-3 rounded text-sm sm:text-base ${
          statusMessage.isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
        }`}>
          {statusMessage.message}
        </div>
      )}

      <form onSubmit={handleInvite} className="mb-6 space-y-4">
        <div className="flex flex-col gap-3">
          <Input
            type="email"
            placeholder="Ange e-postadress"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-base"
            required
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={role} onValueChange={(value) => setRole(value as MemberRole)}>
              <SelectTrigger className="w-full sm:w-40 h-10">
                <SelectValue placeholder="Välj roll" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administratör</SelectItem>
                <SelectItem value="editor">Redaktör</SelectItem>
                <SelectItem value="viewer">Läsare</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full sm:w-auto h-10 touch-manipulation"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isSubmitting ? "Bjuder in..." : "Bjud in"}
            </Button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-500">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Administratörer kan hantera alla aspekter av handboken, redaktörer kan redigera 
          innehåll, och läsare kan endast läsa.
        </p>
      </form>

      <div className="border-t pt-4">
        <h3 className="font-medium text-base sm:text-lg mb-3">Medlemmar</h3>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500 text-sm sm:text-base">Laddar medlemmar...</div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm sm:text-base">
            Inga medlemmar har lagts till ännu.
          </div>
        ) : (
          <ul className="divide-y space-y-1">
            {members.map((member) => (
              <li key={member.id} className="py-3 sm:py-4">
                <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <UserCheck className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base truncate">{member.email}</div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        Tillagd {new Date(member.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2 flex-shrink-0">
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleUpdateRole(member.id, member.user_id, value as MemberRole)}
                      disabled={updatingId === member.id || member.user_id === currentUserId}
                    >
                      <SelectTrigger className="w-full sm:w-32 h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administratör</SelectItem>
                        <SelectItem value="editor">Redaktör</SelectItem>
                        <SelectItem value="viewer">Läsare</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 h-10 w-10 p-0 touch-manipulation flex-shrink-0"
                      onClick={() => handleRemoveMember(member.id, member.user_id)}
                      disabled={updatingId === member.id || member.user_id === currentUserId}
                      title="Ta bort medlem"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 