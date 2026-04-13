import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Wallet, ArrowDownRight, ArrowUpRight, Clock, Banknote } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useZuraPayPayouts } from '@/hooks/useZuraPayPayouts';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

function formatUnixDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const PAYOUT_STATUS_MAP: Record<string, { label: string; classes: string }> = {
  paid: { label: 'Paid', classes: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  in_transit: { label: 'In Transit', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  pending: { label: 'Pending', classes: 'bg-muted text-muted-foreground border-border/50' },
  canceled: { label: 'Canceled', classes: 'bg-red-500/10 text-red-600 border-red-500/20' },
  failed: { label: 'Failed', classes: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export function ZuraPayPayoutsTab() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data, isLoading, error } = useZuraPayPayouts(orgId);
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Wallet}
        title="Unable to Load Payouts"
        description={(error as Error).message || 'Something went wrong while fetching payout data.'}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={Wallet}
        title="No Payout Data"
        description="Payout information will appear here once your account processes payments."
      />
    );
  }

  // Calculate summary values (amounts from Stripe are in cents)
  const availableBalance = (data.balance.available?.[0]?.amount || 0) / 100;
  const pendingBalance = (data.balance.pending?.[0]?.amount || 0) / 100;
  const currency = data.balance.available?.[0]?.currency?.toUpperCase() || 'USD';

  const paidPayouts = data.payouts.filter((p) => p.status === 'paid');
  const previousPayout = paidPayouts[0];
  const nextPayout = data.payouts.find((p) => p.status === 'pending' || p.status === 'in_transit');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <span className={tokens.kpi.label}>Available Balance</span>
            </div>
            <BlurredAmount>
              <p className={cn(tokens.stat.large, 'text-foreground')}>
                {formatCurrency(availableBalance)}
              </p>
            </BlurredAmount>
            {pendingBalance > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <BlurredAmount>{formatCurrency(pendingBalance)}</BlurredAmount>
                {' '}pending
              </p>
            )}
          </CardContent>
        </Card>

        {/* Previous Payout */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-primary" />
              </div>
              <span className={tokens.kpi.label}>Previous Payout</span>
            </div>
            {previousPayout ? (
              <>
                <BlurredAmount>
                  <p className={cn(tokens.stat.large, 'text-foreground')}>
                    {formatCurrency(previousPayout.amount / 100)}
                  </p>
                </BlurredAmount>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {formatUnixDate(previousPayout.arrival_date)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No previous payouts</p>
            )}
          </CardContent>
        </Card>

        {/* Next Payout */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-amber-500" />
              </div>
              <span className={tokens.kpi.label}>Next Payout</span>
            </div>
            {nextPayout ? (
              <>
                <BlurredAmount>
                  <p className={cn(tokens.stat.large, 'text-foreground')}>
                    {formatCurrency(nextPayout.amount / 100)}
                  </p>
                </BlurredAmount>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Expected {formatUnixDate(nextPayout.arrival_date)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No payout scheduled</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="px-5 pt-5 pb-3 flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Banknote className={tokens.card.icon} />
            </div>
            <h3 className={tokens.card.title}>Recent Payouts</h3>
          </div>

          {data.payouts.length === 0 ? (
            <div className="px-5 pb-6">
              <EmptyState
                icon={Banknote}
                title="No Payouts Yet"
                description="Payouts will appear here once your account starts processing transactions."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Total Payout</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Date Sent</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Date Expected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payouts.map((payout) => {
                  const statusConfig = PAYOUT_STATUS_MAP[payout.status] || PAYOUT_STATUS_MAP.pending;
                  return (
                    <TableRow key={payout.id}>
                      <TableCell className="font-sans font-medium">
                        <BlurredAmount>{formatCurrency(payout.amount / 100)}</BlurredAmount>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
                          statusConfig.classes,
                        )}>
                          {statusConfig.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatUnixDate(payout.created)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatUnixDate(payout.arrival_date)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
