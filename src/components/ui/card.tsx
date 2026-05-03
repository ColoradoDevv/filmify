/**
 * MD3 Card — 3 variants:
 *   elevated  → surface + shadow-1 (default)
 *   filled    → surface-container-highest, no shadow
 *   outlined  → surface + border outline-variant
 */
import * as React from "react"
import { cn } from "@/lib/utils"

/* ── Card container ─────────────────────────────────────────────────────── */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "elevated" | "filled" | "outlined" }
>(({ className, variant = "elevated", ...props }, ref) => {
  const variantClass = {
    elevated: "elevation-1 hover:elevation-2",
    filled:   "bg-surface-container-highest",
    outlined: "bg-surface border border-outline-variant",
  }[variant]

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-lg)] text-on-surface transition-shadow duration-200",
        variantClass,
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

/* ── Card Header ────────────────────────────────────────────────────────── */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1 p-4 pb-0", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

/* ── Card Title — MD3 title-large ───────────────────────────────────────── */
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-[1.375rem] leading-[1.75rem] tracking-0 font-medium text-on-surface",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

/* ── Card Description — MD3 body-medium ─────────────────────────────────── */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-[0.875rem] leading-[1.25rem] tracking-[0.015625rem] text-on-surface-variant",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

/* ── Card Content ───────────────────────────────────────────────────────── */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-3", className)} {...props} />
))
CardContent.displayName = "CardContent"

/* ── Card Footer ────────────────────────────────────────────────────────── */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2 p-4 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
