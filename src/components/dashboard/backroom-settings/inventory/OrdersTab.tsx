/**
 * OrdersTab — Purchase order lifecycle management.
 * Apple-grade responsive: scrollable table, mobile-friendly expand, refined transitions.
 */

import { useState, Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, FileText, ChevronDown, ChevronRight, Send, XCircle } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { usePurchaseOrders, useUpdatePurchaseOrder, type PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { format } from 'date-fns';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'received', 'cancelled'] as const;
type POStatusFilter = typeof STATUS_FILTERS[number];

const PO_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border/40' },
  sent: { label: 'Sent', className: 'bg-primary/10 text-primary border-primary/20' },
  received: { label: 'Received', className: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  partial: { label: 'Partial', className: 'bg-warning/10 text-warning border-warning/20' },
};

export function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<POStatusFilter>('all');
  const { data: orders = [], isLoading } = usePurchaseOrders({ status: statusFilter });
  const updatePO = useUpdatePurchaseOrder();
  const { formatCurrency } = useFormatCurrency();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSend = (po: PurchaseOrder) => {
    updatePO.mutate({ id: po.id, updates: { status: 'sent', sent_at: new Date().toISOString() } });
  };

  const handleCancel = (po: PurchaseOrder) => {
    updatePO.mutate({ id: po.id, updates: { status: 'cancelled' } });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Status filter tabs — horizontally scrollable on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
        {STATUS_FILTERS.map(s => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize text-sm shrink-0 transition-all duration-150"
          >
            {s === 'all' ? 'All' : s}
          </Button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className={tokens.empty.container}>
          <FileText className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No purchase orders</h3>
          <p className={tokens.empty.description}>Create purchase orders from the Reorder tab or manually.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[580px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className={tokens.table.columnHeader}>PO #</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Supplier</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Qty</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Total</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Created</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Expected</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((po) => {
                      const isExpanded = expandedId === po.id;
                      const statusStyle = PO_STATUS_STYLES[po.status] || PO_STATUS_STYLES.draft;
                      return (
                        <Fragment key={po.id}>
                          <TableRow
                            className="cursor-pointer transition-colors duration-100"
                            onClick={() => setExpandedId(isExpanded ? null : po.id)}
                          >
                            <TableCell className="pl-3">
                              <div className={cn('transition-transform duration-150', isExpanded && 'rotate-90')}>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                            <TableCell className={tokens.body.emphasis}>{po.id.slice(0, 8).toUpperCase()}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{po.supplier_name || '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">{po.quantity}</TableCell>
                            <TableCell className="text-right tabular-nums">{po.total_cost != null ? formatCurrency(po.total_cost) : '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px] font-medium border whitespace-nowrap', statusStyle.className)}>
                                {statusStyle.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{format(new Date(po.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                              {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'MMM d') : '—'}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1">
                                {po.status === 'draft' && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSend(po)} title="Send to Supplier">
                                    <Send className="w-4 h-4" />
                                  </Button>
                                )}
                                {(po.status === 'draft' || po.status === 'sent') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCancel(po)} title="Cancel">
                                    <XCircle className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/20 p-3 sm:p-4">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 text-sm">
                                  <div className="min-w-0">
                                    <span className={tokens.label.tiny}>Supplier Email</span>
                                    <p className="text-foreground truncate">{po.supplier_email || '—'}</p>
                                  </div>
                                  <div>
                                    <span className={tokens.label.tiny}>Unit Cost</span>
                                    <p className="text-foreground">{po.unit_cost != null ? formatCurrency(po.unit_cost) : '—'}</p>
                                  </div>
                                  <div>
                                    <span className={tokens.label.tiny}>Sent At</span>
                                    <p className="text-foreground">{po.sent_at ? format(new Date(po.sent_at), 'MMM d, yyyy h:mm a') : '—'}</p>
                                  </div>
                                  <div>
                                    <span className={tokens.label.tiny}>Received At</span>
                                    <p className="text-foreground">{po.received_at ? format(new Date(po.received_at), 'MMM d, yyyy h:mm a') : '—'}</p>
                                  </div>
                                </div>
                                {po.notes && (
                                  <div className="mt-3">
                                    <span className={tokens.label.tiny}>Notes</span>
                                    <p className="text-sm text-muted-foreground mt-0.5">{po.notes}</p>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
