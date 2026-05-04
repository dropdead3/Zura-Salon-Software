import { Link } from 'react-router-dom';
import { AlertTriangle, Sparkles, Inbox, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecoverySLA } from '@/hooks/useRecoverySLA';
import { useRecoveryTasks } from '@/hooks/useRecoveryTasks';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

/**
 * Today's Must-Touch — single-glance triage strip for the Feedback Hub.
 * Tells the owner one thing: how many recovery tasks need attention RIGHT NOW.
 *
 * Tier 1: SLA-breached (open >24h, no first contact) — destructive
 * Tier 2: New & untouched — primary
 * Tier 3: Contacted, awaiting resolution — muted
 *
 * Silent when nothing needs attention.
 */
import { useReputationFilter } from '@/contexts/ReputationFilterContext';

export function TodaysMustTouchStrip() {
  const { dashPath } = useOrgDashboardPath();
  const { locationId } = useReputationFilter();
  const { data: sla, isLoading: slaLoading } = useRecoverySLA(locationId);
  const { data: tasks, isLoading: tasksLoading } = useRecoveryTasks(locationId);

  if (slaLoading || tasksLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  const breached = sla?.breachedSLA ?? 0;
  const open = sla?.open ?? 0;
  const inProgress = sla?.contacted ?? 0;
  const totalActive = open + inProgress;

  // All-clear state — celebrate, don't shout
  if (totalActive === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 via-card/80 to-card/80 backdrop-blur-xl p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className={cn(tokens.card.title, 'mb-0.5')}>Inbox zero</p>
          <p className="text-xs text-muted-foreground">
            No open recovery tasks. Your team is on top of feedback.
          </p>
        </div>
      </div>
    );
  }

  const tone =
    breached > 0
      ? 'destructive'
      : open > 0
        ? 'primary'
        : 'muted';

  const headline =
    breached > 0
      ? `${breached} recovery ${breached === 1 ? 'task is' : 'tasks are'} past SLA`
      : open > 0
        ? `${open} new ${open === 1 ? 'task needs' : 'tasks need'} a first touch`
        : `${inProgress} in flight — keep moving`;

  const sub =
    breached > 0
      ? 'Open >24h with no first contact. Touch these first.'
      : open > 0
        ? 'Reach out within 24h to protect the relationship.'
        : 'Awaiting resolution. Close the loop today.';

  const Icon = breached > 0 ? AlertTriangle : open > 0 ? Inbox : Clock;

  const toneClasses =
    tone === 'destructive'
      ? 'border-destructive/40 bg-gradient-to-br from-destructive/10 via-card/80 to-card/80'
      : tone === 'primary'
        ? 'border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-card/80'
        : 'border-border/60 bg-card/80';

  const iconClasses =
    tone === 'destructive'
      ? 'bg-destructive/15 text-destructive'
      : tone === 'primary'
        ? 'bg-primary/15 text-primary'
        : 'bg-muted text-muted-foreground';

  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4',
        toneClasses,
      )}
    >
      <div className={cn('w-11 h-11 rounded-full flex items-center justify-center shrink-0', iconClasses)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(tokens.card.title, 'mb-0.5')}>Today's must-touch</p>
        <p className="text-sm text-foreground font-medium truncate">{headline}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-4 pr-2 text-xs">
          <Stat label="Breached" value={breached} variant={breached > 0 ? 'destructive' : 'muted'} />
          <Stat label="New" value={open} variant={open > 0 ? 'primary' : 'muted'} />
          <Stat label="In flight" value={inProgress} variant="muted" />
        </div>
        <Button asChild size={tokens.button.card}>
          <Link to={dashPath('/admin/feedback/recovery')}>Open inbox</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'destructive' | 'primary' | 'muted';
}) {
  const colorClass =
    variant === 'destructive'
      ? 'text-destructive'
      : variant === 'primary'
        ? 'text-primary'
        : 'text-muted-foreground';
  return (
    <div className="text-center">
      <p className={cn('text-base font-medium leading-none', colorClass)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
