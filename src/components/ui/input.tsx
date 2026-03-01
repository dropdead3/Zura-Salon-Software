import * as React from "react";

import { cn } from "@/lib/utils";

// Capitalize first letter of text
const capitalizeFirst = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, autoCapitalize, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only apply capitalization to text inputs (not email, password, number, etc.)
      // Skip if autoCapitalize is explicitly set to "none" or "off"
      if ((type === 'text' || type === undefined) && autoCapitalize !== 'none' && autoCapitalize !== 'off') {
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
          "flex h-10 w-full rounded-full border border-input bg-background px-4 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/30 transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
