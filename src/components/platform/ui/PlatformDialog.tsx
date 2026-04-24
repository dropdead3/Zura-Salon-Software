import * as React from 'react';
import { cn } from '@/lib/utils';
import { platformBento } from '@/lib/platform-bento-tokens';
// eslint-disable-next-line no-restricted-imports -- Platform* wrapper file legitimately re-styles raw Dialog primitives.
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
// eslint-disable-next-line no-restricted-imports -- Platform* wrapper file legitimately re-styles raw AlertDialog primitives.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/* ─── Platform Dialog wrappers (theme-adaptive) ────────────────────── */

const PlatformDialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn(`bg-[hsl(var(--platform-bg-elevated))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))] ${platformBento.radius.xl}`, className)}
    {...props}
  />
));
PlatformDialogContent.displayName = 'PlatformDialogContent';

const PlatformDialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogTitle>,
  React.ComponentPropsWithoutRef<typeof DialogTitle>
>(({ className, ...props }, ref) => (
  <DialogTitle
    ref={ref}
    className={cn('text-[hsl(var(--platform-foreground))]', className)}
    {...props}
  />
));
PlatformDialogTitle.displayName = 'PlatformDialogTitle';

const PlatformDialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogDescription>,
  React.ComponentPropsWithoutRef<typeof DialogDescription>
>(({ className, ...props }, ref) => (
  <DialogDescription
    ref={ref}
    className={cn('text-[hsl(var(--platform-foreground-muted))]', className)}
    {...props}
  />
));
PlatformDialogDescription.displayName = 'PlatformDialogDescription';

/* ─── Platform AlertDialog wrappers (theme-adaptive) ───────────────── */

const PlatformAlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof AlertDialogContent>,
  React.ComponentPropsWithoutRef<typeof AlertDialogContent>
>(({ className, ...props }, ref) => (
  <AlertDialogContent
    ref={ref}
    className={cn(`bg-[hsl(var(--platform-bg-elevated))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))] ${platformBento.radius.xl}`, className)}
    {...props}
  />
));
PlatformAlertDialogContent.displayName = 'PlatformAlertDialogContent';

const PlatformAlertDialogTitle = React.forwardRef<
  React.ComponentRef<typeof AlertDialogTitle>,
  React.ComponentPropsWithoutRef<typeof AlertDialogTitle>
>(({ className, ...props }, ref) => (
  <AlertDialogTitle
    ref={ref}
    className={cn('text-[hsl(var(--platform-foreground))]', className)}
    {...props}
  />
));
PlatformAlertDialogTitle.displayName = 'PlatformAlertDialogTitle';

const PlatformAlertDialogDescription = React.forwardRef<
  React.ComponentRef<typeof AlertDialogDescription>,
  React.ComponentPropsWithoutRef<typeof AlertDialogDescription>
>(({ className, ...props }, ref) => (
  <AlertDialogDescription
    ref={ref}
    className={cn('text-[hsl(var(--platform-foreground-muted))]', className)}
    {...props}
  />
));
PlatformAlertDialogDescription.displayName = 'PlatformAlertDialogDescription';

/* ─── Platform AlertDialogCancel wrapper (theme-adaptive) ──────────── */

const PlatformAlertDialogCancel = React.forwardRef<
  React.ComponentRef<typeof AlertDialogCancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogCancel>
>(({ className, ...props }, ref) => (
  <AlertDialogCancel
    ref={ref}
    className={cn(
      'bg-[hsl(var(--platform-bg-hover))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-bg-card))] hover:text-[hsl(var(--platform-foreground))]',
      className,
    )}
    {...props}
  />
));
PlatformAlertDialogCancel.displayName = 'PlatformAlertDialogCancel';

/* ─── Re-exports (unchanged primitives) ────────────────────────── */

export {
  // Dialog
  Dialog,
  PlatformDialogContent,
  PlatformDialogTitle,
  PlatformDialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
  DialogTrigger,
  // AlertDialog
  AlertDialog,
  PlatformAlertDialogContent,
  PlatformAlertDialogTitle,
  PlatformAlertDialogDescription,
  PlatformAlertDialogCancel,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
};
