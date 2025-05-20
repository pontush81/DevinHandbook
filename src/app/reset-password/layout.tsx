import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
} 