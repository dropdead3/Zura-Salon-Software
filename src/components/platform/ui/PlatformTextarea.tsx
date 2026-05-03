import * as React from 'react';
import { cn } from '@/lib/utils';
// eslint-disable-next-line no-restricted-imports -- Platform* wrapper file legitimately re-styles the raw Textarea primitive.
import { Textarea, type TextareaProps } from '@/components/ui/textarea';

const PlatformTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <Textarea
      ref={ref}
      className={cn(
        // Input shape canon: textareas are square-ish with slightly rounded
        // corners (rounded-lg / 8px) — deliberately tighter than single-line
        // pill inputs so multi-line fields read as containers, not lozenges.
        // Do NOT raise to rounded-xl/2xl/3xl/full. Enforced by ESLint
        // doctrine `multilineInputRadiusCanon`.
        'rounded-lg bg-[hsl(var(--platform-input))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-subtle))]',
        'focus:bg-[hsl(var(--platform-input-focus))] focus-visible:bg-[hsl(var(--platform-input-focus))]',
        className,
      )}
      {...props}
    />
  ),
);
PlatformTextarea.displayName = 'PlatformTextarea';

export { PlatformTextarea };
