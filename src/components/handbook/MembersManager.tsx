"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertCircle, UserPlus, Trash2, UserCheck, Key, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import { JoinProcessDebugger } from "@/components/debug/JoinProcessDebugger";

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
      const response = await fetch(`/api/handbook/join-code?handbookId=${handbookId}&userId=${currentUserId}`, {
        credentials: 'include'
      });
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
  }, [handbookId, currentUserId]);

  const handleCreateJoinCode = async () => {
    setIsLoadingJoinCode(true);
      
      try {
      const response = await fetch("/api/handbook/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, expiresInDays: 90, userId: currentUserId }), // 3 months instead of 1
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Något gick fel");
      }

      console.log('[MembersManager] Created join code, response data:', data);

      // Set the join code data directly from the response
      if (data.joinCode) {
        const newJoinCodeData = {
          joinCode: data.joinCode,
          expiresAt: data.expiresAt,
          isActive: true
        };
        console.log('[MembersManager] Setting join code data directly:', newJoinCodeData);
        setJoinCodeData(newJoinCodeData);
        setShowJoinCode(true); // Automatically show the join code after creation
      } else {
        // Fallback to fetchJoinCode if direct data isn't available
        await fetchJoinCode();
        setShowJoinCode(true);
      }
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
        body: JSON.stringify({ handbookId, userId: currentUserId }),
        credentials: 'include'
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
        // Silent copy - no notification needed
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
        showMessage("Registreringslänk kopierad! 📋"); // Add success feedback
      } catch (error) {
        showMessage("Kunde inte kopiera join-länk", true);
      }
    }
  };

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[MembersManager] Fetching members for handbook:', handbookId);
      
      // Använd admin API för att hämta medlemmar med e-postadresser
      // Detta kringgår RLS-problem och ger oss tillgång till auth.users tabellen
      const response = await fetch(`/api/handbook/get-members?handbookId=${handbookId}&userId=${currentUserId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch members');
      }
      
      const data = await response.json();
      
      console.log('[MembersManager] Fetched members API response:', data);
      console.log('[MembersManager] Members array length:', data.members?.length || 0);
      console.log('[MembersManager] Members array:', data.members);
      
      // Add debug for setting state
      const membersToSet = data.members || [];
      console.log('[MembersManager] Setting members state to:', membersToSet);
      setMembers(membersToSet);
      
      // Add debug function to window for manual inspection
      (window as any).debugMembers = () => {
        console.log('🔍 Current members state:', membersToSet);
        console.log('🔍 Latest API data:', data);
        return { members: membersToSet, apiData: data };
      };
    } catch (error) {
      console.error("Fel vid hämtning av medlemmar:", error);
      showMessage("Kunde inte hämta medlemmar. Försök igen senare.", true);
      
      // Fallback till direkt Supabase-anrop om API misslyckas
      try {
        console.log('[MembersManager] Trying fallback approach...');
        const { data: membersData, error: membersError } = await supabase
          .from("handbook_members")
          .select(`
            id,
            user_id,
            role,
            created_at,
            users (
              email
            )
          `)
          .eq("handbook_id", handbookId);

        if (membersError) {
          console.error('[MembersManager] Fallback also failed:', membersError);
          throw new Error('Fallback approach failed');
        }
        
        console.log('[MembersManager] Fallback successful, raw data:', membersData);
        
        const formattedMembers = (membersData || []).map((member: any) => ({
          id: member.id,
          user_id: member.user_id,
          email: member.users?.email || 'Unknown email',
          role: member.role,
          created_at: member.created_at
        }));
        
        console.log('[MembersManager] Fallback formatted members:', formattedMembers);
        setMembers(formattedMembers);
      } catch (fallbackError) {
        console.error('[MembersManager] Both primary and fallback failed:', fallbackError);
        setMembers([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [handbookId, currentUserId]);

  // Expose test functions to window for debugging cross-page communication
  useEffect(() => {
    console.log('🧪 [MembersManager] Exposing cross-page communication test functions');
    
    // Test BroadcastChannel communication
    (window as any).testBroadcastChannel = (testData?: any) => {
      const data = testData || {
        type: 'PERMISSION_REFRESH',
        handbookId,
        userId: currentUserId,
        newRole: 'viewer',
        timestamp: Date.now(),
        source: 'test',
        test: true
      };
      
      console.log('🧪 [MembersManager] Testing BroadcastChannel with data:', data);
      
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('handbook-permissions');
          channel.postMessage(data);
          channel.close();
          console.log('✅ [MembersManager] Test BroadcastChannel message sent successfully');
          return { success: true, method: 'BroadcastChannel', data };
        } else {
          console.log('❌ [MembersManager] BroadcastChannel not supported in this browser');
          return { success: false, error: 'BroadcastChannel not supported', data };
        }
      } catch (error) {
        console.error('❌ [MembersManager] Test BroadcastChannel error:', error);
        return { success: false, error: error.message, data };
      }
    };
    
    // Test localStorage communication
    (window as any).testLocalStorageEvent = (testData?: any) => {
      const data = testData || {
        type: 'PERMISSION_REFRESH',
        handbookId,
        userId: currentUserId,
        newRole: 'viewer',
        timestamp: Date.now(),
        source: 'test',
        test: true
      };
      
      console.log('🧪 [MembersManager] Testing localStorage event with data:', data);
      
      try {
        localStorage.setItem('handbook-permission-refresh', JSON.stringify(data));
        console.log('✅ [MembersManager] Test localStorage data set');
        
        setTimeout(() => {
          localStorage.removeItem('handbook-permission-refresh');
          console.log('🗑️ [MembersManager] Test localStorage data removed');
        }, 1000);
        
        return { success: true, method: 'localStorage', data };
      } catch (error) {
        console.error('❌ [MembersManager] Test localStorage error:', error);
        return { success: false, error: error.message, data };
      }
    };
    
    // Test polling marker
    (window as any).testPollingMarker = (testData?: any) => {
      const data = testData || {
        handbookId,
        userId: currentUserId,
        timestamp: Date.now(),
        action: 'test',
        test: true
      };
      
      console.log('🧪 [MembersManager] Testing polling marker with data:', data);
      
      try {
        localStorage.setItem('handbook-permission-last-update', JSON.stringify(data));
        console.log('✅ [MembersManager] Test polling marker set');
        return { success: true, method: 'polling', data };
      } catch (error) {
        console.error('❌ [MembersManager] Test polling marker error:', error);
        return { success: false, error: error.message, data };
      }
    };
    
    // Test all methods at once
    (window as any).testAllCommunicationMethods = (testData?: any) => {
      console.log('🧪 [MembersManager] Testing all cross-page communication methods');
      
      const results = {
        broadcastChannel: (window as any).testBroadcastChannel(testData),
        localStorage: (window as any).testLocalStorageEvent(testData),
        polling: (window as any).testPollingMarker(testData)
      };
      
      console.log('📊 [MembersManager] All test results:', results);
      return results;
    };
    
    // 🧪 TEST MEMBER JOIN REFRESH FUNCTIONALITY
    (window as any).testMemberJoinRefresh = (testData?: any) => {
      const data = testData || {
        type: 'MEMBER_JOINED',
        handbookId,
        handbookTitle: 'Test Handbok',
        userRole: 'viewer',
        timestamp: Date.now(),
        source: 'manual_test'
      };
      
      console.log('🧪 [MembersManager] Testing member join refresh with data:', data);
      
      try {
        // Method 1: BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('handbook-members');
          channel.postMessage(data);
          channel.close();
          console.log('📻 [MembersManager] Test member join BroadcastChannel sent');
        }
        
        // Method 2: localStorage event
        localStorage.setItem('handbook-members-refresh', JSON.stringify(data));
        setTimeout(() => {
          localStorage.removeItem('handbook-members-refresh');
        }, 1000);
        console.log('💾 [MembersManager] Test member join localStorage event sent');
        
        // Method 3: Polling marker
        localStorage.setItem('handbook-members-last-update', JSON.stringify(data));
        console.log('⏰ [MembersManager] Test member join polling marker set');
        
        return { success: true, methods: ['BroadcastChannel', 'localStorage', 'polling'], data };
      } catch (error) {
        console.error('❌ [MembersManager] Test member join refresh error:', error);
        return { success: false, error: error.message, data };
      }
    };
    
    console.log('✅ [MembersManager] Test functions exposed:', {
      testBroadcastChannel: 'window.testBroadcastChannel()',
      testLocalStorageEvent: 'window.testLocalStorageEvent()',
      testPollingMarker: 'window.testPollingMarker()',
      testAllCommunicationMethods: 'window.testAllCommunicationMethods()',
      testMemberJoinRefresh: 'window.testMemberJoinRefresh()'
    });
    
    // Cleanup
    return () => {
      console.log('🧹 [MembersManager] Cleaning up test functions');
      delete (window as any).testBroadcastChannel;
      delete (window as any).testLocalStorageEvent;
      delete (window as any).testPollingMarker;
      delete (window as any).testAllCommunicationMethods;
      delete (window as any).testMemberJoinRefresh;
    };
  }, [handbookId, currentUserId]);

  useEffect(() => {
    fetchMembers();
    fetchJoinCode();
    
    // 🔄 LISTEN FOR NEW MEMBER JOINS FROM OTHER PAGES
    console.log('👂 [MembersManager] Setting up cross-page member refresh listeners');
    
    let membersRefreshChannel: BroadcastChannel | null = null;
    
    // Method 1: BroadcastChannel listener (most reliable)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        membersRefreshChannel = new BroadcastChannel('handbook-members');
        membersRefreshChannel.onmessage = (event) => {
          const data = event.data;
          console.log('📻 [MembersManager] BroadcastChannel message received:', data);
          
          if (data.type === 'MEMBER_JOINED' && data.handbookId === handbookId) {
            console.log(`✅ [MembersManager] New member joined "${data.handbookTitle}" - refreshing list`);
            showMessage(`🎉 Ny medlem gick med i handboken! Uppdaterar listan...`);
            fetchMembers();
          }
        };
        console.log('📻 [MembersManager] BroadcastChannel listener initialized');
      }
    } catch (error) {
      console.error('❌ [MembersManager] BroadcastChannel error:', error);
    }
    
    // Method 2: localStorage event listener (fallback)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'handbook-members-refresh' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          console.log('💾 [MembersManager] localStorage event received:', data);
          
          if (data.type === 'MEMBER_JOINED' && data.handbookId === handbookId) {
            console.log(`✅ [MembersManager] New member joined via localStorage - refreshing list`);
            showMessage(`🎉 Ny medlem gick med i handboken! Uppdaterar listan...`);
            fetchMembers();
          }
        } catch (error) {
          console.error('❌ [MembersManager] localStorage event parsing error:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    console.log('💾 [MembersManager] localStorage event listener initialized');
    
    // Method 3: Polling for updates (ultimate fallback)
    const pollInterval = setInterval(() => {
      try {
        const lastUpdate = localStorage.getItem('handbook-members-last-update');
        if (lastUpdate) {
          const updateData = JSON.parse(lastUpdate);
          const updateTime = new Date(updateData.timestamp);
          const now = new Date();
          const timeDiff = now.getTime() - updateTime.getTime();
          
          // Check for updates in the last 30 seconds for this handbook
          if (timeDiff < 30000 && 
              updateData.handbookId === handbookId && 
              updateData.type === 'MEMBER_JOINED') {
            console.log('⏰ [MembersManager] New member detected via polling - refreshing list');
            showMessage(`🎉 Ny medlem gick med i handboken! Uppdaterar listan...`);
            fetchMembers();
            // Clear the marker to prevent repeated refreshes
            localStorage.removeItem('handbook-members-last-update');
          }
        }
      } catch (error) {
        // Silent fail for polling - don't spam console
      }
    }, 5000); // Check every 5 seconds
    
    console.log('⏰ [MembersManager] Polling for member updates started');
    
    // Cleanup function
    return () => {
      console.log('🧹 [MembersManager] Cleaning up member refresh listeners');
      
      if (membersRefreshChannel) {
        membersRefreshChannel.close();
      }
      
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [fetchMembers, fetchJoinCode]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/handbook/invite-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, email, role, userId: currentUserId }),
        credentials: 'include'
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

  const handleUpdateRole = useCallback(async (memberId: string, userId: string, newRole: MemberRole) => {
    if (updatingId) return;
    
    setUpdatingId(memberId);
    try {
      const response = await fetch("/api/handbook/update-member-role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookId, memberId, role: newRole, userId: currentUserId }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        console.log('[MembersManager] Role updated successfully:', { memberId, newRole });
        
        // Update local state
        setMembers(prev => prev.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        ));
        
        // Refresh permissions for the affected user if they're viewing the handbook
        console.log('🔄 [MembersManager] Attempting permission refresh after role update');
        console.log('🔍 [MembersManager] Window object keys:', Object.keys(window).filter(k => k.includes('refresh')));
        
        // Try multiple methods for cross-page communication
        let refreshTriggered = false;
        
        // Method 1: Direct global function call (works if on same page)
        // @ts-ignore - Global function added by ModernHandbookClient
        if (typeof window.refreshHandbookPermissions === 'function') {
          console.log('✅ [MembersManager] Found global permission refresh function - calling it');
          window.refreshHandbookPermissions();
          refreshTriggered = true;
        } else {
          console.warn('⚠️ [MembersManager] Global permission refresh function not found on this page');
        }
        
        // Method 2: BroadcastChannel (most reliable cross-page)
        const refreshData = {
          type: 'PERMISSION_REFRESH',
          handbookId,
          userId,
          newRole,
          timestamp: Date.now(),
          source: 'role_update'
        };
        
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('handbook-permissions');
            channel.postMessage(refreshData);
            channel.close();
            console.log('📻 [MembersManager] BroadcastChannel message sent successfully');
          } else {
            console.log('⚠️ [MembersManager] BroadcastChannel not supported');
          }
        } catch (error) {
          console.error('❌ [MembersManager] BroadcastChannel error:', error);
        }
        
        // Method 3: localStorage events (fallback)
        console.log('📤 [MembersManager] Setting localStorage data for cross-page communication');
        localStorage.setItem('handbook-permission-refresh', JSON.stringify(refreshData));
        
        // Remove after a delay to ensure event fires across tabs
        setTimeout(() => {
          console.log('🗑️ [MembersManager] Removing localStorage data');
          localStorage.removeItem('handbook-permission-refresh');
        }, 500);
        
        // Method 4: Polling marker (ultimate fallback)
        const updateMarker = {
          handbookId,
          userId,
          timestamp: Date.now(),
          action: 'role_update'
        };
        localStorage.setItem('handbook-permission-last-update', JSON.stringify(updateMarker));
        console.log('⏰ [MembersManager] Permission update marker set for polling detection');
        
        // Method 5: Custom event (backup for same-page scenarios)
        console.log('📢 [MembersManager] Dispatching custom event as backup');
        window.dispatchEvent(new CustomEvent('handbook-permission-change', { 
          detail: refreshData
        }));
        
        // Method 4: If current user role changed to viewer, redirect to main page
        if (userId === currentUserId && (newRole === 'viewer' || newRole === 'editor')) {
          console.log('🔄 [MembersManager] Current user role downgraded - redirecting to main page');
          setTimeout(() => {
            const handbookSlug = window.location.pathname.split('/')[1];
            window.location.href = `/${handbookSlug}`;
          }, 1500); // Give time for success message
        }
        
        console.log('✅ [MembersManager] Permission refresh triggered via multiple methods');
        
        showMessage("Medlemsroll uppdaterad");
      } else {
        throw new Error(data.message || "Internt serverfel");
      }
    } catch (error) {
      console.error('Fel vid uppdatering av roll:', error);
      showMessage(error instanceof Error ? error.message : "Fel vid uppdatering av roll", true);
    } finally {
      setUpdatingId(null);
    }
  }, [handbookId, currentUserId, updatingId]);

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
        body: JSON.stringify({ handbookId, memberId, userId: currentUserId }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Något gick fel");
      }

      showMessage("Användaren har tagits bort från handboken.");
      
      // Refresh permissions for the affected user if they're viewing the handbook
      console.log('🔄 [MembersManager] Attempting permission refresh after member removal');
      
      // Try multiple methods for cross-page communication
      // Method 1: Direct global function call (works if on same page)
      // @ts-ignore - Global function added by ModernHandbookClient
      if (typeof window.refreshHandbookPermissions === 'function') {
        console.log('✅ [MembersManager] Found global permission refresh function - calling it');
        window.refreshHandbookPermissions();
      } else {
        console.warn('⚠️ [MembersManager] Global permission refresh function not found on this page');
      }
      
      // Method 2: BroadcastChannel (most reliable cross-page)
      const refreshData = {
        type: 'PERMISSION_REFRESH',
        handbookId,
        userId,
        newRole: 'removed',
        timestamp: Date.now(),
        source: 'member_removal'
      };
      
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('handbook-permissions');
          channel.postMessage(refreshData);
          channel.close();
          console.log('📻 [MembersManager] BroadcastChannel message sent for member removal');
        } else {
          console.log('⚠️ [MembersManager] BroadcastChannel not supported');
        }
      } catch (error) {
        console.error('❌ [MembersManager] BroadcastChannel error:', error);
      }
      
      // Method 3: localStorage events (fallback)
      console.log('📤 [MembersManager] Setting localStorage data for cross-page communication');
      localStorage.setItem('handbook-permission-refresh', JSON.stringify(refreshData));
      
      // Remove after a delay to ensure event fires across tabs
      setTimeout(() => {
        console.log('🗑️ [MembersManager] Removing localStorage data');
        localStorage.removeItem('handbook-permission-refresh');
      }, 500);
      
      // Method 4: Polling marker (ultimate fallback)
      const updateMarker = {
        handbookId,
        userId,
        timestamp: Date.now(),
        action: 'member_removal'
      };
      localStorage.setItem('handbook-permission-last-update', JSON.stringify(updateMarker));
      console.log('⏰ [MembersManager] Permission update marker set for member removal');
      
      // Method 5: Custom event (backup for same-page scenarios)
      console.log('📢 [MembersManager] Dispatching custom event for member removal');
      window.dispatchEvent(new CustomEvent('handbook-permission-change', { 
        detail: refreshData
      }));
      
      console.log('✅ [MembersManager] Permission refresh triggered via multiple methods');
      
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
          Koden är aktiv i 3 månader av säkerhetsskäl och kan förnyas vid behov.
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
              <p className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                ⏰ Koden går ut: {new Date(joinCodeData.expiresAt).toLocaleDateString('sv-SE')} 
                (kan förnyas genom att klicka "Förnya kod")
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-base sm:text-lg">Medlemmar</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('[MembersManager] Manual refresh triggered');
              fetchMembers();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Laddar...' : 'Uppdatera'}
          </Button>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500 text-sm sm:text-base">Laddar medlemmar...</div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm sm:text-base">
            Inga medlemmar har lagts till ännu.
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
      
      {/* Join Process Debugger - Only in development or for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8">
          <JoinProcessDebugger />
        </div>
      )}


    </div>
  );
} 