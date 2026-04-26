import * as React from 'react';
import { cn, formatPhoneNumber } from '@/lib/utils';

export interface PlatformInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const PlatformInput = React.forwardRef<HTMLInputElement, PlatformInputProps>(
  ({ className, type, icon, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === 'tel') {
        const cursorPosition = e.target.selectionStart;
        e.target.value = formatPhoneNumber(e.target.value);
        if (cursorPosition !== null) {
          const newPos = Math.min(cursorPosition, e.target.value.length);
          e.target.setSelectionRange(newPos, newPos);
        }
      }
      onChange?.(e);
    };

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
            // Input shape canon: rectangular rounded-xl, focus = fill-tone shift only.
            // No border-color change on focus, no ring.
            'flex h-10 w-full rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-input))] px-4 py-2 text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-subtle))]',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:outline-none focus:bg-[hsl(var(--platform-input-focus))] focus-visible:bg-[hsl(var(--platform-input-focus))]',
            'hover:bg-[hsl(var(--platform-input-focus)/0.5)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            icon && 'pl-10',
            className
          )}
          ref={ref}
          onChange={handleChange}
          onWheel={type === 'number' ? (e) => e.currentTarget.blur() : undefined}
          {...props}
        />
      </div>
    );
  }
);
PlatformInput.displayName = 'PlatformInput';

export { PlatformInput };
