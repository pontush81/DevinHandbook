import { AuthProvider } from "@/contexts/AuthContext";

// Temporärt inaktiverad metadata-funktion
// export async function generateMetadata({ params }: { params: { subdomain: string }}): Promise<Metadata> {
//   return {
//     title: `Handbok`,
//     description: `Digital handbok`,
//   };
// }

// Extremt förenklad layout som ignorerar subdomän
export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Temporärt ignorera subdomain
  return <AuthProvider>{children}</AuthProvider>;
} 