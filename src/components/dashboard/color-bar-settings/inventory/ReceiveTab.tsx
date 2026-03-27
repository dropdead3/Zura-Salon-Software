/**
 * ReceiveTab — Shipment receiving workflow (line-by-line).
 * Lists POs that are sent/partially received. Expand to receive per line item.
 */

import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Truck, CheckCircle2, Package, ChevronDown, ChevronRight, AlertTriangle, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  PlatformAlertDialogContent,
  PlatformAlertDialogTitle,
  PlatformAlertDialogDescription,
  PlatformAlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/platform/ui/PlatformDialog';
import type { ReceiveShipmentInput } from '@/hooks/inventory/useReceiveShipment';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useReceiveShipment, type ReceivingLineInput } from '@/hooks/inventory/useReceiveShipment';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

// ── Types ────────────────────────────────────────────

interface ReceivablePO {
  id: string;
  organization_id: string;
  po_number: string | null;
  supplier_name: string | null;
  status: string;
  receiving_status: string | null;
  line_count: number | null;
  subtotal: number | null;
  grand_total: number | null;
  quantity: number;
  sent_at: string | null;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: string;
}

interface POLineWithProduct {
  id: string;
  product_id: string;
  product_name: string;
  product_brand: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number | null;
  notes: string | null;
}

interface LineReceiveState {
  quantity_received: number;
  quantity_damaged: number;
  reason: string;
}

// ── Hooks ────────────────────────────────────────────

function useReceivablePOs() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['purchase-orders-receivable', orgId],
    queryFn: async (): Promise<ReceivablePO[]> => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, organization_id, po_number, supplier_name, status, receiving_status, line_count, subtotal, grand_total, quantity, sent_at, expected_delivery_date, notes, created_at')
        .eq('organization_id', orgId!)
        .in('status', ['sent', 'partially_received'])
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ReceivablePO[];
    },
    enabled: !!orgId,
  });
}

