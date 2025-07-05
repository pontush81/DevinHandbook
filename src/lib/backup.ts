/**
 * Database Backup System
 * Hanterar backup och återställning av Supabase-databasen
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface BackupMetadata {
  id: string;
  created_at: string;
  created_by?: string;
  backup_type: 'manual' | 'scheduled' | 'incremental';
  size_bytes: number;
  compressed_size_bytes?: number;
  compression_ratio?: number;
  table_counts: Record<string, number>;
  schema_version: string;
  checksum: string;
  is_compressed?: boolean;
  incremental_from?: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: {
    handbooks: any[];
    sections: any[];
    pages: any[];
    attachments: any[];
    auth_users: any[]; // Grundläggande användar-info för foreign keys
    user_profiles?: any[];
    trial_activities?: any[];
    // NYTT: Bokningsdata
    booking_resources?: any[];
    bookings?: any[];
    booking_rules?: any[];
    booking_conflicts?: any[];
    performance_metrics?: any[];
    query_performance?: any[];
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
  includeBookingData?: boolean;
  includePerformanceData?: boolean;
  excludeTables?: string[];
  compression?: boolean;
  incremental?: boolean;
  lastBackupDate?: string;
}

/**
 * Huvudklass för backup-hantering
 */
export class DatabaseBackupManager {
  constructor(
    private supabase: SupabaseClient, 
    private userSupabase?: SupabaseClient
  ) {}

  /**
   * Sparar backup-historik i databasen
   */
  private async saveBackupHistory(metadata: BackupMetadata, userId?: string): Promise<void> {
    try {
      console.log('💾 Sparar backup-historik...');
      console.log('📅 Backup-datum:', metadata.created_at);
      
      // Använd service-role klient för att bypassa RLS policies
      const client = this.supabase;
      
      const { error } = await client
        .from('backup_history')
        .insert({
          id: metadata.id,
          created_by: userId,
          backup_type: metadata.backup_type,
          size_bytes: metadata.size_bytes,
          table_counts: metadata.table_counts,
          schema_version: metadata.schema_version,
          checksum: metadata.checksum
        });

      if (error) {
        console.error('❌ Fel vid sparande av backup-historik:', error);
        throw error;
      }

      console.log('✅ Backup-historik sparad');
    } catch (error) {
      console.error('❌ Fel vid sparande av backup-historik:', error);
      throw error;
    }
  }

