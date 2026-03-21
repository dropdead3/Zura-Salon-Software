import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClosedDayWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  date: Date;
  locationName: string;
  reason?: string;
  isOutsideHours?: boolean;
}

export function ClosedDayWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  date,
  locationName,
  reason,
  isOutsideHours,
}: ClosedDayWarningDialogProps) {
  const formattedDate = format(date, 'EEEE, MMMM d');

  const title = isOutsideHours
    ? 'Outside operating hours'
    : 'This location is closed';

  const description = isOutsideHours
    ? `${locationName} is outside regular operating hours on ${formattedDate}. Are you sure you want to schedule at this time?`
    : `${locationName} is closed on ${formattedDate}${reason && reason !== 'Regular hours' ? ` (${reason})` : ''}. Are you sure you want to schedule on this day?`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Schedule Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
