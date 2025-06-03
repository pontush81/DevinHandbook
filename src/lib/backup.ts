/**
 * Database Backup System
 * Hanterar backup och återställning av Supabase-databasen
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { getServiceSupabase } from './supabase';

export interface BackupMetadata {
  id: string;
  created_at: string;
  created_by?: string;
  backup_type: 'manual' | 'scheduled';
  size_bytes: number;
  table_counts: Record<string, number>;
  schema_version: string;
  checksum: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: {
    handbooks: any[];
    sections: any[];
    pages: any[];
    documents: any[];
    attachments: any[];
    user_profiles?: any[];
    trial_activities?: any[];
  };
  schema: {
    version: string;
    tables: string[];
    created_at: string;
  };
}

export interface BackupOptions {
  includeUserData?: boolean;
  includeTrialData?: boolean;
  excludeTables?: string[];
  compression?: boolean;
}

/**
 * Huvudklass för backup-hantering
 */
export class DatabaseBackupManager {
  private supabase;
  
  constructor() {
    this.supabase = getServiceSupabase();
  }

  /**
   * Skapar en fullständig backup av databasen
   */
  async createBackup(options: BackupOptions = {}): Promise<BackupData> {
    try {
      console.log('🔄 Startar databas-backup...');
      
      // Standard-konfiguration
      const config = {
        includeUserData: options.includeUserData ?? false,
        includeTrialData: options.includeTrialData ?? false,
        excludeTables: options.excludeTables ?? [],
        compression: options.compression ?? true,
        ...options
      };

      // Hämta all data från alla tabeller
      const backupData: BackupData['data'] = {
        handbooks: [],
        sections: [],
        pages: [],
        documents: [],
        attachments: []
      };

      // Backup av handbooks
      console.log('📚 Säkerhetskopierar handbooks...');
      const { data: handbooks, error: handbooksError } = await this.supabase
        .from('handbooks')
        .select('*')
        .order('created_at', { ascending: true });

      if (handbooksError) {
        throw new Error(`Fel vid backup av handbooks: ${handbooksError.message}`);
      }
      backupData.handbooks = handbooks || [];

      // Backup av sections
      console.log('📑 Säkerhetskopierar sections...');
      const { data: sections, error: sectionsError } = await this.supabase
        .from('sections')
        .select('*')
        .order('created_at', { ascending: true });

      if (sectionsError) {
        throw new Error(`Fel vid backup av sections: ${sectionsError.message}`);
      }
      backupData.sections = sections || [];

      // Backup av pages
      console.log('📄 Säkerhetskopierar pages...');
      const { data: pages, error: pagesError } = await this.supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: true });

      if (pagesError) {
        throw new Error(`Fel vid backup av pages: ${pagesError.message}`);
      }
      backupData.pages = pages || [];

