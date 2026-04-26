import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { platformBento } from '@/lib/platform-bento-tokens';

// Re-export base primitives that don't need restyling
export {
  Root as Select,
  Group as SelectGroup,
  Value as SelectValue,
  Separator as SelectSeparator,
} from '@radix-ui/react-select';

const PlatformSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // Input shape canon: rectangular rounded-xl, focus = fill-tone shift only.
      'flex h-10 w-full items-center justify-between rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-input))] px-4 py-2 text-sm text-[hsl(var(--platform-foreground))]',
      'placeholder:text-[hsl(var(--platform-foreground-subtle))]',
      'transition-colors duration-150',
      'focus:outline-none focus-visible:outline-none focus:bg-[hsl(var(--platform-input-focus))] focus-visible:bg-[hsl(var(--platform-input-focus))]',
      'data-[state=open]:bg-[hsl(var(--platform-input-focus))]',
      'hover:bg-[hsl(var(--platform-input-focus)/0.5)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      '[&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
PlatformSelectTrigger.displayName = 'PlatformSelectTrigger';

const PlatformSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        `relative z-[100] max-h-96 min-w-[8rem] overflow-hidden ${platformBento.radius.small} border border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-bg-elevated))] text-[hsl(var(--platform-foreground))] shadow-xl`,
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1 text-[hsl(var(--platform-foreground-muted))]">
        <ChevronUp className="h-4 w-4" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport
        className={cn(
          'p-1.5',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1 text-[hsl(var(--platform-foreground-muted))]">
        <ChevronDown className="h-4 w-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
PlatformSelectContent.displayName = 'PlatformSelectContent';

const PlatformSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-9 pr-3 text-sm text-[hsl(var(--platform-foreground)/0.85)] outline-none',
      'transition-colors',
      'focus:bg-[hsl(var(--platform-primary)/0.2)] focus:text-[hsl(var(--platform-foreground))]',
      'hover:bg-[hsl(var(--platform-bg-hover))] hover:text-[hsl(var(--platform-foreground))]',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
PlatformSelectItem.displayName = 'PlatformSelectItem';

const PlatformSelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-medium text-[hsl(var(--platform-foreground-muted))]', className)}
    {...props}
  />
));
PlatformSelectLabel.displayName = 'PlatformSelectLabel';

export {
  PlatformSelectTrigger,
  PlatformSelectContent,
  PlatformSelectItem,
  PlatformSelectLabel,
};
