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
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, glow, ...props }, ref) => {
    const inferredInteractive =
      interactive ??
      (!!props.onClick ||
        (typeof className === 'string' && className.includes('cursor-pointer')));
    const inferredGlow =
      glow ?? (typeof className === 'string' && (className.includes('premium-card') || className.includes('feature-card')));

    return (
      <div
        ref={ref}
        className={cn(
          // Premium material: rounded glass + specular top-edge stroke (Wave 1 depth)
          "rounded-xl border bg-card text-card-foreground premium-surface",
          inferredInteractive && "hover-lift",
          inferredGlow && "card-glow",
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
