import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";

export default function SignupLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
} 