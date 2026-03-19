/**
 * StockTab — Smart Inventory Command Center.
 * Columns: Product, Stock, Suggested Order (primary), Status, Supplier, Cost, Actions.
 * Expandable detail rows reveal Reorder Pt, Par Level, Container, PO History.
 * Groups by brand with collapsible sections.
 */

import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Package, ChevronDown, ChevronRight, UserPlus, FileDown, FileText, ShoppingCart, Zap, SlidersHorizontal, Truck } from 'lucide-react';
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
import { useProductPOHistory } from '@/hooks/backroom/useProductPOHistory';
import { useInventoryIntelligence, type ProductIntelligence } from '@/hooks/backroom/useInventoryIntelligence';
import { CommandCenterRow, stripSizeSuffix, formatCategoryLabel } from './CommandCenterRow';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, type ReportHeaderOptions } from '@/lib/reportPdfLayout';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { POBuilderPanel, type SupplierPOGroup } from './POBuilderPanel';

interface StockTabProps {
  locationId?: string;
}

interface SupplierGroup {
  supplier: string;
  products: BackroomInventoryRow[];
  estimatedTotal: number;
  categories: Map<string, BackroomInventoryRow[]>;
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
    r.quantity_on_hand,
    r.recommended_order_qty > 0 ? r.recommended_order_qty : '—',
    STOCK_STATUS_CONFIG[r.status].label,
    r.supplier_name || '—',
    r.cost_price != null ? formatCurrency(r.cost_price) : r.cost_per_gram != null ? `${formatCurrency(r.cost_per_gram)}/g` : '—',
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['Product', 'Brand', 'Stock', 'Suggested Order', 'Status', 'Supplier', 'Cost']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 41, 41], fontSize: 8, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { top: 72 },
    didDrawPage: () => { addReportHeader(doc, headerOpts); },
  });

  addReportFooter(doc);
  doc.save(`inventory-stock-${format(now, 'yyyy-MM-dd')}.pdf`);
}

// ─── Main Component ─────────────────────────────────

