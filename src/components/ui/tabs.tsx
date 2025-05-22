"use client"

import * as React from "react"

// Tab context
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs component")
  }
  return context
}

// Tabs
interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`tabs ${className || ""}`}>{children}</div>
    </TabsContext.Provider>
  )
}

// TabsList
interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <div 
      className={`flex gap-2 border-b ${className || ""}`} 
      role="tablist"
      {...props}
    >
      {children}
    </div>
  )
}

// TabsTrigger
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabs()
  const isSelected = selectedValue === value

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isSelected}
      className={`px-3 py-2 text-sm font-medium transition-all border-b-2 ${
        isSelected 
          ? "border-blue-500 text-blue-700" 
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      } ${className || ""}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

// TabsContent
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className, ...props }: TabsContentProps) {
  const { value: selectedValue } = useTabs()
  const isSelected = selectedValue === value

  if (!isSelected) return null

  return (
    <div
      role="tabpanel"
      className={`mt-2 ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  )
} 