"use client";

import React, { useState, useMemo } from "react";
import { Trash2, Shield, ShieldCheck, UserX, Filter, X, Building2, Edit, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Handbook {
  id: string;
  title: string;
  slug?: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  app_metadata?: {
    is_superadmin?: boolean;
  };
  handbooks?: Handbook[];
  handbook_count?: number;
  is_superadmin?: boolean;
  is_handbook_admin?: boolean;
  is_handbook_editor?: boolean;
  is_handbook_viewer?: boolean;
  roles?: string[];
  primary_role?: string;
}

interface UsersTableProps {
  users: User[];
  onDataChange: () => void;
}

export function UsersTable({ users, onDataChange }: UsersTableProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEditRoles, setUserToEditRoles] = useState<User | null>(null);
  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [availableHandbooks, setAvailableHandbooks] = useState<{id: string, title: string}[]>([]);
  const [selectedNewHandbook, setSelectedNewHandbook] = useState<string>("");
  const [selectedNewRole, setSelectedNewRole] = useState<string>("viewer");
  
  // Filter states
  const [emailFilter, setEmailFilter] = useState("");
  const [handbookFilter, setHandbookFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [superadminFilter, setSuperadminFilter] = useState<string>("all");

  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];

  // Get all unique handbooks for filter dropdown
  const allHandbooks = useMemo(() => {
    const handbookSet = new Set<string>();
    safeUsers.forEach(user => {
      user.handbooks?.forEach(handbook => {
        handbookSet.add(handbook.title);
      });
    });
    return Array.from(handbookSet).sort();
  }, [safeUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return safeUsers.filter(user => {
      // Email filter
      if (emailFilter && !user.email.toLowerCase().includes(emailFilter.toLowerCase())) {
        return false;
      }
      
      // Handbook filter
      if (handbookFilter && handbookFilter !== "all") {
        const hasHandbook = user.handbooks?.some(h => h.title === handbookFilter);
        if (!hasHandbook) return false;
      }
      
      // Role filter
      if (roleFilter && roleFilter !== "all") {
        if (roleFilter === "admin" && !user.is_handbook_admin) return false;
        if (roleFilter === "editor" && !user.is_handbook_editor) return false;
        if (roleFilter === "viewer" && !user.is_handbook_viewer) return false;
        if (roleFilter === "no_handbook" && (user.handbook_count || 0) > 0) return false;
      }
      
      // Superadmin filter
      if (superadminFilter === "superadmin" && !user.is_superadmin) return false;
      if (superadminFilter === "regular" && user.is_superadmin) return false;
      
      return true;
    });
  }, [safeUsers, emailFilter, handbookFilter, roleFilter, superadminFilter]);

  const toggleUserAdminStatus = async (userId: string, makeAdmin: boolean) => {
    try {
      setIsProcessing(userId);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/admin/set-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, isAdmin: makeAdmin }),
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Kunde inte uppdatera användarroll');
      }
      
      setSuccess(makeAdmin ? 'Användaren har gjorts till superadmin' : 'Superadmin-status har tagits bort');
      onDataChange();
    } catch (err: unknown) {
      console.error("Error updating user admin status:", err);
      setError(err instanceof Error ? err.message : "Kunde inte uppdatera användarroll");
    } finally {
      setIsProcessing(null);
    }
  };

  const deleteUser = async (user: User) => {
    try {
      setIsProcessing(user.id);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Kunde inte ta bort användare');
      }
      
      setSuccess(`Användaren ${user.email} har tagits bort från systemet`);
      setUserToDelete(null);
      onDataChange();
    } catch (err: unknown) {
      console.error("Error deleting user:", err);
      setError(err instanceof Error ? err.message : "Kunde inte ta bort användare");
      setUserToDelete(null);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };

  const handleEditRolesClick = async (user: User) => {
    setUserToEditRoles(user);
    // Hämta alla handböcker för att visa vilka användaren kan läggas till i
    await fetchAvailableHandbooks(user);
  };

  const fetchAvailableHandbooks = async (user: User) => {
    try {
      console.log('Fetching available handbooks for user:', user.email);
      const response = await fetch('/api/admin/handbooks');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success && result.data) {
          console.log('Total handbooks found:', result.data.length);
          // Filtrera bort handböcker där användaren redan är medlem
          const userHandbookIds = new Set(user.handbooks?.map(h => h.id) || []);
          console.log('User is already member of:', Array.from(userHandbookIds));
          
          const available = result.data.filter((h: any) => !userHandbookIds.has(h.id));
          console.log('Available handbooks after filtering:', available.length);
          console.log('Available handbooks:', available);
          
          setAvailableHandbooks(available);
          console.log('Set availableHandbooks to:', available);
        } else {
          console.error('API response missing success or data:', result);
          setAvailableHandbooks([]);
        }
      } else {
        console.error('API request failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setAvailableHandbooks([]);
      }
    } catch (error) {
      console.error('Error fetching handbooks:', error);
      setAvailableHandbooks([]);
    }
  };

  const addUserToHandbook = async () => {
    if (!userToEditRoles || !selectedNewHandbook || !selectedNewRole) return;
    
    try {
      setIsEditingRoles(true);
      setError(null);
      
      const response = await fetch('/api/admin/update-handbook-role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: userToEditRoles.id, 
          handbookId: selectedNewHandbook, 
          role: selectedNewRole 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Kunde inte lägga till i handbok');
      }
      
      setSuccess(result.message);
      setSelectedNewHandbook("");
      setSelectedNewRole("viewer");
      onDataChange();
      // Uppdatera listan över tillgängliga handböcker
      await fetchAvailableHandbooks(userToEditRoles);
    } catch (err: unknown) {
      console.error("Error adding to handbook:", err);
      setError(err instanceof Error ? err.message : "Kunde inte lägga till i handbok");
    } finally {
      setIsEditingRoles(false);
    }
  };

  const updateUserHandbookRole = async (userId: string, handbookId: string, role: string) => {
    try {
      setIsEditingRoles(true);
      setError(null);
      
      const response = await fetch('/api/admin/update-handbook-role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, handbookId, role }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Kunde inte uppdatera roll');
      }
      
      setSuccess(result.message);
      onDataChange();
    } catch (err: unknown) {
      console.error("Error updating handbook role:", err);
      setError(err instanceof Error ? err.message : "Kunde inte uppdatera roll");
    } finally {
      setIsEditingRoles(false);
    }
  };

  const removeUserFromHandbook = async (userId: string, handbookId: string) => {
    try {
      setIsEditingRoles(true);
      setError(null);
      
      const response = await fetch('/api/admin/update-handbook-role', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, handbookId }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Kunde inte ta bort från handbok');
      }
      
      setSuccess(result.message);
      onDataChange();
    } catch (err: unknown) {
      console.error("Error removing from handbook:", err);
      setError(err instanceof Error ? err.message : "Kunde inte ta bort från handbok");
    } finally {
      setIsEditingRoles(false);
    }
  };

  const isUserSuperAdmin = (user: User) => {
    return user.is_superadmin === true || user.app_metadata?.is_superadmin === true;
  };

  const getRoleDisplayName = (role: string) => {
    switch(role) {
      case 'admin': return 'Admin';
      case 'editor': return 'Redaktör';
      case 'viewer': return 'Läsare';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'editor': return 'bg-yellow-100 text-yellow-800';
      case 'viewer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const clearFilters = () => {
    setEmailFilter("");
    setHandbookFilter("");
    setRoleFilter("all");
    setSuperadminFilter("all");
  };

  const hasActiveFilters = emailFilter || handbookFilter !== "" || roleFilter !== "all" || superadminFilter !== "all";

  // Auto-hide success messages after 5 seconds
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Debug: logga när availableHandbooks förändras
  React.useEffect(() => {
    console.log('availableHandbooks state changed:', availableHandbooks);
  }, [availableHandbooks]);

  return (
    <>
      {error && (
        <div className="px-6 py-4 bg-red-50 text-red-600 text-sm rounded-md mb-4">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 underline hover:no-underline"
          >
            Stäng
          </button>
        </div>
      )}

      {success && (
        <div className="px-6 py-4 bg-green-50 text-green-600 text-sm rounded-md mb-4">
          {success}
          <button 
            onClick={() => setSuccess(null)} 
            className="ml-2 underline hover:no-underline"
          >
            Stäng
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-3 w-3 mr-1" />
              Rensa filter
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">E-post</label>
            <Input
              placeholder="Sök e-post..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">BRF/Handbok</label>
            <Select value={handbookFilter} onValueChange={setHandbookFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Alla handböcker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla handböcker</SelectItem>
                {allHandbooks.map((handbook) => (
                  <SelectItem key={handbook} value={handbook}>
                    {handbook}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Handbok-roll</label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Alla roller" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla roller</SelectItem>
                <SelectItem value="admin">Handbok-admin</SelectItem>
                <SelectItem value="editor">Redaktör</SelectItem>
                <SelectItem value="viewer">Läsare</SelectItem>
                <SelectItem value="no_handbook">Ingen handbok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">System-roll</label>
            <Select value={superadminFilter} onValueChange={setSuperadminFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Alla användare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla användare</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
                <SelectItem value="regular">Vanliga användare</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Visar {filteredUsers.length} av {safeUsers.length} användare</span>
          {hasActiveFilters && (
            <span className="text-blue-600">Filter aktiva</span>
          )}
        </div>
      </div>
    
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Användare
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                BRF/Handböcker
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                System-roll
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
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  {hasActiveFilters ? "Inga användare matchar filtren" : "Inga användare hittades"}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {user.handbooks && user.handbooks.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-500 mb-1">
                            <Building2 className="h-3 w-3 mr-1" />
                            {user.handbooks.length} handbok{user.handbooks.length !== 1 ? 'er' : ''}
                          </div>
                          {user.handbooks.slice(0, 2).map((handbook, index) => (
                            <div key={handbook.id} className="flex items-center justify-between">
                              <span className="text-xs text-gray-700 truncate max-w-[150px]" title={handbook.title}>
                                {handbook.title}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`ml-2 text-xs ${getRoleBadgeColor(handbook.role)}`}
                              >
                                {getRoleDisplayName(handbook.role)}
                              </Badge>
                            </div>
                          ))}
                          {user.handbooks.length > 2 && (
                            <div className="text-xs text-gray-400">
                              +{user.handbooks.length - 2} fler...
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Inga handböcker</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      {isUserSuperAdmin(user) ? (
                        <>
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">Superadmin</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500">Användare</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString("sv-SE", {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserAdminStatus(user.id, !isUserSuperAdmin(user))}
                        disabled={isProcessing === user.id}
                        className={isUserSuperAdmin(user) 
                          ? "text-orange-600 hover:text-orange-700" 
                          : "text-blue-600 hover:text-blue-700"
                        }
                      >
                        {isProcessing === user.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                            Uppdaterar...
                          </>
                        ) : isUserSuperAdmin(user) ? (
                          <>
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Ta bort admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-3 w-3 mr-1" />
                            Gör till admin
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRolesClick(user)}
                        disabled={isProcessing === user.id}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Roller
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(user)}
                        disabled={isProcessing === user.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {isProcessing === user.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-2"></div>
                            Tar bort...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-1" />
                            Ta bort
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-red-600" />
              <span>Ta bort användare</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Är du säker på att du vill ta bort användaren{" "}
              <strong className="text-gray-900">{userToDelete?.email}</strong>?
              <br /><br />
              
              {userToDelete?.handbooks && userToDelete.handbooks.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                  <div className="text-blue-800 font-medium text-sm mb-2">Användaren är medlem i:</div>
                  <ul className="text-blue-700 text-sm space-y-1">
                    {userToDelete.handbooks.map((handbook) => (
                      <li key={handbook.id} className="flex justify-between">
                        <span>{handbook.title}</span>
                        <Badge className={`text-xs ${getRoleBadgeColor(handbook.role)}`}>
                          {getRoleDisplayName(handbook.role)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
                <div className="flex items-start space-x-2">
                  <div className="text-amber-600 font-medium text-sm">⚠️ Varning:</div>
                </div>
                <div className="text-amber-700 text-sm mt-1">
                  Detta kommer att permanent ta bort:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Användarens konto och inloggning</li>
                    <li>Alla handbok-medlemskap</li>
                    <li>Användarens profil och inställningar</li>
                    <li>Notifikationsinställningar</li>
                  </ul>
                  <p className="mt-2 font-medium">Denna åtgärd kan inte ångras.</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUser(userToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Ja, ta bort användare
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Roles Dialog */}
      <AlertDialog open={!!userToEditRoles} onOpenChange={() => setUserToEditRoles(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-purple-600" />
              <span>Hantera roller för {userToEditRoles?.email}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Hantera användarens roller i olika handböcker. Du kan ändra roll eller ta bort användaren från en handbok.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            {userToEditRoles?.handbooks && userToEditRoles.handbooks.length > 0 ? (
              <div className="space-y-3">
                {userToEditRoles.handbooks.map((handbook) => (
                  <div key={handbook.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{handbook.title}</div>
                      <div className="text-xs text-gray-500">
                        Nuvarande roll: <Badge className={`ml-1 ${getRoleBadgeColor(handbook.role)}`}>
                          {getRoleDisplayName(handbook.role)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Select
                        value={handbook.role}
                        onValueChange={(newRole) => updateUserHandbookRole(userToEditRoles.id, handbook.id, newRole)}
                        disabled={isEditingRoles}
                      >
                        <SelectTrigger className="w-32 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Redaktör</SelectItem>
                          <SelectItem value="viewer">Läsare</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeUserFromHandbook(userToEditRoles.id, handbook.id)}
                        disabled={isEditingRoles}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Ta bort från handbok"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Användaren är inte medlem i några handböcker</p>
              </div>
            )}
            
                         {/* Add to new handbook section */}
             <div className="mt-6 p-4 border-t">
               <h4 className="text-sm font-medium text-gray-900 mb-3">Lägg till i handbok</h4>
               {console.log('Rendering: availableHandbooks.length =', availableHandbooks.length, 'availableHandbooks =', availableHandbooks)}
               {console.log('First handbook structure:', availableHandbooks[0])}
               {availableHandbooks.map((h, i) => console.log(`Handbook ${i}:`, h.id, h.title))}
               {availableHandbooks.length > 0 ? (
                 <div className="flex items-center space-x-3">
                   {/* Temporary HTML select for debugging */}
                   <select
                     value={selectedNewHandbook}
                     onChange={(e) => setSelectedNewHandbook(e.target.value)}
                     disabled={isEditingRoles}
                     className="flex-1 text-sm border rounded px-3 py-2"
                   >
                     <option value="">Välj handbok...</option>
                     {availableHandbooks.map((handbook) => {
                       console.log('Rendering option for:', handbook.id, handbook.title);
                       return (
                         <option key={handbook.id} value={handbook.id}>
                           {handbook.title}
                         </option>
                       );
                     })}
                   </select>
                   
                   {/* Original Select - commented out for debugging
                   <Select
                     value={selectedNewHandbook}
                     onValueChange={setSelectedNewHandbook}
                     disabled={isEditingRoles}
                   >
                     <SelectTrigger className="flex-1 text-sm">
                       <SelectValue placeholder="Välj handbok..." />
                     </SelectTrigger>
                     <SelectContent>
                       {availableHandbooks.map((handbook) => {
                         console.log('Rendering SelectItem for:', handbook.id, handbook.title);
                         return (
                           <SelectItem key={handbook.id} value={handbook.id}>
                             {handbook.title}
                           </SelectItem>
                         );
                       })}
                     </SelectContent>
                   </Select>
                   */}
                   
                   <Select
                     value={selectedNewRole}
                     onValueChange={setSelectedNewRole}
                     disabled={isEditingRoles}
                   >
                     <SelectTrigger className="w-32 text-sm">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="admin">Admin</SelectItem>
                       <SelectItem value="editor">Redaktör</SelectItem>
                       <SelectItem value="viewer">Läsare</SelectItem>
                     </SelectContent>
                   </Select>
                   
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={addUserToHandbook}
                     disabled={isEditingRoles || !selectedNewHandbook}
                     className="text-green-600 hover:text-green-700 hover:bg-green-50"
                   >
                     <Plus className="h-3 w-3 mr-1" />
                     Lägg till
                   </Button>
                 </div>
               ) : (
                 <div className="text-center py-4 text-gray-500">
                   <p className="text-sm">Inga handböcker tillgängliga att lägga till i</p>
                   <p className="text-xs text-gray-400 mt-1">Antingen är användaren redan medlem i alla handböcker eller så kunde handböcker inte laddas</p>
                 </div>
               )}
             </div>
             
             {isEditingRoles && (
               <div className="flex items-center justify-center py-4">
                 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                 <span className="ml-2 text-sm text-gray-600">Uppdaterar...</span>
               </div>
             )}
           </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEditingRoles}>Stäng</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 