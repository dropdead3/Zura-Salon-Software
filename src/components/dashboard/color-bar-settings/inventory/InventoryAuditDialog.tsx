/**
 * InventoryAuditDialog — Shows chronological audit trail for a product's
 * stock changes and min/max setting changes, with filters and export.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, ArrowUp, ArrowDown, Settings, User, Clock, Download, FileText, CalendarIcon } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useInventoryAuditTrail, type AuditEntry, type AuditFilters } from '@/hooks/backroom/useInventoryAuditTrail';
import { DRILLDOWN_DIALOG_CONTENT_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import { format, formatDistanceToNow } from 'date-fns';
import { AuditEntryDetailPanel, type AuditDetailEntry } from './AuditEntryDetailPanel';

interface InventoryAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  productName: string;
}

const FIELD_LABELS: Record<string, string> = {
  count_adjustment: 'Stock Adjustment',
  receiving: 'Receiving',
  po_received: 'PO Received',
  usage: 'Usage',
  sale: 'Sale',
  waste_adjustment: 'Waste',
  expiration_discard: 'Expiration',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  manual_adjustment: 'Manual Adjustment',
  reorder_level: 'Min Level',
  par_level: 'Max Level',
};

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function exportAuditCsv(entries: AuditEntry[], productName: string) {
  const headers = ['Timestamp', 'Type', 'Field', 'Change', 'After', 'User', 'Notes'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = entries.map(e => [
    new Date(e.created_at).toISOString(),
    e.type,
    getFieldLabel(e.field),
    e.quantity_change != null ? (e.quantity_change > 0 ? `+${e.quantity_change}` : String(e.quantity_change)) : '',
    e.quantity_after ?? '',
    escape(e.changed_by_name ?? ''),
    escape(e.notes ?? ''),
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-trail-${productName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportAuditPdf(entries: AuditEntry[], productName: string, orgName: string) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const { addReportHeader, addReportFooter, buildReportFileName } = await import('@/lib/reportPdfLayout');

  const doc = new jsPDF({ orientation: 'landscape' });
  const today = format(new Date(), 'yyyy-MM-dd');
  const headerOpts = {
    orgName,
    reportTitle: `Audit Trail — ${productName}`,
    dateFrom: entries.length ? entries[entries.length - 1].created_at : today,
    dateTo: entries.length ? entries[0].created_at : today,
  };
  const startY = addReportHeader(doc, headerOpts);

  const tableData = entries.map(e => [
    format(new Date(e.created_at), 'MMM d, yyyy h:mm a'),
    e.type === 'stock' ? 'Stock' : 'Setting',
    getFieldLabel(e.field),
    e.quantity_change != null ? (e.quantity_change > 0 ? `+${e.quantity_change}` : String(e.quantity_change)) : '—',
    e.quantity_after ?? '—',
    e.changed_by_name ?? '—',
    e.notes ?? '',
  ]);

  autoTable(doc, {
    startY,
    head: [['Timestamp', 'Type', 'Field', 'Change', 'After', 'User', 'Notes']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 60, 60] },
    margin: { top: startY },
  });

  addReportFooter(doc);
  doc.save(buildReportFileName({ orgName, reportSlug: `audit-trail-${productName.replace(/\s+/g, '-').toLowerCase()}`, dateFrom: today }));
}

export function InventoryAuditDialog({ open, onOpenChange, productId, productName }: InventoryAuditDialogProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'stock' | 'setting'>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedEntry, setSelectedEntry] = useState<AuditDetailEntry | null>(null);

  const filters: AuditFilters = {
    typeFilter,
    dateFrom,
    dateTo: dateTo ? new Date(dateTo.getTime() + 86400000 - 1) : undefined,
  };

  const { data: entries = [], isLoading } = useInventoryAuditTrail(open ? productId : null, 100, filters);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(DRILLDOWN_DIALOG_CONTENT_CLASS, 'max-w-2xl')}>
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className={cn(tokens.card.title, 'text-sm')}>Audit Trail</DialogTitle>
              <p className="text-muted-foreground text-xs mt-0.5">{productName}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                disabled={entries.length === 0}
                onClick={() => exportAuditCsv(entries, productName)}
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                disabled={entries.length === 0}
                onClick={() => exportAuditPdf(entries, productName, 'Organization')}
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-[140px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Changes</SelectItem>
                <SelectItem value="stock">Stock Changes</SelectItem>
                <SelectItem value="setting">Setting Changes</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 font-normal">
                  <CalendarIcon className="w-3 h-3" />
                  {dateFrom ? format(dateFrom, 'MMM d') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 font-normal">
                  <CalendarIcon className="w-3 h-3" />
                  {dateTo ? format(dateTo, 'MMM d') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {(dateFrom || dateTo || typeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => { setTypeFilter('all'); setDateFrom(undefined); setDateTo(undefined); }}
              >
                Clear
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-5 py-3 space-y-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={tokens.loading.spinner} />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No changes recorded yet</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border/60" />
                {entries.map((entry, i) => (
                  <AuditRow
                    key={entry.id}
                    entry={entry}
                    isLast={i === entries.length - 1}
                    onClick={() => setSelectedEntry({ ...entry, product_name: productName })}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <AuditEntryDetailPanel
          open={!!selectedEntry}
          onOpenChange={(open) => !open && setSelectedEntry(null)}
          entry={selectedEntry}
        />
      </DialogContent>
    </Dialog>
  );
}

function AuditRow({ entry, isLast, onClick }: { entry: AuditEntry; isLast: boolean; onClick: () => void }) {
  const isStock = entry.type === 'stock';
  const isPositive = isStock && (entry.quantity_change ?? 0) > 0;
  const isNegative = isStock && (entry.quantity_change ?? 0) < 0;

  return (
    <div
      className={cn('relative flex gap-3 pb-4 cursor-pointer rounded-lg px-1 -mx-1 hover:bg-muted/30 transition-colors', isLast && 'pb-0')}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className={cn(
        'relative z-10 mt-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0',
        isStock
          ? isPositive
            ? 'bg-success/10 text-success'
            : isNegative
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-muted-foreground'
          : 'bg-primary/10 text-primary'
      )}>
        {isStock ? (
          isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <Settings className="w-3 h-3" />
        )}
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn(
            'text-[10px] font-medium border',
            isStock ? 'bg-muted/50 text-foreground/70' : 'bg-primary/5 text-primary border-primary/20'
          )}>
            {getFieldLabel(entry.field)}
          </Badge>

          {isStock && entry.quantity_change != null && (
            <span className={cn(
              'text-xs font-medium tabular-nums',
              isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {isPositive ? '+' : ''}{entry.quantity_change}
            </span>
          )}

          {isStock && entry.quantity_after != null && (
            <span className="text-muted-foreground text-[10px] tabular-nums">
              → {entry.quantity_after}
            </span>
          )}

          {!isStock && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {entry.old_value ?? '—'} → {entry.quantity_after ?? '—'}
            </span>
          )}
        </div>

        {entry.notes && (
          <p className="text-muted-foreground text-[11px] mt-0.5 truncate">{entry.notes}</p>
        )}

        <div className="flex items-center gap-2 mt-1 text-muted-foreground/60 text-[10px]">
          {entry.changed_by_name && (
            <span className="flex items-center gap-0.5">
              <User className="w-2.5 h-2.5" />
              {entry.changed_by_name}
            </span>
          )}
          <span title={format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}>
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}
