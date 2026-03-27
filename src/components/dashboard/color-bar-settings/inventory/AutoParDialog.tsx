/**
 * AutoParDialog — Review and apply velocity-based par level suggestions.
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Zap, Info } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useAutoParSuggestions, type AutoParSuggestion } from '@/hooks/backroom/useAutoParSuggestions';
import { useInlineStockEdit } from '@/hooks/backroom/useInlineStockEdit';
import { toast } from 'sonner';

interface AutoParDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  orgId: string;
  locationId?: string;
}

export function AutoParDialog({ open, onOpenChange, productIds, orgId, locationId }: AutoParDialogProps) {
  const { data: suggestions = [], isLoading } = useAutoParSuggestions(open ? productIds : []);
  const { updateMinMax } = useInlineStockEdit();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  // Auto-select products with velocity > 0 when data loads
  const initialized = useMemo(() => {
    if (suggestions.length > 0 && selectedIds.size === 0) {
      const withVelocity = suggestions.filter(s => s.velocity > 0).map(s => s.productId);
      if (withVelocity.length > 0) {
        setSelectedIds(new Set(withVelocity));
      }
    }
    return true;
  }, [suggestions]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    const toApply = suggestions.filter(s => selectedIds.has(s.productId) && s.suggestedPar > 0);
    if (toApply.length === 0) return;

    setApplying(true);
    let count = 0;

    for (const s of toApply) {
      try {
        await updateMinMax.mutateAsync({
          orgId,
          productId: s.productId,
          field: 'par_level',
          value: s.suggestedPar,
          oldValue: s.currentPar,
          locationId,
        });
        count++;
      } catch {
        // continue on individual failures
      }
    }

    setApplying(false);
    onOpenChange(false);
    toast.success(`Updated par levels for ${count} product${count !== 1 ? 's' : ''}`);
  };

  const selectedCount = suggestions.filter(s => selectedIds.has(s.productId) && s.suggestedPar > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">Auto-Set Par Levels</DialogTitle>
          <DialogDescription>
            Recommendations based on 28-day usage velocity and supplier lead times.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className={tokens.loading.spinner} />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 font-sans">
              No products to analyze.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(tokens.table.columnHeader, 'w-10')} />
                  <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Current</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Suggested</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Velocity</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden sm:table-cell')}>Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map(s => {
                  const hasVelocity = s.velocity > 0;
                  const changed = s.suggestedPar !== (s.currentPar ?? 0);
                  return (
                    <TableRow key={s.productId} className={cn(!hasVelocity && 'opacity-50')}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(s.productId)}
                          onCheckedChange={() => toggleSelect(s.productId)}
                          disabled={!hasVelocity || s.suggestedPar === 0}
                        />
                      </TableCell>
                      <TableCell className="text-sm font-sans">
                        {s.productName.replace(/\s*[—–-]\s*\d+(\.\d+)?\s*(g|oz|ml|L)\s*$/i, '').trim()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {s.currentPar ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.suggestedPar > 0 ? (
                          <span className={cn(changed && 'text-primary font-medium')}>
                            {s.suggestedPar}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                        {s.velocity > 0 ? `${s.velocity.toFixed(1)}/day` : '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs max-w-[200px] truncate" title={s.explanation}>
                        {hasVelocity ? s.explanation : 'No recent usage'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-sans">
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={applying || selectedCount === 0}
            className="font-sans"
          >
            {applying ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-1.5" />
                Apply {selectedCount} Par Level{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
