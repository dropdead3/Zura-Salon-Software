/**
 * TransfersTab — Inter-location stock transfer management.
 * Create, view, complete, and cancel transfers between locations.
 */

import { useState, useMemo } from 'react';
import { ArrowRight, Plus, Loader2, ArrowLeftRight, Check, XCircle, Package } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useStockTransfers, useCreateStockTransfer, useCompleteStockTransfer, useCancelStockTransfer } from '@/hooks/useStockTransfers';
import { useProducts } from '@/hooks/useProducts';
import type { Location } from '@/hooks/useLocations';

const STATUS_FILTERS = ['all', 'pending', 'completed', 'cancelled'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'outline', label: 'Pending' },
  completed: { variant: 'default', label: 'Completed' },
  cancelled: { variant: 'secondary', label: 'Cancelled' },
};

interface TransfersTabProps {
  locationId: string | undefined;
  locations: Location[];
}

export function TransfersTab({ locationId, locations }: TransfersTabProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'complete' | 'cancel'; transfer: any } | null>(null);

  const { data: transfers = [], isLoading } = useStockTransfers({ status: statusFilter });
  const { data: allProducts = [] } = useProducts({});
  const createTransfer = useCreateStockTransfer();
  const completeTransfer = useCompleteStockTransfer();
  const cancelTransfer = useCancelStockTransfer();

  // Build lookup maps
  const locationMap = useMemo(() => Object.fromEntries(locations.map(l => [l.id, l.name])), [locations]);
  const productMap = useMemo(() => Object.fromEntries(allProducts.map(p => [p.id, p])), [allProducts]);

  // --- New Transfer Dialog state ---
  const [fromLocId, setFromLocId] = useState(locationId || '');
  const [toLocId, setToLocId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const availableToLocations = useMemo(() => locations.filter(l => l.id !== fromLocId), [locations, fromLocId]);

  const resetDialog = () => {
    setFromLocId(locationId || locations[0]?.id || '');
    setToLocId('');
    setSelectedProductId('');
    setQuantity('');
    setNotes('');
  };

  const handleOpenDialog = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const handleCreate = () => {
    if (!orgId || !selectedProductId || !fromLocId || !toLocId || !quantity) return;
    createTransfer.mutate({
      organization_id: orgId,
      product_id: selectedProductId,
      from_location_id: fromLocId,
      to_location_id: toLocId,
      quantity: Number(quantity),
      notes: notes || undefined,
    }, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const t = confirmAction.transfer;
    if (confirmAction.type === 'complete') {
      completeTransfer.mutate({
        transferId: t.id,
        productId: t.product_id,
        quantity: t.quantity,
        fromLocationId: t.from_location_id,
        toLocationId: t.to_location_id,
        organizationId: t.organization_id,
      }, { onSettled: () => setConfirmAction(null) });
    } else {
      cancelTransfer.mutate(t.id, { onSettled: () => setConfirmAction(null) });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className="font-sans rounded-full capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>
        <Button size="sm" className="font-sans rounded-full gap-1.5" onClick={handleOpenDialog}>
          <Plus className="w-4 h-4" /> New Transfer
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card/80 backdrop-blur-xl border-border rounded-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
            </div>
          ) : transfers.length === 0 ? (
            <div className={tokens.empty.container}>
              <ArrowLeftRight className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No transfers found</h3>
              <p className={tokens.empty.description}>
                {statusFilter === 'all'
                  ? 'Create a transfer to move inventory between locations.'
                  : `No ${statusFilter} transfers.`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                  <TableHead className={tokens.table.columnHeader}>From → To</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Qty</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map(t => {
                  const product = productMap[t.product_id];
                  const badge = STATUS_BADGE[t.status] || { variant: 'outline' as const, label: t.status };
                  return (
                    <TableRow key={t.id}>
                      <TableCell className={tokens.body.muted}>
                        {format(new Date(t.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className={tokens.body.emphasis}>{locationMap[t.from_location_id] || 'Unknown'}</span>
                        <ArrowRight className="inline w-3.5 h-3.5 mx-1.5 text-muted-foreground" />
                        <span className={tokens.body.emphasis}>{locationMap[t.to_location_id] || 'Unknown'}</span>
                      </TableCell>
                      <TableCell>
                        <span className={tokens.body.default}>{product?.name || 'Unknown product'}</span>
                        {product?.sku && (
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{product.sku}</span>
                        )}
                      </TableCell>
                      <TableCell className={cn(tokens.body.emphasis, 'text-right tabular-nums')}>
                        {t.quantity}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className="font-sans capitalize">{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {t.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
                              onClick={() => setConfirmAction({ type: 'complete', transfer: t })}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setConfirmAction({ type: 'cancel', transfer: t })}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>Move inventory from one location to another.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={tokens.label.default}>From Location</Label>
                <Select value={fromLocId} onValueChange={(v) => { setFromLocId(v); if (toLocId === v) setToLocId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={tokens.label.default}>To Location</Label>
                <Select value={toLocId} onValueChange={setToLocId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {availableToLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger><SelectValue placeholder="Search or select product" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {allProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.sku && <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Reason for transfer..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!fromLocId || !toLocId || !selectedProductId || !quantity || Number(quantity) <= 0 || createTransfer.isPending}
            >
              {createTransfer.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Complete/Cancel Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'complete' ? 'Complete Transfer?' : 'Cancel Transfer?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'complete'
                ? 'This will deduct inventory from the source location and add it to the destination. This action cannot be undone.'
                : 'This will cancel the pending transfer. No inventory will be moved.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmAction?.type === 'cancel' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {(completeTransfer.isPending || cancelTransfer.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {confirmAction?.type === 'complete' ? 'Complete' : 'Cancel Transfer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
