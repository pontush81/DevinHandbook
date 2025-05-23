import { AuthProvider } from "@/contexts/AuthContext";

export default function HandbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
} 