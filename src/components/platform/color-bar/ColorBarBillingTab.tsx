import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  Building2,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useColorBarBillingHealth, type ColorBarBillingOrg } from '@/hooks/platform/useColorBarBillingHealth';

function BillingKPICard({
  icon: Icon,
  label,
  value,
  subtitle,
  variant = 'default',
}: {
  icon: any;
  label: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'danger';
}) {
  return (
    <PlatformCard variant="glass" className="relative">
      <PlatformCardContent className="p-5 pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">{label}</p>
            <p className={cn(
              'font-display text-2xl tracking-tight',
              variant === 'danger' ? 'text-red-400' : 'text-[hsl(var(--platform-foreground))]'
            )}>
              {value}
            </p>
            {subtitle && <p className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))]">{subtitle}</p>}
          </div>
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            variant === 'danger' ? 'bg-red-500/10' : 'bg-[hsl(var(--platform-bg-hover))]'
          )}>
            <Icon className={cn('w-5 h-5', variant === 'danger' ? 'text-red-400' : 'text-[hsl(var(--platform-primary))]')} />
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}

function subscriptionBadge(status: string | null) {
  const map: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
    active: { label: 'Active', variant: 'success' },
    past_due: { label: 'Past Due', variant: 'error' },
    cancelled: { label: 'Cancelled', variant: 'error' },
    suspended: { label: 'Suspended', variant: 'error' },
  };
  const cfg = map[status || ''] ?? { label: status || 'Unknown', variant: 'default' as const };
  return <PlatformBadge variant={cfg.variant} size="sm">{cfg.label}</PlatformBadge>;
}

export function ColorBarBillingTab() {
  const { data: metrics, isLoading } = useColorBarBillingHealth();
  const [search, setSearch] = useState('');
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (!metrics) return null;

  const filtered = metrics.orgs
    .filter((o) => o.orgName.toLowerCase().includes(search.toLowerCase()))
    .filter((o) => {
      if (!showAtRiskOnly) return true;
      return (
        o.subscriptionStatus === 'past_due' ||
        o.subscriptionStatus === 'cancelled' ||
        o.suspendedLocationCount > 0
      );
    })
    .sort((a, b) => {
      const aRisk = a.subscriptionStatus === 'past_due' ? 0 : 1;
      const bRisk = b.subscriptionStatus === 'past_due' ? 0 : 1;
      if (aRisk !== bRisk) return aRisk - bRisk;
      return b.estimatedMRR - a.estimatedMRR;
    });

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BillingKPICard
          icon={CheckCircle2}
          label="Active Subscriptions"
          value={String(metrics.totalActiveSubscriptions)}
        />
        <BillingKPICard
          icon={DollarSign}
          label="Color Bar MRR"
          value={`$${metrics.totalMRR.toLocaleString()}`}
          subtitle="From active locations"
        />
        <BillingKPICard
          icon={AlertTriangle}
          label="Past Due"
          value={String(metrics.totalPastDueOrgs)}
          subtitle={metrics.totalPastDueOrgs > 0 ? 'Needs attention' : 'All clear'}
          variant={metrics.totalPastDueOrgs > 0 ? 'danger' : 'default'}
        />
        <BillingKPICard
          icon={XCircle}
          label="MRR at Risk"
          value={`$${metrics.mrrAtRisk.toLocaleString()}`}
          subtitle="Past-due organizations"
          variant={metrics.mrrAtRisk > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Per-Org Billing Table */}
      <PlatformCard variant="glass">
        <PlatformCardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <PlatformCardTitle>Billing Health</PlatformCardTitle>
              <PlatformCardDescription>
                {metrics.orgs.length} color-bar-enabled organizations
              </PlatformCardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={showAtRiskOnly} onCheckedChange={setShowAtRiskOnly} />
              <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">At-risk only</span>
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
                {showAtRiskOnly ? 'No at-risk organizations' : 'No organizations found'}
              </h3>
              <p className={tokens.empty.description}>
                {showAtRiskOnly ? 'All billing is healthy.' : 'Try adjusting your search.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[hsl(var(--platform-border)/0.5)]">
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Organization</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Status</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Locations</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Scales</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] text-right pr-4">Est. MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((org) => (
                  <TableRow key={org.orgId} className="border-[hsl(var(--platform-border)/0.3)]">
                    <TableCell>
                      <div>
                        <span className="font-sans text-sm font-medium text-[hsl(var(--platform-foreground))]">{org.orgName}</span>
                        {org.billingEmail && (
                          <p className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))] truncate max-w-[200px]">{org.billingEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{subscriptionBadge(org.subscriptionStatus)}</TableCell>
                    <TableCell>
                      <div className="font-sans text-xs space-y-0.5">
                        <div className="text-[hsl(var(--platform-foreground)/0.85)]">{org.activeLocationCount} active</div>
                        {org.suspendedLocationCount > 0 && (
                          <div className="text-red-400">{org.suspendedLocationCount} suspended</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-[hsl(var(--platform-foreground)/0.85)]">
                      {org.totalScales}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-[hsl(var(--platform-foreground))] text-right pr-4">
                      ${org.estimatedMRR.toLocaleString()}
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