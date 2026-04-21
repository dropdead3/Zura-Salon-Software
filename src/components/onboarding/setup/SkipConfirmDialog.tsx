import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SkipConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  stepTitle: string;
  consequence?: string;
}

/**
 * SkipConfirmDialog — soft-required gate. Operator can skip, but is told
 * what they're leaving on the table. Calm copy, no shame.
 */
export function SkipConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  stepTitle,
  consequence,
}: SkipConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display tracking-wide uppercase text-base">
            Skip {stepTitle}?
          </AlertDialogTitle>
          <AlertDialogDescription className="font-sans space-y-2">
            <span className="block">
              You can configure this later from settings. We mark it as something
              to revisit so it doesn't get lost.
            </span>
            {consequence && (
              <span className="block text-foreground">
                Without this: {consequence}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep filling out</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Skip for now</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
