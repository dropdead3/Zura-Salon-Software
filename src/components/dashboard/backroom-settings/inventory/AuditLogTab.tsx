/**
 * AuditLogTab — Bulk cross-product audit view.
 * Table layout with filters, search, pagination, and CSV/PDF export.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Download, FileText, CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useBulkInventoryAuditTrail, type BulkAuditEntry, type BulkAuditFilters } from '@/hooks/backroom/useBulkInventoryAuditTrail';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format } from 'date-fns';
import { AuditEntryDetailPanel, type AuditDetailEntry } from './AuditEntryDetailPanel';

interface AuditLogTabProps {
  locationId?: string;
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

function exportBulkCsv(entries: BulkAuditEntry[]) {
  const headers = ['Timestamp', 'Product', 'Type', 'Field', 'Change', 'After', 'User', 'Notes'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = entries.map(e => [
    new Date(e.created_at).toISOString(),
    escape(e.product_name),
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
  a.download = `inventory-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportBulkPdf(entries: BulkAuditEntry[], orgName: string) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const { addReportHeader, addReportFooter } = await import('@/lib/reportPdfLayout');

  const doc = new jsPDF({ orientation: 'landscape' });
  const today = format(new Date(), 'yyyy-MM-dd');
  const headerOpts = {
    orgName,
    reportTitle: 'Inventory Audit Log',
    dateFrom: entries.length ? entries[entries.length - 1].created_at : today,
    dateTo: entries.length ? entries[0].created_at : today,
  };
  const startY = addReportHeader(doc, headerOpts);

  const tableData = entries.map(e => [
    format(new Date(e.created_at), 'MMM d, yyyy h:mm a'),
    e.product_name,
    e.type === 'stock' ? 'Stock' : 'Setting',
    getFieldLabel(e.field),
    e.quantity_change != null ? (e.quantity_change > 0 ? `+${e.quantity_change}` : String(e.quantity_change)) : '—',
    e.quantity_after ?? '—',
    e.changed_by_name ?? '—',
    e.notes ?? '',
  ]);

  autoTable(doc, {
    startY,
    head: [['Timestamp', 'Product', 'Type', 'Field', 'Change', 'After', 'User', 'Notes']],
    body: tableData,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [60, 60, 60] },
    margin: { top: startY },
  });

  addReportFooter(doc);
  doc.save(`inventory-audit-log-${today}.pdf`);
}

const PAGE_SIZE = 50;

export function AuditLogTab({ locationId }: AuditLogTabProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgName = effectiveOrganization?.name ?? 'Organization';

  const [typeFilter, setTypeFilter] = useState<'all' | 'stock' | 'setting'>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filters: BulkAuditFilters = {
    typeFilter,
    dateFrom,
    dateTo: dateTo ? new Date(dateTo.getTime() + 86400000 - 1) : undefined,
    search,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useBulkInventoryAuditTrail(filters);
  const entries = data?.entries ?? [];
  const hasMore = data?.hasMore ?? false;

  const [selectedEntry, setSelectedEntry] = useState<AuditDetailEntry | null>(null);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products, users, notes..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as any); setPage(0); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
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
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-normal">
                <CalendarIcon className="w-3 h-3" />
                {dateFrom ? format(dateFrom, 'MMM d') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(d) => { setDateFrom(d); setPage(0); }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-normal">
                <CalendarIcon className="w-3 h-3" />
                {dateTo ? format(dateTo, 'MMM d') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(d) => { setDateTo(d); setPage(0); }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {(dateFrom || dateTo || typeFilter !== 'all' || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => { setTypeFilter('all'); setDateFrom(undefined); setDateTo(undefined); setSearch(''); setPage(0); }}
            >
              Clear
            </Button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              disabled={entries.length === 0}
              onClick={() => exportBulkCsv(entries)}
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              disabled={entries.length === 0}
              onClick={() => exportBulkPdf(entries, orgName)}
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : entries.length === 0 ? (
          <div className={tokens.empty.container}>
            <Clock className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No audit entries found</h3>
            <p className={tokens.empty.description}>Adjust your filters or check back after stock changes are made.</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Timestamp</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Type</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Field</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Change</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>After</TableHead>
                    <TableHead className={tokens.table.columnHeader}>User</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <AuditTableRow key={entry.id} entry={entry} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Page {page + 1}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!hasMore}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AuditTableRow({ entry }: { entry: BulkAuditEntry }) {
  const isStock = entry.type === 'stock';
  const isPositive = isStock && (entry.quantity_change ?? 0) > 0;
  const isNegative = isStock && (entry.quantity_change ?? 0) < 0;

  return (
    <TableRow className="text-xs">
      <TableCell className="tabular-nums whitespace-nowrap">
        {format(new Date(entry.created_at), 'MMM d, h:mm a')}
      </TableCell>
      <TableCell className="font-medium max-w-[160px] truncate">{entry.product_name}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn(
          'text-[10px]',
          isStock ? 'bg-muted/50 text-foreground/70' : 'bg-primary/5 text-primary border-primary/20'
        )}>
          {isStock ? 'Stock' : 'Setting'}
        </Badge>
      </TableCell>
      <TableCell>{getFieldLabel(entry.field)}</TableCell>
      <TableCell className={cn(
        'text-right tabular-nums font-medium',
        isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'
      )}>
        {entry.quantity_change != null
          ? (isPositive ? '+' : '') + entry.quantity_change
          : entry.old_value != null ? `${entry.old_value} →` : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {entry.quantity_after ?? '—'}
      </TableCell>
      <TableCell className="text-muted-foreground">{entry.changed_by_name ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground max-w-[160px] truncate">{entry.notes ?? '—'}</TableCell>
    </TableRow>
  );
}
