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
} from '@/hooks/useTipDistributions';
import { Loader2, Calendar, RefreshCw, CheckCircle2, Clock, Banknote, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
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
  const generateMutation = useGenerateTipDistributions();
  const confirmMutation = useConfirmTipDistribution();
  const bulkConfirmMutation = useBulkConfirmTipDistributions();

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
    if (ids.length === 0) return;
    bulkConfirmMutation.mutate({ ids, method: bulkMethod }, {
      onSuccess: () => setSelectedIds(new Set()),
    });
  };

  const handleConfirmSingle = () => {
    if (!confirmTarget) return;
    confirmMutation.mutate({ id: confirmTarget.id, method: bulkMethod }, {
      onSuccess: () => setConfirmTarget(null),
    });
  };

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
                <SelectItem value="payroll">Include in Payroll</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={selectedIds.size === 0 || bulkConfirmMutation.isPending}
              onClick={handleBulkConfirm}
            >
              {bulkConfirmMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
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
                    <TableCell className="font-medium">{dist.stylist_name || 'Unknown'}</TableCell>
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
              Confirm {formatCurrency(confirmTarget?.amount || 0)} tip payout to {confirmTarget?.name} via {bulkMethod.replace('_', ' ')}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmMutation.isPending}>Cancel</AlertDialogCancel>
            <Button onClick={handleConfirmSingle} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
