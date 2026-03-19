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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Search, Package, ChevronRight, UserPlus, FileDown, FileText, ShoppingCart, Zap, SlidersHorizontal, Truck, AlertTriangle, CheckCircle2, Send, Mail, Eye, Info } from 'lucide-react';
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
import { useBatchCreatePurchaseOrders } from '@/hooks/useBatchReorder';
import { SupplierAssignDialog } from './SupplierAssignDialog';
import { InventoryAuditDialog } from './InventoryAuditDialog';
import { AutoCreatePODialog } from './AutoCreatePODialog';
import { AutoParDialog } from './AutoParDialog';
import { useProductPOHistory } from '@/hooks/backroom/useProductPOHistory';
import { useInventoryIntelligence, type ProductIntelligence } from '@/hooks/backroom/useInventoryIntelligence';
import { CommandCenterRow, stripSizeSuffix, formatCategoryLabel } from './CommandCenterRow';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, type ReportHeaderOptions, type ReportLocationInfo, REPORT_BODY_START_Y } from '@/lib/reportPdfLayout';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
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
  locationInfo?: ReportLocationInfo,
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
    locationInfo,
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
    startY: REPORT_BODY_START_Y,
    head: [['Product', 'Brand', 'Stock', 'Suggested Order', 'Status', 'Supplier', 'Cost']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [55, 55, 55], fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { top: REPORT_BODY_START_Y },
    didDrawPage: () => { addReportHeader(doc, headerOpts); },
  });

  addReportFooter(doc, orgName);
  doc.save(`inventory-stock-${format(now, 'yyyy-MM-dd')}.pdf`);
}

// ─── Main Component ─────────────────────────────────

