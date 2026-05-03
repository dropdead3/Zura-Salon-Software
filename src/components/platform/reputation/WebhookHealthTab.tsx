/**
 * WebhookHealthTab — Stripe webhook reliability surface. Powers dunning trust
 * by exposing last-successful timestamp + 24h failure rate + per-event log.
 *
 * Memory: mem://features/reputation-billing-guide-section
 */
import { useMemo, useState } from 'react';
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
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import {
  PlatformTable as Table,
  PlatformTableBody as TableBody,
  PlatformTableCell as TableCell,
  PlatformTableHead as TableHead,
  PlatformTableHeader as TableHeader,
  PlatformTableRow as TableRow,
} from '@/components/platform/ui/PlatformTable';
import { useWebhookHealth, type WebhookEventRow } from '@/hooks/reputation/useWebhookHealth';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCcw,
  Search,
  Webhook,
} from 'lucide-react';

function relTime(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function statusBadge(s: WebhookEventRow['status']) {
  const map = {
    processed: { label: 'OK', variant: 'success' as const },
    failed: { label: 'Failed', variant: 'error' as const },
    received: { label: 'Pending', variant: 'default' as const },
    replayed: { label: 'Replayed', variant: 'warning' as const },
    ignored: { label: 'Ignored', variant: 'default' as const },
  };
  const cfg = map[s] ?? map.received;
  return <PlatformBadge variant={cfg.variant} size="sm">{cfg.label}</PlatformBadge>;
}

function KPI({
  icon: Icon,
  label,
  value,
  subtitle,
  variant = 'default',
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  variant?: 'default' | 'danger' | 'success';
}) {
  const tone =
    variant === 'danger'
      ? 'text-rose-400'
      : variant === 'success'
        ? 'text-emerald-400'
        : 'text-[hsl(var(--platform-foreground))]';
  const iconBg =
    variant === 'danger'
      ? 'bg-rose-500/10'
      : variant === 'success'
        ? 'bg-emerald-500/10'
        : 'bg-[hsl(var(--platform-bg-hover))]';
  const iconTone =
    variant === 'danger'
      ? 'text-rose-400'
      : variant === 'success'
        ? 'text-emerald-400'
        : 'text-[hsl(var(--platform-primary))]';
  return (
    <PlatformCard variant="glass">
      <PlatformCardContent className="p-5 pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
              {label}
            </p>
            <p className={cn('font-display text-2xl tracking-tight', tone)}>{value}</p>
            {subtitle && (
              <p className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))]">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('w-5 h-5', iconTone)} />
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}

export function WebhookHealthTab() {
  const { data, isLoading, refetch, isFetching } = useWebhookHealth();
  const [search, setSearch] = useState('');
  const [failedOnly, setFailedOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.events
      .filter((e) =>
        failedOnly ? e.status === 'failed' : true,
      )
      .filter((e) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          e.eventType.toLowerCase().includes(q) ||
          e.stripeEventId.toLowerCase().includes(q) ||
          (e.stripeCustomerId ?? '').toLowerCase().includes(q)
        );
      });
  }, [data, failedOnly, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }
  if (!data) return null;

  const lastSuccessVariant = !data.lastSuccessAt
    ? 'danger'
    : Date.now() - new Date(data.lastSuccessAt).getTime() > 60 * 60 * 1000
      ? 'danger'
      : 'success';
  const failureVariant = data.failureRate24h > 0.05 ? 'danger' : 'default';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          icon={CheckCircle2}
          label="Last success"
          value={relTime(data.lastSuccessAt)}
          subtitle={data.lastSuccessAt ? new Date(data.lastSuccessAt).toLocaleString() : 'No successes yet'}
          variant={lastSuccessVariant}
        />
        <KPI
          icon={AlertTriangle}
          label="Failure rate (24h)"
          value={`${Math.round(data.failureRate24h * 100)}%`}
          subtitle={`${data.failed24h} of ${data.total24h} events`}
          variant={failureVariant}
        />
        <KPI
          icon={Activity}
          label="Volume (24h)"
          value={data.total24h}
          subtitle="Webhooks received"
        />
        <KPI
          icon={Clock}
          label="Pending"
          value={data.pendingCount}
          subtitle="Awaiting processing"
          variant={data.pendingCount > 5 ? 'danger' : 'default'}
        />
      </div>

      <PlatformCard variant="glass">
        <PlatformCardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <Webhook className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <PlatformCardTitle>Recent Stripe Webhooks</PlatformCardTitle>
              <PlatformCardDescription>
                Last 200 events. Toggle Failed-only to triage dunning gaps.
              </PlatformCardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PlatformButton
              variant="ghost"
              size="sm"
              onClick={() => setFailedOnly((v) => !v)}
              className={cn(failedOnly && 'text-rose-400')}
            >
              {failedOnly ? 'Showing failed only' : 'All statuses'}
            </PlatformButton>
            <PlatformInput
              icon={<Search className="w-4 h-4" />}
              placeholder="Search type / event id / customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />
            <PlatformButton
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </PlatformButton>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="p-0">
          {filtered.length === 0 ? (
            <div className={cn(tokens.empty.container, 'py-16')}>
              <Webhook className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>
                {failedOnly ? 'No failed webhooks' : 'No webhook activity'}
              </h3>
              <p className={tokens.empty.description}>
                {failedOnly
                  ? 'Stripe ↔ Zura is healthy.'
                  : 'Events appear here as Stripe sends them.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[hsl(var(--platform-border)/0.5)]">
                  <TableHead>Received</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="border-[hsl(var(--platform-border)/0.3)]">
                    <TableCell className="font-sans text-xs tabular-nums text-[hsl(var(--platform-foreground)/0.85)]">
                      {relTime(e.receivedAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[hsl(var(--platform-foreground))]">
                      <div>{e.eventType}</div>
                      <div className="text-[hsl(var(--platform-foreground-subtle))] text-[10px]">
                        {e.stripeEventId}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(e.status)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-[hsl(var(--platform-foreground-muted))] break-all max-w-[180px]">
                      {e.stripeCustomerId ?? '—'}
                    </TableCell>
                    <TableCell className="font-sans text-xs text-rose-400 max-w-[280px] truncate">
                      {e.errorMessage ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
