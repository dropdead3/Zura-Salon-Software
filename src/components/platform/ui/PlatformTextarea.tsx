import * as React from 'react';
import { cn } from '@/lib/utils';
// eslint-disable-next-line no-restricted-imports -- Platform* wrapper file legitimately re-styles the raw Textarea primitive.
import { Textarea, type TextareaProps } from '@/components/ui/textarea';

const PlatformTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <Textarea
      ref={ref}
      className={cn(
        // Input shape canon: textareas use rounded-2xl (deliberate exception
        // to the pill canon — multi-line content needs corners).
        // Focus = fill-tone shift only (no border-color change).
        'rounded-2xl bg-[hsl(var(--platform-input))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-subtle))]',
        'focus:bg-[hsl(var(--platform-input-focus))] focus-visible:bg-[hsl(var(--platform-input-focus))]',
        className,
      )}
      {...props}
    />
  ),
);
PlatformTextarea.displayName = 'PlatformTextarea';

export { PlatformTextarea };
