import * as React from "react";

import { cn } from "@/lib/utils";

// Capitalize first letter of text
const capitalizeFirst = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, onChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const cursorPosition = e.target.selectionStart;
    e.target.value = capitalizeFirst(e.target.value);
    // Restore cursor position
    if (cursorPosition !== null) {
      e.target.setSelectionRange(cursorPosition, cursorPosition);
    }
    onChange?.(e);
  };

  return (
    <textarea
      className={cn(
        // Input shape canon: rectangular rounded-xl, focus = fill-tone shift only.
        "flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:bg-muted/60 focus-visible:bg-muted/60 dark:focus:bg-white/[0.04] dark:focus-visible:bg-white/[0.04] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      onChange={handleChange}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
