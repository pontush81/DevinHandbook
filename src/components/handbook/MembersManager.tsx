"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertCircle, UserPlus, Trash2, UserCheck, Key, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";

type MemberRole = "admin" | "editor" | "viewer";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

interface JoinCodeData {
  joinCode: string | null;
  expiresAt: string | null;
  isActive: boolean;
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
  
  // Join code state
  const [joinCodeData, setJoinCodeData] = useState<JoinCodeData>({ joinCode: null, expiresAt: null, isActive: false });
  const [isLoadingJoinCode, setIsLoadingJoinCode] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);

  const showMessage = (message: string, isError: boolean = false) => {
    setStatusMessage({ message, isError });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  const fetchJoinCode = useCallback(async () => {
    setIsLoadingJoinCode(true);
    try {
      const response = await fetch(`/api/handbook/join-code?handbookId=${handbookId}`);
      const data = await response.json();

      console.log('[MembersManager] fetchJoinCode response:', { response: response.ok, data });

      if (response.ok) {
        const newJoinCodeData = {
          joinCode: data.joinCode,
          expiresAt: data.expiresAt,
          isActive: data.isActive
        };
        console.log('[MembersManager] Setting joinCodeData:', newJoinCodeData);
        setJoinCodeData(newJoinCodeData);
      } else {
        // No join code exists yet, that's fine
        console.log('[MembersManager] No join code found, setting to null');
        setJoinCodeData({ joinCode: null, expiresAt: null, isActive: false });
      }
    } catch (error) {
      console.error("Fel vid hämtning av join-kod:", error);
    } finally {
      setIsLoadingJoinCode(false);
    }
  }, [handbookId]);

  const handleCreateJoinCode = async () => {
    setIsLoadingJoinCode(true);
    try {
      const response = await fetch("/api/handbook/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, expiresInDays: 30 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Något gick fel");
      }

      showMessage("Join-kod skapad!");
      setShowJoinCode(true); // Automatically show the join code after creation
      await fetchJoinCode(); // Refresh join code data
    } catch (error) {
      console.error("Fel vid skapande av join-kod:", error);
      showMessage(error instanceof Error ? error.message : "Kunde inte skapa join-kod", true);
    } finally {
      setIsLoadingJoinCode(false);
    }
  };

  const handleDeactivateJoinCode = async () => {
    setIsLoadingJoinCode(true);
    try {
      const response = await fetch("/api/handbook/join-code", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Något gick fel");
      }

      showMessage("Join-kod inaktiverad");
      await fetchJoinCode(); // Refresh join code data
    } catch (error) {
      console.error("Fel vid inaktivering av join-kod:", error);
      showMessage(error instanceof Error ? error.message : "Kunde inte inaktivera join-kod", true);
    } finally {
      setIsLoadingJoinCode(false);
    }
  };

  const copyJoinCode = async () => {
    if (joinCodeData.joinCode) {
      try {
        await navigator.clipboard.writeText(joinCodeData.joinCode);
        showMessage("Join-kod kopierad till urklipp!");
      } catch (error) {
        showMessage("Kunde inte kopiera join-kod", true);
      }
    }
  };

  const copyJoinUrl = async () => {
    if (joinCodeData.joinCode) {
      const joinUrl = `${window.location.origin}/signup?join=${joinCodeData.joinCode}`;
      try {
        await navigator.clipboard.writeText(joinUrl);
        showMessage("Join-länk kopierad till urklipp!");
      } catch (error) {
        showMessage("Kunde inte kopiera join-länk", true);
      }
    }
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
    fetchJoinCode();
  }, [fetchMembers, fetchJoinCode]);

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

      {/* Join Code Section */}
      <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-lg text-blue-900">Join-kod för handboken</h3>
        </div>
        
        <p className="text-sm text-blue-700 mb-4">
          Skapa en join-kod som nya användare kan använda för att gå med i handboken. 
          Dela koden eller länken med personer som ska ha tillgång.
        </p>

        {joinCodeData.joinCode && joinCodeData.isActive ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type={showJoinCode ? "text" : "password"}
                value={joinCodeData.joinCode}
                readOnly
                className="font-mono text-lg text-center bg-white"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowJoinCode(!showJoinCode)}
                title={showJoinCode ? "Dölj kod" : "Visa kod"}
              >
                {showJoinCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={copyJoinCode}
                className="whitespace-nowrap"
              >
                <Copy className="h-4 w-4 mr-2" />
                Kopiera kod
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={copyJoinUrl}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Kopiera registreringslänk
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateJoinCode}
                disabled={isLoadingJoinCode}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Förnya kod
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeactivateJoinCode}
                disabled={isLoadingJoinCode}
                className="flex-1"
              >
                Inaktivera
              </Button>
            </div>

            {joinCodeData.expiresAt && (
              <p className="text-xs text-blue-600">
                Kod går ut: {new Date(joinCodeData.expiresAt).toLocaleDateString('sv-SE')} {new Date(joinCodeData.expiresAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        ) : (
          <Button
            onClick={handleCreateJoinCode}
            disabled={isLoadingJoinCode}
            className="w-full"
          >
            <Key className="h-4 w-4 mr-2" />
            {isLoadingJoinCode ? "Skapar..." : "Skapa join-kod"}
          </Button>
        )}
      </div>

      {/* Email Invite Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <h3 className="font-medium text-lg mb-3">Bjud in via e-post</h3>
        <form onSubmit={handleInvite} className="space-y-4">
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
      </div>

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