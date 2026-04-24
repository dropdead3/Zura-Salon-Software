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
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import { Select, SelectValue, PlatformSelectContent as SelectContent, PlatformSelectItem as SelectItem, PlatformSelectTrigger as SelectTrigger } from '@/components/platform/ui/PlatformSelect';
import { PlatformCheckbox as Checkbox } from '@/components/platform/ui/PlatformCheckbox';
import { Check, X, RefreshCw, AlertTriangle, Loader2, History, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useWholesalePriceQueue,
  useApprovePriceUpdate,
  useRejectPriceUpdate,
  useBatchApprovePriceUpdates,
  useTriggerPriceSync,
  type PriceQueueStatus,
  type WholesalePriceQueueItem,
} from '@/hooks/platform/useWholesalePriceQueue';
import { RejectNoteDialog } from './RejectNoteDialog';
import { PriceHistoryDialog } from './PriceHistoryDialog';
import { toast } from 'sonner';

const PAGE_SIZE = 25;

function confidenceBadge(score: number) {
  if (score >= 0.9) return <PlatformBadge variant="success" size="sm">{(score * 100).toFixed(0)}%</PlatformBadge>;
  if (score >= 0.7) return <PlatformBadge variant="default" size="sm">{(score * 100).toFixed(0)}%</PlatformBadge>;
  if (score >= 0.4) return <PlatformBadge variant="warning" size="sm">{(score * 100).toFixed(0)}%</PlatformBadge>;
  return <PlatformBadge variant="error" size="sm">{(score * 100).toFixed(0)}%</PlatformBadge>;
}

function statusBadge(status: PriceQueueStatus) {
  const map: Record<PriceQueueStatus, { label: string; variant: 'warning' | 'success' | 'error' | 'primary' }> = {
    pending: { label: 'Pending', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'error' },
    auto_applied: { label: 'Auto-Applied', variant: 'primary' },
  };
  const cfg = map[status];
  return <PlatformBadge variant={cfg.variant} size="sm">{cfg.label}</PlatformBadge>;
}

