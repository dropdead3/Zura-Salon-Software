import * as React from "react";

import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /**
   * Applies `hover-lift` for clickable cards.
   * If omitted, Card will infer interactivity from `onClick` or `cursor-pointer` in className.
   */
  interactive?: boolean;
  /**
   * Applies `card-glow` for feature cards.
   * If omitted, Card will infer glow from common feature classnames (e.g. `premium-card`).
   */
  glow?: boolean;
  /**
   * Material tier (Apple-style vibrancy hierarchy):
   * - 'glass' (default): translucent + backdrop blur. Top-level page containers, hero KPIs.
   * - 'solid': opaque bg-card. Nested cards inside a glass parent.
   * - 'flat': bg-muted/40. Tertiary list rows, breakdown items, stat chips.
   */
  material?: 'glass' | 'solid' | 'flat';
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, glow, material = 'glass', ...props }, ref) => {
    const inferredInteractive =
      interactive ??
      (!!props.onClick ||
        (typeof className === 'string' && className.includes('cursor-pointer')));
    const inferredGlow =
      glow ?? (typeof className === 'string' && (className.includes('premium-card') || className.includes('feature-card')));

    // Step 1C: non-glass tiers get --elevation-1 resting shadow.
    // Glass tier already inherits elevation-1 via .premium-surface.
    const materialClass =
      material === 'solid'
        ? 'bg-card text-card-foreground elevation-1'
        : material === 'flat'
          ? 'bg-muted/40 text-card-foreground border-border/40'
          : 'bg-card text-card-foreground premium-surface';

    return (
      <div
        ref={ref}
        className={cn(
          // Premium material: rounded glass + specular top-edge stroke (Wave 1 depth)
          'rounded-xl border',
          materialClass,
          inferredInteractive && 'hover-lift',
          inferredGlow && 'card-glow',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
