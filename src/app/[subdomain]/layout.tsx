import { AuthProvider } from "@/contexts/AuthContext";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
} 