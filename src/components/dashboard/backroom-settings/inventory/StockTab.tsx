/**
 * StockTab — Stock overview with KPI cards and enhanced inventory table.
 * Groups by brand → category with collapsible brand sections,
 * supplier chips, "Set Supplier" actions, inline editing, PDF export,
 * multi-select checkboxes, per-row reorder, and Auto Create POs.
 */

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Package, AlertTriangle, XCircle, DollarSign, ChevronDown, ChevronRight, Truck, UserPlus, FileDown, History, ShoppingCart, Zap, SlidersHorizontal, Pencil } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useBackroomInventoryTable, STOCK_STATUS_CONFIG, type BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { useInlineStockEdit } from '@/hooks/backroom/useInlineStockEdit';
import { useBackroomOrgId } from '@/hooks/backroom/useBackroomOrgId';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCreateMultiLinePO } from '@/hooks/inventory/usePurchaseOrderLines';
import { SupplierAssignDialog } from './SupplierAssignDialog';
import { InventoryAuditDialog } from './InventoryAuditDialog';
import { AutoCreatePODialog } from './AutoCreatePODialog';
import { AutoParDialog } from './AutoParDialog';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import { useProductPOHistory } from '@/hooks/backroom/useProductPOHistory';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, type ReportHeaderOptions } from '@/lib/reportPdfLayout';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface StockTabProps {
  locationId?: string;
}

interface BrandGroup {
  brand: string;
  products: BackroomInventoryRow[];
  supplierName: string | null;
  categories: Map<string, BackroomInventoryRow[]>;
}

// ─── Helpers ────────────────────────────────────────────

function stripSizeSuffix(name: string): string {
  return name.replace(/\s*[—–-]\s*\d+(\.\d+)?\s*(g|oz|ml|L)\s*$/i, '').trim();
}

function formatCategoryLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Inline Edit Cell ──────────────────────────────────

function InlineEditCell({
  value,
  placeholder = '—',
  onSave,
  className,
}: {
  value: number | null;
  placeholder?: string;
  onSave: (newValue: number | null) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === '') {
      onSave(null);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed) && parsed !== value) {
      onSave(parsed);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={cn(
          'w-16 h-7 px-1.5 text-right text-sm tabular-nums rounded border border-primary/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40',
          className,
        )}
        autoCapitalize="off"
      />
    );
  }

  return (
    <span
      className={cn(
        'group/edit cursor-pointer border-b border-dashed border-muted-foreground/30 hover:border-primary/60 transition-colors tabular-nums inline-flex items-center gap-1',
        className,
      )}
      onClick={() => {
        setDraft(value != null ? String(value) : '');
        setEditing(true);
      }}
      title="Click to edit"
    >
      {value != null ? value : placeholder}
      <Pencil className="w-2.5 h-2.5 text-muted-foreground/0 group-hover/edit:text-muted-foreground/60 transition-colors shrink-0" />
    </span>
  );
}

// ─── PDF Export ──────────────────────────────────────────

async function exportStockPdf(
  rows: BackroomInventoryRow[],
  orgName: string,
  logoUrl: string | null | undefined,
  formatCurrency: (n: number) => string,
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF('landscape', 'mm', 'a4');
  const logoDataUrl = await fetchLogoAsDataUrl(logoUrl);
  const now = new Date();
  const headerOpts: ReportHeaderOptions = {
    orgName,
    logoDataUrl,
    reportTitle: 'Inventory Stock Report',
    dateFrom: format(now, 'yyyy-MM-dd'),
    dateTo: format(now, 'yyyy-MM-dd'),
    generatedAt: now,
  };

  addReportHeader(doc, headerOpts);

  const tableData = rows.map((r) => [
    stripSizeSuffix(r.name),
    r.brand || '—',
    r.category ? formatCategoryLabel(r.category) : '—',
    r.quantity_on_hand,
    r.reorder_level ?? '—',
    r.par_level ?? '—',
    r.recommended_order_qty > 0 ? r.recommended_order_qty : '—',
    STOCK_STATUS_CONFIG[r.status].label,
    r.cost_price != null ? formatCurrency(r.cost_price) : r.cost_per_gram != null ? `${formatCurrency(r.cost_per_gram)}/g` : '—',
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['Product', 'Brand', 'Category', 'Stock', 'Reorder Pt', 'Par Level', 'Reorder Qty', 'Status', 'Cost']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 41, 41], fontSize: 8, fontStyle: 'bold' },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      8: { halign: 'right' },
    },
    margin: { top: 72 },
    didDrawPage: () => { addReportHeader(doc, headerOpts); },
  });

  addReportFooter(doc);
  doc.save(`inventory-stock-${format(now, 'yyyy-MM-dd')}.pdf`);
}

