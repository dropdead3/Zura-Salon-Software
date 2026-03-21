import * as React from 'react';
import { cn } from '@/lib/utils';

interface PlatformCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'interactive';
  size?: 'lg' | 'md' | 'sm';
  glow?: boolean;
}

const PlatformCard = React.forwardRef<HTMLDivElement, PlatformCardProps>(
  ({ className, variant = 'default', size = 'lg', glow = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.5)]',
      glass: 'platform-glass',
      elevated: 'bg-[hsl(var(--platform-bg-card)/0.8)] border-[hsl(var(--platform-border)/0.6)] shadow-xl',
      interactive: 'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.5)] platform-card-hover transition-all duration-300',
    };

    const radii = {
      lg: 'rounded-2xl',
      md: 'rounded-xl',
      sm: 'rounded-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          radii[size], 'border backdrop-blur-xl',
          variants[variant],
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
      className={cn('flex flex-col space-y-1.5 p-6', className)}
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
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
PlatformCardContent.displayName = 'PlatformCardContent';

interface PlatformCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const PlatformCardFooter = React.forwardRef<HTMLDivElement, PlatformCardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
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
