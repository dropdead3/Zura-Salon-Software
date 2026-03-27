/**
 * TransfersTab — Inter-location stock transfer management.
 * Supports multi-product lines, quantity validation, dispatch/receive & verify flow,
 * batch templates, PDF export, and notifications.
 */

import { useState, useMemo } from 'react';
import { ArrowRight, Plus, Loader2, ArrowLeftRight, Check, XCircle, FileDown, Trash2, Truck, PackageCheck, Save, LayoutTemplate } from 'lucide-react';
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  useStockTransfers, useCreateStockTransfer, useCompleteStockTransfer,
  useCancelStockTransfer, useDispatchTransfer, usePendingOutboundQuantities,
} from '@/hooks/useStockTransfers';
import { useStockTransferLines, useBulkAddTransferLines } from '@/hooks/inventory/useStockTransferLines';
import {
  useTransferTemplates, useTransferTemplateLines, useCreateTransferTemplate, useDeleteTransferTemplate,
} from '@/hooks/inventory/useTransferTemplates';
import { useProducts } from '@/hooks/useProducts';
import { exportTransfersPdf } from '@/lib/exportTransfersPdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Location } from '@/hooks/useLocations';

const STATUS_FILTERS = ['all', 'pending', 'in_transit', 'completed', 'cancelled'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'outline', label: 'Pending' },
  in_transit: { variant: 'secondary', label: 'In Transit' },
  completed: { variant: 'default', label: 'Completed' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
};

interface TransferLine {
  product_id: string;
  quantity: string;
}

interface TransfersTabProps {
  locationId: string | undefined;
  locations: Location[];
}

