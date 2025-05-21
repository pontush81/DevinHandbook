import Link from 'next/link';
import ContactClient from './ContactClient';
import { MainLayout } from '@/components/layout/MainLayout';

export default function ContactPage() {
  return (
    <MainLayout variant="landing">
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ContactClient />
        </div>
      </div>
    </MainLayout>
  );
} 