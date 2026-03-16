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
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--platform-foreground-subtle))]">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-input))] px-4 py-2 text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-subtle))]',
            'transition-all duration-200',
            'focus:outline-none focus:border-[hsl(var(--platform-primary)/0.5)]',
            'hover:border-[hsl(var(--platform-border))] hover:bg-[hsl(var(--platform-input-focus)/0.5)]',
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
