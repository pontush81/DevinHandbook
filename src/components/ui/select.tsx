import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Select({ value, onValueChange, children, className }: SelectProps) {
  return (
    <div className={cn("relative", className)}>{children}</div>
  );
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SelectTrigger({ children, className, onClick }: SelectTriggerProps) {
  return (
    <button type="button" className={cn("w-full px-3 py-2 border rounded bg-white text-left", className)} onClick={onClick}>
      {children}
    </button>
  );
}

interface SelectValueProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectValue({ children, className }: SelectValueProps) {
  return <span className={cn("", className)}>{children}</span>;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className }: SelectContentProps) {
  return <div className={cn("absolute left-0 right-0 mt-1 bg-white border rounded shadow z-10", className)}>{children}</div>;
}

interface SelectItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SelectItem({ children, className, onClick }: SelectItemProps) {
  return (
    <div className={cn("px-3 py-2 hover:bg-gray-100 cursor-pointer", className)} onClick={onClick}>
      {children}
    </div>
  );
} 