'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Download, 
  Upload, 
  Database, 
  Clock, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  RefreshCw,
  Plus,
  Trash2,
  Zap,
  Settings
} from 'lucide-react';
import { formatBackupSize, formatBackupDate, generateBackupFilename, BackupData } from '@/lib/backup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

interface BackupStats {
  totalRecords: number;
  tableStats: Record<string, number>;
  estimatedSize: number;
  lastBackupDate?: string;
}

interface BackupOptions {
  includeUserData: boolean;
  includeTrialData: boolean;
  excludeTables: string[];
  compression: boolean;
  incremental: boolean;
  lastBackupDate?: string;
}

interface BackupSchedule {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  email: string;
  last_run?: string;
  next_run?: string;
  enabled: boolean;
}

export default function BackupManager() {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    includeUserData: false,
    includeTrialData: false,
    excludeTables: [],
    compression: true,
    incremental: false,
    lastBackupDate: undefined
  });

  const [emailConfig, setEmailConfig] = useState({
    emailTo: 'pontus.hberg@gmail.com',
    emailSubject: 'Databas-backup'
  });

  const [restoreData, setRestoreData] = useState<string>('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [newSchedule, setNewSchedule] = useState<Omit<BackupSchedule, 'id' | 'last_run' | 'next_run'>>({
    frequency: 'daily',
    time: '12:00',
    email: '',
    enabled: true,
  });

  // Helper function to create auth headers
  const createAuthHeaders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        };
      }
    } catch {}
    return { 'Content-Type': 'application/json' };
  };

  // Helper function to make authenticated API calls with 401 retry
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    // For admin endpoints, always send auth headers from the start
    const isAdminEndpoint = url.includes('/api/admin/');
    
    let headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    
    if (isAdminEndpoint) {
      console.log('[BackupManager] Admin endpoint detected, including auth headers');
      const authHeaders = await createAuthHeaders();
      headers = { ...headers, ...authHeaders };
    }
    
    let response = await fetch(url, {
      ...options,
      headers
    });
    
    // If unauthorized and we haven't tried auth headers yet, try with auth header
    if (!response.ok && response.status === 401 && !isAdminEndpoint) {
      console.log('[BackupManager] Got 401, retrying with auth headers...');
      const authHeaders = await createAuthHeaders();
      response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...authHeaders
        }
      });
    }
    
    return response;
  };

  useEffect(() => {
    loadBackupStats();
    loadSchedules();
  }, []);

  const loadBackupStats = async (showMessage = false) => {
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest('/api/admin/backup/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.stats);
        if (showMessage) {
          setMessage({ type: 'success', text: 'Statistik uppdaterad!' });
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Fel vid hämtning av statistik' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fel vid hämtning av backup-statistik' });
    } finally {
      setLoading(false);
    }
  };

  const createManualBackup = async () => {
    setLoading(true);
    setProgress(0);
    setMessage(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await makeAuthenticatedRequest('/api/admin/backup/create', {
        method: 'POST',
        body: JSON.stringify(backupOptions)
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fel vid skapande av backup');
      }

      const result = await response.json();
      
      if (result.success && result.backup) {
        setMessage({ type: 'success', text: 'Backup skapad framgångsrikt!' });
        
        try {
          const backupJson = JSON.stringify(result.backup, null, 2);
          const blob = new Blob([backupJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = generateBackupFilename(result.backup.metadata);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setTimeout(async () => {
            // Ladda statistik utan att visa meddelande
            setLoading(true);
            try {
              const response = await makeAuthenticatedRequest('/api/admin/backup/stats');
              const result = await response.json();
              if (result.success) {
                setStats(result.stats);
              }
            } catch (error) {
              console.error('Fel vid hämtning av statistik:', error);
            } finally {
              setLoading(false);
            }
          }, 1000);
        } catch (downloadError) {
          console.error('Fel vid nedladdning av backup:', downloadError);
          setMessage({ 
            type: 'error', 
            text: 'Backup skapades men kunde inte laddas ner. Kontrollera konsolen för mer information.' 
          });
        }
      } else {
        throw new Error(result.error || 'Ogiltig respons från servern');
      }
    } catch (error) {
      console.error('Fel vid backup:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Fel vid skapande av backup' 
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const createScheduledBackup = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await makeAuthenticatedRequest('/api/admin/backup/scheduled', {
        method: 'POST',
        body: JSON.stringify({
          options: backupOptions,
          emailTo: emailConfig.emailTo,
          emailSubject: emailConfig.emailSubject,
          sendEmail: true
        })
      });

      const result = await response.json();
      
      console.log('🔄 Restore API response:', result);
      console.log('📊 Response status:', response.status);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Email skickat.' });
        await loadBackupStats(false);
      } else {
        console.error('❌ Återställning misslyckades:', result.error);
        setMessage({ type: 'error', text: result.error || 'Fel vid skapande av schemalagd backup' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fel vid skapande av schemalagd backup' });
    } finally {
      setLoading(false);
    }
  };

  const restoreFromBackup = async () => {
    setLoading(true);
    setMessage(null);

    try {
      let backupDataString = restoreData.trim();
      
      // Om restoreData är tom men vi har en fil, läs filen först
      if (!backupDataString && selectedFile) {
        console.log('🔄 RestoreData är tom, läser fil automatiskt:', selectedFile.name);
        setMessage({ type: 'info', text: 'Läser backup-fil...' });
        
        try {
          backupDataString = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const content = e.target?.result as string;
              console.log('📄 Fil inläst automatiskt, längd:', content.length);
              resolve(content);
            };
            reader.onerror = () => reject(new Error('Fel vid filläsning'));
            reader.readAsText(selectedFile);
          });
          
          // Uppdatera restoreData för framtida användning
          setRestoreData(backupDataString);
          console.log('✅ RestoreData uppdaterad med filinnehåll');
          
        } catch (error) {
          console.error('❌ Fel vid automatisk filläsning:', error);
          setMessage({ type: 'error', text: 'Fel vid läsning av backup-fil' });
          setLoading(false);
          return;
        }
      }
      
      if (!backupDataString) {
        console.error('❌ Ingen backup-data tillgänglig');
        setMessage({ type: 'error', text: 'Ingen backup-data angiven. Välj en backup-fil först.' });
        setLoading(false);
        return;
      }

      console.log('🔍 Validerar backup-data...');
      setMessage({ type: 'info', text: 'Validerar backup-data...' });

      let backupData;
      try {
        backupData = JSON.parse(backupDataString);
        console.log('✅ JSON parsing lyckades');
      } catch (jsonError) {
        console.error('❌ JSON parsing misslyckades:', jsonError);
        setMessage({ type: 'error', text: 'Ogiltig JSON-format i backup-filen' });
        setLoading(false);
        return;
      }

      // Validera backup-struktur
      if (!backupData.metadata || !backupData.data || !backupData.schema) {
        console.error('❌ Ogiltig backup-struktur:', { 
          hasMetadata: !!backupData.metadata, 
          hasData: !!backupData.data, 
          hasSchema: !!backupData.schema 
        });
        setMessage({ type: 'error', text: 'Ogiltig backup-struktur. Kontrollera att filen är en korrekt backup.' });
        setLoading(false);
        return;
      }

      console.log('✅ Backup-struktur validerad');
      setMessage({ type: 'info', text: 'Påbörjar databasåterställning...' });
      
      const response = await makeAuthenticatedRequest('/api/admin/backup/restore', {
        method: 'POST',
        body: JSON.stringify({
          backupData,
          force: true
        })
      });

      const result = await response.json();
      
      console.log('🔄 Restore API response:', result);
      console.log('📊 Response status:', response.status);
      
      if (result.success) {
        console.log('✅ Databas återställd framgångsrikt!');
        setMessage({ type: 'success', text: 'Databas återställd framgångsrikt!' });
        setRestoreData('');
        setSelectedFile(null);
        setShowRestoreConfirm(false);
        await loadBackupStats();
      } else {
        console.error('❌ Återställning misslyckades:', result.error);
        setMessage({ type: 'error', text: result.error || 'Fel vid återställning' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ogiltig backup-data eller fel vid återställning' });
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/backup/schedules');
      const result = await response.json();
      
      if (result.success) {
        setSchedules(result.schedules);
      } else {
        setMessage({ type: 'error', text: result.error || 'Fel vid hämtning av scheman' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fel vid hämtning av backup-scheman' });
    }
  };

  const createSchedule = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await makeAuthenticatedRequest('/api/admin/backup/schedules', {
        method: 'POST',
        body: JSON.stringify(newSchedule)
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Backup-schema skapat!' });
        await loadSchedules();
        setNewSchedule({
          frequency: 'daily',
          time: '12:00',
          email: '',
          enabled: true,
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Fel vid skapande av schema' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fel vid skapande av backup-schema' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSchedule = async (id: string, enabled: boolean) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/backup/schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadSchedules();
      } else {
        setMessage({ type: 'error', text: result.error || 'Fel vid uppdatering av schema' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fel vid uppdatering av backup-schema' });
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort detta backup-schema?')) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`/api/admin/backup/schedules/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Backup-schema borttaget!' });
        await loadSchedules();
      } else {
        setMessage({ type: 'error', text: result.error || 'Fel vid borttagning av schema' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fel vid borttagning av backup-schema' });
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : message.type === 'success' ? 'border-green-500' : 'border-blue-500'}>
          {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
          {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
          {message.type === 'info' && <Info className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {loading && progress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Skapar backup...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Zap className="h-5 w-5" />
            Snabbåtgärder
          </CardTitle>
          <CardDescription>
            Vanligaste backup-åtgärder och email-inställningar
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="space-y-3 p-4 bg-white rounded-lg border border-blue-100">
            <Label className="text-sm font-medium">Email-inställningar</Label>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="emailTo" className="text-xs">Email-adress</Label>
                <Input
                  id="emailTo"
                  type="email"
                  placeholder="admin@handbok.org"
                  value={emailConfig.emailTo}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, emailTo: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="emailSubject" className="text-xs">Ämne</Label>
                <Input
                  id="emailSubject"
                  placeholder="Databas-backup"
                  value={emailConfig.emailSubject}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, emailSubject: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={createManualBackup} 
              disabled={loading}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Skapar backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Skapa backup nu
                </>
              )}
            </Button>

            <Button 
              onClick={createScheduledBackup} 
              disabled={loading}
              variant="outline"
              className="flex-1 h-12 border-blue-200 hover:bg-blue-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Skapar backup...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Skicka via email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Databas-statistik
          </CardTitle>
          <CardDescription>
            Aktuell status för databasen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalRecords}</div>
                <div className="text-sm text-gray-600">Totalt poster</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatBackupSize(stats.estimatedSize)}</div>
                <div className="text-sm text-gray-600">Uppskattad storlek</div>
                <div className="text-xs text-green-500 mt-1">
                  ~{formatBackupSize(Math.round(stats.estimatedSize * 0.3))} med GZIP
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.tableStats).length}</div>
                <div className="text-sm text-gray-600">Tabeller</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.lastBackupDate ? formatBackupDate(stats.lastBackupDate) : 'Aldrig'}
                </div>
                <div className="text-sm text-gray-600">Senaste backup</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Laddar statistik...
            </div>
          )}

          <Button 
            onClick={() => loadBackupStats(true)} 
            variant="outline" 
            size="sm" 
            className="mt-4"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Uppdatera
          </Button>
        </CardContent>
      </Card>



      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Återställ från backup
          </CardTitle>
          <CardDescription className="text-red-600">
            <strong>VARNING:</strong> Detta kommer att ersätta ALL data i databasen!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="backupFile">Välj backup-fil</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="backupFile"
                  type="file"
                  accept=".json"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (selectedFile) {
                      console.log('Läs in-knapp klickad, selectedFile:', selectedFile);
                      setMessage({ type: 'info', text: 'Läser in backup-fil...' });
                      
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const content = e.target?.result as string;
                        console.log('Fil inläst, innehåll längd:', content.length);
                        
                        try {
                          JSON.parse(content);
                          setRestoreData(content);
                          console.log('setRestoreData kallad med innehåll längd:', content.length);
                          setMessage({ type: 'success', text: `Backup-fil "${selectedFile.name}" laddad framgångsrikt!` });
                          console.log('setMessage kallad med success-meddelande');
                        } catch (error) {
                          setMessage({ type: 'error', text: 'Ogiltig JSON-fil' });
                        }
                      };
                      reader.onerror = () => {
                        setMessage({ type: 'error', text: 'Fel vid läsning av backup-fil' });
                      };
                      reader.readAsText(selectedFile);
                    }
                  }}
                  disabled={!selectedFile || loading}
                  variant="outline"
                >
                  Läs in
                </Button>
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Vald fil: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              {restoreData.length > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Backup-data inläst och redo för återställning
                </p>
              )}
            </div>

            {(restoreData.trim() || selectedFile) && (
              <Button
                onClick={() => {
                  setRestoreData('');
                  setSelectedFile(null);
                  const fileInput = document.getElementById('backupFile') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                  setMessage({ type: 'info', text: 'Backup-data rensad' });
                }}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Rensa
              </Button>
            )}
          </div>

          {!showRestoreConfirm ? (
            <Button 
              onClick={() => {
                console.log('Återställ databas klickad, restoreData längd:', restoreData.length);
                setShowRestoreConfirm(true);
              }}
              disabled={(!restoreData.trim() && !selectedFile) || loading}
              variant="destructive"
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white border-2 border-red-800"
              style={{ minHeight: '48px' }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Återställ databas {restoreData.length > 0 ? `(${Math.round(restoreData.length/1000)}k tecken)` : '(ingen data)'}
            </Button>
          ) : (
            <div className="space-y-2">
              <Alert className="border-red-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Är du säker?</strong> Detta kommer att ersätta ALL data i databasen med backup-data. 
                  Denna åtgärd kan inte ångras!
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={restoreFromBackup}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6"
                  style={{ minHeight: '48px' }}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Återställer databas...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      ✅ Ja, återställ databas
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => setShowRestoreConfirm(false)}
                  variant="outline"
                  disabled={loading}
                  className="px-6 py-3"
                  style={{ minHeight: '48px' }}
                >
                  ❌ Avbryt
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schemalagda backups
          </CardTitle>
          <CardDescription>
            Hantera automatiska backups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="font-medium">Skapa nytt backup-schema</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="frequency">Frekvens</Label>
                <Select 
                  value={newSchedule.frequency}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                    setNewSchedule(prev => ({ ...prev, frequency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj frekvens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Dagligen</SelectItem>
                    <SelectItem value="weekly">Veckovis</SelectItem>
                    <SelectItem value="monthly">Månadsvis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time">Tid</Label>
                <Input
                  id="time"
                  type="time"
                  value={newSchedule.time}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="scheduleEmail">Email</Label>
                <Input
                  id="scheduleEmail"
                  type="email"
                  placeholder="admin@handbok.org"
                  value={newSchedule.email}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <Button 
              onClick={createSchedule}
              disabled={loading || !newSchedule.email || !newSchedule.time}
              className="w-full mt-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Skapar schema...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Skapa backup-schema
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Aktiva scheman</h3>
            
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inga schemalagda backups konfigurerade.
              </p>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">
                        {schedule.frequency === 'daily' ? 'Dagligen' :
                         schedule.frequency === 'weekly' ? 'Veckovis' : 'Månadsvis'} 
                        kl. {schedule.time}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {schedule.email}
                      </div>
                      {schedule.last_run && (
                        <div className="text-xs text-muted-foreground">
                          Senaste: {new Date(schedule.last_run).toLocaleString('sv-SE')}
                        </div>
                      )}
                      {schedule.next_run && (
                        <div className="text-xs text-muted-foreground">
                          Nästa: {new Date(schedule.next_run).toLocaleString('sv-SE')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(checked) => toggleSchedule(schedule.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSchedule(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 