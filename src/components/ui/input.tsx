import * as React from "react";

import { cn, formatPhoneNumber } from "@/lib/utils";

// Capitalize first letter of text
const capitalizeFirst = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, autoCapitalize, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Auto-format phone numbers for tel inputs
      if (type === 'tel') {
        const cursorPosition = e.target.selectionStart;
        e.target.value = formatPhoneNumber(e.target.value);
        // Restore cursor position
        if (cursorPosition !== null) {
          const newPos = Math.min(cursorPosition, e.target.value.length);
          e.target.setSelectionRange(newPos, newPos);
        }
      }
      // Only apply capitalization to text inputs (not email, password, number, etc.)
      // Skip if autoCapitalize is explicitly set to "none" or "off"
      else if ((type === 'text' || type === undefined) && autoCapitalize !== 'none' && autoCapitalize !== 'off') {
        const cursorPosition = e.target.selectionStart;
        e.target.value = capitalizeFirst(e.target.value);
        // Restore cursor position
        if (cursorPosition !== null) {
          e.target.setSelectionRange(cursorPosition, cursorPosition);
        }
      }
      onChange?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          // Input shape canon: PILL (rounded-full). Focus = fill-tone shift only.
          // Shape, border color, and ring are immutable on focus.
          "flex h-10 w-full rounded-full border border-input bg-background px-5 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:bg-muted/60 focus-visible:bg-muted/60 dark:focus:bg-white/[0.04] dark:focus-visible:bg-white/[0.04] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        onWheel={type === 'number' ? (e) => e.currentTarget.blur() : undefined}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
