import * as React from 'react';
import { cn } from '@/lib/utils';
// eslint-disable-next-line no-restricted-imports -- Platform* wrapper file legitimately re-styles the raw Textarea primitive.
import { Textarea, type TextareaProps } from '@/components/ui/textarea';

const PlatformTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <Textarea
      ref={ref}
      className={cn(
        'bg-[hsl(var(--platform-input))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-subtle))] focus-visible:border-[hsl(var(--platform-primary)/0.5)]',
        className,
      )}
      {...props}
    />
  ),
);
PlatformTextarea.displayName = 'PlatformTextarea';

export { PlatformTextarea };