export function TransfersTab({ locationId, locations }: TransfersTabProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'complete' | 'cancel' | 'dispatch'; transfer: any } | null>(null);
  const [hoveredTransferId, setHoveredTransferId] = useState<string | null>(null);

  // Receive & Verify state
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveTransfer, setReceiveTransfer] = useState<any>(null);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, { qty: string; notes: string }>>({});

  // Template save state
  const [templateSaveOpen, setTemplateSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { data: transfers = [], isLoading } = useStockTransfers({ status: statusFilter });
  const { data: allProducts = [] } = useProducts({});
  const createTransfer = useCreateStockTransfer();
  const completeTransfer = useCompleteStockTransfer();
  const cancelTransfer = useCancelStockTransfer();
  const dispatchTransfer = useDispatchTransfer();
  const bulkAddLines = useBulkAddTransferLines();

  // Templates
  const { data: templates = [] } = useTransferTemplates(orgId);
  const { data: selectedTemplateLines = [] } = useTransferTemplateLines(selectedTemplateId);
  const createTemplate = useCreateTransferTemplate();
  const deleteTemplate = useDeleteTransferTemplate();

  // Fetch lines for hovered transfer (for tooltip)
  const { data: hoveredLines = [] } = useStockTransferLines(hoveredTransferId);

  // Fetch lines for receive dialog
  const { data: receiveLines = [] } = useStockTransferLines(receiveTransfer?.id ?? null);

  // Build lookup maps
  const locationMap = useMemo(() => Object.fromEntries(locations.map(l => [l.id, l.name])), [locations]);
  const productMap = useMemo(() => Object.fromEntries(allProducts.map(p => [p.id, p])), [allProducts]);

  // --- New Transfer Dialog state ---
  const [fromLocId, setFromLocId] = useState(locationId || '');
  const [toLocId, setToLocId] = useState('');
  const [lines, setLines] = useState<TransferLine[]>([{ product_id: '', quantity: '' }]);
  const [notes, setNotes] = useState('');

  // Quantity validation — pending outbound from source location
  const { data: pendingOutbound = {} } = usePendingOutboundQuantities(fromLocId || undefined);

  const availableToLocations = useMemo(() => locations.filter(l => l.id !== fromLocId), [locations, fromLocId]);

  const getAvailableQty = (productId: string) => {
    const product = productMap[productId];
    if (!product) return 0;
    const onHand = (product as any).quantity_on_hand ?? 0;
    const committed = pendingOutbound[productId] || 0;
    return Math.max(0, onHand - committed);
  };

  const resetDialog = () => {
    setFromLocId(locationId || locations[0]?.id || '');
    setToLocId('');
    setLines([{ product_id: '', quantity: '' }]);
    setNotes('');
  };

  const handleOpenDialog = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const updateLine = (index: number, field: keyof TransferLine, value: string) => {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const removeLine = (index: number) => {
    setLines(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const addLine = () => {
    setLines(prev => [...prev, { product_id: '', quantity: '' }]);
  };

  // Validation: check each line doesn't exceed available stock
  const lineValidations = lines.map(l => {
    if (!l.product_id || !l.quantity) return { valid: true, available: 0, exceeded: false };
    const available = getAvailableQty(l.product_id);
    const qty = Number(l.quantity);
    return { valid: qty > 0 && qty <= available, available, exceeded: qty > available };
  });

  const validLines = lines.filter((l, i) => l.product_id && l.quantity && Number(l.quantity) > 0 && lineValidations[i]?.valid);
  const hasExceeded = lineValidations.some(v => v.exceeded);
  const canCreate = !!fromLocId && !!toLocId && validLines.length > 0 && !hasExceeded;

  const handleCreate = () => {
    if (!orgId || !canCreate) return;
    const firstLine = validLines[0];

    createTransfer.mutate({
      organization_id: orgId,
      product_id: firstLine.product_id,
      from_location_id: fromLocId,
      to_location_id: toLocId,
      quantity: validLines.reduce((sum, l) => sum + Number(l.quantity), 0),
      notes: notes || undefined,
    }, {
      onSuccess: (data: any) => {
        if (validLines.length > 0) {
          bulkAddLines.mutate({
            transfer_id: data.id,
            lines: validLines.map(l => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
          });
        }

        supabase.functions.invoke('notify-transfer-request', {
          body: {
            transferId: data.id,
            organizationId: orgId,
            toLocationId: toLocId,
            fromLocationName: locationMap[fromLocId] || 'Unknown',
            toLocationName: locationMap[toLocId] || 'Unknown',
          },
        }).catch(() => {});

        setDialogOpen(false);
      },
    });
  };

  // Template: load from template
  const handleLoadTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      if (tmpl.from_location_id) setFromLocId(tmpl.from_location_id);
      if (tmpl.to_location_id) setToLocId(tmpl.to_location_id);
      setNotes(tmpl.notes || '');
    }
  };

  // When template lines load, populate dialog lines
  useMemo(() => {
    if (selectedTemplateLines.length > 0) {
      setLines(selectedTemplateLines.map(l => ({
        product_id: l.product_id,
        quantity: String(l.quantity),
      })));
      setSelectedTemplateId(null);
    }
  }, [selectedTemplateLines]);

  // Template: save current dialog as template
  const handleSaveTemplate = () => {
    if (!orgId || !templateName.trim() || validLines.length === 0) return;
    createTemplate.mutate({
      organization_id: orgId,
      name: templateName.trim(),
      from_location_id: fromLocId,
      to_location_id: toLocId,
      notes: notes || undefined,
      lines: validLines.map(l => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
    }, {
      onSuccess: () => {
        setTemplateSaveOpen(false);
        setTemplateName('');
      },
    });
  };

  // Dispatch handler
  const handleDispatch = (transferId: string) => {
    dispatchTransfer.mutate(transferId);
  };

  // Open Receive & Verify dialog
  const handleOpenReceiveDialog = (transfer: any) => {
    setReceiveTransfer(transfer);
    setReceivedQuantities({});
    setReceiveDialogOpen(true);
  };

  // Initialize received quantities when lines load
  useMemo(() => {
    if (receiveLines.length > 0 && receiveTransfer) {
      const init: Record<string, { qty: string; notes: string }> = {};
      receiveLines.forEach(l => {
        init[l.id] = { qty: String(l.quantity), notes: '' };
      });
      setReceivedQuantities(init);
    }
  }, [receiveLines, receiveTransfer]);

  const handleCompleteReceive = () => {
    if (!receiveTransfer) return;
    const t = receiveTransfer;
    const receivedLineData = receiveLines.map(l => ({
      lineId: l.id,
      productId: l.product_id,
      expectedQty: l.quantity,
      receivedQty: Number(receivedQuantities[l.id]?.qty || l.quantity),
      notes: receivedQuantities[l.id]?.notes || undefined,
    }));

    completeTransfer.mutate({
      transferId: t.id,
      productId: t.product_id,
      quantity: t.quantity,
      fromLocationId: t.from_location_id,
      toLocationId: t.to_location_id,
      organizationId: t.organization_id,
      receivedLines: receivedLineData.length > 0 ? receivedLineData : undefined,
    }, {
      onSettled: () => {
        setReceiveDialogOpen(false);
        setReceiveTransfer(null);
      },
    });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const t = confirmAction.transfer;
    if (confirmAction.type === 'dispatch') {
      handleDispatch(t.id);
      setConfirmAction(null);
    } else if (confirmAction.type === 'complete') {
      // Legacy direct complete (no lines)
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

  const handleExportPdf = async () => {
    if (transfers.length === 0) {
      toast.info('No transfers to export');
      return;
    }

    const transferIds = transfers.map(t => t.id);
    const { data: allLines } = await supabase
      .from('stock_transfer_lines')
      .select('transfer_id, product_id, quantity')
      .in('transfer_id', transferIds);

    const linesMap: Record<string, { product_id: string; quantity: number }[]> = {};
    (allLines || []).forEach((l: any) => {
      if (!linesMap[l.transfer_id]) linesMap[l.transfer_id] = [];
      linesMap[l.transfer_id].push({ product_id: l.product_id, quantity: l.quantity });
    });

    exportTransfersPdf({
      transfers,
      locationMap,
      productMap,
      orgName: effectiveOrganization?.name,
      linesMap,
    });
    toast.success('PDF downloaded');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className="font-sans rounded-full capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s === 'in_transit' ? 'In Transit' : s}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-sans rounded-full gap-1.5" onClick={handleExportPdf}>
            <FileDown className="w-4 h-4" /> PDF
          </Button>

          {/* From Template dropdown */}
          {templates.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="font-sans rounded-full gap-1.5">
                  <LayoutTemplate className="w-4 h-4" /> From Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {templates.map(tmpl => (
                  <DropdownMenuItem key={tmpl.id} onClick={() => { handleLoadTemplate(tmpl.id); setDialogOpen(true); }}>
                    {tmpl.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button size="sm" className="font-sans rounded-full gap-1.5" onClick={handleOpenDialog}>
            <Plus className="w-4 h-4" /> New Transfer
          </Button>
        </div>
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
                  : `No ${statusFilter === 'in_transit' ? 'in-transit' : statusFilter} transfers.`}
              </p>
            </div>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                    <TableHead className={tokens.table.columnHeader}>From → To</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Product(s)</TableHead>
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
                          <Tooltip>
                            <TooltipTrigger
                              asChild
                              onMouseEnter={() => setHoveredTransferId(t.id)}
                              onMouseLeave={() => setHoveredTransferId(null)}
                            >
                              <span className={cn(tokens.body.default, 'cursor-default')}>
                                {product?.name || 'Unknown product'}
                                {product?.sku && (
                                  <span className="ml-2 text-xs text-muted-foreground font-mono">{product.sku}</span>
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              {hoveredLines.length > 0 ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium">{hoveredLines.length} product(s):</p>
                                  {hoveredLines.map((line, i) => (
                                    <p key={i} className="text-xs">
                                      {productMap[line.product_id]?.name || 'Unknown'} × {line.quantity}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs">{product?.name || 'Unknown'} × {t.quantity}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
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
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-primary"
                                    onClick={() => setConfirmAction({ type: 'dispatch', transfer: t })}
                                  >
                                    <Truck className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Dispatch</TooltipContent>
                              </Tooltip>
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
                          {t.status === 'in_transit' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary"
                                  onClick={() => handleOpenReceiveDialog(t)}
                                >
                                  <PackageCheck className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Receive & Verify</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* New Transfer Dialog — Multi-Product with Validation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>Move inventory from one location to another. Add multiple products below.</DialogDescription>
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

            {/* Line Items with validation */}
            <div className="space-y-2">
              <Label className={tokens.label.default}>Products</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {lines.map((line, index) => {
                  const validation = lineValidations[index];
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Select value={line.product_id} onValueChange={(v) => updateLine(index, 'product_id', v)}>
                          <SelectTrigger className="flex-1 min-w-0">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {allProducts.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="flex items-center gap-2">
                                  <span className="truncate">{p.name}</span>
                                  {p.sku && <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={e => updateLine(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className={cn('w-20', validation?.exceeded && 'border-destructive text-destructive')}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Available stock indicator */}
                      {line.product_id && fromLocId && (
                        <p className={cn(
                          'text-xs pl-1',
                          validation?.exceeded ? 'text-destructive' : 'text-muted-foreground'
                        )}>
                          Available: {validation?.available ?? 0}
                          {validation?.exceeded && ' — exceeds available stock'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" className="font-sans gap-1.5" onClick={addLine}>
                <Plus className="w-3.5 h-3.5" /> Add Product
              </Button>
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 mr-auto">
              {validLines.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-sans gap-1.5 text-muted-foreground"
                  onClick={() => { setTemplateSaveOpen(true); }}
                >
                  <Save className="w-3.5 h-3.5" /> Save as Template
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate || createTransfer.isPending}
            >
              {createTransfer.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create Transfer ({validLines.length} item{validLines.length !== 1 ? 's' : ''})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={templateSaveOpen} onOpenChange={setTemplateSaveOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Name this template for quick reuse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g. Weekly Warehouse Replenishment"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateSaveOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || createTemplate.isPending}
            >
              {createTemplate.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive & Verify Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={(open) => { if (!open) { setReceiveDialogOpen(false); setReceiveTransfer(null); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Receive & Verify Transfer</DialogTitle>
            <DialogDescription>
              Confirm the quantities actually received. Discrepancies will be logged automatically.
            </DialogDescription>
          </DialogHeader>
          {receiveTransfer && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{locationMap[receiveTransfer.from_location_id] || 'Unknown'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{locationMap[receiveTransfer.to_location_id] || 'Unknown'}</span>
              </div>

              {receiveLines.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {receiveLines.map(line => {
                    const product = productMap[line.product_id];
                    const rq = receivedQuantities[line.id];
                    const receivedQty = Number(rq?.qty || line.quantity);
                    const hasDiscrepancy = receivedQty !== line.quantity;
                    return (
                      <div key={line.id} className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className={tokens.body.emphasis}>{product?.name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">Expected: {line.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground shrink-0">Received:</Label>
                          <Input
                            type="number"
                            min={0}
                            value={rq?.qty ?? String(line.quantity)}
                            onChange={e => setReceivedQuantities(prev => ({
                              ...prev,
                              [line.id]: { ...prev[line.id], qty: e.target.value },
                            }))}
                            className={cn('w-20', hasDiscrepancy && 'border-warning text-warning')}
                          />
                          {hasDiscrepancy && (
                            <Input
                              value={rq?.notes || ''}
                              onChange={e => setReceivedQuantities(prev => ({
                                ...prev,
                                [line.id]: { ...prev[line.id], notes: e.target.value },
                              }))}
                              placeholder="Discrepancy notes..."
                              className="flex-1 text-sm"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No line items found. This transfer will complete using the parent record quantities.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReceiveDialogOpen(false); setReceiveTransfer(null); }}>Cancel</Button>
            <Button
              onClick={handleCompleteReceive}
              disabled={completeTransfer.isPending}
            >
              {completeTransfer.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirm & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dispatch/Cancel Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'dispatch' ? 'Dispatch Transfer?' :
               confirmAction?.type === 'complete' ? 'Complete Transfer?' : 'Cancel Transfer?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'dispatch'
                ? 'This will mark the transfer as in-transit. The destination location will be able to receive and verify the shipment.'
                : confirmAction?.type === 'complete'
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
              {(completeTransfer.isPending || cancelTransfer.isPending || dispatchTransfer.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {confirmAction?.type === 'dispatch' ? 'Dispatch' :
               confirmAction?.type === 'complete' ? 'Complete' : 'Cancel Transfer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
