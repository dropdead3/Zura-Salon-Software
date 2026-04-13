import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import {
  useTipDistributions,
  useGenerateTipDistributions,
  useConfirmTipDistribution,
  useBulkConfirmTipDistributions,
  useProcessTipPayout,
} from '@/hooks/useTipDistributions';
import { useStaffPayoutAccounts } from '@/hooks/useStaffPayoutAccount';
import { Loader2, Calendar, RefreshCw, CheckCircle2, Clock, Banknote, Wallet, AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  paid: { label: 'Paid', variant: 'outline' },
};

export function TipDistributionManager() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { formatCurrency } = useFormatCurrency();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMethod, setBulkMethod] = useState('cash');
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; amount: number } | null>(null);

  const { data: distributions = [], isLoading } = useTipDistributions(selectedDate);
  const { data: payoutAccounts = [] } = useStaffPayoutAccounts();
  const generateMutation = useGenerateTipDistributions();
  const confirmMutation = useConfirmTipDistribution();
  const bulkConfirmMutation = useBulkConfirmTipDistributions();
  const payoutMutation = useProcessTipPayout();

  // Build a lookup of verified payout accounts
  const verifiedAccountMap = new Map(
    payoutAccounts
      .filter(a => a.payouts_enabled)
      .map(a => [a.user_id, true])
  );

  const pendingDistributions = distributions.filter(d => d.status === 'pending');
  const totalTips = distributions.reduce((sum, d) => sum + Number(d.total_tips), 0);
  const pendingTotal = pendingDistributions.reduce((sum, d) => sum + Number(d.total_tips), 0);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pendingDistributions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingDistributions.map(d => d.id)));
    }
  };

  const handleGenerate = () => {
    if (!orgId) return;
    generateMutation.mutate({
      organization_id: orgId,
      distribution_date: selectedDate,
    });
  };

  const handleBulkConfirm = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !orgId) return;

    if (bulkMethod === 'direct_deposit') {
      // Validate all selected stylists have verified accounts
      const selectedDists = distributions.filter(d => ids.includes(d.id));
      const unverified = selectedDists.filter(d => !verifiedAccountMap.has(d.stylist_user_id));
      if (unverified.length > 0) {
        const names = unverified.map(d => d.stylist_name || 'Unknown').join(', ');
        toast.error(`Cannot process direct deposit: ${names} ${unverified.length === 1 ? 'has' : 'have'} no verified payout account`);
        return;
      }
      // Process each as a payout
      let completed = 0;
      const total = ids.length;
      for (const id of ids) {
        payoutMutation.mutate(
          { distribution_id: id, organization_id: orgId },
          {
            onSuccess: () => {
              completed++;
              if (completed === total) setSelectedIds(new Set());
            },
          }
        );
      }
    } else {
      bulkConfirmMutation.mutate({ ids, method: bulkMethod }, {
        onSuccess: () => setSelectedIds(new Set()),
      });
    }
  };

  const handleConfirmSingle = () => {
    if (!confirmTarget || !orgId) return;

    if (bulkMethod === 'direct_deposit') {
      const dist = distributions.find(d => d.id === confirmTarget.id);
      if (dist && !verifiedAccountMap.has(dist.stylist_user_id)) {
        toast.error('This staff member has no verified payout account. They must connect their bank account first.');
        return;
      }
      payoutMutation.mutate(
        { distribution_id: confirmTarget.id, organization_id: orgId },
        { onSuccess: () => setConfirmTarget(null) }
      );
    } else {
      confirmMutation.mutate({ id: confirmTarget.id, method: bulkMethod }, {
        onSuccess: () => setConfirmTarget(null),
      });
    }
  };

  const isProcessing = confirmMutation.isPending || payoutMutation.isPending;
  const isBulkProcessing = bulkConfirmMutation.isPending || payoutMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Tip Distributions</CardTitle>
                <MetricInfoTooltip description="Generate and confirm daily tip payouts for each service provider. Tips are aggregated from completed appointments." />
              </div>
              <CardDescription>Daily tip payout management</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-full border border-input bg-background text-sm"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              size="sm"
              className="rounded-full"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Generate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Staff Payout Accounts Summary (Admin visibility) */}
        {payoutAccounts.length > 0 && (
          <div className="mb-4 p-3 rounded-lg border border-border/60">
            <p className="text-xs font-display uppercase tracking-wide text-muted-foreground mb-2">Staff Payout Accounts</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{payoutAccounts.filter(a => a.payouts_enabled).length} verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{payoutAccounts.filter(a => !a.payouts_enabled && a.details_submitted).length} pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{payoutAccounts.filter(a => !a.details_submitted).length} not started</span>
              </div>
              <span className="text-muted-foreground">/ {payoutAccounts.length} total</span>
            </div>
          </div>
        )}

        {/* Summary bar */}
        {distributions.length > 0 && (
          <div className="flex items-center gap-6 mb-4 p-3 rounded-lg bg-muted/50">
            <div className="text-sm">
              <span className="text-muted-foreground">Total tips:</span>{' '}
              <span className="font-medium"><BlurredAmount>{formatCurrency(totalTips)}</BlurredAmount></span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Pending:</span>{' '}
              <span className="font-medium"><BlurredAmount>{formatCurrency(pendingTotal)}</BlurredAmount></span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Stylists:</span>{' '}
              <span className="font-medium">{distributions.length}</span>
            </div>
          </div>
        )}

        {/* Bulk actions */}
        {pendingDistributions.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <Select value={bulkMethod} onValueChange={setBulkMethod}>
              <SelectTrigger className="w-[160px] h-9 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="manual_transfer">Manual Transfer</SelectItem>
                <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                <SelectItem value="payroll">Include in Payroll</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={selectedIds.size === 0 || isBulkProcessing}
              onClick={handleBulkConfirm}
            >
              {isBulkProcessing && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Confirm Selected ({selectedIds.size})
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : distributions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No tip distributions"
            description="Click 'Generate' to calculate tip distributions from completed appointments for the selected date."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(tokens.table.columnHeader, 'w-10')}>
                  <Checkbox
                    checked={selectedIds.size === pendingDistributions.length && pendingDistributions.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
                <TableHead className={tokens.table.columnHeader}>Total Tips</TableHead>
                <TableHead className={tokens.table.columnHeader}>Cash</TableHead>
                <TableHead className={tokens.table.columnHeader}>Card</TableHead>
                <TableHead className={tokens.table.columnHeader}>Method</TableHead>
                <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions.map((dist) => {
                const status = STATUS_STYLES[dist.status] || STATUS_STYLES.pending;
                const isPending = dist.status === 'pending';
                const hasPayoutAccount = verifiedAccountMap.has(dist.stylist_user_id);
                return (
                  <TableRow key={dist.id}>
                    <TableCell>
                      {isPending && (
                        <Checkbox
                          checked={selectedIds.has(dist.id)}
                          onCheckedChange={() => toggleSelect(dist.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{dist.stylist_name || 'Unknown'}</span>
                        {bulkMethod === 'direct_deposit' && isPending && !hasPayoutAccount && (
                          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell><BlurredAmount>{formatCurrency(Number(dist.total_tips))}</BlurredAmount></TableCell>
                    <TableCell><BlurredAmount>{formatCurrency(Number(dist.cash_tips))}</BlurredAmount></TableCell>
                    <TableCell><BlurredAmount>{formatCurrency(Number(dist.card_tips))}</BlurredAmount></TableCell>
                    <TableCell className="capitalize">{dist.method.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="text-xs">
                        {dist.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {dist.status === 'confirmed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmTarget({
                            id: dist.id,
                            name: dist.stylist_name || 'Unknown',
                            amount: Number(dist.total_tips),
                          })}
                        >
                          Confirm
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Confirm single dialog */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Tip Distribution</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkMethod === 'direct_deposit'
                ? `Process ${formatCurrency(confirmTarget?.amount || 0)} direct deposit payout to ${confirmTarget?.name}? This will initiate a bank transfer.`
                : `Confirm ${formatCurrency(confirmTarget?.amount || 0)} tip payout to ${confirmTarget?.name} via ${bulkMethod.replace('_', ' ')}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <Button onClick={handleConfirmSingle} disabled={isProcessing}>
              {isProcessing && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {bulkMethod === 'direct_deposit' ? 'Process Payout' : 'Confirm'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
