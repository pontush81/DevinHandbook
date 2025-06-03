import { Metadata } from 'next';
import BackupManager from '@/components/admin/BackupManager';

export const metadata: Metadata = {
  title: 'Backup-hantering | Admin',
  description: 'Hantera databas-backups och återställning',
};

export default function BackupPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Backup-hantering
          </h1>
          <p className="text-gray-600">
            Skapa, hantera och återställ databas-backups för att säkerställa datasäkerhet.
          </p>
        </div>

        <BackupManager />
      </div>
    </div>
  );
} 