export function PriceQueueTab() {
  const [statusFilter, setStatusFilter] = useState<PriceQueueStatus | 'all'>('pending');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});

  const [rejectTarget, setRejectTarget] = useState<WholesalePriceQueueItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ productName: string; brand: string } | null>(null);

  const { data: allItems = [], isLoading } = useWholesalePriceQueue(
    statusFilter === 'all' ? undefined : { status: statusFilter }
  );

  const filteredItems = brandFilter === 'all' ? allItems : allItems.filter((i) => i.brand === brandFilter);
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const items = filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const brands = [...new Set(allItems.map((i) => i.brand))].sort();

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

  const getEffectivePrice = (item: WholesalePriceQueueItem) => {
    const edited = editingPrices[item.id];
    if (edited !== undefined) {
      const parsed = parseFloat(edited);
      return isNaN(parsed) ? item.wholesale_price : parsed;
    }
    return item.wholesale_price;
  };

  const handleApprove = (item: WholesalePriceQueueItem) => {
    const price = getEffectivePrice(item);
    approveMutation.mutate(
      { queueItemId: item.id, productId: item.product_id, wholesalePrice: price },
      {
        onSuccess: () => {
          toast.success(`Approved price update for ${item.product_name}`);
          setEditingPrices((p) => { const n = { ...p }; delete n[item.id]; return n; });
        },
      }
    );
  };

  const handleRejectConfirm = (notes: string) => {
    if (!rejectTarget) return;
    rejectMutation.mutate(
      { queueItemId: rejectTarget.id, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success(`Rejected price update for ${rejectTarget.product_name}`);
          setRejectTarget(null);
        },
      }
    );
  };

  const handleBatchApprove = () => {
    const toApprove = filteredItems
      .filter((i) => selected.has(i.id))
      .map((i) => ({ queueItemId: i.id, productId: i.product_id, wholesalePrice: getEffectivePrice(i) }));
    batchApprove.mutate(toApprove, {
      onSuccess: () => {
        toast.success(`Approved ${toApprove.length} price updates`);
        setSelected(new Set());
      },
    });
  };

  const handleBatchReject = () => {
    const toReject = filteredItems.filter((i) => selected.has(i.id) && i.status === 'pending');
    Promise.all(
      toReject.map((i) =>
        rejectMutation.mutateAsync({ queueItemId: i.id, notes: 'Batch rejected' })
      )
    ).then(() => {
      toast.success(`Rejected ${toReject.length} price updates`);
      setSelected(new Set());
    });
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (data) => toast.success(`Sync complete — ${data?.queued || 0} items queued`),
      onError: () => toast.error('Sync failed'),
    });
  };

  const pendingCount = allItems.filter((i) => i.status === 'pending').length;

  return (
    <>
      <PlatformCard variant="glass">
        <PlatformCardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <PlatformCardTitle>Price Review Queue</PlatformCardTitle>
              <PlatformCardDescription>
                {pendingCount} pending review{pendingCount !== 1 ? 's' : ''} · {filteredItems.length} total
              </PlatformCardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(0); }}>
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
            <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36 h-9 font-sans text-sm">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected.size > 0 && (
              <>
                <PlatformButton size="sm" onClick={handleBatchApprove} disabled={batchApprove.isPending}>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Approve ({selected.size})
                </PlatformButton>
                <PlatformButton size="sm" variant="destructive" onClick={handleBatchReject} disabled={rejectMutation.isPending}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reject ({selected.size})
                </PlatformButton>
              </>
            )}
            <PlatformButton variant="outline" size="sm" onClick={handleSync} disabled={syncMutation.isPending}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncMutation.isPending && 'animate-spin')} />
              Sync Now
            </PlatformButton>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="p-0">
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
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-[hsl(var(--platform-border)/0.5)]">
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={selected.size === items.length && items.length > 0}
                        onCheckedChange={(checked) => {
                          setSelected(checked ? new Set(items.filter((i) => i.status === 'pending').map((i) => i.id)) : new Set());
                        }}
                      />
                    </TableHead>
                    <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Product</TableHead>
                    <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Brand</TableHead>
                    <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">New Price</TableHead>
                    <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Δ%</TableHead>
                    <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Confidence</TableHead>
                    <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Status</TableHead>
                    <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-[hsl(var(--platform-border)/0.3)]">
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          disabled={item.status !== 'pending'}
                        />
                      </TableCell>
                      <TableCell className="font-sans text-sm text-[hsl(var(--platform-foreground))]">
                        <div>{item.product_name}</div>
                        {item.sku && <span className="text-xs text-[hsl(var(--platform-foreground-subtle))]">{item.sku}</span>}
                        {item.notes && (
                          <p className="text-xs text-amber-400 mt-0.5">{item.notes}</p>
                        )}
                      </TableCell>
                      <TableCell className="font-sans text-sm text-[hsl(var(--platform-foreground)/0.85)]">{item.brand}</TableCell>
                      <TableCell className="font-sans text-sm tabular-nums text-[hsl(var(--platform-foreground))]">
                        {item.status === 'pending' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[hsl(var(--platform-foreground-subtle))]">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editingPrices[item.id] ?? item.wholesale_price.toFixed(2)}
                              onChange={(e) => setEditingPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                              className="h-7 w-20 font-sans text-sm tabular-nums px-1.5 rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] text-[hsl(var(--platform-foreground))] focus:border-[hsl(var(--platform-primary)/0.5)] focus:outline-none"
                            />
                          </div>
                        ) : (
                          <>
                            ${item.wholesale_price.toFixed(2)}
                            {item.previous_price != null && (
                              <span className="text-xs text-[hsl(var(--platform-foreground-subtle))] ml-1">
                                (was ${item.previous_price.toFixed(2)})
                              </span>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="font-sans text-sm tabular-nums">
                        {item.price_delta_pct != null ? (
                          <span className={item.price_delta_pct > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {item.price_delta_pct > 0 ? '+' : ''}
                            {item.price_delta_pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-[hsl(var(--platform-foreground-subtle))]">—</span>
                        )}
                      </TableCell>
                      <TableCell>{confidenceBadge(item.confidence_score)}</TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <PlatformButton
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setHistoryTarget({ productName: item.product_name, brand: item.brand })}
                            title="View price history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </PlatformButton>
                          {item.status === 'pending' && (
                            <>
                              <PlatformButton
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleApprove(item)}
                                disabled={approveMutation.isPending}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </PlatformButton>
                              <PlatformButton
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setRejectTarget(item)}
                                disabled={rejectMutation.isPending}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <X className="w-3.5 h-3.5" />
                              </PlatformButton>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--platform-border)/0.3)]">
                  <span className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))]">
                    Page {page + 1} of {totalPages} · {filteredItems.length} items
                  </span>
                  <div className="flex items-center gap-1">
                    <PlatformButton variant="ghost" size="icon-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </PlatformButton>
                    <PlatformButton variant="ghost" size="icon-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </PlatformButton>
                  </div>
                </div>
              )}
            </>
          )}
        </PlatformCardContent>
      </PlatformCard>

      <RejectNoteDialog
        open={!!rejectTarget}
        onOpenChange={(v) => { if (!v) setRejectTarget(null); }}
        productName={rejectTarget?.product_name || ''}
        onConfirm={handleRejectConfirm}
        isPending={rejectMutation.isPending}
      />

      <PriceHistoryDialog
        open={!!historyTarget}
        onOpenChange={(v) => { if (!v) setHistoryTarget(null); }}
        productName={historyTarget?.productName || ''}
        brand={historyTarget?.brand || ''}
      />
    </>
  );
}