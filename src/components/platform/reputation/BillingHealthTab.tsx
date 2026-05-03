/**
 * BillingHealthTab — Per-org Reputation billing posture for the platform console.
 * Mirrors the Color Bar pattern: KPI row + searchable / at-risk-filterable table.
 */
import { useState, Fragment } from 'react';
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
import { PlatformSwitch } from '@/components/platform/ui/PlatformSwitch';
import {
  PlatformTable as Table,
  PlatformTableBody as TableBody,
  PlatformTableCell as TableCell,
  PlatformTableHead as TableHead,
  PlatformTableHeader as TableHeader,
  PlatformTableRow as TableRow,
} from '@/components/platform/ui/PlatformTable';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import {
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  XCircle,
  Tag,
  CreditCard,
  Search,
  Building2,
  Loader2,
  ChevronRight,
  Percent,
} from 'lucide-react';
import {
  useReputationBillingHealth,
  type ReputationBillingOrgRow,
} from '@/hooks/reputation/useReputationBillingHealth';

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
  variant?: 'default' | 'danger';
}) {
  return (
    <PlatformCard variant="glass">
      <PlatformCardContent className="p-5 pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
              {label}
            </p>
            <p
              className={cn(
                'font-display text-2xl tracking-tight',
                variant === 'danger' ? 'text-rose-400' : 'text-[hsl(var(--platform-foreground))]',
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))]">
                {subtitle}
              </p>
            )}
          </div>
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              variant === 'danger' ? 'bg-rose-500/10' : 'bg-[hsl(var(--platform-bg-hover))]',
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5',
                variant === 'danger' ? 'text-rose-400' : 'text-[hsl(var(--platform-primary))]',
              )}
            />
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}

function statusBadge(status: ReputationBillingOrgRow['status']) {
  const map: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
    trialing: { label: 'Trialing', variant: 'default' },
    active: { label: 'Active', variant: 'success' },
    past_due: { label: 'Past Due', variant: 'error' },
    canceled: { label: 'Canceled', variant: 'warning' },
  };
  const cfg = map[status ?? ''] ?? { label: status ?? 'No sub', variant: 'default' as const };
  return (
    <PlatformBadge variant={cfg.variant} size="sm">
      {cfg.label}
    </PlatformBadge>
  );
}

function daysUntil(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'today';
  return `${days}d`;
}

export function BillingHealthTab() {
  const { data, isLoading } = useReputationBillingHealth();
  const [search, setSearch] = useState('');
  const [atRiskOnly, setAtRiskOnly] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }
  if (!data) return null;

  const filtered = data.orgs
    .filter((o) => o.organizationName.toLowerCase().includes(search.toLowerCase()))
    .filter((o) => (atRiskOnly ? o.status === 'past_due' : true));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPI icon={CheckCircle2} label="Active" value={data.totalActive} />
        <KPI
          icon={DollarSign}
          label="MRR"
          value={<BlurredAmount disableTooltip>${data.monthlyRecurringRevenue.toLocaleString()}</BlurredAmount>}
          subtitle="Active subs"
        />
        <KPI
          icon={AlertTriangle}
          label="Past Due"
          value={data.totalPastDue}
          subtitle={data.totalPastDue > 0 ? 'Inside 30d grace' : 'All clear'}
          variant={data.totalPastDue > 0 ? 'danger' : 'default'}
        />
        <KPI
          icon={XCircle}
          label="MRR at Risk"
          value={<BlurredAmount disableTooltip>${data.mrrAtRisk.toLocaleString()}</BlurredAmount>}
          subtitle="Past-due orgs"
          variant={data.mrrAtRisk > 0 ? 'danger' : 'default'}
        />
        <KPI icon={Tag} label="Retention Coupons" value={data.retentionCouponsUsed} subtitle="Used" />
      </div>

      <PlatformCard variant="glass">
        <PlatformCardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <PlatformCardTitle>Per-Organization Billing</PlatformCardTitle>
              <PlatformCardDescription>
                {data.orgs.length} organizations with a Reputation subscription record
              </PlatformCardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <PlatformSwitch checked={atRiskOnly} onCheckedChange={setAtRiskOnly} />
              <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                Past-due only
              </span>
            </label>
            <PlatformInput
              icon={<Search className="w-4 h-4" />}
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="p-0">
          {filtered.length === 0 ? (
            <div className={cn(tokens.empty.container, 'py-16')}>
              <Building2 className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>
                {atRiskOnly ? 'No at-risk organizations' : 'No subscriptions yet'}
              </h3>
              <p className={tokens.empty.description}>
                {atRiskOnly
                  ? 'All Reputation billing is healthy.'
                  : 'Subscriptions appear here once orgs start their trial.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[hsl(var(--platform-border)/0.5)]">
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Renews</TableHead>
                  <TableHead>Grace ends</TableHead>
                  <TableHead>Coupon</TableHead>
                  <TableHead className="text-right pr-4">MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.organizationId} className="border-[hsl(var(--platform-border)/0.3)]">
                    <TableCell className="font-sans text-sm text-[hsl(var(--platform-foreground))]">
                      {o.organizationName}
                    </TableCell>
                    <TableCell>{statusBadge(o.status)}</TableCell>
                    <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
                      {o.grantSource ?? '—'}
                    </TableCell>
                    <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground)/0.85)] tabular-nums">
                      {daysUntil(o.currentPeriodEnd)}
                    </TableCell>
                    <TableCell className="font-sans text-xs tabular-nums">
                      {o.status === 'past_due' ? (
                        <span className="text-rose-400">{daysUntil(o.graceUntil)}</span>
                      ) : (
                        <span className="text-[hsl(var(--platform-foreground-subtle))]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {o.retentionCouponUsed ? (
                        <PlatformBadge variant="default" size="sm">Used</PlatformBadge>
                      ) : (
                        <span className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-right pr-4">
                      <BlurredAmount disableTooltip>${o.estimatedMRR}</BlurredAmount>
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
