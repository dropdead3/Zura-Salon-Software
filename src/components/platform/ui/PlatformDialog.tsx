import * as React from 'react';
import { cn } from '@/lib/utils';
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

/* ─── Platform Dialog wrappers (dark theme) ────────────────────── */

const PlatformDialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn('bg-slate-900 border-slate-700 text-white', className)}
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
    className={cn('text-white', className)}
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
    className={cn('text-slate-400', className)}
    {...props}
  />
));
PlatformDialogDescription.displayName = 'PlatformDialogDescription';

/* ─── Platform AlertDialog wrappers (dark theme) ───────────────── */

const PlatformAlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof AlertDialogContent>,
  React.ComponentPropsWithoutRef<typeof AlertDialogContent>
>(({ className, ...props }, ref) => (
  <AlertDialogContent
    ref={ref}
    className={cn('bg-slate-900 border-slate-700 text-white', className)}
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
    className={cn('text-white', className)}
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
    className={cn('text-slate-400', className)}
    {...props}
  />
));
PlatformAlertDialogDescription.displayName = 'PlatformAlertDialogDescription';

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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
};