function usePOLinesWithProducts(poId: string | null) {
  return useQuery({
    queryKey: ['po-lines-with-products', poId],
    queryFn: async (): Promise<POLineWithProduct[]> => {
      // Fetch lines
      const { data: lines, error: lErr } = await supabase
        .from('purchase_order_lines')
        .select('id, product_id, quantity_ordered, quantity_received, unit_cost, notes')
        .eq('purchase_order_id', poId!)
        .order('created_at');

      if (lErr) throw lErr;
      if (!lines?.length) return [];

      // Fetch product names
      const productIds = lines.map((l) => l.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('id, name, brand')
        .in('id', productIds);

      const productMap = new Map((products ?? []).map((p) => [p.id, p]));

      return lines.map((l) => {
        const product = productMap.get(l.product_id);
        return {
          id: l.id,
          product_id: l.product_id,
          product_name: product?.name ?? 'Unknown Product',
          product_brand: product?.brand ?? null,
          quantity_ordered: l.quantity_ordered,
          quantity_received: l.quantity_received ?? 0,
          unit_cost: l.unit_cost,
          notes: l.notes,
        };
      });
    },
    enabled: !!poId,
  });
}

// ── Helpers ──────────────────────────────────────────

function getPoLabel(po: ReceivablePO): string {
  return po.po_number || `PO-${po.id.slice(0, 8).toUpperCase()}`;
}

function getReceivingBadge(po: ReceivablePO) {
  if (po.receiving_status === 'partial' || po.status === 'partially_received') {
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
        Partial
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-border/40 text-xs">
      Awaiting
    </Badge>
  );
}

// ── Component ────────────────────────────────────────

export function ReceiveTab() {
  const { data: receivablePOs = [], isLoading } = useReceivablePOs();
  const { effectiveOrganization } = useOrganizationContext();
  const { formatCurrency } = useFormatCurrency();
  const receiveShipment = useReceiveShipment();

  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [lineStates, setLineStates] = useState<Record<string, LineReceiveState>>({});
  const [receiveNotes, setReceiveNotes] = useState('');
  const [showFifoReminder, setShowFifoReminder] = useState(false);
  const pendingReceiveData = useRef<ReceiveShipmentInput | null>(null);

  const expandedPO = receivablePOs.find((po) => po.id === expandedPoId);
  const { data: poLines = [], isLoading: linesLoading } = usePOLinesWithProducts(expandedPoId);

  // Filter to only lines that still have outstanding quantity
  const receivableLines = useMemo(
    () => poLines.filter((l) => l.quantity_received < l.quantity_ordered),
    [poLines]
  );

  const alreadyReceivedLines = useMemo(
    () => poLines.filter((l) => l.quantity_received >= l.quantity_ordered),
    [poLines]
  );

  // Initialize line states when lines load
  const getLineState = (lineId: string, line: POLineWithProduct): LineReceiveState => {
    if (lineStates[lineId]) return lineStates[lineId];
    return {
      quantity_received: line.quantity_ordered - line.quantity_received,
      quantity_damaged: 0,
      reason: 'none',
    };
  };

  const updateLineState = (lineId: string, updates: Partial<LineReceiveState>) => {
    setLineStates((prev) => ({
      ...prev,
      [lineId]: { ...getLineState(lineId, receivableLines.find((l) => l.id === lineId)!), ...updates },
    }));
  };

  const handleToggle = (poId: string) => {
    if (expandedPoId === poId) {
      setExpandedPoId(null);
      setLineStates({});
      setReceiveNotes('');
    } else {
      setExpandedPoId(poId);
      setLineStates({});
      setReceiveNotes('');
    }
  };

  const handleConfirmReceive = () => {
    if (!expandedPO || receivableLines.length === 0) return;

    const lines: ReceivingLineInput[] = receivableLines.map((line) => {
      const state = getLineState(line.id, line);
      return {
        po_line_id: line.id,
        product_id: line.product_id,
        quantity_received: state.quantity_received,
        quantity_damaged: state.quantity_damaged,
        notes: state.reason !== 'none' ? state.reason : undefined,
      };
    });

    const validLines = lines.filter((l) => l.quantity_received > 0 || l.quantity_damaged > 0);
    if (validLines.length === 0) return;

    // Stash payload and show FIFO reminder before processing
    pendingReceiveData.current = {
      organization_id: effectiveOrganization?.id || '',
      purchase_order_id: expandedPO.id,
      notes: receiveNotes || undefined,
      lines: validLines,
    };
    setShowFifoReminder(true);
  };

  const handleAcknowledgeFifo = () => {
    setShowFifoReminder(false);
    if (!pendingReceiveData.current) return;

    receiveShipment.mutate(pendingReceiveData.current, {
      onSuccess: () => {
        setExpandedPoId(null);
        setLineStates({});
        setReceiveNotes('');
        pendingReceiveData.current = null;
      },
    });
  };

  // Summary stats for the receiving form
  const receivingSummary = useMemo(() => {
    if (receivableLines.length === 0) return null;
    let totalOrdered = 0;
    let totalReceiving = 0;
    let totalDamaged = 0;

    for (const line of receivableLines) {
      const state = getLineState(line.id, line);
      const outstanding = line.quantity_ordered - line.quantity_received;
      totalOrdered += outstanding;
      totalReceiving += state.quantity_received;
      totalDamaged += state.quantity_damaged;
    }

    const isPartial = totalReceiving < totalOrdered;
    return { totalOrdered, totalReceiving, totalDamaged, isPartial };
  }, [receivableLines, lineStates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (receivablePOs.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Truck className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No pending shipments</h3>
        <p className={tokens.empty.description}>
          Purchase orders marked as &quot;Sent&quot; will appear here for receiving.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className={tokens.body.emphasis}>
          {receivablePOs.length} shipment{receivablePOs.length !== 1 ? 's' : ''} awaiting receiving
        </p>
        <p className={tokens.body.muted}>
          Expand a shipment to receive items line by line and update stock levels.
        </p>
      </div>

      <div className="space-y-3">
        {receivablePOs.map((po) => {
          const isExpanded = expandedPoId === po.id;

          return (
            <Card key={po.id} className={cn(isExpanded && 'ring-1 ring-primary/30')}>
              {/* ── PO Header ── */}
              <CardHeader
                className="pb-3 cursor-pointer select-none"
                onClick={() => handleToggle(po.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={tokens.card.iconBox}>
                      <Package className={tokens.card.icon} />
                    </div>
                    <div>
                      <CardTitle className={cn(tokens.card.title, 'text-sm flex items-center gap-2')}>
                        {getPoLabel(po)}
                        {getReceivingBadge(po)}
                      </CardTitle>
                      <CardDescription>
                        {po.supplier_name || 'Unknown Supplier'}
                        {po.line_count != null && ` · ${po.line_count} item${po.line_count !== 1 ? 's' : ''}`}
                        {po.grand_total != null && ` · ${formatCurrency(po.grand_total)}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Sent {po.sent_at ? format(new Date(po.sent_at), 'MMM d') : '—'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* ── Line-by-Line Receiving ── */}
              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {linesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : receivableLines.length === 0 && alreadyReceivedLines.length > 0 ? (
                    <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-center">
                      <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-2" />
                      <p className="text-sm text-success">All items fully received</p>
                    </div>
                  ) : (
                    <>
                      {/* Receivable lines */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(tokens.label.default, 'text-xs')}>Items to Receive</span>
                          <MetricInfoTooltip description="Enter the quantity actually received for each product. Mark damaged items separately — they won't be added to stock." />
                        </div>

                        {receivableLines.map((line) => {
                          const state = getLineState(line.id, line);
                          const outstanding = line.quantity_ordered - line.quantity_received;
                          const hasDamaged = state.quantity_damaged > 0;
                          const hasShortage = state.quantity_received < outstanding;

                          return (
                            <div
                              key={line.id}
                              className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2"
                            >
                              {/* Product info */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-sans truncate">{line.product_name}</p>
                                  {line.product_brand && (
                                    <p className="text-xs text-muted-foreground">{line.product_brand}</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">
                                    Ordered: {line.quantity_ordered}
                                    {line.quantity_received > 0 && (
                                      <span className="text-success ml-1">
                                        ({line.quantity_received} prev. received)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs font-sans">
                                    Outstanding: <span className="text-foreground">{outstanding}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Quantity inputs */}
                              <div className="flex flex-wrap items-end gap-3">
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">Qty Received</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={outstanding}
                                    value={state.quantity_received}
                                    onChange={(e) =>
                                      updateLineState(line.id, {
                                        quantity_received: Math.min(
                                          Number(e.target.value),
                                          outstanding
                                        ),
                                      })
                                    }
                                    className="w-24 h-8 text-sm"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">Damaged</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={outstanding}
                                    value={state.quantity_damaged}
                                    onChange={(e) =>
                                      updateLineState(line.id, {
                                        quantity_damaged: Number(e.target.value),
                                      })
                                    }
                                    className="w-20 h-8 text-sm"
                                  />
                                </div>

                                {(hasDamaged || hasShortage) && (
                                  <div className="space-y-1 min-w-[140px]">
                                    <label className="text-xs text-muted-foreground">Reason</label>
                                    <Select
                                      value={state.reason}
                                      onValueChange={(v) => updateLineState(line.id, { reason: v })}
                                    >
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Select reason" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No issue</SelectItem>
                                        <SelectItem value="Short shipped">Short Shipped</SelectItem>
                                        <SelectItem value="Damaged in transit">Damaged in Transit</SelectItem>
                                        <SelectItem value="Wrong item">Wrong Item</SelectItem>
                                        <SelectItem value="Quality issue">Quality Issue</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {/* Status badges */}
                                <div className="flex items-center gap-1.5 pb-0.5">
                                  {hasDamaged && (
                                    <Badge
                                      variant="outline"
                                      className="bg-destructive/10 text-destructive border-destructive/20 text-xs"
                                    >
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      {state.quantity_damaged} damaged
                                    </Badge>
                                  )}
                                  {hasShortage && !hasDamaged && (
                                    <Badge
                                      variant="outline"
                                      className="bg-warning/10 text-warning border-warning/20 text-xs"
                                    >
                                      Short
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Already received lines (collapsed info) */}
                      {alreadyReceivedLines.length > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                          {alreadyReceivedLines.length} item{alreadyReceivedLines.length !== 1 ? 's' : ''} already fully received
                        </div>
                      )}

                      {/* Notes */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Receiving Notes (optional)</label>
                        <Input
                          value={receiveNotes}
                          onChange={(e) => setReceiveNotes(e.target.value)}
                          placeholder="e.g. Box 2 of 3 arrived"
                          className="h-8 text-sm"
                        />
                      </div>

                      {/* Summary + Confirm */}
                      {receivingSummary && (
                        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                          <div className="flex items-center gap-3 text-xs">
                            <span>
                              Receiving{' '}
                              <span className="text-foreground">
                                {receivingSummary.totalReceiving}
                              </span>{' '}
                              of {receivingSummary.totalOrdered} outstanding
                            </span>
                            {receivingSummary.totalDamaged > 0 && (
                              <span className="text-destructive">
                                {receivingSummary.totalDamaged} damaged
                              </span>
                            )}
                            {receivingSummary.isPartial && (
                              <Badge
                                variant="outline"
                                className="bg-warning/10 text-warning border-warning/20 text-xs"
                              >
                                Partial Receive
                              </Badge>
                            )}
                            {!receivingSummary.isPartial && receivingSummary.totalDamaged === 0 && (
                              <Badge
                                variant="outline"
                                className="bg-success/10 text-success border-success/20 text-xs"
                              >
                                Full Receive
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={handleConfirmReceive}
                            disabled={
                              receiveShipment.isPending ||
                              receivingSummary.totalReceiving === 0
                            }
                            className={tokens.button.cardAction}
                          >
                            {receiveShipment.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Confirm Receipt
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── FIFO Stock Rotation Reminder ── */}
      <AlertDialog open={showFifoReminder} onOpenChange={setShowFifoReminder}>
        <PlatformAlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-warning" />
              </div>
              <PlatformAlertDialogTitle>Stock Rotation Reminder</PlatformAlertDialogTitle>
            </div>
            <PlatformAlertDialogDescription>
              Before shelving new inventory, complete the FIFO checklist to keep stock fresh and reduce waste.
            </PlatformAlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2 px-1">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-sans">1</span>
              <div>
                <p className="text-sm font-sans">Pull existing stock forward</p>
                <p className="text-xs text-muted-foreground">Move all current inventory to the front of the shelf.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-sans">2</span>
              <div>
                <p className="text-sm font-sans">Place new inventory behind old</p>
                <p className="text-xs text-muted-foreground">New stock goes to the back so older product is used first.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning text-xs font-sans">3</span>
              <div>
                <p className="text-sm font-sans">Check for expired or near-expiry items</p>
                <p className="text-xs text-muted-foreground">Remove anything expired and flag items approaching their use-by date.</p>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <PlatformAlertDialogCancel onClick={() => setShowFifoReminder(false)}>
              Go Back
            </PlatformAlertDialogCancel>
            <AlertDialogAction onClick={handleAcknowledgeFifo}>
              <RotateCcw className="w-4 h-4 mr-1" />
              I've Rotated Stock — Confirm Receive
            </AlertDialogAction>
          </AlertDialogFooter>
        </PlatformAlertDialogContent>
      </AlertDialog>
    </div>
  );
}
