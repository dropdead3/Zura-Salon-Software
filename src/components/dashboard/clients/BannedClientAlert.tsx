import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BannedClientAlertProps {
  reason?: string | null;
}

export function BannedClientAlert({ reason }: BannedClientAlertProps) {
  return (
    <Alert variant="destructive" className="bg-destructive/5 dark:bg-destructive/10 border-destructive/20 dark:border-destructive/30">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-medium">Client Banned</AlertTitle>
      <AlertDescription className="text-sm">
        This client has been blacklisted and should not be scheduled.
        {reason && (
          <span className="block mt-1 font-medium">Reason: {reason}</span>
        )}
      </AlertDescription>
    </Alert>
  );
}
