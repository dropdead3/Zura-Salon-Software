/**
 * AutoCreatePODialog — Confirmation dialog for bulk PO creation.
 * Groups products by supplier, shows line counts and estimated costs,
 * and creates draft POs via useCreateMultiLinePO.
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
import { Loader2, AlertTriangle, Truck, Package } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useCreateMultiLinePO } from '@/hooks/inventory/usePurchaseOrderLines';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { toast } from 'sonner';
import type { BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';

interface SupplierGroup {
  supplierName: string;
  supplierEmail: string | null;
  products: BackroomInventoryRow[];
  lineCount: number;
  estimatedCost: number;
}

interface AutoCreatePODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: BackroomInventoryRow[];
  organizationId: string;
  onSuccess?: () => void;
}

export function AutoCreatePODialog({
  open,
  onOpenChange,
  products,
  organizationId,
  onSuccess,
}: AutoCreatePODialogProps) {
  const createPO = useCreateMultiLinePO();
  const { formatCurrency } = useFormatCurrency();
  const [creating, setCreating] = useState(false);

  const { supplierGroups, unassigned } = useMemo(() => {
    const groupMap = new Map<string, SupplierGroup>();
    const unassigned: BackroomInventoryRow[] = [];

    for (const p of products) {
      if (p.recommended_order_qty <= 0) continue;
      if (!p.supplier_name) {
        unassigned.push(p);
        continue;
      }
      const key = p.supplier_name;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          supplierName: p.supplier_name,
          supplierEmail: p.supplier_email,
          products: [],
          lineCount: 0,
          estimatedCost: 0,
        });
      }
      const g = groupMap.get(key)!;
      g.products.push(p);
      g.lineCount += 1;
      g.estimatedCost += p.recommended_order_qty * (p.cost_price ?? p.cost_per_gram ?? 0);
    }

    return {
      supplierGroups: Array.from(groupMap.values()).sort((a, b) => a.supplierName.localeCompare(b.supplierName)),
      unassigned,
    };
  }, [products]);

  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(
    new Set(supplierGroups.map(g => g.supplierName))
  );

  // Reset selections when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedSuppliers(new Set(supplierGroups.map(g => g.supplierName)));
    }
    onOpenChange(isOpen);
  };

  const toggleSupplier = (name: string) => {
    setSelectedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectedGroups = supplierGroups.filter(g => selectedSuppliers.has(g.supplierName));
  const totalPOs = selectedGroups.length;
  const totalLines = selectedGroups.reduce((s, g) => s + g.lineCount, 0);
  const totalCost = selectedGroups.reduce((s, g) => s + g.estimatedCost, 0);

  const handleCreate = async () => {
    if (totalPOs === 0) return;
    setCreating(true);
    let created = 0;

    try {
      for (const group of selectedGroups) {
        await createPO.mutateAsync({
          organization_id: organizationId,
          supplier_name: group.supplierName,
          supplier_email: group.supplierEmail ?? undefined,
          notes: `Auto-generated reorder PO for ${group.supplierName}`,
          lines: group.products.map(p => ({
            product_id: p.id,
            quantity_ordered: p.recommended_order_qty,
            unit_cost: p.cost_price ?? p.cost_per_gram ?? undefined,
          })),
        });
        created++;
      }

      toast.success(`Created ${created} draft PO${created !== 1 ? 's' : ''}`, {
        description: 'Review them in the Orders tab before sending.',
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(`Created ${created}/${totalPOs} POs. Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className={tokens.card.title}>Auto Create Purchase Orders</DialogTitle>
          <DialogDescription>
            Review supplier groupings below. Draft POs will be created — no emails are sent until you review and send from the Orders tab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {supplierGroups.length === 0 && unassigned.length === 0 && (
            <div className={tokens.empty.container}>
              <Package className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No products need reorder</h3>
              <p className={tokens.empty.description}>All stock levels are above reorder thresholds.</p>
            </div>
          )}

          {supplierGroups.map(group => (
            <div
              key={group.supplierName}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                selectedSuppliers.has(group.supplierName)
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border/40 bg-muted/20 opacity-60'
              )}
            >
              <Checkbox
                checked={selectedSuppliers.has(group.supplierName)}
                onCheckedChange={() => toggleSupplier(group.supplierName)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-sans text-sm font-medium truncate">{group.supplierName}</span>
                </div>
                {group.supplierEmail && (
                  <span className="text-muted-foreground text-xs truncate block">{group.supplierEmail}</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm tabular-nums font-medium">{group.lineCount} item{group.lineCount !== 1 ? 's' : ''}</div>
                <div className="text-xs text-muted-foreground tabular-nums">~{formatCurrency(group.estimatedCost)}</div>
              </div>
            </div>
          ))}

          {unassigned.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-warning/30 bg-warning/5">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <span className="font-sans text-sm font-medium text-warning">
                  {unassigned.length} product{unassigned.length !== 1 ? 's' : ''} without supplier
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These will be skipped. Assign a supplier via the brand header to include them.
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {unassigned.slice(0, 5).map(p => (
                    <Badge key={p.id} variant="outline" className="text-[10px] font-medium">
                      {p.name.replace(/\s*[—–-]\s*\d+(\.\d+)?\s*(g|oz|ml|L)\s*$/i, '').trim()}
                    </Badge>
                  ))}
                  {unassigned.length > 5 && (
                    <Badge variant="outline" className="text-[10px] font-medium">
                      +{unassigned.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {totalPOs > 0 && (
          <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
            <span>{totalPOs} PO{totalPOs !== 1 ? 's' : ''} · {totalLines} line{totalLines !== 1 ? 's' : ''}</span>
            <span className="tabular-nums">Est. total: {formatCurrency(totalCost)}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || totalPOs === 0}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Creating...
              </>
            ) : (
              `Create ${totalPOs} Draft PO${totalPOs !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
