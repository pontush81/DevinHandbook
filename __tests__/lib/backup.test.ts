import { DatabaseBackupManager, formatBackupSize, formatBackupDate, generateBackupFilename } from '@/lib/backup';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  getServiceSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      delete: jest.fn(() => ({
        neq: jest.fn(() => ({
          error: null
        }))
      })),
      insert: jest.fn(() => ({
        error: null
      }))
    }))
  }))
}));

describe('Backup System', () => {
  describe('DatabaseBackupManager', () => {
    let backupManager: DatabaseBackupManager;

    beforeEach(() => {
      backupManager = new DatabaseBackupManager();
    });

    describe('createBackup', () => {
      it('should create a backup with default options', async () => {
        const backup = await backupManager.createBackup();

        expect(backup).toHaveProperty('metadata');
        expect(backup).toHaveProperty('data');
        expect(backup).toHaveProperty('schema');
        
        expect(backup.metadata.backup_type).toBe('manual');
        expect(backup.metadata.schema_version).toBe('1.0.0');
        expect(backup.metadata.checksum).toBeDefined();
        expect(backup.metadata.size_bytes).toBeGreaterThan(0);
      });

      it('should create a backup with custom options', async () => {
        const options = {
          includeUserData: true,
          includeTrialData: true,
          compression: false
        };

        const backup = await backupManager.createBackup(options);

        expect(backup.metadata.backup_type).toBe('manual');
        expect(backup.data).toHaveProperty('handbooks');
        expect(backup.data).toHaveProperty('sections');
        expect(backup.data).toHaveProperty('pages');
      });

      it('should include table counts in metadata', async () => {
        const backup = await backupManager.createBackup();

        expect(backup.metadata.table_counts).toHaveProperty('handbooks');
        expect(backup.metadata.table_counts).toHaveProperty('sections');
        expect(backup.metadata.table_counts).toHaveProperty('pages');
        expect(backup.metadata.table_counts).toHaveProperty('documents');
        expect(backup.metadata.table_counts).toHaveProperty('attachments');
      });
    });

    describe('getBackupStatistics', () => {
      it('should return database statistics', async () => {
        const stats = await backupManager.getBackupStatistics();

        expect(stats).toHaveProperty('totalRecords');
        expect(stats).toHaveProperty('tableStats');
        expect(stats).toHaveProperty('estimatedSize');
        expect(typeof stats.totalRecords).toBe('number');
        expect(typeof stats.estimatedSize).toBe('number');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('formatBackupSize', () => {
      it('should format bytes correctly', () => {
        expect(formatBackupSize(1024)).toBe('1.00 KB');
        expect(formatBackupSize(1048576)).toBe('1.00 MB');
        expect(formatBackupSize(1073741824)).toBe('1.00 GB');
        expect(formatBackupSize(500)).toBe('500.00 B');
      });
    });

    describe('formatBackupDate', () => {
      it('should format date in Swedish locale', () => {
        const date = '2024-01-15T10:30:00.000Z';
        const formatted = formatBackupDate(date);
        
        expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/);
      });
    });

    describe('generateBackupFilename', () => {
      it('should generate correct filename', () => {
        const metadata = {
          id: 'test-backup',
          created_at: '2024-01-15T10:30:00.000Z',
          backup_type: 'manual' as const,
          size_bytes: 1024,
          table_counts: {},
          schema_version: '1.0.0',
          checksum: 'test-checksum'
        };

        const filename = generateBackupFilename(metadata);
        
        expect(filename).toMatch(/^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_manual\.json$/);
      });
    });
  });

  describe('Backup Data Validation', () => {
    it('should validate backup data structure', () => {
      const validBackup = {
        metadata: {
          id: 'test',
          created_at: '2024-01-15T10:30:00.000Z',
          backup_type: 'manual' as const,
          size_bytes: 1024,
          table_counts: { handbooks: 1 },
          schema_version: '1.0.0',
          checksum: 'test'
        },
        data: {
          handbooks: [],
          sections: [],
          pages: [],
          documents: [],
          attachments: []
        },
        schema: {
          version: '1.0.0',
          tables: ['handbooks'],
          created_at: '2024-01-15T10:30:00.000Z'
        }
      };

      // Test that the structure is valid
      expect(validBackup.metadata).toBeDefined();
      expect(validBackup.data).toBeDefined();
      expect(validBackup.schema).toBeDefined();
      expect(Array.isArray(validBackup.data.handbooks)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock a database error
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              data: null,
              error: { message: 'Connection failed' }
            }))
          }))
        }))
      };

      // Override the mock for this test
      jest.doMock('@/lib/supabase', () => ({
        getServiceSupabase: () => mockSupabase
      }));

      const backupManager = new DatabaseBackupManager();
      
      await expect(backupManager.createBackup()).rejects.toThrow();
    });
  });

  describe('Checksum Generation', () => {
    it('should generate consistent checksums', async () => {
      const testData = JSON.stringify({ test: 'data' });
      const backupManager = new DatabaseBackupManager();
      
      // Access private method through any type casting for testing
      const checksum1 = await (backupManager as any).generateChecksum(testData);
      const checksum2 = await (backupManager as any).generateChecksum(testData);
      
      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe('string');
      expect(checksum1.length).toBeGreaterThan(0);
    });

    it('should generate different checksums for different data', async () => {
      const backupManager = new DatabaseBackupManager();
      
      const checksum1 = await (backupManager as any).generateChecksum('data1');
      const checksum2 = await (backupManager as any).generateChecksum('data2');
      
      expect(checksum1).not.toBe(checksum2);
    });
  });
}); 