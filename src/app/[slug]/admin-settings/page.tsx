import { redirect } from 'next/navigation';

interface AdminSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  const { slug } = await params;
  
  // Redirect to new unified settings page
  redirect(`/${slug}/settings`);
} 