// ─── Main Component ─────────────────────────────────────

export function StockTab({ locationId }: StockTabProps) {
  const { data: inventory = [], isLoading } = useBackroomInventoryTable({ locationId });
  const { data: poHistoryMap } = useProductPOHistory();
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();
  const { adjustStock, updateMinMax } = useInlineStockEdit();
  const orgId = useBackroomOrgId();
  const { effectiveOrganization } = useOrganizationContext();
  const createPO = useCreateMultiLinePO();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [supplierDialog, setSupplierDialog] = useState<{ open: boolean; brand: string; products: BackroomInventoryRow[] }>({ open: false, brand: '', products: [] });
  const [auditDialog, setAuditDialog] = useState<{ open: boolean; productId: string | null; productName: string }>({ open: false, productId: null, productName: '' });
  const [autoPoDialog, setAutoPoDialog] = useState(false);
  const [autoParDialog, setAutoParDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Compute KPIs
  const kpis = useMemo(() => {
    const totalOnHand = inventory.reduce((s, r) => s + r.quantity_on_hand, 0);
    const lowStock = inventory.filter(r => r.status === 'replenish' || r.status === 'urgent_reorder').length;
    const outOfStock = inventory.filter(r => r.status === 'out_of_stock').length;
    const totalValue = inventory.reduce((s, r) => s + (r.quantity_on_hand * (r.cost_price ?? r.cost_per_gram ?? 0)), 0);
    const needsReorder = inventory.filter(r => r.recommended_order_qty > 0).length;
    return { totalOnHand, lowStock, outOfStock, totalValue, needsReorder };
  }, [inventory]);

  // Categories for filter
  const categories = useMemo(() => {
    const cats = new Set(inventory.map(r => r.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()] as string[];
  }, [inventory]);

  // Filtered + searched rows
  const filtered = useMemo(() => {
    let rows = inventory;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.brand?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') rows = rows.filter(r => r.category === categoryFilter);
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    return rows;
  }, [inventory, search, categoryFilter, statusFilter]);

  // Group by brand → category
  const brandGroups = useMemo((): BrandGroup[] => {
    const map = new Map<string, BackroomInventoryRow[]>();
    for (const row of filtered) {
      const brand = row.brand || 'Uncategorized';
      const arr = map.get(brand) ?? [];
      arr.push(row);
      map.set(brand, arr);
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([brand, products]) => {
        const supplierName = products.find(p => p.supplier_name)?.supplier_name ?? null;
        const categories = new Map<string, BackroomInventoryRow[]>();
        for (const p of products) {
          const cat = p.category || 'Other';
          const arr = categories.get(cat) ?? [];
          arr.push(p);
          categories.set(cat, arr);
        }
        return { brand, products, supplierName, categories };
      });
  }, [filtered]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id)));
    }
  };

  const selectedProducts = filtered.filter(r => selectedIds.has(r.id));
  const selectedReorderProducts = selectedProducts.filter(r => r.recommended_order_qty > 0);

  // Products for Auto PO — use selection if any, otherwise all needing reorder
  const autoPoProducts = selectedReorderProducts.length > 0
    ? selectedReorderProducts
    : inventory.filter(r => r.recommended_order_qty > 0);

  // Single product quick reorder
  const handleQuickReorder = (row: BackroomInventoryRow) => {
    if (!orgId || row.recommended_order_qty <= 0) return;
    createPO.mutate({
      organization_id: orgId,
      supplier_name: row.supplier_name ?? undefined,
      supplier_email: row.supplier_email ?? undefined,
      notes: `Reorder for ${stripSizeSuffix(row.name)}`,
      lines: [{
        product_id: row.id,
        quantity_ordered: row.recommended_order_qty,
        unit_cost: row.cost_price ?? row.cost_per_gram ?? undefined,
      }],
    });
  };

  const handlePdfExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportStockPdf(
        filtered,
        effectiveOrganization?.name ?? 'Organization',
        effectiveOrganization?.logo_url,
        formatCurrency,
      );
    } finally {
      setExporting(false);
    }
  }, [filtered, effectiveOrganization, formatCurrency]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<Package className="w-5 h-5 text-primary" />} label="Total On Hand" value={formatNumber(kpis.totalOnHand)} tooltip="Sum of all tracked product quantities across this location." />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5 text-warning" />}
          label="Low Stock"
          value={String(kpis.lowStock)}
          accent={kpis.lowStock > 0 ? 'warning' : undefined}
          onClick={() => setStatusFilter(statusFilter === 'replenish' ? 'all' : 'replenish')}
          tooltip="Products at or below their Reorder Point. Click to filter."
        />
        <KpiCard
          icon={<XCircle className="w-5 h-5 text-destructive" />}
          label="Out of Stock"
          value={String(kpis.outOfStock)}
          accent={kpis.outOfStock > 0 ? 'destructive' : undefined}
          onClick={() => setStatusFilter(statusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
          tooltip="Products with zero quantity on hand. Click to filter."
        />
        <KpiCard icon={<DollarSign className="w-5 h-5 text-primary" />} label="Inventory Value" value={formatCurrency(kpis.totalValue)} tooltip="Total cost value of all stock on hand (quantity × unit cost)." />
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products, brands, SKUs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : formatCategoryLabel(c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="replenish">Replenish</SelectItem>
            <SelectItem value="urgent_reorder">Urgent Reorder</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="font-sans"
          onClick={handlePdfExport}
          disabled={exporting || filtered.length === 0}
        >
          {exporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileDown className="w-4 h-4 mr-1.5" />}
          PDF
        </Button>
        <Button
          size="sm"
          className="font-sans"
          onClick={() => setAutoPoDialog(true)}
          disabled={kpis.needsReorder === 0}
        >
          <Zap className="w-4 h-4 mr-1.5" />
          Auto Create POs
          {kpis.needsReorder > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-5 px-1.5 rounded-full">
              {kpis.needsReorder}
            </Badge>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="font-sans"
          onClick={() => setAutoParDialog(true)}
          disabled={inventory.length === 0}
        >
          <SlidersHorizontal className="w-4 h-4 mr-1.5" />
          Auto-Set Pars
        </Button>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5">
          <span className="text-sm text-muted-foreground font-sans">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            className="font-sans h-7"
            onClick={() => setAutoPoDialog(true)}
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
            Create PO ({selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="font-sans h-7 text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Stock Table */}
      {filtered.length === 0 ? (
        <div className={tokens.empty.container}>
          <Package className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No products found</h3>
          <p className={tokens.empty.description}>
            {inventory.length === 0 ? 'No tracked products at this location. Enable tracking in the Product Catalog.' : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(tokens.table.columnHeader, 'w-10')}>
                    <Checkbox
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Container</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>
                    <span className="inline-flex items-center gap-1">
                      Stock
                      <MetricInfoTooltip description="Current quantity on hand. Click the number to adjust." />
                    </span>
                  </TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell')}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      Reorder Pt
                      <MetricInfoTooltip description="When stock drops to this level, a reorder is triggered. Click to edit." />
                    </span>
                  </TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell')}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      Par Level
                      <MetricInfoTooltip description="Your target stock level — the ideal quantity to have on hand. Click to edit." />
                    </span>
                  </TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden lg:table-cell')}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      Reorder Qty
                      <MetricInfoTooltip description="How many units to order to reach Par Level, minus any already on open POs." />
                    </span>
                  </TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden xl:table-cell w-[72px]')}>PO History</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden xl:table-cell')}>Cost</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'w-20')} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {brandGroups.map((bg) => (
                  <BrandSection
                    key={bg.brand}
                    group={bg}
                    formatCurrency={formatCurrency}
                    formatNumber={formatNumber}
                    orgId={orgId}
                    locationId={locationId}
                    adjustStock={adjustStock}
                    updateMinMax={updateMinMax}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onSetSupplier={() => setSupplierDialog({ open: true, brand: bg.brand, products: bg.products })}
                    onAudit={(productId, productName) => setAuditDialog({ open: true, productId, productName })}
                    onQuickReorder={handleQuickReorder}
                    poHistoryMap={poHistoryMap}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SupplierAssignDialog
        open={supplierDialog.open}
        onOpenChange={(open) => setSupplierDialog(prev => ({ ...prev, open }))}
        brand={supplierDialog.brand}
        products={supplierDialog.products}
      />
      <InventoryAuditDialog
        open={auditDialog.open}
        onOpenChange={(open) => setAuditDialog(prev => ({ ...prev, open }))}
        productId={auditDialog.productId}
        productName={auditDialog.productName}
      />
      <AutoCreatePODialog
        open={autoPoDialog}
        onOpenChange={setAutoPoDialog}
        products={autoPoProducts}
        organizationId={orgId ?? ''}
      />
      <AutoParDialog
        open={autoParDialog}
        onOpenChange={setAutoParDialog}
        productIds={inventory.map(r => r.id)}
        orgId={orgId ?? ''}
        locationId={locationId}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────

function KpiCard({ icon, label, value, accent, onClick, tooltip }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: 'warning' | 'destructive';
  onClick?: () => void;
  tooltip?: string;
}) {
  return (
    <div
      className={cn(
        tokens.kpi.tile,
        'relative',
        onClick && 'cursor-pointer hover:border-primary/40 transition-colors',
        accent === 'warning' && 'border-warning/30',
        accent === 'destructive' && 'border-destructive/30',
      )}
      onClick={onClick}
    >
      {tooltip && <MetricInfoTooltip description={tooltip} className={tokens.kpi.infoIcon} />}
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className={tokens.kpi.label}>{label}</span>
      </div>
      <span className={tokens.kpi.value}>{value}</span>
    </div>
  );
}

function BrandSection({ group, formatCurrency, formatNumber, orgId, locationId, adjustStock, updateMinMax, selectedIds, onToggleSelect, onSetSupplier, onAudit, onQuickReorder, poHistoryMap }: {
  group: BrandGroup;
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
  orgId: string | undefined;
  locationId: string | undefined;
  adjustStock: ReturnType<typeof useInlineStockEdit>['adjustStock'];
  updateMinMax: ReturnType<typeof useInlineStockEdit>['updateMinMax'];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSetSupplier: () => void;
  onAudit: (productId: string, productName: string) => void;
  onQuickReorder: (row: BackroomInventoryRow) => void;
  poHistoryMap?: Map<string, number[]>;
}) {
  const [open, setOpen] = useState(true);
  const sortedCategories = Array.from(group.categories.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <>
      {/* Brand header row */}
      <TableRow
        className="bg-muted/30 hover:bg-muted/40 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <TableCell colSpan={11} className="py-2">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <span className={cn(tokens.label.tiny, 'text-foreground/80')}>{group.brand}</span>
            <span className="text-muted-foreground text-[10px]">({group.products.length})</span>
            {group.supplierName ? (
              <Badge variant="outline" className="text-[10px] font-medium border-primary/20 text-primary bg-primary/5 ml-2">
                <Truck className="w-3 h-3 mr-1" />
                {group.supplierName}
              </Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] ml-2 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onSetSupplier(); }}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Set Supplier
              </Button>
            )}
            {group.supplierName && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] ml-1 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onSetSupplier(); }}
              >
                Edit
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {open && sortedCategories.map(([category, rows]) => (
        <CategoryGroup
          key={`${group.brand}-${category}`}
          category={category}
          rows={rows}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          orgId={orgId}
          locationId={locationId}
          adjustStock={adjustStock}
          updateMinMax={updateMinMax}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onAudit={onAudit}
          onQuickReorder={onQuickReorder}
          poHistoryMap={poHistoryMap}
        />
      ))}
    </>
  );
}

function CategoryGroup({ category, rows, formatCurrency, formatNumber, orgId, locationId, adjustStock, updateMinMax, selectedIds, onToggleSelect, onAudit, onQuickReorder, poHistoryMap }: {
  category: string;
  rows: BackroomInventoryRow[];
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
  orgId: string | undefined;
  locationId: string | undefined;
  adjustStock: ReturnType<typeof useInlineStockEdit>['adjustStock'];
  updateMinMax: ReturnType<typeof useInlineStockEdit>['updateMinMax'];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onAudit: (productId: string, productName: string) => void;
  onQuickReorder: (row: BackroomInventoryRow) => void;
  poHistoryMap?: Map<string, number[]>;
}) {
  return (
    <>
      {/* Category sub-header */}
      <TableRow className="bg-muted/10 hover:bg-muted/10">
        <TableCell colSpan={11} className="py-1 pl-10">
          <span className="text-muted-foreground text-[11px] tracking-wide">{formatCategoryLabel(category)}</span>
          <span className="text-muted-foreground/50 text-[10px] ml-1.5">({rows.length})</span>
        </TableCell>
      </TableRow>
      {rows.map((row) => {
        const statusCfg = STOCK_STATUS_CONFIG[row.status];
        const needsReorder = row.recommended_order_qty > 0;
        return (
          <TableRow
            key={row.id}
            className={cn(needsReorder && 'bg-warning/[0.03] hover:bg-warning/[0.06]')}
          >
            <TableCell className="w-10">
              <Checkbox
                checked={selectedIds.has(row.id)}
                onCheckedChange={() => onToggleSelect(row.id)}
              />
            </TableCell>
            <TableCell className="pl-2">
              <div>
                <span className={tokens.body.emphasis}>{stripSizeSuffix(row.name)}</span>
                {row.sku && <span className="text-muted-foreground text-xs ml-2">{row.sku}</span>}
              </div>
            </TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{row.container_size || '—'}</TableCell>
            <TableCell className="text-right">
              <InlineEditCell
                value={row.quantity_on_hand}
                onSave={(newVal) => {
                  if (!orgId || newVal == null) return;
                  adjustStock.mutate({
                    orgId,
                    productId: row.id,
                    currentQty: row.quantity_on_hand,
                    newQty: newVal,
                    locationId,
                  });
                }}
                className="font-medium"
              />
            </TableCell>
            <TableCell className="text-right hidden sm:table-cell">
              <InlineEditCell
                value={row.reorder_level}
                onSave={(newVal) => {
                  if (!orgId) return;
                  updateMinMax.mutate({
                    orgId,
                    productId: row.id,
                    field: 'reorder_level',
                    value: newVal,
                    oldValue: row.reorder_level,
                    locationId,
                  });
                }}
                className="text-muted-foreground"
              />
            </TableCell>
            <TableCell className="text-right hidden sm:table-cell">
              <InlineEditCell
                value={row.par_level}
                onSave={(newVal) => {
                  if (!orgId) return;
                  updateMinMax.mutate({
                    orgId,
                    productId: row.id,
                    field: 'par_level',
                    value: newVal,
                    oldValue: row.par_level,
                    locationId,
                  });
                }}
                className="text-muted-foreground"
              />
            </TableCell>
            <TableCell className="text-right hidden lg:table-cell tabular-nums">
              {needsReorder ? (
                <span className="text-warning font-medium">{row.recommended_order_qty}</span>
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )}
              {row.open_po_qty > 0 && (
                <span className="text-primary/60 text-[10px] ml-1" title={`${row.open_po_qty} on open POs`}>
                  ({row.open_po_qty} pending)
                </span>
              )}
            </TableCell>
            <TableCell className="hidden xl:table-cell">
              {(() => {
                const history = poHistoryMap?.get(row.id);
                if (!history || history.every(v => v === 0)) {
                  return <span className="text-muted-foreground/40 text-xs">—</span>;
                }
                return <TrendSparkline data={history} variant="muted" width={64} height={20} />;
              })()}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={cn('text-[10px] font-medium border', statusCfg.className)}>
                {statusCfg.label}
              </Badge>
            </TableCell>
            <TableCell className="text-right hidden xl:table-cell text-muted-foreground tabular-nums">
              {row.cost_price != null ? formatCurrency(row.cost_price) : row.cost_per_gram != null ? `${formatCurrency(row.cost_per_gram)}/g` : '—'}
            </TableCell>
            <TableCell className="w-20">
              <div className="flex items-center gap-0.5 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => onAudit(row.id, row.name)}
                  title="View audit trail"
                >
                  <History className="w-3.5 h-3.5" />
                </Button>
                {needsReorder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-warning hover:text-warning hover:bg-warning/10"
                    onClick={() => onQuickReorder(row)}
                    title={`Quick reorder ${row.recommended_order_qty} units`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
