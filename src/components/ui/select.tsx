import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  placeholder?: string;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

const useSelectContext = () => {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a Select provider");
  }
  return context;
};

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Select({ value, onValueChange, children, className, disabled = false }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const contextValue: SelectContextType = {
    value,
    onValueChange,
    isOpen: isOpen && !disabled,
    setIsOpen: disabled ? () => {} : setIsOpen,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={selectRef} className={cn("relative", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SelectTrigger({ children, className, disabled = false }: SelectTriggerProps) {
  const { isOpen, setIsOpen } = useSelectContext();

  const handleClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <button 
      type="button" 
      className={cn(
        "flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )} 
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
      <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", isOpen && "transform rotate-180")} />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function SelectValue({ placeholder = "Välj...", className }: SelectValueProps) {
  const { value } = useSelectContext();
  const [selectedLabel, setSelectedLabel] = React.useState<string>("");

  // Find the selected option label from the SelectItems
  React.useEffect(() => {
    const selectElement = document.querySelector(`[data-select-value="${value}"]`);
    if (selectElement) {
      setSelectedLabel(selectElement.textContent || "");
    } else {
      setSelectedLabel("");
    }
  }, [value]);

  return (
    <span className={cn("block truncate", !selectedLabel && "text-gray-400", className)}>
      {selectedLabel || placeholder}
    </span>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className }: SelectContentProps) {
  const { isOpen } = useSelectContext();

  if (!isOpen) return null;

  return (
    <div className={cn(
      "absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg",
      className
    )}>
      {children}
    </div>
  );
}

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export function SelectItem({ children, value, className, disabled = false }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setIsOpen } = useSelectContext();
  const isSelected = selectedValue === value;

  const handleClick = () => {
    if (!disabled) {
      onValueChange(value);
      setIsOpen(false);
    }
  };

  return (
    <div 
      data-select-value={value}
      className={cn(
        "relative cursor-pointer select-none px-3 py-2 text-sm",
        isSelected && "bg-blue-100 text-blue-900",
        !isSelected && !disabled && "hover:bg-gray-100",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )} 
      onClick={handleClick}
    >
      {children}
    </div>
  );
} 