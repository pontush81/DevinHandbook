"use client"

import * as React from "react"

// Context för sheet-state
interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | undefined>(undefined)

function useSheet() {
  const context = React.useContext(SheetContext)
  if (!context) {
    throw new Error("Sheet components must be used within a Sheet component")
  }
  return context
}

// Root Sheet component
interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sheet({ children, open, onOpenChange }: SheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  
  const handleOpenChange = React.useCallback((value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value)
    }
    onOpenChange?.(value)
  }, [isControlled, onOpenChange])
  
  return (
    <SheetContext.Provider value={{ open: isOpen, setOpen: handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

// Sheet trigger
interface SheetTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function SheetTrigger({ children, asChild = false }: SheetTriggerProps) {
  const { setOpen } = useSheet()
  
  const Comp = asChild ? React.cloneElement(children as React.ReactElement, {
    onClick: () => setOpen(true)
  }) : (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  )
  
  return Comp
}

// Sheet content
interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function SheetContent({ 
  children, 
  className = "", 
  side = "right",
  ...props 
}: SheetContentProps) {
  const { open, setOpen } = useSheet()
  
  // Om inte öppen, rendrera ingenting
  if (!open) return null
  
  // Positionering baserat på side
  const sideStyles = {
    right: "fixed inset-y-0 right-0 w-3/4 max-w-sm h-full",
    left: "fixed inset-y-0 left-0 w-3/4 max-w-sm h-full",
    top: "fixed inset-x-0 top-0 h-auto",
    bottom: "fixed inset-x-0 bottom-0 h-auto",
  }
  
  // Stäng när man klickar utanför
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [setOpen])
  
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-50 bg-black/50" 
        onClick={() => setOpen(false)}
      />
      
      {/* Content */}
      <div
        className={`bg-white z-50 flex flex-col shadow-lg ${sideStyles[side]} ${className}`}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
        <button
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
          onClick={() => setOpen(false)}
        >
          <span className="sr-only">Close</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </>
  )
}

// Sheet header
export function SheetHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col space-y-2 p-4 ${className}`}
      {...props}
    />
  )
}

// Sheet footer
export function SheetFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mt-auto flex flex-col space-y-2 p-4 ${className}`}
      {...props}
    />
  )
}

// Sheet title
export function SheetTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-semibold ${className}`}
      {...props}
    />
  )
}

// Sheet description
export function SheetDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm text-gray-500 ${className}`}
      {...props}
    />
  )
}

// For backward compatibility
export const SheetClose = SheetTrigger
