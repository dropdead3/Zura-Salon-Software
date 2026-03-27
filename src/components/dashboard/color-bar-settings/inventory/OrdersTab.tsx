/**
 * OrdersTab — Purchase order lifecycle management.
 * Lists POs with status filters, expandable line items, delivery tracking, and email PO actions.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, FileText, ChevronDown, ChevronRight, Send, XCircle, Mail, CalendarIcon, Clock } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { usePurchaseOrders, useUpdatePurchaseOrder, type PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { usePurchaseOrderLines, type PurchaseOrderLine } from '@/hooks/inventory/usePurchaseOrderLines';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isPast, parseISO } from 'date-fns';
import { SendAllDraftsDialog } from './SendAllDraftsDialog';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'received', 'cancelled'] as const;
type POStatusFilter = typeof STATUS_FILTERS[number];

const PO_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border/40' },
  sent: { label: 'Sent', className: 'bg-primary/10 text-primary border-primary/20' },
  received: { label: 'Received', className: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  partial: { label: 'Partial', className: 'bg-warning/10 text-warning border-warning/20' },
};

function getPoLabel(po: PurchaseOrder): string {
  return (po as any).po_number || po.id.slice(0, 8).toUpperCase();
}

export function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<POStatusFilter>('all');
  const { data: orders = [], isLoading } = usePurchaseOrders({ status: statusFilter });
  const { data: allOrders = [] } = usePurchaseOrders({ status: 'all' });
  const updatePO = useUpdatePurchaseOrder();
  const { formatCurrency } = useFormatCurrency();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendAllOpen, setSendAllOpen] = useState(false);

  const draftPOs = useMemo(() => allOrders.filter(po => po.status === 'draft'), [allOrders]);

  const handleSend = (po: PurchaseOrder) => {
    updatePO.mutate({ id: po.id, updates: { status: 'sent', sent_at: new Date().toISOString() } });
  };

  const handleCancel = (po: PurchaseOrder) => {
    updatePO.mutate({ id: po.id, updates: { status: 'cancelled' } });
  };

  const handleEmailPO = async (po: PurchaseOrder) => {
    if (!po.supplier_email) {
      toast.error('No supplier email on this PO');
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('send-reorder-email', {
        body: { purchase_order_id: po.id },
      });
      if (error) throw error;
      toast.success('PO emailed to ' + po.supplier_email);
    } catch (err: any) {
      toast.error('Failed to send email: ' + (err.message || 'Unknown error'));
    }
  };

  const handleFollowUp = async (po: PurchaseOrder) => {
    if (!po.supplier_email) {
      toast.error('No supplier email on this PO');
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('send-reorder-email', {
        body: { purchase_order_id: po.id, is_followup: true },
      });
      if (error) throw error;
      // Update followup timestamp
      await supabase.from('purchase_orders').update({
        delivery_followup_sent_at: new Date().toISOString(),
      } as any).eq('id', po.id);
      toast.success('Follow-up sent to ' + po.supplier_email);
    } catch (err: any) {
      toast.error('Failed to send follow-up: ' + (err.message || 'Unknown error'));
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Status filter tabs + batch actions */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize text-sm"
          >
            {s === 'all' ? 'All' : s}
          </Button>
        ))}

        {draftPOs.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto font-sans"
            onClick={() => setSendAllOpen(true)}
          >
            <Mail className="w-4 h-4 mr-1.5" />
            Send All Drafts
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-5 px-1.5 rounded-full">
              {draftPOs.length}
            </Badge>
          </Button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className={tokens.empty.container}>
          <FileText className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No purchase orders</h3>
          <p className={tokens.empty.description}>Create purchase orders from the Reorder tab.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className={tokens.table.columnHeader}>PO #</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Supplier</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell')}>Qty</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden md:table-cell')}>Total</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Created</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden xl:table-cell')}>Delivery</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po) => {
                  const isExpanded = expandedId === po.id;
                  const statusStyle = PO_STATUS_STYLES[po.status] || PO_STATUS_STYLES.draft;
                  return (
                    <PORow
                      key={po.id}
                      po={po}
                      isExpanded={isExpanded}
                      statusStyle={statusStyle}
                      formatCurrency={formatCurrency}
                      onToggle={() => setExpandedId(isExpanded ? null : po.id)}
                      onSend={() => handleSend(po)}
                      onCancel={() => handleCancel(po)}
                      onEmail={() => handleEmailPO(po)}
                      onFollowUp={() => handleFollowUp(po)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SendAllDraftsDialog
        open={sendAllOpen}
        onOpenChange={setSendAllOpen}
        draftPOs={draftPOs}
        onComplete={() => {
          setStatusFilter('all');
        }}
      />
    </div>
  );
}

function PORow({ po, isExpanded, statusStyle, formatCurrency, onToggle, onSend, onCancel, onEmail, onFollowUp }: {
  po: PurchaseOrder;
  isExpanded: boolean;
  statusStyle: { label: string; className: string };
  formatCurrency: (n: number) => string;
  onToggle: () => void;
  onSend: () => void;
  onCancel: () => void;
  onEmail: () => void;
  onFollowUp: () => void;
}) {
  const expectedDate = po.expected_delivery_date ? parseISO(po.expected_delivery_date) : null;
  const isOverdue = po.status === 'sent' && expectedDate && isPast(expectedDate) && !po.received_at;

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="pl-3">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </TableCell>
        <TableCell className={tokens.body.emphasis}>{getPoLabel(po)}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{po.supplier_name || '—'}</TableCell>
        <TableCell className="text-right hidden sm:table-cell tabular-nums">{po.quantity}</TableCell>
        <TableCell className="text-right hidden md:table-cell tabular-nums">{po.total_cost != null ? formatCurrency(po.total_cost) : '—'}</TableCell>
        <TableCell>
          <Badge variant="outline" className={cn('text-[10px] font-medium border', statusStyle.className)}>
            {statusStyle.label}
          </Badge>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{format(new Date(po.created_at), 'MMM d, yyyy')}</TableCell>
        <TableCell className="hidden xl:table-cell text-sm">
          {expectedDate ? (
            <span className={cn('tabular-nums', isOverdue && 'text-destructive')}>
              {isOverdue && <Clock className="w-3 h-3 inline mr-1" />}
              {format(expectedDate, 'MMM d')}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            {isOverdue && (
              <Button variant="ghost" size="icon" onClick={onFollowUp} title="Send Delivery Follow-Up">
                <Clock className="w-4 h-4 text-destructive" />
              </Button>
            )}
            {(po.status === 'draft' || po.status === 'sent') && po.supplier_email && (
              <Button variant="ghost" size="icon" onClick={onEmail} title="Email PO to Supplier">
                <Mail className="w-4 h-4" />
              </Button>
            )}
            {po.status === 'draft' && (
              <Button variant="ghost" size="icon" onClick={onSend} title="Mark as Sent">
                <Send className="w-4 h-4" />
              </Button>
            )}
            {(po.status === 'draft' || po.status === 'sent') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Cancel PO">
                    <XCircle className="w-4 h-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Purchase Order?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark {getPoLabel(po)} as cancelled. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep PO</AlertDialogCancel>
                    <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Cancel PO
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && <POExpandedRow poId={po.id} po={po} formatCurrency={formatCurrency} />}
    </>
  );
}

function POExpandedRow({ poId, po, formatCurrency }: {
  poId: string;
  po: PurchaseOrder;
  formatCurrency: (n: number) => string;
}) {
  const { data: lines = [], isLoading } = usePurchaseOrderLines(poId);
  const { data: products = [] } = useProducts({});
  const updatePO = useUpdatePurchaseOrder();
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(
    po.expected_delivery_date ? parseISO(po.expected_delivery_date) : undefined
  );

  const getProductName = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    return product?.name || productId.slice(0, 8);
  };

  const handleDeliveryDateChange = (date: Date | undefined) => {
    setDeliveryDate(date);
    if (date) {
      updatePO.mutate({ id: poId, updates: { expected_delivery_date: date.toISOString() } as any });
    }
  };

  const confirmedDate = (po as any).supplier_confirmed_delivery_date;

  return (
    <TableRow>
      <TableCell colSpan={9} className="bg-muted/20 p-4">
        <div className="space-y-3">
          {/* PO metadata */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className={tokens.label.tiny}>PO Number</span>
              <p className="text-foreground">{getPoLabel(po)}</p>
            </div>
            <div>
              <span className={tokens.label.tiny}>Supplier Email</span>
              <p className="text-foreground">{po.supplier_email || '—'}</p>
            </div>
            <div>
              <span className={tokens.label.tiny}>Sent At</span>
              <p className="text-foreground">{po.sent_at ? format(new Date(po.sent_at), 'MMM d, yyyy h:mm a') : '—'}</p>
            </div>
            <div>
              <span className={tokens.label.tiny}>Expected Delivery</span>
              {po.status === 'draft' || po.status === 'sent' ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-sm gap-1.5 -ml-2">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {deliveryDate ? format(deliveryDate, 'MMM d, yyyy') : 'Set date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={deliveryDate} onSelect={handleDeliveryDateChange} initialFocus />
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="text-foreground">{po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'MMM d, yyyy') : '—'}</p>
              )}
            </div>
            <div>
              <span className={tokens.label.tiny}>Received At</span>
              <p className="text-foreground">{po.received_at ? format(new Date(po.received_at), 'MMM d, yyyy h:mm a') : '—'}</p>
            </div>
          </div>

          {/* Supplier confirmed date */}
          {confirmedDate && (
            <div className="text-sm">
              <span className={tokens.label.tiny}>Supplier Confirmed Delivery</span>
              <p className="text-foreground">{format(new Date(confirmedDate), 'MMM d, yyyy')}</p>
            </div>
          )}

          {/* Line items */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading line items...
            </div>
          ) : lines.length > 0 ? (
            <div>
              <span className={cn(tokens.label.tiny, 'mb-2 block')}>Line Items</span>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Qty Ordered</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Qty Received</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Unit Cost</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm">{getProductName(line.product_id)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{line.quantity_ordered}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <span className={cn(line.quantity_received < line.quantity_ordered && 'text-warning')}>
                          {line.quantity_received}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        {line.unit_cost != null ? formatCurrency(line.unit_cost) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {line.line_total != null ? formatCurrency(line.line_total) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No line items — this is a single-product PO.</p>
          )}

          {po.notes && (
            <div>
              <span className={tokens.label.tiny}>Notes</span>
              <p className="text-sm text-muted-foreground mt-0.5">{po.notes}</p>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
