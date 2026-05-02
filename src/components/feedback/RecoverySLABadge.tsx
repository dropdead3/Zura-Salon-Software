import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

const SLA_FIRST_CONTACT_HOURS = 24;
const SLA_RESOLUTION_HOURS = 72;

interface RecoverySLABadgeProps {
  status: string;
  createdAt: string;
  firstContactedAt?: string | null;
  resolvedAt?: string | null;
}

/**
 * Per-task SLA badge: shows whether this individual recovery row is
 * inside-window, breached, or resolved on-time.
 */
export function RecoverySLABadge({
  status,
  createdAt,
  firstContactedAt,
  resolvedAt,
}: RecoverySLABadgeProps) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const ageHours = (now - created) / 3_600_000;

  // Resolved
  if (resolvedAt) {
    const resolutionHours = (new Date(resolvedAt).getTime() - created) / 3_600_000;
    const onTime = resolutionHours <= SLA_RESOLUTION_HOURS;
    return (
      <Badge
        variant={onTime ? 'secondary' : 'outline'}
        className="gap-1 text-[10px]"
      >
        <CheckCircle2 className="h-3 w-3" />
        {onTime ? 'Resolved on time' : `Resolved in ${Math.round(resolutionHours)}h`}
      </Badge>
    );
  }

  // Contacted but not resolved
  if (status === 'contacted' || firstContactedAt) {
    const breached = ageHours > SLA_RESOLUTION_HOURS;
    return (
      <Badge
        variant={breached ? 'destructive' : 'secondary'}
        className="gap-1 text-[10px]"
      >
        <Clock className="h-3 w-3" />
        {breached ? 'Past 72h' : `${Math.round(ageHours)}h old`}
      </Badge>
    );
  }

  // New — measure against first-contact SLA
  const breached = ageHours > SLA_FIRST_CONTACT_HOURS;
  if (breached) {
    return (
      <Badge variant="destructive" className="gap-1 text-[10px]">
        <AlertTriangle className="h-3 w-3" />
        SLA breached
      </Badge>
    );
  }

  const remaining = Math.max(0, SLA_FIRST_CONTACT_HOURS - ageHours);
  return (
    <Badge variant="outline" className="gap-1 text-[10px]">
      <Clock className="h-3 w-3" />
      {remaining < 1 ? '<1h left' : `${Math.round(remaining)}h left`}
    </Badge>
  );
}
