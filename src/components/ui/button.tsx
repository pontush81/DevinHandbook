"use client"

import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = "default", 
    size = "default", 
    children, 
    ...props 
  }, ref) => {
    const variantClasses = {
      default: "bg-black text-white hover:bg-gray-800",
      outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
      ghost: "text-gray-700 hover:bg-gray-100",
      link: "text-blue-500 underline-offset-4 hover:underline",
    }

    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6 text-lg",
    }

    // Används för att säkerställa att alla länkar inuti knappen har samma textfärg
    const wrappedChildren = React.Children.map(children, child => {
      // Om det är en anchor tag, säkerställ att den har rätt textfärg
      if (React.isValidElement(child) && typeof child.type === 'string' && child.type === 'a') {
        return React.cloneElement(child as React.ReactElement, {
          className: `text-inherit ${child.props.className || ''}`
        });
      }
      return child;
    });

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className || ""}`}
        {...props}
      >
        {wrappedChildren}
      </button>
    )
  }
)

Button.displayName = "Button"