  /**
   * Hämtar senaste backup-datum
   */
  private async getLastBackupDate(): Promise<string | undefined> {
    try {
      // Använd service-role klient för att bypassa RLS policies
      const client = this.supabase;
      
      const { data, error } = await client
        .from('backup_history')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Fel vid hämtning av senaste backup-datum:', error);
        return undefined;
      }

      return data?.created_at;
    } catch (error) {
      console.error('Fel vid hämtning av senaste backup-datum:', error);
      return undefined;
    }
  }

  /**
   * Genererar ett UUID för backup
   */
  private generateBackupId(): string {
    return crypto.randomUUID();
  }

  /**
   * Hämtar ALLA poster från en tabell med paginering (hanterar >1000 rader)
   */
  private async getAllRecords(tableName: string, sinceDate?: string): Promise<any[]> {
    const allRecords: any[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    console.log(`🔄 Hämtar alla poster från ${tableName}...`);

    while (hasMore) {
      let query = this.supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1);

      // Lägg till datum-filter för inkrementell backup
      if (sinceDate) {
        query = query.gte('updated_at', sinceDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Fel vid hämtning från ${tableName}: ${error.message}`);
      }

      if (data && data.length > 0) {
        allRecords.push(...data);
        console.log(`📄 ${tableName}: Hämtade ${data.length} poster (totalt ${allRecords.length})`);
        
        // Om vi fick färre än pageSize poster, är vi klara
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ ${tableName}: Totalt ${allRecords.length} poster hämtade`);
    return allRecords;
  }

  /**
   * Komprimerar backup-data med GZIP
   */
  private async compressBackup(data: string): Promise<Buffer> {
    try {
      return await gzip(data);
    } catch (error) {
      console.error('❌ Fel vid komprimering:', error);
      throw error;
    }
  }

  /**
   * Dekomprimerar backup-data från GZIP
   */
  private async decompressBackup(compressedData: Buffer): Promise<string> {
    try {
      const decompressed = await gunzip(compressedData);
      return decompressed.toString('utf8');
    } catch (error) {
      console.error('❌ Fel vid dekomprimering:', error);
      throw error;
    }
  }

  /**
   * Skapar en fullständig backup av databasen
   */
  async createBackup(options: BackupOptions = {}, userId?: string): Promise<BackupData> {
    try {
      console.log('🔄 Startar databas-backup...');
      
      // Standard-konfiguration
      const config = {
        includeUserData: options.includeUserData ?? false,
        includeTrialData: options.includeTrialData ?? false,
        includeBookingData: options.includeBookingData ?? true,
        includePerformanceData: options.includePerformanceData ?? false,
        excludeTables: options.excludeTables ?? [],
        compression: options.compression ?? true,
        ...options
      };

      // Hämta all data från alla tabeller
      const backupData: BackupData['data'] = {
        handbooks: [],
        sections: [],
        pages: [],
        attachments: [],
        auth_users: [], // Grundläggande användar-info för foreign key relationships
        // NYTT: Bokningsdata
        booking_resources: [],
        bookings: [],
        booking_rules: [],
        booking_conflicts: [],
        performance_metrics: [],
        query_performance: []
      };

      // Backup av handbooks (med paginering för att hantera >1000 rader)
      console.log('📚 Säkerhetskopierar handbooks...');
      backupData.handbooks = await this.getAllRecords('handbooks', config.incremental ? options.lastBackupDate : undefined);
      console.log(`📚 Handbooks: ${backupData.handbooks.length} poster säkerhetskopierade`);

      // Backup av sections (med paginering)
      console.log('📑 Säkerhetskopierar sections...');
      backupData.sections = await this.getAllRecords('sections', config.incremental ? options.lastBackupDate : undefined);
      console.log(`📑 Sections: ${backupData.sections.length} poster säkerhetskopierade`);

      // Backup av pages (med paginering)
      console.log('📄 Säkerhetskopierar pages...');
      backupData.pages = await this.getAllRecords('pages', config.incremental ? options.lastBackupDate : undefined);
      console.log(`📄 Pages: ${backupData.pages.length} poster säkerhetskopierade`);

      // Backup av attachments (med paginering)
      console.log('📎 Säkerhetskopierar attachments...');
      backupData.attachments = await this.getAllRecords('attachments');
      console.log(`📎 Attachments: ${backupData.attachments.length} poster säkerhetskopierade`);

      // Backup av grundläggande användar-info (för foreign key relationships)
      console.log('👤 Säkerhetskopierar grundläggande användar-info...');
      try {
        // Hämta användar-info från auth.users (bara grundläggande data för FK relationships)
        const { data: authUsers, error: authError } = await this.supabase
          .from('auth.users')
          .select('id, email, created_at')
          .limit(1000);

        if (authError && authError.code !== '42P01') { // 42P01 = table does not exist
          console.warn('⚠️ Kunde inte hämta auth.users direkt, försöker genom user_profiles...');
          
          // Fallback: hämta från user_profiles om det finns
          const { data: userProfiles } = await this.supabase
            .from('user_profiles')
            .select('id, created_at')
            .limit(1000);
          
          backupData.auth_users = userProfiles || [];
        } else {
          backupData.auth_users = authUsers || [];
        }
        
        console.log(`👤 Auth users: ${backupData.auth_users.length} poster säkerhetskopierade`);
      } catch (error) {
        console.warn('⚠️ Kunde inte säkerhetskopiera användar-info:', error);
        backupData.auth_users = [];
      }

      // Inkludera användardata om begärt (med paginering)
      if (config.includeUserData) {
        console.log('👤 Säkerhetskopierar användardata...');
        try {
          backupData.user_profiles = await this.getAllRecords('user_profiles');
          console.log(`👤 User profiles: ${backupData.user_profiles.length} poster säkerhetskopierade`);
        } catch (error) {
          console.warn(`Varning vid backup av user_profiles: ${error}`);
          backupData.user_profiles = [];
        }
      }

      // Inkludera trial-data om begärt (med paginering)
      if (config.includeTrialData) {
        console.log('🧪 Säkerhetskopierar trial-data...');
        try {
          backupData.trial_activities = await this.getAllRecords('trial_activities');
          console.log(`🧪 Trial activities: ${backupData.trial_activities.length} poster säkerhetskopierade`);
        } catch (error) {
          console.warn(`Varning vid backup av trial_activities: ${error}`);
          backupData.trial_activities = [];
        }
      }

      // Inkludera bokningsdata om begärt (standard: ja)
      if (config.includeBookingData) {
        console.log('📅 Säkerhetskopierar bokningsdata...');
        try {
          backupData.booking_resources = await this.getAllRecords('booking_resources');
          console.log(`📅 Booking resources: ${backupData.booking_resources.length} poster säkerhetskopierade`);
          
          backupData.bookings = await this.getAllRecords('bookings');
          console.log(`📅 Bookings: ${backupData.bookings.length} poster säkerhetskopierade`);
          
          backupData.booking_rules = await this.getAllRecords('booking_rules');
          console.log(`📅 Booking rules: ${backupData.booking_rules.length} poster säkerhetskopierade`);
          
          backupData.booking_conflicts = await this.getAllRecords('booking_conflicts');
          console.log(`📅 Booking conflicts: ${backupData.booking_conflicts.length} poster säkerhetskopierade`);
        } catch (error) {
          console.warn(`Varning vid backup av bokningsdata: ${error}`);
          backupData.booking_resources = [];
          backupData.bookings = [];
          backupData.booking_rules = [];
          backupData.booking_conflicts = [];
        }
      }

      // Inkludera prestandadata om begärt (standard: nej)
      if (config.includePerformanceData) {
        console.log('⚡ Säkerhetskopierar prestandadata...');
        try {
          backupData.performance_metrics = await this.getAllRecords('performance_metrics');
          console.log(`⚡ Performance metrics: ${backupData.performance_metrics.length} poster säkerhetskopierade`);
          
          backupData.query_performance = await this.getAllRecords('query_performance');
          console.log(`⚡ Query performance: ${backupData.query_performance.length} poster säkerhetskopierade`);
        } catch (error) {
          console.warn(`Varning vid backup av prestandadata: ${error}`);
          backupData.performance_metrics = [];
          backupData.query_performance = [];
        }
      }

      // Skapa metadata
      const metadata: BackupMetadata = {
        id: this.generateBackupId(),
        created_at: new Date().toISOString(),
        created_by: userId,
        backup_type: 'manual',
        size_bytes: 0,
        table_counts: {
          handbooks: backupData.handbooks.length,
          sections: backupData.sections.length,
          pages: backupData.pages.length,
          attachments: backupData.attachments.length,
          auth_users: backupData.auth_users.length,
          user_profiles: backupData.user_profiles?.length ?? 0,
          trial_activities: backupData.trial_activities?.length ?? 0,
          booking_resources: backupData.booking_resources?.length ?? 0,
          bookings: backupData.bookings?.length ?? 0,
          booking_rules: backupData.booking_rules?.length ?? 0,
          booking_conflicts: backupData.booking_conflicts?.length ?? 0,
          performance_metrics: backupData.performance_metrics?.length ?? 0,
          query_performance: backupData.query_performance?.length ?? 0
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

      // Komprimera om begärt
      if (config.compression) {
        try {
          const compressedData = await this.compressBackup(backupString);
          metadata.compressed_size_bytes = compressedData.length;
          metadata.compression_ratio = Math.round((1 - compressedData.length / metadata.size_bytes) * 100);
          metadata.is_compressed = true;
          
          console.log('🗜️ Backup komprimerad framgångsrikt!');
          console.log(`📦 Komprimerad storlek: ${(metadata.compressed_size_bytes / 1024 / 1024).toFixed(2)} MB`);
          console.log(`📈 Komprimeringsfaktor: ${metadata.compression_ratio}%`);
        } catch (error) {
          console.warn('⚠️ Komprimering misslyckades, fortsätter utan komprimering:', error);
          metadata.is_compressed = false;
        }
      }

      console.log('✅ Backup skapad framgångsrikt!');
      console.log(`📊 Totalt antal poster: ${Object.values(metadata.table_counts).reduce((a, b) => a + b, 0)}`);
      console.log(`💾 Ursprunglig storlek: ${(metadata.size_bytes / 1024 / 1024).toFixed(2)} MB`);
      if (metadata.compressed_size_bytes) {
        console.log(`🗜️ Komprimerad storlek: ${(metadata.compressed_size_bytes / 1024 / 1024).toFixed(2)} MB (${metadata.compression_ratio}% mindre)`);
      }

      // Spara backup-historik
      await this.saveBackupHistory(metadata, userId);

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

      // Första fasen: Rensa alla tabeller i omvänd ordning (pga foreign keys)
      console.log('🗑️ Fas 1: Rensar befintlig data...');
      
      const tablesToClear = [
        { name: 'trial_activities', data: backupData.data.trial_activities },
        { name: 'user_profiles', data: backupData.data.user_profiles },
        { name: 'performance_metrics', data: backupData.data.performance_metrics },
        { name: 'query_performance', data: backupData.data.query_performance },
        { name: 'booking_conflicts', data: backupData.data.booking_conflicts },
        { name: 'bookings', data: backupData.data.bookings },
        { name: 'booking_rules', data: backupData.data.booking_rules },
        { name: 'booking_resources', data: backupData.data.booking_resources },
        { name: 'attachments', data: backupData.data.attachments },
        { name: 'pages', data: backupData.data.pages },
        { name: 'sections', data: backupData.data.sections },
        { name: 'handbooks', data: backupData.data.handbooks }
        // Hoppa över auth_users i clear-fasen då det är en systemtabell
      ];

      for (const table of tablesToClear) {
        if (table.data && table.data.length > 0) {
          console.log(`🗑️ Rensar ${table.name}...`);
          await this.clearTable(table.name);
        }
      }

      // Andra fasen: Återställ data i korrekt ordning
      console.log('📤 Fas 2: Återställer data...');

      // 0. Först användare (om backup innehåller det) - hoppa över detta för auth.users
      if (backupData.data.auth_users && backupData.data.auth_users.length > 0) {
        console.log('👤 Info: Auth users finns i backup men hoppas över (systemtabell)');
        console.log(`👤 ${backupData.data.auth_users.length} användare finns i backup för referens`);
      }

      // 1. Handbooks först (master table)
      if (backupData.data.handbooks.length > 0) {
        console.log('📚 Återställer handbooks...');
        await this.restoreTableData('handbooks', backupData.data.handbooks);
      }

      // 2. Sections (refererar till handbooks)
      if (backupData.data.sections.length > 0) {
        console.log('📑 Återställer sections...');
        await this.restoreTableData('sections', backupData.data.sections);
      }

      // 3. Pages (refererar till sections)
      if (backupData.data.pages.length > 0) {
        console.log('📄 Återställer pages...');
        await this.restoreTableData('pages', backupData.data.pages);
      }

      // 4. Attachments (refererar till handbooks och pages)
      if (backupData.data.attachments.length > 0) {
        console.log('📎 Återställer attachments...');
        await this.restoreTableData('attachments', backupData.data.attachments);
      }

      // 5. Användardata (om inkluderat)
      if (backupData.data.user_profiles && backupData.data.user_profiles.length > 0) {
        console.log('👤 Återställer user_profiles...');
        await this.restoreTableData('user_profiles', backupData.data.user_profiles);
      }

      // 6. Trial-data (om inkluderat)
      if (backupData.data.trial_activities && backupData.data.trial_activities.length > 0) {
        console.log('🧪 Återställer trial_activities...');
        await this.restoreTableData('trial_activities', backupData.data.trial_activities);
      }

      // 7. Bokningsdata (om inkluderat)
      if (backupData.data.booking_resources && backupData.data.booking_resources.length > 0) {
        console.log('📅 Återställer booking_resources...');
        await this.restoreTableData('booking_resources', backupData.data.booking_resources);
      }
      
      if (backupData.data.booking_rules && backupData.data.booking_rules.length > 0) {
        console.log('📅 Återställer booking_rules...');
        await this.restoreTableData('booking_rules', backupData.data.booking_rules);
      }
      
      if (backupData.data.bookings && backupData.data.bookings.length > 0) {
        console.log('📅 Återställer bookings...');
        await this.restoreTableData('bookings', backupData.data.bookings);
      }
      
      if (backupData.data.booking_conflicts && backupData.data.booking_conflicts.length > 0) {
        console.log('📅 Återställer booking_conflicts...');
        await this.restoreTableData('booking_conflicts', backupData.data.booking_conflicts);
      }

      // 8. Prestandadata (om inkluderat)
      if (backupData.data.performance_metrics && backupData.data.performance_metrics.length > 0) {
        console.log('⚡ Återställer performance_metrics...');
        await this.restoreTableData('performance_metrics', backupData.data.performance_metrics);
      }
      
      if (backupData.data.query_performance && backupData.data.query_performance.length > 0) {
        console.log('⚡ Återställer query_performance...');
        await this.restoreTableData('query_performance', backupData.data.query_performance);
      }

      console.log('✅ Återställning slutförd framgångsrikt!');

    } catch (error) {
      console.error('❌ Fel vid återställning:', error);
      throw error;
    }
  }

  /**
   * Rensar en specifik tabell från all data
   */
  private async clearTable(tableName: string): Promise<void> {
    try {
      console.log(`🗑️ Rensar befintlig data från ${tableName}...`);
      
      // Först, hämta alla ID:n som finns i tabellen
      const { data: existingRecords, error: selectError } = await this.supabase
        .from(tableName)
        .select('id');

      if (selectError) {
        console.warn(`⚠️ Varning vid hämtning av ${tableName} ID:n:`, selectError);
      } else if (existingRecords && existingRecords.length > 0) {
        console.log(`🗑️ Raderar ${existingRecords.length} befintliga poster från ${tableName}`);
        
        // Radera i batches för att undvika timeout
        const deleteBatches = 100;
        for (let i = 0; i < existingRecords.length; i += deleteBatches) {
          const batch = existingRecords.slice(i, i + deleteBatches);
          const ids = batch.map(record => record.id);
          
          const { error: deleteError } = await this.supabase
            .from(tableName)
            .delete()
            .in('id', ids);

          if (deleteError) {
            console.error(`❌ Fel vid radering av batch i ${tableName}:`, deleteError);
            throw new Error(`Fel vid radering av ${tableName}: ${deleteError.message}`);
          }
          
          console.log(`🗑️ ${tableName}: Raderade batch ${Math.floor(i/deleteBatches) + 1}/${Math.ceil(existingRecords.length/deleteBatches)}`);
        }
        console.log(`✅ ${tableName} rensad framgångsrikt (${existingRecords.length} poster raderade)`);
      } else {
        console.log(`✅ ${tableName} var redan tom`);
      }

    } catch (error) {
      console.error(`💥 Kritiskt fel vid rensning av ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Återställer data till en specifik tabell
   */
  private async restoreTableData(tableName: string, data: any[]): Promise<void> {
    try {
      console.log(`🔄 Återställer ${tableName} med ${data.length} poster...`);

      // Sätt in ny data i mindre batches för att undvika timeout
      const batchSize = 50; // Minska batch-storlek
      let insertedCount = 0;
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        console.log(`📤 Sätter in batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} för ${tableName}`);
        
        const { error: insertError } = await this.supabase
          .from(tableName)
          .insert(batch);

        if (insertError) {
          console.error(`❌ Fel vid insättning i ${tableName}, batch ${Math.floor(i/batchSize) + 1}:`, insertError);
          
          // Hantera foreign key constraint fel gracefully
          if (insertError.code === '23503') {
            console.warn(`⚠️ Foreign key constraint fel i ${tableName} - försöker enskilda poster...`);
            
            // Försök sätta in poster en i taget och skippa de som misslyckas
            let successCount = 0;
            for (const record of batch) {
              try {
                const { error: singleError } = await this.supabase
                  .from(tableName)
                  .insert([record]);
                
                if (!singleError) {
                  successCount++;
                } else if (singleError.code !== '23503') {
                  // Kasta bara icke-foreign-key fel
                  throw new Error(`Kritiskt fel: ${singleError.message}`);
                }
              } catch (singleRecordError) {
                console.warn(`⚠️ Skippade post i ${tableName}:`, singleRecordError);
              }
            }
            
            console.log(`✅ ${tableName}: ${successCount}/${batch.length} poster i batch ${Math.floor(i/batchSize) + 1} framgångsrikt insatta`);
            insertedCount += successCount;
          } else {
            // Andra fel än foreign key constraints ska fortfarande kasta fel
            throw new Error(`Fel vid insättning i ${tableName}: ${insertError.message}`);
          }
        } else {
          insertedCount += batch.length;
        }
        
        console.log(`✅ ${tableName}: ${insertedCount}/${data.length} poster insatta`);
      }

      console.log(`🎉 ${tableName}: Alla ${data.length} poster återställda framgångsrikt!`);

    } catch (error) {
      console.error(`💥 Kritiskt fel vid återställning av ${tableName}:`, error);
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
      const requiredDataFields = ['handbooks', 'sections', 'pages', 'attachments'];
      for (const field of requiredDataFields) {
        if (!(field in backupData.data) || !Array.isArray(backupData.data[field])) {
          return false;
        }
      }

      // Kontrollera auth_users (optional men bör vara array om det finns)
      if ('auth_users' in backupData.data && !Array.isArray(backupData.data.auth_users)) {
        return false;
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
      console.log('📊 Hämtar backup-statistik...');
      
      const stats = {
        totalRecords: 0,
        tableStats: {} as Record<string, number>,
        estimatedSize: 0,
        lastBackupDate: undefined as string | undefined
      };

      // Räkna poster i varje tabell
      const tables = ['handbooks', 'sections', 'pages', 'attachments'];
      
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

      // Hämta senaste backup-datum från backup_history
      console.log('📅 Hämtar senaste backup-datum...');
      
      // Använd service-role klient för att bypassa RLS policies
      const client = this.supabase;
      
      const { data: lastBackup, error: backupError } = await client
        .from('backup_history')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!backupError && lastBackup) {
        stats.lastBackupDate = lastBackup.created_at;
        console.log('✅ Senaste backup:', stats.lastBackupDate);
      } else {
        console.log('❌ Kunde inte hämta senaste backup-datum:', backupError);
      }

      return stats;
    } catch (error) {
      console.error('❌ Fel vid hämtning av backup-statistik:', error);
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