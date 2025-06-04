"use client"

import * as React from "react"

// Card
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg bg-white shadow-sm ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  )
}

// CardHeader
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  )
}

// CardTitle
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3
      className={`text-lg font-semibold ${className || ""}`}
      {...props}
    >
      {children}
    </h3>
  )
}

// CardDescription
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={`text-sm text-gray-500 ${className || ""}`}
      {...props}
    >
      {children}
    </p>
  )
}

// CardContent
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div
      className={`p-6 pt-0 ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  )
}

// CardFooter
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div
      className={`flex items-center p-6 pt-0 ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  )
}
