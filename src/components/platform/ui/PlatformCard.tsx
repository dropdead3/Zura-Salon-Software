import * as React from 'react';
import { cn } from '@/lib/utils';
import { platformBento } from '@/lib/platform-bento-tokens';

interface PlatformCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'interactive';
  size?: 'container' | 'lg' | 'md' | 'sm';
  nested?: boolean;
  glow?: boolean;
}

const PlatformCard = React.forwardRef<HTMLDivElement, PlatformCardProps>(
  ({ className, variant = 'default', size = 'lg', nested = false, glow = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.5)]',
      glass: 'platform-glass',
      elevated: 'bg-[hsl(var(--platform-bg-card)/0.8)] border-[hsl(var(--platform-border)/0.6)]',
      interactive: 'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.5)] platform-card-hover',
    };

    const radii = {
      container: platformBento.radius.container,
      lg: platformBento.radius.large,
      md: platformBento.radius.medium,
      sm: platformBento.radius.small,
    };

    const shadows = {
      container: platformBento.shadow.large,
      lg: platformBento.shadow.large,
      md: platformBento.shadow.medium,
      sm: platformBento.shadow.none,
    };

    // nested prop forces inner-card radius (12px) regardless of size
    const resolvedRadius = nested ? platformBento.radius.small : radii[size];
    const resolvedShadow = nested ? platformBento.shadow.none : shadows[size];

    return (
      <div
        ref={ref}
        className={cn(
          resolvedRadius, 'border backdrop-blur-xl',
          platformBento.hover.transition,
          variants[variant],
          resolvedShadow,
          variant === 'interactive' && platformBento.hover.lift,
          glow && 'platform-glow-sm',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PlatformCard.displayName = 'PlatformCard';

interface PlatformCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const PlatformCardHeader = React.forwardRef<HTMLDivElement, PlatformCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-5', className)}
      {...props}
    />
  )
);
PlatformCardHeader.displayName = 'PlatformCardHeader';

interface PlatformCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const PlatformCardTitle = React.forwardRef<HTMLHeadingElement, PlatformCardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-xl font-medium leading-none tracking-tight text-[hsl(var(--platform-foreground))]',
        className
      )}
      {...props}
    />
  )
);
PlatformCardTitle.displayName = 'PlatformCardTitle';

interface PlatformCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const PlatformCardDescription = React.forwardRef<HTMLParagraphElement, PlatformCardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[hsl(var(--platform-foreground-muted))]', className)}
      {...props}
    />
  )
);
PlatformCardDescription.displayName = 'PlatformCardDescription';

interface PlatformCardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const PlatformCardContent = React.forwardRef<HTMLDivElement, PlatformCardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  )
);
PlatformCardContent.displayName = 'PlatformCardContent';

interface PlatformCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const PlatformCardFooter = React.forwardRef<HTMLDivElement, PlatformCardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-5 pt-0', className)}
      {...props}
    />
  )
);
PlatformCardFooter.displayName = 'PlatformCardFooter';

export {
  PlatformCard,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
  PlatformCardContent,
  PlatformCardFooter,
};
