import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const platformBadgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-slate-700/60 text-slate-300 border border-slate-600/50',
        primary: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
        secondary: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        error: 'bg-red-500/20 text-red-300 border border-red-500/30',
        info: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        outline: 'border border-slate-600/50 text-slate-400',
        glow: 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm shadow-violet-500/20',
      },
      size: {
        default: 'text-xs px-2.5 py-0.5 rounded-[10px]',
        sm: 'text-[10px] px-2 py-0.5 rounded-full',
        lg: 'text-sm px-3 py-1 rounded-[10px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface PlatformBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof platformBadgeVariants> {}

function PlatformBadge({ className, variant, size, ...props }: PlatformBadgeProps) {
  return (
    <div className={cn(platformBadgeVariants({ variant, size }), className)} {...props} />
  );
}

export { PlatformBadge, platformBadgeVariants };
