import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tag, Ticket, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import type { PromoRedemption } from '@/hooks/useTransactionPromoDetails';

interface PromoRedemptionListProps {
  redemptions: PromoRedemption[];
  isLoading: boolean;
}

export function PromoRedemptionList({ redemptions, isLoading }: PromoRedemptionListProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrency } = useFormatCurrency();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [redemptions]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === redemptions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(redemptions.map(r => r.id)));
    }
  }, [redemptions, selectedIds.size]);

  const handleExportSelected = () => {
    const selected = redemptions.filter(r => selectedIds.has(r.id));
    if (selected.length === 0) return;
    const headers = ['Date', 'Promotion', 'Code', 'Client', 'Discount', 'Original', 'Final'];
    const rows = selected.map(r => [
      formatDate(new Date(r.redeemed_at), 'MM/dd/yyyy'),
      r.promotion_name,
      r.promo_code || '',
      r.client_name || 'Walk-in',
      r.discount_applied,
      r.original_amount ?? '',
      r.final_amount ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promo-redemptions-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </Card>
    );
  }

  if (redemptions.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Ticket className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No Promo Redemptions</h3>
        <p className={tokens.empty.description}>No promotion codes have been redeemed in this period.</p>
      </div>
    );
  }

  const allSelected = selectedIds.size === redemptions.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < redemptions.length;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pr-0">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => { if (el) (el as any).indeterminate = someSelected; }}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className={tokens.table.columnHeader}>Date</TableHead>
              <TableHead className={tokens.table.columnHeader}>Promotion</TableHead>
              <TableHead className={tokens.table.columnHeader}>Code</TableHead>
              <TableHead className={tokens.table.columnHeader}>Client</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Discount</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Original</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redemptions.map((r) => {
              const isSelected = selectedIds.has(r.id);
              return (
                <TableRow key={r.id} className={cn(isSelected && 'bg-muted/50')}>
                  <TableCell className="w-10 pr-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(r.id)}
                      aria-label={`Select ${r.promotion_name}`}
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(new Date(r.redeemed_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{r.promotion_name}</TableCell>
                  <TableCell>
                    {r.promo_code ? (
                      <Badge variant="outline" className="gap-1 border-primary/30 text-primary bg-primary/5">
                        <Tag className="w-3 h-3" />
                        {r.promo_code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{r.client_name || 'Walk-in')}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-amber-600">
                    <BlurredAmount>-{formatCurrency(r.discount_applied)}</BlurredAmount>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {r.original_amount != null ? (
                      <BlurredAmount>{formatCurrency(r.original_amount)}</BlurredAmount>
                    ) : '—')}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {r.final_amount != null ? (
                      <BlurredAmount>{formatCurrency(r.final_amount)}</BlurredAmount>
                    ) : '—')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer with count + batch bar */}
      <div className="border-t p-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {redemptions.length} redemption{redemptions.length !== 1 ? 's' : ''}
        </span>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="ghost" size={tokens.button.inline} onClick={() => setSelectedIds(new Set())} className="h-7 px-2">
              <X className="h-3 w-3" />
            </Button>
            <Button variant="outline" size={tokens.button.inline} onClick={handleExportSelected} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
