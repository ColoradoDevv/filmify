/**
 * MD3 Button — 5 variants mapped to Material Design 3 button types:
 *   filled        → default  (primary container, highest emphasis)
 *   tonal         → secondary (secondary container, medium emphasis)
 *   outlined      → outline  (border only, medium emphasis)
 *   text          → ghost    (no container, lowest emphasis)
 *   elevated      → elevated (surface + shadow, medium emphasis)
 *   destructive   → destructive
 *   link          → link
 *
 * Sizes follow MD3 button height spec: default = 40px, sm = 32px, lg = 48px
 */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base — MD3 button shape (full pill = rounded-full), label-large type
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-full",                          // MD3 full shape
    "text-[0.875rem] leading-[1.25rem] tracking-[0.00625rem] font-medium", // label-large
    "transition-all duration-200",
    "disabled:pointer-events-none disabled:opacity-38",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    // MD3 state layer via pseudo-element
    "relative overflow-hidden",
    "after:absolute after:inset-0 after:rounded-[inherit] after:bg-current after:opacity-0",
    "hover:after:opacity-[0.08] active:after:opacity-[0.12]",
    "after:transition-opacity after:pointer-events-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // Filled — highest emphasis
        default:
          "bg-primary text-on-primary shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)]",
        // Filled tonal — secondary container
        secondary:
          "bg-secondary-container text-on-secondary-container hover:shadow-[var(--shadow-1)]",
        // Elevated — surface + elevation 1
        elevated:
          "elevation-1 text-primary hover:elevation-2",
        // Outlined — border, no fill
        outline:
          "border border-outline bg-transparent text-primary hover:bg-primary/8",
        // Text — no container
        ghost:
          "bg-transparent text-primary hover:bg-primary/8",
        // Destructive
        destructive:
          "bg-error-container text-on-error-container hover:shadow-[var(--shadow-1)]",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-6 py-2.5",   // MD3 standard 40px
        sm:      "h-8 px-4 py-1.5 text-[0.75rem] tracking-[0.03125rem]",  // 32px
        lg:      "h-12 px-8 py-3",     // 48px
        icon:    "h-10 w-10 p-0",      // icon button
        "icon-sm": "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
