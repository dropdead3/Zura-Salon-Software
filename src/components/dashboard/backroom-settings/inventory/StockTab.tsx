/**
 * StockTab — Stock overview with KPI cards and enhanced inventory table.
 * Groups by brand, shows status badges, supports search/filter.
 * Apple-grade responsive: scrollable table, stacked filters on mobile, compact KPIs.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Search, Package, AlertTriangle, XCircle, DollarSign } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useBackroomInventoryTable, STOCK_STATUS_CONFIG, type BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';

interface StockTabProps {
  locationId?: string;
}

export function StockTab({ locationId }: StockTabProps) {
  const { data: inventory = [], isLoading } = useBackroomInventoryTable({ locationId });
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const kpis = useMemo(() => {
    const totalOnHand = inventory.reduce((s, r) => s + r.quantity_on_hand, 0);
    const lowStock = inventory.filter(r => r.status === 'replenish' || r.status === 'urgent_reorder').length;
    const outOfStock = inventory.filter(r => r.status === 'out_of_stock').length;
    const totalValue = inventory.reduce((s, r) => s + (r.quantity_on_hand * (r.cost_price ?? r.cost_per_gram ?? 0)), 0);
    return { totalOnHand, lowStock, outOfStock, totalValue };
  }, [inventory]);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(r => r.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()] as string[];
  }, [inventory]);

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

  const grouped = useMemo(() => {
    const map = new Map<string, BackroomInventoryRow[]>();
    for (const row of filtered) {
      const brand = row.brand || 'Uncategorized';
      const arr = map.get(brand) ?? [];
      arr.push(row);
      map.set(brand, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={<Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />} label="On Hand" value={formatNumber(kpis.totalOnHand)} />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />}
          label="Low Stock"
          value={String(kpis.lowStock)}
          accent={kpis.lowStock > 0 ? 'warning' : undefined}
          onClick={() => setStatusFilter(statusFilter === 'replenish' ? 'all' : 'replenish')}
        />
        <KpiCard
          icon={<XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />}
          label="Out of Stock"
          value={String(kpis.outOfStock)}
          accent={kpis.outOfStock > 0 ? 'destructive' : undefined}
          onClick={() => setStatusFilter(statusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
        />
        <KpiCard icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />} label="Value" value={formatCurrency(kpis.totalValue)} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products, brands, SKUs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn('pl-9', tokens.input?.search)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className={cn('flex-1 sm:w-40', tokens.input?.filter)}>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn('flex-1 sm:w-40', tokens.input?.filter)}>
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
        </div>
      </div>

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
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[640px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden md:table-cell')}>Category</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Container</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Stock</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Min</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Max</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden lg:table-cell')}>Order Qty</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden xl:table-cell')}>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped.map(([brand, rows]) => (
                      <BrandGroup key={brand} brand={brand} rows={rows} formatCurrency={formatCurrency} formatNumber={formatNumber} />
                    ))}
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

// ─── Sub-components ──────────────────────────────────

function KpiCard({ icon, label, value, accent, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: 'warning' | 'destructive';
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        tokens.kpi.tile,
        'relative p-3 sm:p-4 transition-all duration-150',
        onClick && 'cursor-pointer hover:border-primary/40 active:scale-[0.98]',
        accent === 'warning' && 'border-warning/30',
        accent === 'destructive' && 'border-destructive/30',
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
        {icon}
        <span className={cn(tokens.kpi.label, 'text-[10px] sm:text-xs')}>{label}</span>
      </div>
      <span className={cn(tokens.kpi.value, 'text-lg sm:text-2xl')}>{value}</span>
    </div>
  );
}

function BrandGroup({ brand, rows, formatCurrency, formatNumber }: {
  brand: string;
  rows: BackroomInventoryRow[];
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}) {
  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={9} className="py-1.5 sm:py-2">
          <span className={cn(tokens.label.tiny, 'text-foreground/70')}>{brand}</span>
          <span className="text-muted-foreground text-[10px] ml-2">({rows.length})</span>
        </TableCell>
      </TableRow>
      {rows.map((row) => {
        const statusCfg = STOCK_STATUS_CONFIG[row.status];
        return (
          <TableRow key={row.id}>
            <TableCell className="py-2 sm:py-3">
              <div className="min-w-0">
                <span className={cn(tokens.body.emphasis, 'block truncate')}>{row.name}</span>
                {row.sku && <span className="text-muted-foreground text-[10px] sm:text-xs">{row.sku}</span>}
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{row.category || '—'}</TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{row.container_size || '—'}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatNumber(row.quantity_on_hand)}</TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">{row.reorder_level ?? '—'}</TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">{row.par_level ?? '—'}</TableCell>
            <TableCell className="text-right hidden lg:table-cell tabular-nums">
              {row.order_qty > 0 ? <span className="text-warning font-medium">{row.order_qty}</span> : '—'}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={cn('text-[10px] font-medium border whitespace-nowrap', statusCfg.className)}>
                {statusCfg.label}
              </Badge>
            </TableCell>
            <TableCell className="text-right hidden xl:table-cell text-muted-foreground tabular-nums">
              {row.cost_price != null ? formatCurrency(row.cost_price) : row.cost_per_gram != null ? `${formatCurrency(row.cost_per_gram)}/g` : '—'}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
