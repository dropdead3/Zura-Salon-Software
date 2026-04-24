import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

/**
 * Platform-scoped switch. Reads from `--platform-primary` and
 * `--platform-border` instead of global `--primary` / `--muted`,
 * preventing org theme leakage into the platform admin layer.
 *
 * Use in any `/platform/*` surface in place of `@/components/ui/switch`.
 */
const PlatformSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--platform-primary)/0.4)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[hsl(var(--platform-primary))] data-[state=unchecked]:bg-[hsl(var(--platform-border)/0.5)]',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
        'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
      )}
    />
  </SwitchPrimitives.Root>
));
PlatformSwitch.displayName = 'PlatformSwitch';

export { PlatformSwitch };
