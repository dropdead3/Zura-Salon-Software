import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Wallet, ArrowDownRight, ArrowUpRight, Clock, Banknote, Building2,
  CalendarClock, Save, Loader2, Info, ShieldCheck, AlertCircle,
} from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useZuraPayPayouts, useUpdatePayoutSchedule, useLoadMorePayouts, type PayoutSchedule } from '@/hooks/useZuraPayPayouts';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useLocations } from '@/hooks/useLocations';
import { LocationSelect } from '@/components/ui/location-select';

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

const WEEKDAY_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
];

const BANK_STATUS_MAP: Record<string, { label: string; icon: typeof ShieldCheck; classes: string }> = {
  verified: { label: 'Verified', icon: ShieldCheck, classes: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  new: { label: 'Pending Verification', icon: Clock, classes: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  errored: { label: 'Verification Failed', icon: AlertCircle, classes: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export function ZuraPayPayoutsTab() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: locations = [] } = useLocations();

  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const locationId = selectedLocationId === 'all' ? null : selectedLocationId;

  const { data, isLoading, error } = useZuraPayPayouts(orgId, locationId);
  const updateSchedule = useUpdatePayoutSchedule(orgId, locationId);
  const loadMore = useLoadMorePayouts(orgId, locationId);
  const { formatCurrency } = useFormatCurrency();

  const [scheduleInterval, setScheduleInterval] = useState<PayoutSchedule['interval']>('daily');
  const [weeklyAnchor, setWeeklyAnchor] = useState('monday');
  const [monthlyAnchor, setMonthlyAnchor] = useState(1);
  const [isDirty, setIsDirty] = useState(false);

  // Sync local state from fetched data
  useEffect(() => {
    if (data?.payout_schedule) {
      setScheduleInterval(data.payout_schedule.interval);
      if (data.payout_schedule.weekly_anchor) setWeeklyAnchor(data.payout_schedule.weekly_anchor);
      if (data.payout_schedule.monthly_anchor) setMonthlyAnchor(data.payout_schedule.monthly_anchor);
      setIsDirty(false);
    }
  }, [data?.payout_schedule]);

  // Auto-select first location for single-location orgs
  useEffect(() => {
    if (locations.length === 1 && selectedLocationId === 'all') {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const handleSaveSchedule = () => {
    const payload: Partial<PayoutSchedule> = { interval: scheduleInterval };
    if (scheduleInterval === 'weekly') payload.weekly_anchor = weeklyAnchor;
    if (scheduleInterval === 'monthly') payload.monthly_anchor = monthlyAnchor;
    updateSchedule.mutate(payload);
  };

  const handleLoadMore = () => {
    if (!data?.payouts.length) return;
    const lastPayout = data.payouts[data.payouts.length - 1];
    loadMore.mutate(lastPayout.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
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

  const availableBalance = (data.balance.available?.[0]?.amount || 0) / 100;
  const pendingBalance = (data.balance.pending?.[0]?.amount || 0) / 100;
  const paidPayouts = data.payouts.filter((p) => p.status === 'paid');
  const previousPayout = paidPayouts[0];
  const nextPayout = data.payouts.find((p) => p.status === 'pending' || p.status === 'in_transit');
  const delayDays = data.payout_schedule?.delay_days;
  const bankAccount = data.bank_account;
  const bankStatus = BANK_STATUS_MAP[bankAccount?.status || 'new'] || BANK_STATUS_MAP.new;
  const BankStatusIcon = bankStatus.icon;

  return (
    <div className="space-y-6">
      {/* Location Selector */}
      {locations.length > 1 && (
        <div className="flex items-center gap-3">
          <LocationSelect
            value={selectedLocationId}
            onValueChange={setSelectedLocationId}
            includeAll
            allLabel="Organization Default"
            triggerClassName="w-auto min-w-[220px]"
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Schedule + Bank Account Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payout Schedule Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <CalendarClock className={tokens.card.icon} />
              </div>
              <div>
                <h3 className={tokens.card.title}>Payout Schedule</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose how often funds are deposited
                </p>
              </div>
            </div>

            <RadioGroup
              value={scheduleInterval}
              onValueChange={(v) => {
                setScheduleInterval(v as PayoutSchedule['interval']);
                setIsDirty(true);
              }}
              className="grid grid-cols-3 gap-3"
            >
              {(['daily', 'weekly', 'monthly'] as const).map((interval) => (
                <label
                  key={interval}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                    scheduleInterval === interval
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/50 hover:bg-muted/40'
                  )}
                >
                  <RadioGroupItem value={interval} />
                  <span className="text-sm font-sans capitalize">{interval}</span>
                </label>
              ))}
            </RadioGroup>

            {scheduleInterval === 'weekly' && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-sans">Payout day</label>
                <Select
                  value={weeklyAnchor}
                  onValueChange={(v) => { setWeeklyAnchor(v); setIsDirty(true); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scheduleInterval === 'monthly' && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-sans">Day of month</label>
                <Select
                  value={String(monthlyAnchor)}
                  onValueChange={(v) => { setMonthlyAnchor(Number(v)); setIsDirty(true); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {typeof delayDays === 'number' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Payouts arrive T+{delayDays} day{delayDays !== 1 ? 's' : ''} after the scheduled date
              </p>
            )}

            <Button
              size="sm"
              disabled={!isDirty || updateSchedule.isPending}
              onClick={handleSaveSchedule}
              className="w-full"
            >
              {updateSchedule.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Bank Account Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Building2 className={tokens.card.icon} />
              </div>
              <div>
                <h3 className={tokens.card.title}>Connected Bank Account</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Where your payouts are deposited
                </p>
              </div>
            </div>

            {bankAccount ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-sans font-medium text-foreground">
                      {bankAccount.bank_name || 'Bank Account'}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
                      bankStatus.classes,
                    )}>
                      <BankStatusIcon className="w-3 h-3" />
                      {bankStatus.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Account ending in</p>
                      <p className="text-sm font-sans font-medium text-foreground">
                        •••• {bankAccount.last4}
                      </p>
                    </div>
                    {bankAccount.routing_last4 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Routing ending in</p>
                        <p className="text-sm font-sans font-medium text-foreground">
                          •••• {bankAccount.routing_last4}
                        </p>
                      </div>
                    )}
                  </div>

                  {bankAccount.currency && (
                    <div>
                      <p className="text-xs text-muted-foreground">Currency</p>
                      <p className="text-sm font-sans font-medium text-foreground">
                        {bankAccount.currency}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  To update your bank account details, please contact support
                </p>
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No Bank Account Connected"
                description="Complete your Zura Pay onboarding to connect a bank account for payouts."
              />
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
            <>
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
              {data.has_more && (
                <div className="px-5 py-3 border-t border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadMore.isPending}
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    {loadMore.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Load More Payouts
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
