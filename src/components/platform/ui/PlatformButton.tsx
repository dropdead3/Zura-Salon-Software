import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const platformButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/40 rounded-xl',
        secondary:
          'bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border))] rounded-xl',
        outline:
          'border border-[hsl(var(--platform-border))] bg-transparent text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-bg-hover))] hover:text-[hsl(var(--platform-foreground))] hover:border-[hsl(var(--platform-border-glow)/0.5)] rounded-xl',
        ghost:
          'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-hover))] rounded-xl',
        destructive:
          'bg-red-600/80 text-white hover:bg-red-500/80 shadow-lg shadow-red-500/20 rounded-xl',
        link:
          'text-[hsl(var(--platform-primary))] underline-offset-4 hover:underline hover:text-[hsl(var(--platform-primary-hover))]',
        glow:
          'bg-gradient-to-r from-violet-600 to-purple-600 text-white platform-button-glow hover:from-violet-500 hover:to-purple-500 rounded-xl',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8 text-base rounded-[14px]',
        xl: 'h-14 px-10 text-lg rounded-[14px]',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface PlatformButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof platformButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const PlatformButton = React.forwardRef<HTMLButtonElement, PlatformButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(platformButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
PlatformButton.displayName = 'PlatformButton';

export { PlatformButton, platformButtonVariants };
