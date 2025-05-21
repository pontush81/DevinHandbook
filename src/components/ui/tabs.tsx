import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn("w-full", className)}>{children}</div>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn("flex border-b", className)} role="tablist">
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TabsTrigger({ value, children, className, onClick }: TabsTriggerProps) {
  return (
    <button
      className={cn(
        "flex-1 py-2 px-4 text-sm font-medium text-gray-700 border-b-2 border-transparent hover:text-blue-600 focus:outline-none transition-colors",
        className
      )}
      role="tab"
      aria-selected={false}
      tabIndex={0}
      onClick={onClick}
      data-value={value}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  return (
    <div className={cn("py-4", className)} role="tabpanel" data-value={value}>
      {children}
    </div>
  );
} 