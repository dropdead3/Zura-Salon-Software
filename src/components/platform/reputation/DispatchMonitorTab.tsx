/**
 * DispatchMonitorTab — Operational health for the Reputation messaging engine.
 * Reads platform-wide dispatch queue + opt-out registry. Honors kill switches.
 */
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardDescription,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { useReputationDispatchHealth } from '@/hooks/reputation/useReputationDispatchHealth';
import { useReputationKillSwitches } from '@/hooks/reputation/useReputationKillSwitches';
import {
  Loader2,
  Send,
  Clock,
  AlertTriangle,
  PauseCircle,
  ShieldOff,
  RefreshCw,
} from 'lucide-react';

function Tile({
  icon: Icon,
  label,
  value,
  subtitle,
  tone = 'neutral',
}: {
  icon: any;
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const toneClass: Record<string, string> = {
    neutral: 'text-[hsl(var(--platform-foreground))]',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
    info: 'text-blue-400',
  };
  return (
    <div className="p-4 rounded-lg border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-card)/0.4)]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-[10px] tracking-[0.08em] uppercase text-[hsl(var(--platform-foreground-subtle))]">
          {label}
        </span>
        <Icon className={cn('w-4 h-4', toneClass[tone])} />
      </div>
      <p className={cn('font-display text-2xl', toneClass[tone])}>{value}</p>
      {subtitle && (
        <p className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))] mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function DispatchMonitorTab() {
  const { data, isLoading } = useReputationDispatchHealth();
  const { data: switches } = useReputationKillSwitches();

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  const dispatchPaused = !!switches?.dispatch_disabled;
  const manualPaused = !!switches?.manual_send_disabled;
  const webhookPaused = !!switches?.webhook_processing_disabled;

  const ageLabel = data.oldestPendingAgeMinutes == null
    ? '—'
    : data.oldestPendingAgeMinutes < 60
      ? `${data.oldestPendingAgeMinutes}m`
      : `${Math.round(data.oldestPendingAgeMinutes / 60)}h`;

  return (
    <div className="space-y-6">
      {(dispatchPaused || manualPaused || webhookPaused) && (
        <PlatformCard variant="glass" className="border-amber-500/40 bg-amber-500/5">
          <PlatformCardContent className="p-4 flex items-start gap-3">
            <PauseCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-display text-xs tracking-[0.08em] uppercase text-amber-300">
                Kill switch engaged
              </p>
              <p className="font-sans text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                {dispatchPaused && 'Automated dispatch is paused. '}
                {manualPaused && 'Manual sends are paused. '}
                {webhookPaused && 'Webhook processing is paused. '}
                Resume in the <span className="text-amber-300">Kill Switches</span> tab.
              </p>
            </div>
          </PlatformCardContent>
        </PlatformCard>
      )}

      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle>Dispatch Queue</PlatformCardTitle>
          <PlatformCardDescription>
            Real-time review-request queue across all organizations.
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Tile icon={Clock} label="Pending" value={data.pendingCount} tone={data.pendingCount > 100 ? 'warning' : 'neutral'} />
            <Tile icon={Send} label="Sent (24h)" value={data.sentLast24h} tone="success" />
            <Tile icon={AlertTriangle} label="Skipped (24h)" value={data.skippedLast24h} tone="info" />
            <Tile icon={RefreshCw} label="Failed (24h)" value={data.failedLast24h} tone={data.failedLast24h > 0 ? 'danger' : 'neutral'} />
            <Tile icon={Clock} label="Oldest pending" value={ageLabel} tone={data.oldestPendingAgeMinutes && data.oldestPendingAgeMinutes > 120 ? 'warning' : 'neutral'} />
          </div>
        </PlatformCardContent>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle>Retry distribution</PlatformCardTitle>
          <PlatformCardDescription>Pending rows by attempt count. 3+ usually signals a bad number or carrier block.</PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Tile icon={Clock} label="0 attempts" value={data.retryBuckets.zero} />
            <Tile icon={RefreshCw} label="1 attempt" value={data.retryBuckets.one} tone="info" />
            <Tile icon={RefreshCw} label="2 attempts" value={data.retryBuckets.two} tone="warning" />
            <Tile icon={AlertTriangle} label="3+ attempts" value={data.retryBuckets.threePlus} tone={data.retryBuckets.threePlus > 0 ? 'danger' : 'neutral'} />
          </div>
        </PlatformCardContent>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle>Top failure reasons (24h)</PlatformCardTitle>
          <PlatformCardDescription>
            Bucketed from `last_error`. Carrier-blocked + landline = phone-list hygiene issue.
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          {data.topFailureReasons.length === 0 ? (
            <p className="font-sans text-sm text-[hsl(var(--platform-foreground-subtle))]">
              No failures in the last 24 hours.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.topFailureReasons.map((r) => (
                <li
                  key={r.reason}
                  className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-card)/0.4)]"
                >
                  <span className="font-sans text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                    {r.reason}
                  </span>
                  <PlatformBadge variant={r.count > 25 ? 'destructive' : 'default'} size="sm">
                    {r.count}
                  </PlatformBadge>
                </li>
              ))}
            </ul>
          )}
        </PlatformCardContent>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <PlatformCardTitle>Opt-out registry</PlatformCardTitle>
              <PlatformCardDescription>
                STOP keyword writes are permanent and never override-able.
              </PlatformCardDescription>
            </div>
            <PlatformBadge variant="default" size="sm">
              {data.optOutsLast7d} new (7d)
            </PlatformBadge>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="grid grid-cols-2 gap-4">
            <Tile icon={ShieldOff} label="Total opt-outs" value={data.optOutsTotal} />
            <Tile icon={ShieldOff} label="Last 7 days" value={data.optOutsLast7d} tone={data.optOutsLast7d > 25 ? 'warning' : 'neutral'} />
          </div>
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