      // Backup av documents
      console.log('📁 Säkerhetskopierar documents...');
      const { data: documents, error: documentsError } = await this.supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: true });

      if (documentsError) {
        throw new Error(`Fel vid backup av documents: ${documentsError.message}`);
      }
      backupData.documents = documents || [];

      // Backup av attachments
      console.log('📎 Säkerhetskopierar attachments...');
      const { data: attachments, error: attachmentsError } = await this.supabase
        .from('attachments')
        .select('*')
        .order('created_at', { ascending: true });

      if (attachmentsError) {
        throw new Error(`Fel vid backup av attachments: ${attachmentsError.message}`);
      }
      backupData.attachments = attachments || [];

      // Inkludera användardata om begärt
      if (config.includeUserData) {
        console.log('👤 Säkerhetskopierar användardata...');
        const { data: profiles, error: profilesError } = await this.supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: true });

        if (profilesError) {
          console.warn(`Varning vid backup av user_profiles: ${profilesError.message}`);
        } else {
          backupData.user_profiles = profiles || [];
        }
      }

      // Inkludera trial-data om begärt
      if (config.includeTrialData) {
        console.log('🧪 Säkerhetskopierar trial-data...');
        const { data: trialActivities, error: trialError } = await this.supabase
          .from('trial_activities')
          .select('*')
          .order('created_at', { ascending: true });

        if (trialError) {
          console.warn(`Varning vid backup av trial_activities: ${trialError.message}`);
        } else {
          backupData.trial_activities = trialActivities || [];
        }
      }

      // Skapa metadata
      const metadata: BackupMetadata = {
        id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        backup_type: 'manual',
        size_bytes: 0,
        table_counts: {
          handbooks: backupData.handbooks.length,
          sections: backupData.sections.length,
          pages: backupData.pages.length,
          documents: backupData.documents.length,
          attachments: backupData.attachments.length,
          user_profiles: backupData.user_profiles?.length ?? 0,
          trial_activities: backupData.trial_activities?.length ?? 0
        },
        schema_version: '1.0.0',
        checksum: ''
      };

      // Skapa schema-information
      const schema = {
        version: '1.0.0',
        tables: Object.keys(metadata.table_counts),
        created_at: new Date().toISOString()
      };

      // Beräkna storlek och checksum
      const fullBackup: BackupData = { metadata, data: backupData, schema };
      const backupString = JSON.stringify(fullBackup);
      metadata.size_bytes = Buffer.byteLength(backupString, 'utf8');
      metadata.checksum = await this.generateChecksum(backupString);

      console.log('✅ Backup skapad framgångsrikt!');
      console.log(`📊 Totalt antal poster: ${Object.values(metadata.table_counts).reduce((a, b) => a + b, 0)}`);
      console.log(`💾 Storlek: ${(metadata.size_bytes / 1024 / 1024).toFixed(2)} MB`);

      return fullBackup;

    } catch (error) {
      console.error('❌ Fel vid skapande av backup:', error);
      throw error;
    }
  }

  /**
   * Återställer databas från backup
   */
  async restoreFromBackup(backupData: BackupData, options: { force?: boolean } = {}): Promise<void> {
    try {
      console.log('🔄 Startar återställning från backup...');
      
      // Validera backup-data
      if (!this.validateBackupData(backupData)) {
        throw new Error('Ogiltig backup-data');
      }

      // Bekräfta checksum
      const backupString = JSON.stringify(backupData);
      const calculatedChecksum = await this.generateChecksum(backupString);
      if (calculatedChecksum !== backupData.metadata.checksum && !options.force) {
        throw new Error('Backup-checksum matchar inte. Använd force=true för att återställa ändå.');
      }

      console.log('⚠️  VARNING: Detta kommer att ersätta ALL data i databasen!');
      
      if (!options.force) {
        throw new Error('Återställning kräver force=true för säkerhet');
      }

      // Återställ data tabell för tabell (i korrekt ordning pga foreign keys)
      
      // 1. Handbooks först (master table)
      if (backupData.data.handbooks.length > 0) {
        console.log('📚 Återställer handbooks...');
        await this.clearAndRestoreTable('handbooks', backupData.data.handbooks);
      }

      // 2. Sections (refererar till handbooks)
      if (backupData.data.sections.length > 0) {
        console.log('📑 Återställer sections...');
        await this.clearAndRestoreTable('sections', backupData.data.sections);
      }

      // 3. Pages (refererar till sections)
      if (backupData.data.pages.length > 0) {
        console.log('📄 Återställer pages...');
        await this.clearAndRestoreTable('pages', backupData.data.pages);
      }

      // 4. Documents (refererar till handbooks och sections)
      if (backupData.data.documents.length > 0) {
        console.log('📁 Återställer documents...');
        await this.clearAndRestoreTable('documents', backupData.data.documents);
      }

      // 5. Attachments (refererar till handbooks och pages)
      if (backupData.data.attachments.length > 0) {
        console.log('📎 Återställer attachments...');
        await this.clearAndRestoreTable('attachments', backupData.data.attachments);
      }

      // 6. Användardata (om inkluderat)
      if (backupData.data.user_profiles && backupData.data.user_profiles.length > 0) {
        console.log('👤 Återställer user_profiles...');
        await this.clearAndRestoreTable('user_profiles', backupData.data.user_profiles);
      }

      // 7. Trial-data (om inkluderat)
      if (backupData.data.trial_activities && backupData.data.trial_activities.length > 0) {
        console.log('🧪 Återställer trial_activities...');
        await this.clearAndRestoreTable('trial_activities', backupData.data.trial_activities);
      }

      console.log('✅ Återställning slutförd framgångsrikt!');

    } catch (error) {
      console.error('❌ Fel vid återställning:', error);
      throw error;
    }
  }

  /**
   * Rensar och återställer en specifik tabell
   */
  private async clearAndRestoreTable(tableName: string, data: any[]): Promise<void> {
    try {
      // Rensa befintlig data (använd service role för att bypassa RLS)
      const { error: deleteError } = await this.supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Ta bort alla rader

      if (deleteError) {
        console.warn(`Varning vid rensning av ${tableName}:`, deleteError.message);
      }

      // Sätt in ny data i batches (Supabase har begränsningar)
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const { error: insertError } = await this.supabase
          .from(tableName)
          .insert(batch);

        if (insertError) {
          throw new Error(`Fel vid insättning i ${tableName}: ${insertError.message}`);
        }
      }

      console.log(`✅ ${tableName}: ${data.length} poster återställda`);

    } catch (error) {
      console.error(`❌ Fel vid återställning av ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Validerar backup-data struktur
   */
  private validateBackupData(backupData: BackupData): boolean {
    try {
      // Kontrollera att alla nödvändiga fält finns
      if (!backupData.metadata || !backupData.data || !backupData.schema) {
        return false;
      }

      // Kontrollera metadata
      const requiredMetadataFields = ['id', 'created_at', 'backup_type', 'size_bytes', 'table_counts', 'schema_version', 'checksum'];
      for (const field of requiredMetadataFields) {
        if (!(field in backupData.metadata)) {
          return false;
        }
      }

      // Kontrollera data-struktur
      const requiredDataFields = ['handbooks', 'sections', 'pages', 'documents', 'attachments'];
      for (const field of requiredDataFields) {
        if (!(field in backupData.data) || !Array.isArray(backupData.data[field])) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Genererar checksum för backup-validering
   */
  private async generateChecksum(data: string): Promise<string> {
    try {
      // Använd Web Crypto API för checksum
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      // Fallback till enkel hash om Web Crypto inte finns
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * Hämtar backup-statistik
   */
  async getBackupStatistics(): Promise<{
    totalRecords: number;
    tableStats: Record<string, number>;
    estimatedSize: number;
    lastBackupDate?: string;
  }> {
    try {
      const stats = {
        totalRecords: 0,
        tableStats: {} as Record<string, number>,
        estimatedSize: 0,
        lastBackupDate: undefined as string | undefined
      };

      // Räkna poster i varje tabell
      const tables = ['handbooks', 'sections', 'pages', 'documents', 'attachments'];
      
      for (const table of tables) {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
          stats.tableStats[table] = count;
          stats.totalRecords += count;
        }
      }

      // Uppskatta storlek (ungefär 1KB per post som approximation)
      stats.estimatedSize = stats.totalRecords * 1024;

      return stats;
    } catch (error) {
      console.error('Fel vid hämtning av backup-statistik:', error);
      throw error;
    }
  }
}

/**
 * Hjälpfunktioner för backup-hantering
 */

export function formatBackupSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function formatBackupDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function generateBackupFilename(metadata: BackupMetadata): string {
  const date = new Date(metadata.created_at);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `backup_${dateStr}_${timeStr}_${metadata.backup_type}.json`;
} 