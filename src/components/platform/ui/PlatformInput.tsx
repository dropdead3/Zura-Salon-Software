import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PlatformInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const PlatformInput = React.forwardRef<HTMLInputElement, PlatformInputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm text-white placeholder:text-slate-500',
            'transition-all duration-200',
            'focus:outline-none focus:border-violet-500/50',
            'hover:border-slate-600/50 hover:bg-slate-800/70',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            icon && 'pl-10',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
PlatformInput.displayName = 'PlatformInput';

export { PlatformInput };
