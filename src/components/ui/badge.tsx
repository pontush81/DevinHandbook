"use client"

import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "destructive";
  children?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variantClasses = {
      default: "bg-blue-100 text-blue-800",
      outline: "border border-gray-300 text-gray-800",
      destructive: "bg-red-100 text-red-800",
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${variantClasses[variant]} ${className || ""}`}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = "Badge" 