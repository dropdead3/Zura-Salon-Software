import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/80 backdrop-blur-md text-primary-foreground border border-primary/20 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-primary/90",
        secondary: "bg-secondary/80 backdrop-blur-md text-secondary-foreground border border-border/50 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-secondary/90",
        destructive: "bg-destructive/80 backdrop-blur-md text-destructive-foreground border border-destructive/20 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-destructive/90",
        outline: "bg-background/50 backdrop-blur-md text-foreground border border-border/50 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-background/80",
        glass: "bg-white/10 backdrop-blur-xl text-foreground border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/15",
        "glass-dark": "bg-foreground/10 backdrop-blur-xl text-background border border-foreground/20 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-foreground/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

// forwardRef so Badge is safe to use inside Slot/asChild parents (e.g. Button asChild,
// TooltipTrigger asChild, DropdownMenuTrigger asChild). Without this, React warns
// "Function components cannot be given refs" whenever a Slot parent forwards its ref.
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