export function StockTab({ locationId }: StockTabProps) {
  const { data: inventory = [], isLoading } = useBackroomInventoryTable({ locationId });
  const { data: poHistoryMap } = useProductPOHistory();
  const { data: intelligenceMap } = useInventoryIntelligence(locationId);
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();
  const { adjustStock, updateMinMax } = useInlineStockEdit();
  const orgId = useBackroomOrgId();
  const { effectiveOrganization } = useOrganizationContext();
  const createPO = useCreateMultiLinePO();
  const batchCreatePOs = useBatchCreatePurchaseOrders();
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
  const [showEmailPreview, setShowEmailPreview] = useState(false);

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
      quantity_ordered: qtyOverrides.get(item.id) ?? (item.recommended_order_qty > 0 ? item.recommended_order_qty : 1),
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
    const needsReorder = inventory.filter(r => r.recommended_order_qty > 0 || r.stock_state === 'out_of_stock' || r.severity === 'low' || r.severity === 'critical').length;
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
  const selectedReorderProducts = selectedProducts.filter(r => r.recommended_order_qty > 0 || r.stock_state === 'out_of_stock');

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
    const qty = overrideQty ?? qtyOverrides.get(row.id) ?? (row.recommended_order_qty > 0 ? row.recommended_order_qty : 1);
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
        businessSettings?.business_name || effectiveOrganization?.name || 'Organization',
        businessSettings?.logo_light_url || effectiveOrganization?.logo_url,
        formatCurrency,
        locationInfo,
      );
    } finally {
      setExporting(false);
    }
  }, [filtered, effectiveOrganization, formatCurrency]);

  // Stage all supplier items into PO builder
  const stageSupplierToPo = useCallback((products: BackroomInventoryRow[]) => {
    const reorderItems = products.filter(p => p.recommended_order_qty > 0 || p.stock_state === 'out_of_stock');
    if (reorderItems.length === 0) return;
    setPoItemIds(prev => {
      const next = new Set(prev);
      reorderItems.forEach(r => next.add(r.id));
      return next;
    });
    setPoBuilderOpen(true);
    toast.success(`${reorderItems.length} items added to PO Builder`);
  }, []);

  // ─── Email Send Flow (ported from ReorderTab) ───────────

  /** Groups with email + selected items for email preview */
  const emailPreviewGroups = useMemo(() => {
    return supplierGroups
      .filter(g => g.supplier !== 'Unassigned' && g.products.some(p => p.supplier_email))
      .map(g => ({
        supplierName: g.supplier,
        supplierEmail: g.products.find(p => p.supplier_email)?.supplier_email ?? null,
        products: g.products.filter(p => selectedIds.has(p.id)),
        totalEstCost: g.estimatedTotal,
      }))
      .filter(g => g.products.length > 0 && g.supplierEmail);
  }, [supplierGroups, selectedIds]);

  const selectedWithoutEmail = useMemo(() => {
    return filtered.filter(r =>
      selectedIds.has(r.id) && (!r.supplier_email || !r.supplier_name || r.supplier_name === 'Unassigned')
    ).length;
  }, [filtered, selectedIds]);

  const getOrderQtyForEmail = useCallback((row: BackroomInventoryRow) => {
    return qtyOverrides.get(row.id) ?? row.recommended_order_qty;
  }, [qtyOverrides]);

  const handleCreateAndEmailPOs = useCallback(async () => {
    if (!orgId) return;
    const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
    const items = emailPreviewGroups.flatMap(g =>
      g.products.map(p => ({
        organization_id: orgId,
        product_id: p.id,
        product_name: p.name,
        product_sku: p.sku,
        supplier_name: g.supplierName,
        supplier_email: g.supplierEmail ?? undefined,
        quantity: getOrderQtyForEmail(p),
        unit_cost: p.cost_price ?? p.cost_per_gram ?? undefined,
      }))
    );
    if (items.length === 0) {
      toast.error('No emailable items selected');
      return;
    }
    batchCreatePOs.mutate(
      {
        items,
        sendEmails: true,
        orgName: effectiveOrganization?.name ?? 'Organization',
        logoDataUrl,
      },
      {
        onSuccess: () => {
          setShowEmailPreview(false);
          setSelectedIds(new Set());
        },
      }
    );
  }, [orgId, emailPreviewGroups, getOrderQtyForEmail, effectiveOrganization, batchCreatePOs]);

  /** Build the HTML email that suppliers will receive */
  const buildEmailPreviewHtml = useCallback((group: { supplierName: string; supplierEmail: string | null; products: BackroomInventoryRow[] }) => {
    const orgName = effectiveOrganization?.name ?? 'Organization';
    const selectedProducts = group.products.filter(p => selectedIds.has(p.id));
    if (selectedProducts.length === 0) return '';

    const hasUnitCost = selectedProducts.some(p => (p.cost_price ?? p.cost_per_gram) != null);
    const rows = selectedProducts.map(p => {
      const qty = getOrderQtyForEmail(p);
      const unitCost = p.cost_price ?? p.cost_per_gram;
      const total = unitCost != null ? unitCost * qty : null;
      return `<tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${p.name}${p.sku ? ` (SKU: ${p.sku})` : ''}</td>
        <td style="text-align: right; padding: 10px; border: 1px solid #ddd;">${qty}</td>
        ${hasUnitCost ? `<td style="text-align: right; padding: 10px; border: 1px solid #ddd;">${unitCost != null ? `$${unitCost.toFixed(2)}` : '—'}</td>` : ''}
        ${hasUnitCost ? `<td style="text-align: right; padding: 10px; border: 1px solid #ddd;">${total != null ? `$${total.toFixed(2)}` : '—'}</td>` : ''}
      </tr>`;
    }).join('');

    const grandTotal = selectedProducts.reduce((s, p) => {
      const unitCost = p.cost_price ?? p.cost_per_gram ?? 0;
      return s + getOrderQtyForEmail(p) * unitCost;
    }, 0);

    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; margin-bottom: 24px;">Purchase Order Request</h2>
      <p>Dear ${group.supplierName},</p>
      <p>We would like to place the following order${selectedProducts.length > 1 ? ` (${selectedProducts.length} items)` : ''}:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f5f5f5;">
          <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Product</th>
          <th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Quantity</th>
          ${hasUnitCost ? '<th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Unit Cost</th>' : ''}
          ${hasUnitCost ? '<th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Total</th>' : ''}
        </tr>
        ${rows}
        ${hasUnitCost && selectedProducts.length > 1 ? `<tr style="background: #f9f9f9; font-weight: bold;">
          <td style="padding: 10px; border: 1px solid #ddd;" colspan="${hasUnitCost ? 3 : 2}">Grand Total</td>
          <td style="text-align: right; padding: 10px; border: 1px solid #ddd;">$${grandTotal.toFixed(2)}</td>
        </tr>` : ''}
      </table>
      <p>Please confirm receipt of this order and provide an estimated delivery date.</p>
      <p>Thank you,<br/>${orgName}</p>
      <p style="color: #888; font-size: 12px; margin-top: 16px;"><em>📎 A formatted PO PDF is attached to this email.</em></p>
    </div>`;
  }, [effectiveOrganization, selectedIds, getOrderQtyForEmail]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  const hasActionItems = kpis.needsReorder > 0;

  return (
    <div className="space-y-4">
      {/* Sticky Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-20 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-card/95 backdrop-blur-sm shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200">
          <span className="text-sm text-muted-foreground font-sans tabular-nums">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <Button
            size="sm"
            className="font-sans h-7 gap-1"
            onClick={() => {
              selectedProducts.forEach(r => {
                if ((r.recommended_order_qty > 0 || r.stock_state === 'out_of_stock') && !poItemIds.has(r.id)) {
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
            onClick={() => setAutoPoDialog(true)}
          >
            <Zap className="w-3.5 h-3.5" />
            Auto Build PO
          </Button>
          {emailPreviewGroups.length > 0 && (
            <Button
              size="sm"
              className="font-sans h-7 gap-1"
              onClick={() => setShowEmailPreview(true)}
              disabled={batchCreatePOs.isPending}
            >
              <Mail className="w-3.5 h-3.5" />
              Create & Email ({emailPreviewGroups.reduce((s, g) => s + g.products.length, 0)})
            </Button>
          )}
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
        <>
          {/* Filters + Actions — above the card */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
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
              size="sm"
              variant="outline"
              className="font-sans"
              onClick={() => setAutoParDialog(true)}
              disabled={inventory.length === 0}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Auto-Set Pars
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    role="button"
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground hover:bg-foreground/20 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="w-3 h-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[300px] text-center">
                  A par level is the ideal maximum stock quantity to keep on hand. This tool automatically calculates par levels and reorder points based on your 30-day usage velocity and supplier lead times.
                </TooltipContent>
              </Tooltip>
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

          <Card className="overflow-hidden">
            {/* ─── Decision Header ─── */}
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
              {hasActionItems ? (
                <>
                  <div className="flex items-baseline gap-1.5 shrink-0">
                    <span className="text-lg font-display tracking-wide tabular-nums">{kpis.needsReorder}</span>
                    <span className="text-xs text-foreground/80 font-sans">need action</span>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-center gap-2 text-xs font-sans">
                    <button
                      onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
                      className={cn(
                        'tabular-nums transition-colors duration-150 shrink-0',
                        severityFilter === 'critical' ? 'text-destructive font-medium' : 'text-destructive/70 hover:text-destructive',
                      )}
                    >
                      {kpis.criticalCount} Critical
                    </button>
                    <span className="text-muted-foreground/30">·</span>
                    <button
                      onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}
                      className={cn(
                        'tabular-nums transition-colors duration-150 shrink-0',
                        severityFilter === 'low' ? 'text-warning font-medium' : 'text-warning/70 hover:text-warning',
                      )}
                    >
                      {kpis.lowStock} Low
                    </button>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      Est. PO: <span className="text-foreground">{formatCurrency(kpis.estimatedPoValue)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-sans rounded-full h-7 px-3 text-xs"
                      onClick={() => setSeverityFilter(severityFilter === 'needs_reorder' ? 'all' : 'needs_reorder')}
                    >
                      {severityFilter === 'needs_reorder' ? 'Show All' : 'Review Items'}
                    </Button>
                    <Button
                      size="sm"
                      className="font-sans rounded-full h-7 px-3 text-xs"
                      onClick={() => setAutoPoDialog(true)}
                      disabled={kpis.needsReorder === 0}
                    >
                      <Zap className="w-3.5 h-3.5 mr-1" />
                      Auto Build PO
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-sans rounded-full h-7 px-3 text-xs"
                      onClick={handlePdfExport}
                      disabled={exporting || filtered.length === 0}
                    >
                      {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
                      PDF
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs font-sans">All stock levels healthy</span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    <span className="text-xs text-muted-foreground font-sans tabular-nums hidden sm:block">
                      {formatNumber(kpis.totalOnHand)} units · {formatCurrency(kpis.totalValue)} on hand
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-sans rounded-full h-7 px-3 text-xs"
                      onClick={handlePdfExport}
                      disabled={exporting || filtered.length === 0}
                    >
                      {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
                      PDF
                    </Button>
                  </div>
                </>
              )}
            </div>
            <CardContent className="p-0">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className={cn(tokens.table.columnHeader, 'w-10')}>
                    <Checkbox
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right w-20')}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      Stock
                      <MetricInfoTooltip description="Current quantity on hand. Click the number to adjust." />
                    </span>
                  </TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right w-28')}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      Suggested
                      <MetricInfoTooltip description="Units needed to reach Par Level, minus any on open POs. The primary decision signal." />
                    </span>
                  </TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'w-24')}>Status</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Supplier</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell w-20')}>Cost</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'w-24')} />
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
                    onStageToPo={stageSupplierToPo}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </>
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

      {/* Bulk Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className={tokens.card.title}>Confirm PO Email Send</DialogTitle>
            <DialogDescription>
              Review the purchase orders and preview what suppliers will receive. A formatted PDF will be attached.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="summary" className="flex-1 gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" /> Order Summary
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex-1 gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Email Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <ScrollArea className="max-h-[350px] pr-2">
                <div className="space-y-4 py-2">
                  {emailPreviewGroups.map(group => (
                    <div key={group.supplierName} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <span className={tokens.body.emphasis}>{group.supplierName}</span>
                        <span className="text-muted-foreground text-xs">→ {group.supplierEmail}</span>
                      </div>
                      <div className="pl-6 space-y-1">
                        {group.products.map(p => (
                          <div key={p.id} className="flex items-center justify-between text-sm">
                            <span>{p.name}</span>
                            <div className="flex items-center gap-3 text-muted-foreground tabular-nums">
                              <span>×{getOrderQtyForEmail(p)}</span>
                              <span>{formatCurrency(getOrderQtyForEmail(p) * (p.cost_price ?? p.cost_per_gram ?? 0))}</span>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-end pt-1 border-t border-border/40">
                          <span className="text-sm text-muted-foreground">
                            Subtotal: {formatCurrency(group.products.reduce((s, p) => s + getOrderQtyForEmail(p) * (p.cost_price ?? p.cost_per_gram ?? 0), 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="preview">
              <ScrollArea className="max-h-[350px] pr-2">
                <div className="space-y-4 py-2">
                  {emailPreviewGroups.map(group => (
                    <div key={group.supplierName} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        <span className={tokens.body.emphasis}>To: {group.supplierEmail}</span>
                      </div>
                      <div className="border border-border rounded-lg overflow-hidden bg-white">
                        <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Subject: Purchase Order: {group.products.length === 1
                              ? `${getOrderQtyForEmail(group.products[0])}x ${group.products[0].name}`
                              : `${group.products.length} products`}
                          </span>
                        </div>
                        <div
                          className="p-3 text-sm"
                          dangerouslySetInnerHTML={{ __html: buildEmailPreviewHtml(group) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {selectedWithoutEmail > 0 && (
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {selectedWithoutEmail} selected item{selectedWithoutEmail !== 1 ? 's' : ''} skipped (no supplier email)
            </p>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {emailPreviewGroups.length} supplier{emailPreviewGroups.length !== 1 ? 's' : ''} ·{' '}
              {emailPreviewGroups.reduce((s, g) => s + g.products.length, 0)} items ·{' '}
              {formatCurrency(emailPreviewGroups.reduce((s, g) => s + g.products.reduce((ss, p) => ss + getOrderQtyForEmail(p) * (p.cost_price ?? p.cost_per_gram ?? 0), 0), 0))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEmailPreview(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateAndEmailPOs}
                disabled={batchCreatePOs.isPending}
              >
                {batchCreatePOs.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Create & Send with PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────

function SupplierSection({ group, formatCurrency, orgId, locationId, adjustStock, updateMinMax, selectedIds, onToggleSelect, onSetSupplier, onAudit, onQuickReorder, poHistoryMap, qtyOverrides, onQtyOverride, poItemIds, onToggleAddToPo, intelligenceMap, onStageToPo }: {
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
  intelligenceMap?: Map<string, ProductIntelligence>;
  onStageToPo: (products: BackroomInventoryRow[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const sortedCategories = Array.from(group.categories.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const isUnassigned = group.supplier === 'Unassigned';
  const reorderCount = group.products.filter(p => p.recommended_order_qty > 0 || p.stock_state === 'out_of_stock').length;

  return (
    <>
      {/* Supplier header row — Identity Upgrade */}
      <TableRow
        className="bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors duration-150"
        onClick={() => setOpen(!open)}
      >
        <TableCell colSpan={8} className="py-2.5">
          <div className="flex items-center gap-2.5">
            <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-150', open && 'rotate-90')} />
            <Truck className={cn('w-4 h-4', isUnassigned ? 'text-muted-foreground/30' : 'text-primary/70')} />
            <div className="flex flex-col">
              <span className={cn('text-sm font-medium font-sans', isUnassigned ? 'text-muted-foreground/60' : 'text-foreground/80')}>
                {isUnassigned ? 'Unassigned Supplier' : group.supplier}
              </span>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums font-sans">
                {group.products.length} item{group.products.length !== 1 ? 's' : ''}
                {group.estimatedTotal > 0 && <> · {formatCurrency(group.estimatedTotal)} est.</>}
              </span>
            </div>
            {reorderCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-sans border-warning/20 text-warning/80 bg-warning/5 ml-1">
                {reorderCount} to reorder
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              {!isUnassigned && reorderCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs font-sans border-primary/20 text-primary/80 hover:text-primary hover:bg-primary/5"
                  onClick={(e) => { e.stopPropagation(); onStageToPo(group.products); }}
                >
                  <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                  Create PO
                </Button>
              )}
              {isUnassigned && (
                <>
                  {reorderCount > 0 && (
                  <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs font-sans border-primary/20 text-primary/80 hover:text-primary hover:bg-primary/5"
                      onClick={(e) => { e.stopPropagation(); onStageToPo(group.products); }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                      Create PO
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); onSetSupplier(group.products); }}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Assign Supplier
                  </Button>
                </>
              )}
            </div>
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
           intelligenceMap={intelligenceMap}
         />
      ))}
    </>
  );
}

function CategoryGroup({ category, rows, formatCurrency, orgId, locationId, adjustStock, updateMinMax, selectedIds, onToggleSelect, onAudit, onQuickReorder, poHistoryMap, qtyOverrides, onQtyOverride, poItemIds, onToggleAddToPo, intelligenceMap }: {
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
  intelligenceMap?: Map<string, ProductIntelligence>;
}) {
  return (
    <>
      {/* Category sub-header */}
      <TableRow className="bg-muted/[0.06] hover:bg-muted/10 transition-colors duration-150">
        <TableCell colSpan={8} className="py-1 pl-10">
          <span className="text-muted-foreground/60 text-[11px] tracking-wide">{formatCategoryLabel(category)}</span>
          <span className="text-muted-foreground/35 text-[10px] ml-1.5 tabular-nums">({rows.length})</span>
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
           intelligence={intelligenceMap?.get(row.id)}
         />
      ))}
    </>
  );
}
