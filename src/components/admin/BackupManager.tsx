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
import { 
  Download, 
  Upload, 
  Database, 
  Clock, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  RefreshCw
} from 'lucide-react';
import { formatBackupSize, formatBackupDate, BackupData } from '@/lib/backup';

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
}

export default function BackupManager() {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Backup-alternativ
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    includeUserData: false,
    includeTrialData: false,
    excludeTables: [],
    compression: true
  });

  // Email-konfiguration
  const [emailConfig, setEmailConfig] = useState({
    sendEmail: true,
    emailTo: '',
    emailSubject: 'Databas-backup'
  });

  // Återställning
  const [restoreData, setRestoreData] = useState<string>('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Hämta backup-statistik vid laddning
  useEffect(() => {
    loadBackupStats();
  }, []);

  const loadBackupStats = async () => {
    try {
      const response = await fetch('/api/admin/backup/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.stats);
      } else {
        setMessage({ type: 'error', text: result.error || 'Fel vid hämtning av statistik' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fel vid hämtning av backup-statistik' });
    }
  };

  const createManualBackup = async () => {
    setLoading(true);
    setProgress(0);
    setMessage(null);

    try {
      // Simulera progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/admin/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy' // Du kan implementera riktig auth senare
        },
        body: JSON.stringify(backupOptions)
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Backup skapad framgångsrikt!' });
        
        // Ladda ner backup-filen
        const backupJson = JSON.stringify(result.backup, null, 2);
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}_manual.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Uppdatera statistik
        await loadBackupStats();
      } else {
        setMessage({ type: 'error', text: result.error || 'Fel vid skapande av backup' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fel vid skapande av backup' });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const createScheduledBackup = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/backup/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...backupOptions,
          ...emailConfig
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Schemalagd backup skapad! ${emailConfig.sendEmail ? 'Email skickat.' : ''}` 
        });
        await loadBackupStats();
      } else {
        setMessage({ type: 'error', text: result.error || 'Fel vid schemalagd backup' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fel vid schemalagd backup' });
    } finally {
      setLoading(false);
    }
  };

  const restoreFromBackup = async () => {
    if (!restoreData.trim()) {
      setMessage({ type: 'error', text: 'Ingen backup-data angiven' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const backupData = JSON.parse(restoreData);
      
      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy'
        },
        body: JSON.stringify({
          backupData,
          force: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Databas återställd framgångsrikt!' });
        setRestoreData('');
        setShowRestoreConfirm(false);
        await loadBackupStats();
      } else {
        setMessage({ type: 'error', text: result.error || 'Fel vid återställning' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ogiltig backup-data eller fel vid återställning' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Meddelanden */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : message.type === 'success' ? 'border-green-500' : 'border-blue-500'}>
          {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
          {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
          {message.type === 'info' && <Info className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Progress bar */}
      {loading && progress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Skapar backup...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {/* Databas-statistik */}
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
            onClick={loadBackupStats} 
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

      {/* Backup-alternativ */}
      <Card>
        <CardHeader>
          <CardTitle>Backup-alternativ</CardTitle>
          <CardDescription>
            Konfigurera vad som ska inkluderas i backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeUserData"
              checked={backupOptions.includeUserData}
              onCheckedChange={(checked) => 
                setBackupOptions(prev => ({ ...prev, includeUserData: !!checked }))
              }
            />
            <Label htmlFor="includeUserData">Inkludera användardata</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeTrialData"
              checked={backupOptions.includeTrialData}
              onCheckedChange={(checked) => 
                setBackupOptions(prev => ({ ...prev, includeTrialData: !!checked }))
              }
            />
            <Label htmlFor="includeTrialData">Inkludera trial-data</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="compression"
              checked={backupOptions.compression}
              onCheckedChange={(checked) => 
                setBackupOptions(prev => ({ ...prev, compression: !!checked }))
              }
            />
            <Label htmlFor="compression">Komprimering</Label>
          </div>
        </CardContent>
      </Card>

      {/* Manuell backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Manuell backup
          </CardTitle>
          <CardDescription>
            Skapa en backup direkt och ladda ner den
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={createManualBackup} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Skapar backup...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Skapa och ladda ner backup
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Schemalagd backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schemalagd backup
          </CardTitle>
          <CardDescription>
            Skapa backup och skicka via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sendEmail"
              checked={emailConfig.sendEmail}
              onCheckedChange={(checked) => 
                setEmailConfig(prev => ({ ...prev, sendEmail: !!checked }))
              }
            />
            <Label htmlFor="sendEmail">Skicka via email</Label>
          </div>

          {emailConfig.sendEmail && (
            <>
              <div>
                <Label htmlFor="emailTo">Email-adress</Label>
                <Input
                  id="emailTo"
                  type="email"
                  placeholder="admin@handbok.org"
                  value={emailConfig.emailTo}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, emailTo: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="emailSubject">Ämne</Label>
                <Input
                  id="emailSubject"
                  placeholder="Databas-backup"
                  value={emailConfig.emailSubject}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, emailSubject: e.target.value }))}
                />
              </div>
            </>
          )}

          <Button 
            onClick={createScheduledBackup} 
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Skapar backup...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Skapa schemalagd backup
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Återställning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Återställ från backup
          </CardTitle>
          <CardDescription>
            <span className="text-red-600 font-semibold">VARNING:</span> Detta kommer att ersätta ALL data i databasen!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="restoreData">Backup-data (JSON)</Label>
            <Textarea
              id="restoreData"
              placeholder="Klistra in backup JSON-data här..."
              value={restoreData}
              onChange={(e) => setRestoreData(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          {!showRestoreConfirm ? (
            <Button 
              onClick={() => setShowRestoreConfirm(true)}
              disabled={!restoreData.trim() || loading}
              variant="destructive"
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Återställ databas
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
              
              <div className="flex gap-2">
                <Button 
                  onClick={restoreFromBackup}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Återställer...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Ja, återställ databas
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => setShowRestoreConfirm(false)}
                  variant="outline"
                  disabled={loading}
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 