export function StockTab({ locationId }: StockTabProps) {
  const { data: inventory = [], isLoading } = useBackroomInventoryTable({ locationId });
  const { data: poHistoryMap } = useProductPOHistory();
  const { data: intelligenceMap } = useInventoryIntelligence(locationId);
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
  const [qtyOverrides, setQtyOverrides] = useState<Map<string, number>>(new Map());
  const [supplierDialog, setSupplierDialog] = useState<{ open: boolean; brand: string; products: BackroomInventoryRow[] }>({ open: false, brand: '', products: [] });
  const [auditDialog, setAuditDialog] = useState<{ open: boolean; productId: string | null; productName: string }>({ open: false, productId: null, productName: '' });
  const [autoPoDialog, setAutoPoDialog] = useState(false);
  const [autoParDialog, setAutoParDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'low' | 'needs_reorder'>('all');
  const [poItemIds, setPoItemIds] = useState<Set<string>>(new Set());
  const [poBuilderOpen, setPoBuilderOpen] = useState(false);

  const toggleAddToPo = useCallback((productId: string) => {
    setPoItemIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    // Auto-open panel when adding items
    setPoBuilderOpen(true);
  }, []);

  const poItems = useMemo(() => inventory.filter(r => poItemIds.has(r.id)), [inventory, poItemIds]);

  const handleSubmitPO = useCallback((group: SupplierPOGroup) => {
    if (!orgId) return;
    const lines = group.items.map(item => ({
      product_id: item.id,
      quantity_ordered: qtyOverrides.get(item.id) ?? item.recommended_order_qty,
      unit_cost: item.cost_price ?? item.cost_per_gram ?? undefined,
    }));
    createPO.mutate({
      organization_id: orgId,
      supplier_name: group.supplier !== 'Unassigned' ? group.supplier : undefined,
      supplier_email: group.items.find(i => i.supplier_email)?.supplier_email ?? undefined,
      notes: `PO for ${group.supplier}`,
      lines,
    }, {
      onSuccess: () => {
        // Remove submitted items from staged set
        setPoItemIds(prev => {
          const next = new Set(prev);
          group.items.forEach(i => next.delete(i.id));
          return next;
        });
        toast.success(`Draft PO created for ${group.supplier}`);
      },
    });
  }, [orgId, qtyOverrides, createPO]);

  // Compute KPIs — now includes severity-based metrics
  const kpis = useMemo(() => {
    const totalOnHand = inventory.reduce((s, r) => s + r.quantity_on_hand, 0);
    const lowStock = inventory.filter(r => r.severity === 'low').length;
    const criticalCount = inventory.filter(r => r.severity === 'critical').length;
    const outOfStock = inventory.filter(r => r.stock_state === 'out_of_stock').length;
    const totalValue = inventory.reduce((s, r) => s + (r.quantity_on_hand * (r.cost_price ?? r.cost_per_gram ?? 0)), 0);
    const needsReorder = inventory.filter(r => r.recommended_order_qty > 0).length;
    const estimatedPoValue = inventory.reduce((s, r) => {
      if (r.recommended_order_qty <= 0) return s;
      return s + r.recommended_order_qty * (r.cost_price ?? r.cost_per_gram ?? 0);
    }, 0);
    return { totalOnHand, lowStock, criticalCount, outOfStock, totalValue, needsReorder, estimatedPoValue };
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
    if (severityFilter === 'critical') rows = rows.filter(r => r.severity === 'critical');
    else if (severityFilter === 'low') rows = rows.filter(r => r.severity === 'low');
    else if (severityFilter === 'needs_reorder') rows = rows.filter(r => r.recommended_order_qty > 0);
    return rows;
  }, [inventory, search, categoryFilter, statusFilter, severityFilter]);

  // Group by supplier → category
  const supplierGroups = useMemo((): SupplierGroup[] => {
    const map = new Map<string, BackroomInventoryRow[]>();
    for (const row of filtered) {
      const supplier = row.supplier_name || '__unassigned__';
      const arr = map.get(supplier) ?? [];
      arr.push(row);
      map.set(supplier, arr);
    }

    return Array.from(map.entries())
      .sort((a, b) => {
        // Unassigned always last
        if (a[0] === '__unassigned__') return 1;
        if (b[0] === '__unassigned__') return -1;
        return a[0].localeCompare(b[0]);
      })
      .map(([supplier, products]) => {
        const estimatedTotal = products.reduce((sum, p) => {
          const qty = p.recommended_order_qty;
          const cost = p.cost_price ?? p.cost_per_gram ?? 0;
          return sum + qty * cost;
        }, 0);
        const categories = new Map<string, BackroomInventoryRow[]>();
        for (const p of products) {
          const cat = p.category || 'Other';
          const arr = categories.get(cat) ?? [];
          arr.push(p);
          categories.set(cat, arr);
        }
        return { supplier: supplier === '__unassigned__' ? 'Unassigned' : supplier, products, estimatedTotal, categories };
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

  const autoPoProducts = selectedReorderProducts.length > 0
    ? selectedReorderProducts
    : inventory.filter(r => r.recommended_order_qty > 0);

  // Override handler
  const handleQtyOverride = (productId: string, qty: number | null) => {
    setQtyOverrides(prev => {
      const next = new Map(prev);
      if (qty == null) next.delete(productId);
      else next.set(productId, qty);
      return next;
    });
  };

  // Single product quick reorder — respects override
  const handleQuickReorder = (row: BackroomInventoryRow, overrideQty?: number) => {
    const qty = overrideQty ?? qtyOverrides.get(row.id) ?? row.recommended_order_qty;
    if (!orgId || qty <= 0) return;
    createPO.mutate({
      organization_id: orgId,
      supplier_name: row.supplier_name ?? undefined,
      supplier_email: row.supplier_email ?? undefined,
      notes: `Reorder for ${stripSizeSuffix(row.name)}`,
      lines: [{
        product_id: row.id,
        quantity_ordered: qty,
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
      {/* Summary / Control Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <SummaryChip
          label="Needs Reorder"
          value={kpis.needsReorder}
          active={severityFilter === 'needs_reorder'}
          onClick={() => setSeverityFilter(severityFilter === 'needs_reorder' ? 'all' : 'needs_reorder')}
          accent={kpis.needsReorder > 0 ? 'warning' : undefined}
        />
        <SummaryChip
          label="Critical"
          value={kpis.criticalCount}
          active={severityFilter === 'critical'}
          onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
          accent={kpis.criticalCount > 0 ? 'destructive' : undefined}
        />
        <SummaryChip
          label="Low"
          value={kpis.lowStock}
          active={severityFilter === 'low'}
          onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}
          accent={kpis.lowStock > 0 ? 'warning' : undefined}
        />
        <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
        <span className="text-xs text-muted-foreground font-sans tabular-nums">
          Est. PO Value: <span className="text-foreground">{formatCurrency(kpis.estimatedPoValue)}</span>
        </span>
        <span className="text-xs text-muted-foreground font-sans tabular-nums ml-auto hidden sm:block">
          {formatNumber(kpis.totalOnHand)} units · {formatCurrency(kpis.totalValue)} on hand
        </span>
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
          onClick={() => {
            const reorderItems = inventory.filter(r => r.recommended_order_qty > 0);
            if (reorderItems.length === 0) return;
            setPoItemIds(prev => {
              const next = new Set(prev);
              reorderItems.forEach(r => next.add(r.id));
              return next;
            });
            setPoBuilderOpen(true);
            toast.success(`${reorderItems.length} items added to PO Builder`);
          }}
          disabled={kpis.needsReorder === 0}
        >
          <Zap className="w-4 h-4 mr-1.5" />
          Auto Build PO
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
        {poItemIds.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="font-sans border-primary/30 text-primary"
            onClick={() => setPoBuilderOpen(!poBuilderOpen)}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            PO Builder
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-5 px-1.5 rounded-full">
              {poItemIds.size}
            </Badge>
          </Button>
        )}
      </div>

      {/* Sticky Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-20 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-card/95 backdrop-blur-sm shadow-lg">
          <span className="text-sm text-muted-foreground font-sans tabular-nums">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <Button
            size="sm"
            className="font-sans h-7 gap-1"
            onClick={() => {
              selectedProducts.forEach(r => {
                if (r.recommended_order_qty > 0 && !poItemIds.has(r.id)) {
                  toggleAddToPo(r.id);
                }
              });
            }}
            disabled={selectedReorderProducts.length === 0}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add Selected to PO
            {selectedReorderProducts.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5 rounded-full">
                {selectedReorderProducts.length}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="font-sans h-7 gap-1"
            onClick={() => {
              const reorderItems = inventory.filter(r => r.recommended_order_qty > 0 && !poItemIds.has(r.id));
              setPoItemIds(prev => {
                const next = new Set(prev);
                reorderItems.forEach(r => next.add(r.id));
                return next;
              });
              setPoBuilderOpen(true);
              toast.success(`${reorderItems.length} items added to PO Builder`);
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            Auto Build PO
          </Button>
          {selectedReorderProducts.length > 0 && (
            <span className="text-xs text-muted-foreground font-sans tabular-nums ml-auto hidden sm:block">
              Est. {formatCurrency(selectedReorderProducts.reduce((s, r) => {
                const qty = qtyOverrides.get(r.id) ?? r.recommended_order_qty;
                return s + qty * (r.cost_price ?? r.cost_per_gram ?? 0);
              }, 0))}
            </span>
          )}
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

      {/* Command Center Table */}
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
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      Stock
                      <MetricInfoTooltip description="Current quantity on hand. Click the number to adjust." />
                    </span>
                  </TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      Suggested Order
                      <MetricInfoTooltip description="Units needed to reach Par Level, minus any on open POs. The primary decision signal." />
                    </span>
                  </TableHead>
                  <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Supplier</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell')}>Cost</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'w-20')} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierGroups.map((sg) => (
                  <SupplierSection
                    key={sg.supplier}
                    group={sg}
                    formatCurrency={formatCurrency}
                    orgId={orgId}
                    locationId={locationId}
                    adjustStock={adjustStock}
                    updateMinMax={updateMinMax}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onSetSupplier={(products) => setSupplierDialog({ open: true, brand: sg.supplier, products })}
                    onAudit={(productId, productName) => setAuditDialog({ open: true, productId, productName })}
                    onQuickReorder={handleQuickReorder}
                    poHistoryMap={poHistoryMap}
                    qtyOverrides={qtyOverrides}
                    onQtyOverride={handleQtyOverride}
                    poItemIds={poItemIds}
                    onToggleAddToPo={toggleAddToPo}
                    intelligenceMap={intelligenceMap}
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
      <POBuilderPanel
        open={poBuilderOpen}
        onClose={() => setPoBuilderOpen(false)}
        items={poItems}
        qtyOverrides={qtyOverrides}
        onQtyOverride={handleQtyOverride}
        onRemoveItem={toggleAddToPo}
        onClearAll={() => { setPoItemIds(new Set()); setPoBuilderOpen(false); }}
        onSubmitPO={handleSubmitPO}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────

function SummaryChip({ label, value, active, onClick, accent }: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  accent?: 'warning' | 'destructive';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-colors border',
        active
          ? accent === 'destructive'
            ? 'bg-destructive/10 border-destructive/30 text-destructive'
            : accent === 'warning'
              ? 'bg-warning/10 border-warning/30 text-warning'
              : 'bg-primary/10 border-primary/30 text-primary'
          : 'bg-muted/40 border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
      )}
    >
      <span className="tabular-nums font-medium">{value}</span>
      {label}
    </button>
  );
}

function SupplierSection({ group, formatCurrency, orgId, locationId, adjustStock, updateMinMax, selectedIds, onToggleSelect, onSetSupplier, onAudit, onQuickReorder, poHistoryMap, qtyOverrides, onQtyOverride, poItemIds, onToggleAddToPo }: {
  group: SupplierGroup;
  formatCurrency: (n: number) => string;
  orgId: string | undefined;
  locationId: string | undefined;
  adjustStock: ReturnType<typeof useInlineStockEdit>['adjustStock'];
  updateMinMax: ReturnType<typeof useInlineStockEdit>['updateMinMax'];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSetSupplier: (products: BackroomInventoryRow[]) => void;
  onAudit: (productId: string, productName: string) => void;
  onQuickReorder: (row: BackroomInventoryRow, overrideQty?: number) => void;
  poHistoryMap?: Map<string, number[]>;
  qtyOverrides: Map<string, number>;
  onQtyOverride: (productId: string, qty: number | null) => void;
  poItemIds: Set<string>;
  onToggleAddToPo: (productId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const sortedCategories = Array.from(group.categories.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const isUnassigned = group.supplier === 'Unassigned';
  const reorderCount = group.products.filter(p => p.recommended_order_qty > 0).length;

  return (
    <>
      {/* Supplier header row */}
      <TableRow
        className="bg-muted/30 hover:bg-muted/40 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <TableCell colSpan={8} className="py-2">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <Truck className={cn('w-3.5 h-3.5', isUnassigned ? 'text-muted-foreground/40' : 'text-primary')} />
            <span className={cn(tokens.label.tiny, isUnassigned ? 'text-muted-foreground/60' : 'text-foreground/80')}>
              {group.supplier}
            </span>
            <span className="text-muted-foreground text-[10px]">({group.products.length})</span>
            {reorderCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-sans border-warning/30 text-warning bg-warning/5 ml-1">
                {reorderCount} to reorder
              </Badge>
            )}
            {group.estimatedTotal > 0 && (
              <span className="text-[10px] text-muted-foreground/60 ml-auto mr-2 tabular-nums">
                Est. {formatCurrency(group.estimatedTotal)}
              </span>
            )}
            {isUnassigned && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] ml-1 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onSetSupplier(group.products); }}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Assign Supplier
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {open && sortedCategories.map(([category, rows]) => (
        <CategoryGroup
          key={`${group.supplier}-${category}`}
          category={category}
          rows={rows}
          formatCurrency={formatCurrency}
          orgId={orgId}
          locationId={locationId}
          adjustStock={adjustStock}
          updateMinMax={updateMinMax}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onAudit={onAudit}
          onQuickReorder={onQuickReorder}
          poHistoryMap={poHistoryMap}
          qtyOverrides={qtyOverrides}
          onQtyOverride={onQtyOverride}
          poItemIds={poItemIds}
          onToggleAddToPo={onToggleAddToPo}
        />
      ))}
    </>
  );
}

function CategoryGroup({ category, rows, formatCurrency, orgId, locationId, adjustStock, updateMinMax, selectedIds, onToggleSelect, onAudit, onQuickReorder, poHistoryMap, qtyOverrides, onQtyOverride, poItemIds, onToggleAddToPo }: {
  category: string;
  rows: BackroomInventoryRow[];
  formatCurrency: (n: number) => string;
  orgId: string | undefined;
  locationId: string | undefined;
  adjustStock: ReturnType<typeof useInlineStockEdit>['adjustStock'];
  updateMinMax: ReturnType<typeof useInlineStockEdit>['updateMinMax'];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onAudit: (productId: string, productName: string) => void;
  onQuickReorder: (row: BackroomInventoryRow, overrideQty?: number) => void;
  poHistoryMap?: Map<string, number[]>;
  qtyOverrides: Map<string, number>;
  onQtyOverride: (productId: string, qty: number | null) => void;
  poItemIds: Set<string>;
  onToggleAddToPo: (productId: string) => void;
}) {
  return (
    <>
      {/* Category sub-header */}
      <TableRow className="bg-muted/10 hover:bg-muted/10">
        <TableCell colSpan={8} className="py-1 pl-10">
          <span className="text-muted-foreground text-[11px] tracking-wide">{formatCategoryLabel(category)}</span>
          <span className="text-muted-foreground/50 text-[10px] ml-1.5">({rows.length})</span>
        </TableCell>
      </TableRow>
      {rows.map((row) => (
        <CommandCenterRow
          key={row.id}
          row={row}
          isSelected={selectedIds.has(row.id)}
          onToggleSelect={onToggleSelect}
          formatCurrency={formatCurrency}
          orgId={orgId}
          locationId={locationId}
          adjustStock={adjustStock}
          updateMinMax={updateMinMax}
          onAudit={onAudit}
          onQuickReorder={onQuickReorder}
          poHistory={poHistoryMap?.get(row.id)}
          qtyOverride={qtyOverrides.get(row.id) ?? null}
          onQtyOverride={onQtyOverride}
          addedToPo={poItemIds.has(row.id)}
          onToggleAddToPo={onToggleAddToPo}
        />
      ))}
    </>
  );
}
