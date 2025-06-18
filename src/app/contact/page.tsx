import Link from 'next/link';
import ContactClient from './ContactClient';
import { MainLayout } from '@/components/layout/MainLayout';

export default function ContactPage() {
  return (
    <MainLayout variant="landing">
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <ContactClient />
        </div>
      </div>
    </MainLayout>
  );
} 