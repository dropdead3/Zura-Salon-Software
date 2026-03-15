import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import {
  useWholesalePriceQueue,
  useApprovePriceUpdate,
  useRejectPriceUpdate,
  useBatchApprovePriceUpdates,
  useTriggerPriceSync,
  type PriceQueueStatus,
} from '@/hooks/platform/useWholesalePriceQueue';
import { toast } from 'sonner';

function confidenceBadge(score: number) {
  if (score >= 0.9) return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-sans text-xs">{(score * 100).toFixed(0)}%</Badge>;
  if (score >= 0.7) return <Badge variant="secondary" className="font-sans text-xs">{(score * 100).toFixed(0)}%</Badge>;
  if (score >= 0.4) return <Badge variant="outline" className="text-amber-600 border-amber-500/30 font-sans text-xs">{(score * 100).toFixed(0)}%</Badge>;
  return <Badge variant="outline" className="text-destructive border-destructive/30 font-sans text-xs">{(score * 100).toFixed(0)}%</Badge>;
}

function statusBadge(status: PriceQueueStatus) {
  const map: Record<PriceQueueStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    auto_applied: { label: 'Auto-Applied', className: 'bg-primary/10 text-primary border-primary/20' },
  };
  const cfg = map[status];
  return <Badge variant="outline" className={cn('font-sans text-xs', cfg.className)}>{cfg.label}</Badge>;
}

export function PriceQueueTab() {
  const [statusFilter, setStatusFilter] = useState<PriceQueueStatus | 'all'>('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useWholesalePriceQueue(
    statusFilter === 'all' ? undefined : { status: statusFilter }
  );
  const approveMutation = useApprovePriceUpdate();
  const rejectMutation = useRejectPriceUpdate();
  const batchApprove = useBatchApprovePriceUpdates();
  const syncMutation = useTriggerPriceSync();

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleApprove = (item: typeof items[0]) => {
    approveMutation.mutate(
      { queueItemId: item.id, productId: item.product_id, wholesalePrice: item.wholesale_price },
      { onSuccess: () => toast.success(`Approved price update for ${item.product_name}`) }
    );
  };

  const handleReject = (item: typeof items[0]) => {
    rejectMutation.mutate(
      { queueItemId: item.id },
      { onSuccess: () => toast.success(`Rejected price update for ${item.product_name}`) }
    );
  };

  const handleBatchApprove = () => {
    const toApprove = items
      .filter((i) => selected.has(i.id))
      .map((i) => ({ queueItemId: i.id, productId: i.product_id, wholesalePrice: i.wholesale_price }));
    batchApprove.mutate(toApprove, {
      onSuccess: () => {
        toast.success(`Approved ${toApprove.length} price updates`);
        setSelected(new Set());
      },
    });
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (data) => toast.success(`Sync complete — ${data?.queued || 0} items queued`),
      onError: () => toast.error('Sync failed'),
    });
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <Card className="rounded-xl border-border/60 bg-card/80 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <AlertTriangle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Price Review Queue</CardTitle>
            <CardDescription className="font-sans text-sm">
              {pendingCount} pending review{pendingCount !== 1 ? 's' : ''}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-32 h-9 font-sans text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {selected.size > 0 && (
            <Button size="sm" onClick={handleBatchApprove} disabled={batchApprove.isPending} className="font-sans font-medium">
              <Check className="w-3.5 h-3.5 mr-1" />
              Approve ({selected.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncMutation.isPending} className="font-sans font-medium">
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncMutation.isPending && 'animate-spin')} />
            Sync Now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : items.length === 0 ? (
          <div className={cn(tokens.empty.container, 'py-16')}>
            <Check className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>Queue is clear</h3>
            <p className={tokens.empty.description}>No price updates awaiting review.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={selected.size === items.length && items.length > 0}
                    onCheckedChange={(checked) => {
                      setSelected(checked ? new Set(items.map((i) => i.id)) : new Set());
                    }}
                  />
                </TableHead>
                <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                <TableHead className={tokens.table.columnHeader}>Brand</TableHead>
                <TableHead className={tokens.table.columnHeader}>New Price</TableHead>
                <TableHead className={tokens.table.columnHeader}>Δ%</TableHead>
                <TableHead className={tokens.table.columnHeader}>Confidence</TableHead>
                <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                <TableHead className={cn(tokens.table.columnHeader, 'text-right pr-4')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      disabled={item.status !== 'pending'}
                    />
                  </TableCell>
                  <TableCell className="font-sans text-sm">
                    <div>{item.product_name}</div>
                    {item.sku && <span className="text-xs text-muted-foreground">{item.sku}</span>}
                    {item.notes && (
                      <p className="text-xs text-amber-600 mt-0.5">{item.notes}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-sans text-sm">{item.brand}</TableCell>
                  <TableCell className="font-sans text-sm tabular-nums">
                    ${item.wholesale_price.toFixed(2)}
                    {item.previous_price != null && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (was ${item.previous_price.toFixed(2)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-sans text-sm tabular-nums">
                    {item.price_delta_pct != null ? (
                      <span className={item.price_delta_pct > 0 ? 'text-destructive' : 'text-emerald-600'}>
                        {item.price_delta_pct > 0 ? '+' : ''}
                        {item.price_delta_pct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{confidenceBadge(item.confidence_score)}</TableCell>
                  <TableCell>{statusBadge(item.status)}</TableCell>
                  <TableCell className="text-right pr-4">
                    {item.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(item)}
                          disabled={approveMutation.isPending}
                          className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(item)}
                          disabled={rejectMutation.isPending}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
