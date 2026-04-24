import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Platform-scoped checkbox. Reads from `--platform-primary` instead
 * of the global `--primary`, so org theme classes on `<html>` (e.g.
 * `theme-rosewood`) cannot leak pink/magenta into platform UI.
 *
 * Use in any `/platform/*` surface in place of `@/components/ui/checkbox`.
 */
const PlatformCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-[hsl(var(--platform-primary))]',
      'data-[state=checked]:bg-[hsl(var(--platform-primary))] data-[state=checked]:text-[hsl(var(--platform-primary-foreground,0_0%_100%))]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--platform-primary)/0.4)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
PlatformCheckbox.displayName = 'PlatformCheckbox';

export { PlatformCheckbox };
