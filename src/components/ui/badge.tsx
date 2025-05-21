import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "bg-blue-100 text-blue-800 border-transparent",
        variant === "secondary" && "bg-gray-100 text-gray-800 border-transparent",
        variant === "destructive" && "bg-red-100 text-red-800 border-transparent",
        variant === "outline" && "bg-transparent border-gray-300 text-gray-800",
        className
      )}
      {...props}
    />
  );
} 