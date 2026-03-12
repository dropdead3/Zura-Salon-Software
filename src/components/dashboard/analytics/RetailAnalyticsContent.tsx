import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LineChart, Line,
  PieChart, Pie,
} from 'recharts';
import {
  DollarSign, Package, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  ShoppingBag, Users, Search, ArrowUpDown, BarChart3, Loader2, Info, Percent, Tag, Scissors,
  ChevronDown, ChevronUp, Settings2, Archive, Download, Target, Bell, Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { VisibilityGate } from '@/components/visibility/VisibilityGate';
import { useRetailAnalytics, exportRetailCSV, type ProductRow, type RedFlag, type BrandRow, type RetailAnalyticsResult } from '@/hooks/useRetailAnalytics';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { exportStockMovementsCsv } from '@/lib/exportStockMovementsCsv';
import { toast } from 'sonner';
import { useServiceRetailAttachment } from '@/hooks/useServiceRetailAttachment';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { useCurrentRetailGoals } from '@/hooks/useRetailGoals';
import { useCommissionConfig, useCommissionOverrides, calculateStaffCommissions } from '@/hooks/useRetailCommissions';
import { useProducts } from '@/hooks/useProducts';
import { calculateInventoryAlerts } from '@/hooks/useInventoryAlerts';
import { EmptyState } from '@/components/ui/empty-state';
import { useAggregatedRetailGoals } from '@/hooks/useAggregatedRetailGoals';
import { getMovementRating, computePercentiles, getTierConfig, MOVEMENT_TIERS, type MovementTier } from '@/lib/productMovementRating';
import { MovementBadge } from '@/components/ui/MovementBadge';
import { useProductVelocity } from '@/hooks/useProductVelocity';
import { useSupplierPerformance } from '@/hooks/useSupplierPerformance';
import { BundleSuggestionsCard } from './BundleSuggestionsCard';
import { ReplenishmentTimelineCard } from './ReplenishmentTimelineCard';
import { InventoryValuationCard } from './InventoryValuationCard';
import { DeadStockAlertCard } from './DeadStockAlertCard';
import { ReorderApprovalCard } from './ReorderApprovalCard';
import { ExpiryAlertCard } from './ExpiryAlertCard';
import { ShrinkageReportCard } from './ShrinkageReportCard';
import { SeasonalForecastCard } from './SeasonalForecastCard';
import { MarginErosionCard } from './MarginErosionCard';

interface RetailAnalyticsContentProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext?: FilterContext;
}

function ChangeBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value === 0) return (
    <span className="text-xs text-muted-foreground cursor-help" title="No prior period data to compare">--</span>
  );
  const positive = value > 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
      positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
    )}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{Math.round(value)}{suffix}
    </span>
  );
}

function TrendArrow({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const positive = value > 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
      positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
    )}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{Math.round(value)}%
    </span>
  );
}

type SortKey = 'revenue' | 'unitsSold' | 'avgPrice' | 'discount' | 'revenueTrend';
type SortDir = 'asc' | 'desc';
type StaffSortKey = 'name' | 'productRevenue' | 'unitsSold' | 'attachmentRate' | 'avgTicket';

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const BAR_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))',
];

function RedFlagRow({ flag }: { flag: RedFlag }) {
  const isDanger = flag.severity === 'danger';
  const typeConfig: Record<string, { icon: typeof TrendingDown; color: string }> = {
    declining: { icon: TrendingDown, color: 'text-red-500' },
    heavy_discount: { icon: Tag, color: 'text-amber-500' },
    slow_mover: { icon: Package, color: 'text-orange-500' },
  };
  const cfg = typeConfig[flag.type];
  const Icon = cfg.icon;
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border px-3 py-2.5',
      isDanger
        ? 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20'
        : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20',
    )}>
      <Icon className={cn('w-4 h-4 shrink-0', cfg.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{flag.product}</p>
        <p className="text-xs text-muted-foreground">{flag.detail}</p>
      </div>
      <Badge variant="outline" className={cn(
        'text-[10px] shrink-0',
        isDanger
          ? 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-800'
          : 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800',
      )}>
        {flag.label}
      </Badge>
    </div>
  );
}

// ─── Mini Sparkline ───
function Sparkline({ data, color = 'hsl(var(--chart-1))' }: { data: { date: string; revenue: number }[]; color?: string }) {
  if (data.length < 2) return null;
  return (
    <div className="w-24 h-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="revenue" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── CSV Export Button ───
function ExportButton({ data, section }: { data: RetailAnalyticsResult; section: Parameters<typeof exportRetailCSV>[1] }) {
  return (
    <Button variant="ghost" size={tokens.button.inline} className="text-xs gap-1 text-muted-foreground" onClick={() => exportRetailCSV(data, section)}>
      <Download className="w-3.5 h-3.5" /> Export
    </Button>
  );
}

// ─── CSV export for inventory alerts ───
function exportInventoryAlertsCSV(alerts: ReturnType<typeof calculateInventoryAlerts>) {
  const headers = ['Product', 'Brand', 'Category', 'Stock', 'Reorder Level', 'Deficit', 'Velocity/Day', 'Days Until Stockout', 'Suggested Order', 'Severity'];
  const rows = alerts.map(a => [
    a.productName, a.brand || '', a.category || '', a.currentStock, a.reorderLevel, a.deficit,
    a.salesVelocity.toFixed(1), a.daysUntilStockout >= 999 ? 'N/A' : a.daysUntilStockout, a.suggestedReorder, a.severity,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'inventory-alerts.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV export for commissions ───
function exportCommissionsCSV(commissions: { name: string; retailRevenue: number; commissionRate: number; commissionEarned: number; isOverride: boolean }[]) {
  const headers = ['Stylist', 'Retail Revenue', 'Rate %', 'Override', 'Commission'];
  const rows = commissions.map(c => [c.name, c.retailRevenue.toFixed(2), c.commissionRate, c.isOverride ? 'Yes' : 'No', c.commissionEarned.toFixed(2)]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'retail-commissions.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Brand Performance Card ───
function BrandPerformanceCard({ brands, totalRevenue, formatCurrencyWhole, data, filterContext }: { brands: BrandRow[]; totalRevenue: number; formatCurrencyWhole: (n: number) => string; data: RetailAnalyticsResult; filterContext?: FilterContext }) {
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <PinnableCard elementKey="retail_brand_performance" elementName="Brand Performance" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">SALES BY BRAND</CardTitle>
                  <MetricInfoTooltip description="Revenue breakdown by product brand. Click a row to see full product-level drill-down with margin, stock, and trend data. Brands are resolved from the product catalog." />
                </div>
                <CardDescription className="text-xs">{brands.length} brand{brands.length !== 1 ? 's' : ''} with sales</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
              <ExportButton data={data} section="brands" />
              <Button variant="ghost" size={tokens.button.inline} className="text-xs gap-1 text-muted-foreground" onClick={() => navigate('/dashboard/admin/settings?category=retail-products')}>
                <Settings2 className="w-3.5 h-3.5" /> Manage Products
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bar chart */}
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brands.slice(0, 10)} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="brand" width={120} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => [formatCurrencyWhole(value), 'Revenue']} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {brands.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    {brands.some(b => b.margin > 0) && <TableHead className="text-right">Margin</TableHead>}
                    <TableHead className="text-right">Trend</TableHead>
                    <TableHead className="text-center">Sparkline</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map(b => (
                    <>
                      <TableRow key={b.brand} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedBrand(expandedBrand === b.brand ? null : b.brand)}>
                        <TableCell className="font-medium text-sm">{b.brand}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium"><BlurredAmount>{formatCurrencyWhole(b.revenue)}</BlurredAmount></TableCell>
                        <TableCell className="text-right tabular-nums">{b.unitsSold}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.productCount}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(b.avgPrice)}</BlurredAmount></TableCell>
                        {brands.some(br => br.margin > 0) && (
                          <TableCell className="text-right">
                            {b.margin > 0 ? (
                              <Badge variant="outline" className={cn('text-xs tabular-nums', b.margin >= 50 ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400' : b.margin >= 30 ? 'text-amber-600 border-amber-200 dark:text-amber-400' : 'text-red-500 border-red-200 dark:text-red-400')}>
                                {b.margin.toFixed(0)}%
                              </Badge>
                            ) : '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-right"><TrendArrow value={b.revenueTrend} /></TableCell>
                        <TableCell className="text-center"><Sparkline data={b.dailyRevenue} color={BAR_COLORS[brands.indexOf(b) % BAR_COLORS.length]} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={totalRevenue > 0 ? (b.revenue / totalRevenue) * 100 : 0} className="w-12 h-1.5" />
                            <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{totalRevenue > 0 ? Math.round((b.revenue / totalRevenue) * 100) : 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{expandedBrand === b.brand ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}</TableCell>
                      </TableRow>
                      {expandedBrand === b.brand && (
                        <TableRow key={`${b.brand}-detail`}>
                          <TableCell colSpan={10} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-3">
                              <p className="text-xs font-medium text-muted-foreground">Products under <span className="text-foreground">{b.brand}</span></p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Product</TableHead>
                                    <TableHead className="text-xs text-right">Revenue</TableHead>
                                    <TableHead className="text-xs text-right">Units</TableHead>
                                    {b.productBreakdown.some(p => p.margin != null) && <TableHead className="text-xs text-right">Margin</TableHead>}
                                    <TableHead className="text-xs text-right">Stock</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {b.productBreakdown.map(p => (
                                    <TableRow key={p.name}>
                                      <TableCell className="text-sm">{p.name}</TableCell>
                                      <TableCell className="text-right tabular-nums text-sm"><BlurredAmount>{formatCurrencyWhole(p.revenue)}</BlurredAmount></TableCell>
                                      <TableCell className="text-right tabular-nums text-sm">{p.unitsSold}</TableCell>
                                      {b.productBreakdown.some(pp => pp.margin != null) && (
                                        <TableCell className="text-right">
                                          {p.margin != null ? (
                                            <Badge variant="outline" className={cn('text-[10px] tabular-nums',
                                              p.margin >= 50 ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400' :
                                              p.margin >= 30 ? 'text-amber-600 border-amber-200 dark:text-amber-400' :
                                              'text-red-500 border-red-200 dark:text-red-400'
                                            )}>{p.margin.toFixed(0)}%</Badge>
                                          ) : '—'}
                                        </TableCell>
                                      )}
                                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{p.quantityOnHand ?? '—'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {b.staleProducts.length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-2">
                                  <AlertTriangle className="w-3 h-3" />
                                  {b.staleProducts.length} catalog product(s) with zero sales: {b.staleProducts.slice(0, 3).join(', ')}{b.staleProducts.length > 3 ? ` +${b.staleProducts.length - 3} more` : ''}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}

// ─── Dead Stock Card ───
function DeadStockCard({ deadStock, formatCurrencyWhole, data, filterContext }: { deadStock: RetailAnalyticsResult['deadStock']; formatCurrencyWhole: (n: number) => string; data: RetailAnalyticsResult; filterContext?: FilterContext }) {
  const navigate = useNavigate();
  
  // Phase B: Filter out products created within last 7 days (new product grace period)
  const now = new Date();
  const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;
  const filteredDeadStock = deadStock.filter(d => {
    // If product has a created_at and it's within 7 days, exclude
    if ((d as any).createdAt) {
      const createdAt = new Date((d as any).createdAt);
      if (now.getTime() - createdAt.getTime() < gracePeriodMs) return false;
    }
    return true;
  });

  const totalCapital = filteredDeadStock.reduce((s, d) => s + d.capitalTiedUp, 0);
  const newProductCount = deadStock.length - filteredDeadStock.length;

  if (filteredDeadStock.length === 0 && newProductCount > 0) {
    return (
      <PinnableCard elementKey="retail_dead_stock" elementName="Dead Stock" category="Analytics Hub - Retail">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                  <Archive className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-display text-base tracking-wide">DEAD STOCK</CardTitle>
                    <MetricInfoTooltip description="Products in your catalog with zero sales in the selected period but inventory on hand. New products (added within 7 days) are excluded." />
                  </div>
                  <CardDescription className="text-xs">No stale products detected</CardDescription>
                </div>
              </div>
              {filterContext && (
                <div className="flex items-center gap-2">
                  <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">
              {newProductCount} new product{newProductCount !== 1 ? 's' : ''} excluded (added within 7 days).
            </p>
          </CardContent>
        </Card>
      </PinnableCard>
    );
  }

  return (
    <PinnableCard elementKey="retail_dead_stock" elementName="Dead Stock" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Archive className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">DEAD STOCK</CardTitle>
                  <MetricInfoTooltip description="Products in your catalog with zero sales in the selected period but inventory on hand. Capital tied up = retail price × quantity on hand. New products (added within 7 days) are excluded." />
                </div>
                <CardDescription className="text-xs">
                  <BlurredAmount>{formatCurrencyWhole(totalCapital)}</BlurredAmount> capital tied up in {filteredDeadStock.length} product(s)
                  {newProductCount > 0 && <span className="text-muted-foreground/60"> · {newProductCount} new excluded</span>}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
              <ExportButton data={data} section="deadstock" />
              <Button variant="ghost" size={tokens.button.inline} className="text-xs gap-1 text-muted-foreground" onClick={() => navigate('/dashboard/admin/settings?category=retail-products')}>
                <Settings2 className="w-3.5 h-3.5" /> Manage Products
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Retail Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Capital Tied Up</TableHead>
                  <TableHead className="text-right">Last Sold</TableHead>
                  <TableHead className="text-right">Days Stale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeadStock.slice(0, 20).map(d => (
                  <TableRow key={d.name}>
                    <TableCell className="font-medium text-sm">{d.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.brand}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.category}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(d.retailPrice)}</BlurredAmount></TableCell>
                    <TableCell className="text-right tabular-nums">{d.quantityOnHand}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium"><BlurredAmount>{formatCurrencyWhole(d.capitalTiedUp)}</BlurredAmount></TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{d.lastSoldDate || 'Never'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={cn('text-[10px] tabular-nums',
                        d.daysStale >= 90 ? 'text-red-500 border-red-200 dark:text-red-400' :
                        d.daysStale >= 30 ? 'text-amber-600 border-amber-200 dark:text-amber-400' :
                        'text-muted-foreground border-border'
                      )}>
                        {d.daysStale}d
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}

// ─── Inventory Turnover Card ───
function InventoryTurnoverCard({ brands, filterContext }: { brands: BrandRow[]; filterContext?: FilterContext }) {
  const turnoverData = brands.filter(b => b.unitsSold > 0).map(b => {
    const turnover = b.productCount > 0 ? b.unitsSold / b.productCount : 0;
    const classification = turnover >= 10 ? 'Fast' : turnover >= 3 ? 'Normal' : 'Slow';
    return { brand: b.brand, unitsSold: b.unitsSold, productCount: b.productCount, turnover: Math.round(turnover * 10) / 10, classification };
  }).sort((a, b) => b.turnover - a.turnover);

  if (turnoverData.length === 0) return null;

  return (
    <PinnableCard elementKey="retail_inventory_turnover" elementName="Inventory Turnover" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">INVENTORY TURNOVER BY BRAND</CardTitle>
                  <MetricInfoTooltip description="Units sold per product in the period, grouped by brand. Fast = 10+ units/product, Normal = 3-9, Slow = under 3. Low turnover with high stock = capital risk." />
                </div>
                <CardDescription className="text-xs">Sell-through velocity per brand</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Units/Product</TableHead>
                  <TableHead className="text-right">Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnoverData.map(t => (
                  <TableRow key={t.brand}>
                    <TableCell className="font-medium text-sm">{t.brand}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.unitsSold}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.productCount}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{t.turnover}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={cn('text-[10px]',
                        t.classification === 'Fast' ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400' :
                        t.classification === 'Normal' ? 'text-amber-600 border-amber-200 dark:text-amber-400' :
                        'text-red-500 border-red-200 dark:text-red-400'
                      )}>
                        {t.classification}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}

export function RetailAnalyticsContent({ dateFrom, dateTo, locationId, filterContext }: RetailAnalyticsContentProps) {
  const { data, isLoading } = useRetailAnalytics(dateFrom, dateTo, locationId);
  const { data: retailAttachment, isLoading: retailAttachmentLoading } = useServiceRetailAttachment({ dateFrom, dateTo, locationId });
  const { formatCurrencyWhole } = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffSortKey, setStaffSortKey] = useState<StaffSortKey>('productRevenue');
  const [staffSortDir, setStaffSortDir] = useState<SortDir>('desc');
  const navigate = useNavigate();

  const { effectiveOrganization } = useOrganizationContext();
  // Retail Goals
  const { data: currentGoals } = useCurrentRetailGoals();
  // Commission
  const { data: commissionConfig } = useCommissionConfig();
  const { data: commissionOverrides } = useCommissionOverrides(commissionConfig?.id);
  // Inventory Alerts - respect location filter
  const { data: allProducts } = useProducts(locationId ? { locationId } : {});
  // Aggregated staff retail goals
  const { data: aggregatedRetailGoals } = useAggregatedRetailGoals(data?.summary?.totalRevenue ?? 0);
  // Velocity data for forecasting + weighted ratings
  const { data: velocityMap } = useProductVelocity(locationId);
  // Supplier performance
  const { data: supplierMetrics } = useSupplierPerformance();

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleStaffSort = (key: StaffSortKey) => {
    if (staffSortKey === key) setStaffSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setStaffSortKey(key); setStaffSortDir('desc'); }
  };

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    let list = data.products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q));
    }
    const dir = sortDir === 'desc' ? -1 : 1;
    return [...list].sort((a, b) => (a[sortKey] - b[sortKey]) * dir);
  }, [data, search, sortKey, sortDir]);

  const filteredStaff = useMemo(() => {
    if (!data) return [];
    let list = data.staffRetail;
    if (staffSearch) {
      const q = staffSearch.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    const dir = staffSortDir === 'desc' ? -1 : 1;
    return [...list].sort((a, b) => {
      if (staffSortKey === 'name') return a.name.localeCompare(b.name) * dir;
      return (a[staffSortKey] - b[staffSortKey]) * dir;
    });
  }, [data, staffSearch, staffSortKey, staffSortDir]);

  // Commission calculations
  const staffCommissions = useMemo(() => {
    if (!data || !commissionConfig) return [];
    return calculateStaffCommissions(data.staffRetail, commissionConfig, commissionOverrides || []);
  }, [data, commissionConfig, commissionOverrides]);

  // Inventory alerts
  const inventoryAlerts = useMemo(() => {
    if (!allProducts || !data) return [];
    return calculateInventoryAlerts(allProducts, data.salesVelocity);
  }, [allProducts, data]);

  // Movement ratings for products — use weighted velocity when available
  const { productMovementRatings, productVelocityChanges } = useMemo(() => {
    if (!data || !allProducts) return { productMovementRatings: new Map<string, ReturnType<typeof getMovementRating>>(), productVelocityChanges: new Map<string, number | null>() };
    const flatVelocityMap = data.salesVelocity;
    // Prefer weighted velocity from useProductVelocity when available
    const allVelocities = (allProducts || []).map(p => {
      const nameLower = p.name.toLowerCase().trim();
      const weightedEntry = velocityMap?.get(nameLower);
      return weightedEntry?.weightedVelocity ?? flatVelocityMap.get(nameLower) ?? 0;
    });
    const percentiles = computePercentiles(allVelocities);
    const map = new Map<string, ReturnType<typeof getMovementRating>>();
    const changes = new Map<string, number | null>();
    for (const p of (allProducts || [])) {
      const nameLower = p.name.toLowerCase().trim();
      const weightedEntry = velocityMap?.get(nameLower);
      const velocity = weightedEntry?.weightedVelocity ?? flatVelocityMap.get(nameLower) ?? 0;
      // Find days since last sale from deadStock data or velocity hook
      const deadRow = data.deadStock.find(d => d.name.toLowerCase().trim() === nameLower);
      const daysSinceLastSale = weightedEntry?.daysSinceLastSale ?? (deadRow ? deadRow.daysStale : (velocity > 0 ? 0 : null));
      const rating = getMovementRating({
        velocity: flatVelocityMap.get(nameLower) ?? 0,
        weightedVelocity: weightedEntry?.weightedVelocity,
        totalUnitsSold: weightedEntry?.totalUnitsSold ?? 0,
        daysSinceLastSale,
        hasStock: (p.quantity_on_hand ?? 0) > 0,
        velocityPercentile: percentiles.get(velocity) ?? 0,
      });
      map.set(nameLower, rating);
      // Use velocity change from weighted hook when available
      changes.set(nameLower, weightedEntry?.velocityChange ?? null);
    }
    return { productMovementRatings: map, productVelocityChanges: changes };
  }, [data, allProducts, velocityMap]);

  // Movement distribution for the chart
  const movementDistribution = useMemo(() => {
    if (productMovementRatings.size === 0) return [];
    const counts: Record<MovementTier, { count: number; revenue: number }> = {
      best_seller: { count: 0, revenue: 0 },
      popular: { count: 0, revenue: 0 },
      steady: { count: 0, revenue: 0 },
      slow_mover: { count: 0, revenue: 0 },
      stagnant: { count: 0, revenue: 0 },
      dead_weight: { count: 0, revenue: 0 },
    };
    for (const [name, rating] of productMovementRatings) {
      counts[rating.tier].count++;
      // Find revenue from product performance data
      const productRow = data?.products.find(p => p.name.toLowerCase().trim() === name);
      if (productRow) counts[rating.tier].revenue += productRow.revenue;
    }
    return MOVEMENT_TIERS.map(t => ({
      tier: t.value,
      label: t.label,
      count: counts[t.value].count,
      revenue: counts[t.value].revenue,
      config: getTierConfig(t.value),
    })).filter(d => d.count > 0);
  }, [productMovementRatings, data]);

  const goalProgress = useMemo(() => {
    if (!data) return null;
    const agg = aggregatedRetailGoals;
    const hasStaffGoals = agg && agg.totalMonthlyCommitment > 0;
    const orgGoal = currentGoals?.monthly?.find((g: any) => !g.location_id);
    const hasOrgGoal = !!orgGoal;
    if (!hasStaffGoals && !hasOrgGoal) return null;

    // Primary target: staff aggregate if available, otherwise org top-down
    const target = hasStaffGoals ? agg.totalMonthlyCommitment : (orgGoal as any).target_revenue;
    const current = data.summary.totalRevenue;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const progressPct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    const idealPace = (dayOfMonth / daysInMonth) * 100;
    const onTrack = progressPct >= idealPace * 0.9;
    const targetAttachmentRate = hasOrgGoal ? (orgGoal as any).target_attachment_rate : null;
    return {
      target,
      current,
      progressPct,
      idealPace,
      onTrack,
      dayOfMonth,
      daysInMonth,
      targetAttachmentRate,
      // Dual-target info
      staffCommitted: hasStaffGoals ? agg.totalMonthlyCommitment : null,
      orgTopDown: hasOrgGoal ? (orgGoal as any).target_revenue : null,
      gap: agg?.gap ?? null,
      staffBreakdown: agg?.staffBreakdown ?? [],
      staffWithoutGoals: agg?.staffWithoutGoals ?? 0,
      totalStaff: agg?.totalStaff ?? 0,
      isStaffDriven: hasStaffGoals,
    };
  }, [currentGoals, data, aggregatedRetailGoals]);

  const summary = data?.summary;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-20 mb-3" /><Skeleton className="h-8 w-28" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6 flex items-center justify-center h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></CardContent></Card>
      </div>
    );
  }

  if (!data || !summary) return null;

  const kpis = [
    { label: 'Product Revenue', value: formatCurrencyWhole(summary.totalRevenue), change: summary.revenueChange as number | null, icon: DollarSign, tooltip: 'Total revenue from retail product sales in the selected period. Change is compared against the equivalent prior period.' },
    { label: 'Units Sold', value: summary.totalUnits.toLocaleString(), change: summary.unitsChange as number | null, icon: Package, tooltip: 'Total quantity of retail products sold. Change is compared against the equivalent prior period.' },
    { label: 'Attachment Rate', value: `${summary.attachmentRate}%`, change: null as number | null, icon: ShoppingBag, tooltip: 'Percentage of service transactions that also included a retail product sale (excludes extension products). Higher rates indicate effective retail recommendations.' },
    { label: 'Avg Product Ticket', value: formatCurrencyWhole(summary.avgProductTicket), change: null as number | null, icon: Tag, tooltip: 'Average revenue per retail unit sold. Calculated as total product revenue divided by total units sold.' },
  ];

  const hasNoSalesData = summary.totalRevenue === 0 && summary.totalUnits === 0;

  return (
    <div className="space-y-6">
      {/* Section 1: KPI Summary Row */}
      <div className="space-y-2">
        {filterContext && (
          <div className="flex justify-end">
            <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-muted flex items-center justify-center rounded-lg">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</p>
                      <MetricInfoTooltip description={kpi.tooltip} />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-display tabular-nums"><BlurredAmount>{kpi.value}</BlurredAmount></span>
                    {kpi.change !== null && <ChangeBadge value={kpi.change} />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Phase B: Contextual empty state banner when no sales data */}
      {hasNoSalesData && (
        <Card className="border-dashed border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">No retail sales recorded in this period</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try widening the date range, or record a retail sale to start tracking product performance.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Product Performance Table */}
      <PinnableCard elementKey="retail_product_performance" elementName="Product Performance" category="Analytics Hub - Retail">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-display text-base tracking-wide">PRODUCT PERFORMANCE</CardTitle>
                    <MetricInfoTooltip description="All retail products sold in the selected period, ranked by revenue. Trend compares each product's revenue to the equivalent prior period. Best Sellers are the top 3 by revenue." />
                  </div>
                  <CardDescription className="text-xs">{summary.uniqueProducts} products sold</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                <ExportButton data={data} section="products" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('unitsSold')}>
                      <span className="inline-flex items-center gap-1">Units <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('revenue')}>
                      <span className="inline-flex items-center gap-1">Revenue <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('avgPrice')}>
                      <span className="inline-flex items-center gap-1">Avg Price <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('discount')}>
                      <span className="inline-flex items-center gap-1">Discount <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('revenueTrend')}>
                      <span className="inline-flex items-center gap-1">Trend <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-center">Sparkline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {search ? 'No products match your search' : 'No product sales in this period'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const realRank = data.products.findIndex(pp => pp.name === p.name);
                      const isBestSeller = realRank >= 0 && realRank < 3;
                      return (
                        <TableRow key={p.name} className={cn(isBestSeller && 'bg-chart-2/[0.03]')}>
                          <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{p.name}</span>
                              {(() => {
                                const nameLower = p.name.toLowerCase().trim();
                                const rating = productMovementRatings.get(nameLower);
                                const change = productVelocityChanges.get(nameLower);
                                return rating ? <MovementBadge rating={rating} compact velocityChange={change} /> : null;
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.brand || '\u2014'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.category || '\u2014'}</TableCell>
                          <TableCell className="text-right tabular-nums">{p.unitsSold}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium"><BlurredAmount>{formatCurrencyWhole(p.revenue)}</BlurredAmount></TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(p.avgPrice)}</BlurredAmount></TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {p.discount > 0 ? <BlurredAmount>{formatCurrencyWhole(p.discount)}</BlurredAmount> : '\u2014'}
                          </TableCell>
                          <TableCell className="text-right"><TrendArrow value={p.revenueTrend} /></TableCell>
                          <TableCell className="text-center">
                            {p.dailyRevenue && p.dailyRevenue.length >= 2 ? (
                              <Sparkline data={p.dailyRevenue} color="hsl(var(--chart-2))" />
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {filteredProducts.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell />
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right font-display tabular-nums">{summary.totalUnits}</TableCell>
                      <TableCell className="text-right font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(summary.totalRevenue)}</BlurredAmount></TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {summary.totalDiscount > 0 ? <BlurredAmount>{formatCurrencyWhole(summary.totalDiscount)}</BlurredAmount> : '\u2014'}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </PinnableCard>

      {/* Section 3: Red Flags */}
      {data.redFlags.length > 0 && (
        <PinnableCard elementKey="retail_red_flags" elementName="Retail Red Flags" category="Analytics Hub - Retail">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">RED FLAGS & ALERTS</CardTitle>
                      <MetricInfoTooltip description="Products needing attention: declining sales (revenue down >20% vs prior period), heavy discounting (>15% of retail value discounted), or slow movers (<3 units sold in the period)." />
                    </div>
                    <CardDescription className="text-xs">{data.redFlags.length} issue{data.redFlags.length !== 1 ? 's' : ''} detected</CardDescription>
                  </div>
                </div>
                <Badge variant="destructive" className="text-xs">{data.redFlags.length} alert{data.redFlags.length !== 1 ? 's' : ''}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.redFlags.map((flag, idx) => (
                  <RedFlagRow key={`${flag.product}-${flag.type}-${idx}`} flag={flag} />
                ))}
              </div>
            </CardContent>
          </Card>
        </PinnableCard>
      )}

      {/* Section 4: Category Breakdown */}
      <PinnableCard elementKey="retail_category_breakdown" elementName="Category Breakdown" category="Analytics Hub - Retail">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-display text-base tracking-wide">CATEGORY BREAKDOWN</CardTitle>
                    <MetricInfoTooltip description="Revenue distribution across product categories. Percentage shows each category's share of total retail revenue." />
                  </div>
                  <CardDescription className="text-xs">Revenue distribution by product category</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
                <ExportButton data={data} section="categories" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.categories.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No category data available for this period</p>
            ) : (
              <div className="space-y-6">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.categories.slice(0, 10)} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => [formatCurrencyWhole(value), 'Revenue']} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                        {data.categories.slice(0, 10).map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Units</TableHead>
                        <TableHead className="text-right">Products</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.categories.map((cat) => (
                        <TableRow key={cat.category}>
                          <TableCell className="font-medium">{cat.category}</TableCell>
                          <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(cat.revenue)}</BlurredAmount></TableCell>
                          <TableCell className="text-right tabular-nums">{cat.units}</TableCell>
                          <TableCell className="text-right tabular-nums">{cat.productCount}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(cat.avgPrice)}</BlurredAmount></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={cat.pctOfTotal} className="w-16 h-1.5" />
                              <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">{Math.round(cat.pctOfTotal)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PinnableCard>

      {/* Section 4.5: Brand Performance */}
      {data.brandPerformance.length > 0 && (
        <BrandPerformanceCard brands={data.brandPerformance} totalRevenue={summary.totalRevenue} formatCurrencyWhole={formatCurrencyWhole} data={data} filterContext={filterContext} />
      )}

      {/* Section 4.6: Dead Stock */}
      {data.deadStock.length > 0 && (
        <DeadStockCard deadStock={data.deadStock} formatCurrencyWhole={formatCurrencyWhole} data={data} filterContext={filterContext} />
      )}

      {/* Section 4.7: Inventory Turnover by Brand */}
      {data.brandPerformance.length > 0 && (
        <InventoryTurnoverCard brands={data.brandPerformance} filterContext={filterContext} />
      )}

      {/* Section 4.8: Movement Distribution */}
      {movementDistribution.length > 0 && (
        <PinnableCard elementKey="retail_movement_distribution" elementName="Movement Distribution" category="Analytics Hub - Retail">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">MOVEMENT DISTRIBUTION</CardTitle>
                      <MetricInfoTooltip description="Classifies every catalog product by sales velocity over the last 90 days. Best Seller = top 10% velocity (>0.5/day), Popular = top 25% (>0.2/day), Steady = regular sales, Slow Mover = barely selling, Stagnant = no recent sales, Dead Weight = never sold or 180+ days stale." />
                    </div>
                    <CardDescription className="text-xs">{productMovementRatings.size} products rated by 90-day velocity</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Donut chart */}
                <div className="h-[220px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={movementDistribution}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={0}
                        stroke="hsl(var(--border) / 0.4)"
                        strokeWidth={1}
                      >
                        {movementDistribution.map((d, i) => {
                          const colorMap: Record<string, string> = {
                            best_seller: 'hsl(145, 60%, 45%)',
                            popular: 'hsl(215, 70%, 55%)',
                            steady: 'hsl(var(--muted-foreground))',
                            slow_mover: 'hsl(38, 80%, 50%)',
                            stagnant: 'hsl(25, 80%, 50%)',
                            dead_weight: 'hsl(0, 70%, 50%)',
                          };
                          return <Cell key={d.tier} fill={colorMap[d.tier] || BAR_COLORS[i % BAR_COLORS.length]} />;
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value} products`, name]}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Breakdown table */}
                <div className="space-y-2">
                  {movementDistribution.map(d => {
                    const totalProducts = productMovementRatings.size;
                    const pct = totalProducts > 0 ? Math.round((d.count / totalProducts) * 100) : 0;
                    return (
                      <div key={d.tier} className="flex items-center gap-3 py-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-2 py-0.5 w-24 justify-center',
                            d.config.colorClass,
                            d.config.borderClass,
                            d.config.bgClass,
                          )}
                        >
                          {d.label}
                        </Badge>
                        <div className="flex-1">
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground w-20 text-right">
                          {d.count} ({pct}%)
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground w-20 text-right">
                          <BlurredAmount>{formatCurrencyWhole(d.revenue)}</BlurredAmount>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actionable callouts */}
              {(() => {
                const deadWeight = movementDistribution.find(d => d.tier === 'dead_weight');
                const slowMovers = movementDistribution.find(d => d.tier === 'slow_mover');
                const stagnant = movementDistribution.find(d => d.tier === 'stagnant');
                const concerns = [deadWeight, stagnant, slowMovers].filter(Boolean);
                if (concerns.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                    {deadWeight && deadWeight.count > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{deadWeight.count} Dead Weight</span> product{deadWeight.count !== 1 ? 's' : ''} — consider discontinuing or running a clearance promotion.
                        </span>
                      </div>
                    )}
                    {(stagnant && stagnant.count > 0) && (
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{stagnant.count} Stagnant</span> product{stagnant.count !== 1 ? 's' : ''} — have stylists actively recommend these during appointments.
                        </span>
                      </div>
                    )}
                    {(slowMovers && slowMovers.count > 0) && (
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{slowMovers.count} Slow Mover</span> product{slowMovers.count !== 1 ? 's' : ''} — consider bundling or promotional pricing.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </PinnableCard>
      )}

      {/* Section 4.9: Markdown Candidates */}
      {(() => {
        const candidates = (allProducts || [])
          .filter(p => {
            const nameLower = p.name.toLowerCase().trim();
            const rating = productMovementRatings.get(nameLower);
            if (!rating || !['dead_weight', 'stagnant'].includes(rating.tier)) return false;
            const capitalAtRisk = (p.cost_price ?? 0) * (p.quantity_on_hand ?? 0);
            return capitalAtRisk > 50;
          })
          .map(p => {
            const capitalAtRisk = (p.cost_price ?? 0) * (p.quantity_on_hand ?? 0);
            const nameLower = p.name.toLowerCase().trim();
            const rating = productMovementRatings.get(nameLower)!;
            const deadRow = data?.deadStock.find(d => d.name.toLowerCase().trim() === nameLower);
            return {
              ...p,
              capitalAtRisk,
              rating,
              daysSinceLastSale: deadRow?.daysStale ?? null,
              markdownSavings: capitalAtRisk * 0.3,
            };
          })
          .sort((a, b) => b.capitalAtRisk - a.capitalAtRisk);

        if (candidates.length === 0) return null;
        const totalCapital = candidates.reduce((s, c) => s + c.capitalAtRisk, 0);

        return (
          <PinnableCard elementKey="retail_markdown_candidates" elementName="Markdown Candidates" category="Analytics Hub - Retail">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="font-display text-base tracking-wide">MARKDOWN CANDIDATES</CardTitle>
                        <MetricInfoTooltip description="Dead Weight and Stagnant products with more than $50 in capital at risk. Consider discounting these to free up capital and shelf space. 'Capital freed at 30%' estimates recovery if marked down by 30%." />
                      </div>
                      <CardDescription className="text-xs">
                        <BlurredAmount>{formatCurrencyWhole(totalCapital)}</BlurredAmount> in capital at risk across {candidates.length} product{candidates.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Movement</TableHead>
                        <TableHead className="text-right">Cost Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Capital at Risk</TableHead>
                        <TableHead className="text-right">Days Since Sale</TableHead>
                        <TableHead className="text-right">Capital Freed at 30%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.slice(0, 15).map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-sm">{c.name}</TableCell>
                          <TableCell><MovementBadge rating={c.rating} compact /></TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(c.cost_price ?? 0)}</BlurredAmount></TableCell>
                          <TableCell className="text-right tabular-nums">{c.quantity_on_hand}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium"><BlurredAmount>{formatCurrencyWhole(c.capitalAtRisk)}</BlurredAmount></TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{c.daysSinceLastSale != null ? `${c.daysSinceLastSale}d` : 'Never'}</TableCell>
                          <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400"><BlurredAmount>{formatCurrencyWhole(c.markdownSavings)}</BlurredAmount></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </PinnableCard>
        );
      })()}

      {/* Section 5: Product Trend Chart */}
      <PinnableCard elementKey="retail_product_trend" elementName="Product Revenue Trend" category="Analytics Hub - Retail">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-display text-base tracking-wide">PRODUCT REVENUE TREND</CardTitle>
                    <MetricInfoTooltip description="Daily retail product revenue over the selected date range. Use this to spot seasonal patterns, promotional impacts, or consistent growth/decline." />
                  </div>
                  <CardDescription className="text-xs">Daily retail revenue over time</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.dailyTrend.length < 2 ? (
              <div className="h-[260px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a wider date range to view trend data</p>
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyTrend} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="retailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickFormatter={(d) => { const parts = d.split('-'); return `${parseInt(parts[1])}/${parseInt(parts[2])}`; }} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => [formatCurrencyWhole(value), 'Product Revenue']} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" fill="url(#retailGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </PinnableCard>

      {/* Section 6: Staff Retail Performance */}
      <PinnableCard elementKey="retail_staff_performance" elementName="Staff Retail Performance" category="Analytics Hub - Retail">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-display text-base tracking-wide">STAFF RETAIL PERFORMANCE</CardTitle>
                    <MetricInfoTooltip description="Per-stylist retail sales metrics. Attachment rate is the percentage of each stylist's service transactions that included a product sale. Avg ticket is average revenue per unit sold." />
                  </div>
                  <CardDescription className="text-xs">Retail sales by team member</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Search staff..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                <ExportButton data={data} section="staff" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleStaffSort('name')}>
                      <span className="inline-flex items-center gap-1">Stylist <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleStaffSort('productRevenue')}>
                      <span className="inline-flex items-center gap-1">Product Revenue <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleStaffSort('unitsSold')}>
                      <span className="inline-flex items-center gap-1">Units Sold <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleStaffSort('attachmentRate')}>
                      <span className="inline-flex items-center gap-1">Attachment Rate <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleStaffSort('avgTicket')}>
                      <span className="inline-flex items-center gap-1">Avg Ticket <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {staffSearch ? 'No staff match your search' : 'No staff retail data in this period'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((s, idx) => {
                      const isTop = idx === 0 && staffSortKey === 'productRevenue' && staffSortDir === 'desc';
                      return (
                        <TableRow key={s.userId || s.name} className={cn(isTop && 'bg-chart-2/[0.03]')}>
                          <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-7 h-7">
                                {s.photoUrl && <AvatarImage src={s.photoUrl} alt={s.name} />}
                                <AvatarFallback className="text-[10px]">{getInitials(s.name)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{s.name}</span>
                              {isTop && <span className="text-[9px] text-chart-2 font-medium uppercase tracking-wider">Top</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium"><BlurredAmount>{formatCurrencyWhole(s.productRevenue)}</BlurredAmount></TableCell>
                          <TableCell className="text-right tabular-nums">{s.unitsSold}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.attachmentRate}%</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(s.avgTicket)}</BlurredAmount></TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {filteredStaff.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell />
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(summary.totalRevenue)}</BlurredAmount></TableCell>
                      <TableCell className="text-right font-display tabular-nums">{summary.totalUnits}</TableCell>
                      <TableCell className="text-right tabular-nums">{summary.attachmentRate}%</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </PinnableCard>

      {/* Section 7: Margin Analysis */}
      {data.marginData ? (
        <PinnableCard elementKey="retail_margin_analysis" elementName="Margin Analysis" category="Analytics Hub - Retail">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <Percent className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">MARGIN ANALYSIS</CardTitle>
                      <MetricInfoTooltip description="Profit margin analysis using cost data from the product catalog. Gross margin = (revenue - cost) / revenue. Only products with cost data configured are included." />
                    </div>
                    <CardDescription className="text-xs">Product-level profitability</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.marginData.products.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No sales with cost data in this period</p>
                  <p className="text-xs text-muted-foreground mt-1">Products need both sales and cost prices configured to calculate margins.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Gross Margin</p>
                      <p className="text-2xl font-display tabular-nums">{data.marginData.grossMarginPct.toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Estimated Profit</p>
                      <p className="text-2xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(data.marginData.estimatedProfit)}</BlurredAmount></p>
                    </div>
                    {data.marginData.products.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Highest Margin</p>
                        <p className="text-sm font-medium">{data.marginData.products[0]?.name}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">{data.marginData.products[0]?.margin.toFixed(1)}% margin</p>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Margin %</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.marginData.products.map((m) => (
                          <TableRow key={m.name}>
                            <TableCell className="font-medium text-sm">{m.name}</TableCell>
                            <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(m.revenue)}</BlurredAmount></TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(m.cost)}</BlurredAmount></TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={cn(
                                'text-xs tabular-nums',
                                m.margin >= 50 ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800' :
                                m.margin >= 30 ? 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' :
                                'text-red-500 border-red-200 dark:text-red-400 dark:border-red-800'
                              )}>
                                {m.margin.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium"><BlurredAmount>{formatCurrencyWhole(m.profit)}</BlurredAmount></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </PinnableCard>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Info className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Margin Analysis Unavailable</p>
            <p className="text-xs text-muted-foreground mt-1">Add cost prices to your product catalog to unlock profit margin insights.</p>
          </CardContent>
        </Card>
      )}

      {/* Service-Driven Retail */}
      <PinnableCard elementKey="retail_service_driven" elementName="Service-Driven Retail" category="Analytics Hub - Retail">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                  <Scissors className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-display text-base tracking-wide">SERVICE-DRIVEN RETAIL</CardTitle>
                    <MetricInfoTooltip description="Which services generate the most retail revenue? Cross-references service and product line items within the same transaction. Focus training on low-attachment, high-volume services to unlock more product sales." />
                  </div>
                  <CardDescription className="text-xs mt-0.5">Which services are the biggest drivers of retail revenue?</CardDescription>
                </div>
              </div>
              {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
            </div>
          </CardHeader>
          <CardContent>
            {retailAttachmentLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !retailAttachment?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No service-retail data available for this period.</p>
            ) : (() => {
              const filtered = retailAttachment.filter(r => r.totalTransactions >= 3);
              const topDriver = filtered[0];
              const highVolumeLowest = [...filtered]
                .filter(r => r.totalTransactions >= 10)
                .sort((a, b) => a.attachmentRate - b.attachmentRate)[0];
              return (
                <>
                  {topDriver && (
                    <div className="mb-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium text-foreground">{topDriver.serviceName}</span> drives the most retail revenue at{' '}
                        <span className="font-medium text-foreground">{formatCurrencyWhole(topDriver.retailRevenue)}</span> ({topDriver.attachmentRate}% attach rate).
                      </p>
                      {highVolumeLowest && highVolumeLowest.serviceName !== topDriver.serviceName && highVolumeLowest.attachmentRate < 40 && (
                        <p className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                          <span><span className="font-medium text-foreground">{highVolumeLowest.serviceName}</span> has {highVolumeLowest.totalTransactions} visits but only {highVolumeLowest.attachmentRate}% attachment — training opportunity.</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Retail Revenue</TableHead>
                          <TableHead className="text-right">Attach Rate</TableHead>
                          <TableHead className="text-right">Avg Retail Ticket</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.slice(0, 20).map(row => (
                          <TableRow key={row.serviceName}>
                            <TableCell className="font-medium text-sm">{row.serviceName}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{row.serviceCategory || '\u2014'}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              <BlurredAmount>{formatCurrencyWhole(row.retailRevenue)}</BlurredAmount>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={cn(
                                'text-xs tabular-nums',
                                row.attachmentRate >= 50 ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800' :
                                row.attachmentRate >= 25 ? 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' :
                                'text-red-500 border-red-200 dark:text-red-400 dark:border-red-800'
                              )}>
                                {row.attachmentRate}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              <BlurredAmount>{formatCurrencyWhole(row.avgRetailPerAttached)}</BlurredAmount>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {row.attachedTransactions}/{row.totalTransactions}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </PinnableCard>

      {/* Section: Retail Goal Tracker */}
      {goalProgress && (
        <PinnableCard elementKey="retail_goal_tracker" elementName="Retail Goal Tracker" category="Analytics Hub - Retail">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">RETAIL GOAL TRACKER</CardTitle>
                      <MetricInfoTooltip description="Retail revenue target built from staff commitments. Each team member sets their own retail goal, and the org target is the sum of all staff commitments." />
                    </div>
                    <CardDescription className="text-xs">
                      Day {goalProgress.dayOfMonth} of {goalProgress.daysInMonth}
                      {goalProgress.isStaffDriven && <span className="ml-1 text-primary">· Staff-driven target</span>}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
                  <Button variant="ghost" size={tokens.button.inline} className="text-xs gap-1 text-muted-foreground" onClick={() => navigate('/dashboard/admin/settings?category=retail-products')}>
                    <Settings2 className="w-3.5 h-3.5" /> Set Goals
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dual-target banner */}
              {goalProgress.staffCommitted !== null && goalProgress.orgTopDown !== null && goalProgress.gap !== null && goalProgress.gap > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Staff commitments are {formatCurrencyWhole(goalProgress.gap)} below the organizational target</p>
                    <p className="text-muted-foreground mt-0.5">
                      Staff committed: {formatCurrencyWhole(goalProgress.staffCommitted)} vs Org target: {formatCurrencyWhole(goalProgress.orgTopDown)} — consider reviewing with your team.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Revenue Progress</p>
                    <p className="text-2xl font-display tabular-nums">
                      <BlurredAmount>{formatCurrencyWhole(goalProgress.current)}</BlurredAmount>
                      <span className="text-sm text-muted-foreground font-normal"> / {formatCurrencyWhole(goalProgress.target)}</span>
                    </p>
                  </div>
                  <Progress value={goalProgress.progressPct} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(goalProgress.progressPct)}% complete</span>
                    <span className={cn(
                      'inline-flex items-center gap-1',
                      goalProgress.onTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    )}>
                      {goalProgress.onTrack 
                        ? <><CheckCircle className="w-3 h-3" /> On track</>
                        : <><AlertTriangle className="w-3 h-3" /> Behind pace</>
                      }
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Ideal Pace vs Actual</p>
                  <div className="flex items-end gap-3 h-16">
                    <div className="flex-1 space-y-1">
                      <div className="text-xs text-muted-foreground">Ideal</div>
                      <Progress value={goalProgress.idealPace} className="h-3 bg-muted" />
                      <div className="text-[10px] tabular-nums text-muted-foreground">{Math.round(goalProgress.idealPace)}%</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-xs text-muted-foreground">Actual</div>
                      <Progress value={goalProgress.progressPct} className={cn('h-3', goalProgress.onTrack ? '' : '[&>div]:bg-amber-500')} />
                      <div className="text-[10px] tabular-nums text-muted-foreground">{Math.round(goalProgress.progressPct)}%</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {goalProgress.targetAttachmentRate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Attachment Rate Target</p>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-lg font-display tabular-nums">{summary.attachmentRate}%</span>
                        <span className="text-sm text-muted-foreground">/ {goalProgress.targetAttachmentRate}%</span>
                      </div>
                      <Progress value={goalProgress.targetAttachmentRate > 0 ? (summary.attachmentRate / goalProgress.targetAttachmentRate) * 100 : 0} className="h-1.5 mt-1" />
                    </div>
                  )}
                  <div className="p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-0.5">Lever Recommendation</p>
                    {goalProgress.staffWithoutGoals > 0 ? (
                      <p>{goalProgress.staffWithoutGoals} of {goalProgress.totalStaff} team members haven't set retail goals yet. Encourage them to commit targets on their Stats page.</p>
                    ) : !goalProgress.onTrack ? (
                      <p>Need <BlurredAmount>{formatCurrencyWhole((goalProgress.target - goalProgress.current) / Math.max(1, goalProgress.daysInMonth - goalProgress.dayOfMonth))}</BlurredAmount>/day to hit target. Focus on attachment rate with top-performing services.</p>
                    ) : (
                      <p>On pace. Maintain current retail recommendations during checkout.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Staff Breakdown Table */}
              {goalProgress.staffBreakdown.length > 0 && goalProgress.isStaffDriven && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Staff Retail Commitments</p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Member</TableHead>
                          <TableHead className="text-right">Monthly Target</TableHead>
                          <TableHead className="text-right">Weekly Target</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {goalProgress.staffBreakdown
                          .filter(s => s.retailMonthlyTarget > 0)
                          .map(staff => (
                            <TableRow key={staff.userId}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    {staff.photoUrl && <AvatarImage src={staff.photoUrl} />}
                                    <AvatarFallback className="text-[10px]">{getInitials(staff.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">{staff.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">
                                {formatCurrencyWhole(staff.retailMonthlyTarget)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">
                                {formatCurrencyWhole(staff.retailWeeklyTarget)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="text-[10px]">
                                  <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" /> Set
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        {goalProgress.staffBreakdown
                          .filter(s => s.retailMonthlyTarget === 0)
                          .slice(0, 5)
                          .map(staff => (
                            <TableRow key={staff.userId} className="opacity-60">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    {staff.photoUrl && <AvatarImage src={staff.photoUrl} />}
                                    <AvatarFallback className="text-[10px]">{getInitials(staff.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{staff.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  Not set
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </PinnableCard>
      )}

      {/* Section: Inventory Alerts */}
      {inventoryAlerts.length > 0 && (
        <PinnableCard elementKey="retail_inventory_alerts" elementName="Inventory Alerts" category="Analytics Hub - Retail">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">INVENTORY ALERTS</CardTitle>
                      <MetricInfoTooltip description="Products below reorder level with estimated stockout timeline based on sales velocity. Suggested reorder quantities factor in 30-day supply." />
                    </div>
                    <CardDescription className="text-xs">
                      {inventoryAlerts.filter(a => a.severity === 'critical').length} critical, {inventoryAlerts.filter(a => a.severity === 'warning').length} warning, {inventoryAlerts.filter(a => a.severity === 'info').length} info
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
                   <Button variant="ghost" size={tokens.button.inline} className="text-xs gap-1 text-muted-foreground" onClick={() => exportInventoryAlertsCSV(inventoryAlerts)}>
                     <Download className="w-3.5 h-3.5" /> Export Alerts
                   </Button>
                   {effectiveOrganization?.id && (
                     <Button
                       variant="ghost"
                       size={tokens.button.inline}
                       className="text-xs gap-1 text-muted-foreground"
                       onClick={async () => {
                         try {
                           await exportStockMovementsCsv(effectiveOrganization.id);
                           toast.success('Stock movements exported');
                         } catch {
                           toast.error('Failed to export');
                         }
                       }}
                     >
                       <Download className="w-3.5 h-3.5" /> Export Movements
                     </Button>
                   )}
                   <Button variant="ghost" size={tokens.button.inline} className="text-xs gap-1 text-muted-foreground" onClick={() => navigate('/dashboard/admin/settings?category=retail-products')}>
                     <Settings2 className="w-3.5 h-3.5" /> Manage Inventory
                   </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Reorder Lvl</TableHead>
                      <TableHead className="text-right">Velocity</TableHead>
                      <TableHead className="text-right">Stockout In</TableHead>
                      <TableHead className="text-right">Suggested Order</TableHead>
                      <TableHead className="text-right">Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryAlerts.slice(0, 15).map(a => (
                      <TableRow key={a.productId} className={cn(a.severity === 'critical' && 'bg-red-50/50 dark:bg-red-950/10')}>
                        <TableCell className="font-medium text-sm">{a.productName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.brand || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{a.currentStock}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{a.reorderLevel}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {a.salesVelocity > 0 ? `${a.salesVelocity.toFixed(1)}/day` : <span className="text-xs italic">No recent sales</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={cn('text-[10px] tabular-nums',
                            a.daysUntilStockout <= 7 ? 'text-red-500 border-red-200 dark:text-red-400' :
                            a.daysUntilStockout <= 14 ? 'text-amber-600 border-amber-200 dark:text-amber-400' :
                            'text-muted-foreground border-border'
                          )}>
                            {a.daysUntilStockout >= 999 ? (a.salesVelocity === 0 ? 'No sales' : 'N/A') : `${a.daysUntilStockout}d`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{a.suggestedReorder}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={a.severity === 'critical' ? 'destructive' : a.severity === 'warning' ? 'outline' : 'outline'} className={cn('text-[10px]',
                            a.severity === 'warning' && 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800'
                          )}>
                            {a.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </PinnableCard>
      )}

      {/* Section: Retail Commissions */}
      {staffCommissions.length > 0 ? (
        <PinnableCard elementKey="retail_commissions" elementName="Retail Commissions" category="Analytics Hub - Retail">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <Banknote className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">RETAIL COMMISSIONS</CardTitle>
                      <MetricInfoTooltip description="Estimated retail commission payouts based on your commission configuration. Override rates are marked. Configure rates in Settings → Retail Products." />
                    </div>
                    <CardDescription className="text-xs">
                      {commissionConfig?.commission_type === 'tiered' ? 'Tiered' : commissionConfig?.commission_type === 'per_employee' ? 'Per-Employee' : 'Flat Rate'} @ {commissionConfig?.default_rate}% default
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
                  <Button variant="ghost" size={tokens.button.inline} className="text-xs gap-1 text-muted-foreground" onClick={() => exportCommissionsCSV(staffCommissions)}>
                    <Download className="w-3.5 h-3.5" /> Export
                  </Button>
                  <Button variant="ghost" size={tokens.button.inline} className="text-xs gap-1 text-muted-foreground" onClick={() => navigate('/dashboard/admin/settings?category=retail-products')}>
                    <Settings2 className="w-3.5 h-3.5" /> Configure
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Stylist</TableHead>
                      <TableHead className="text-right">Retail Revenue</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffCommissions.map((s, idx) => (
                      <TableRow key={s.userId || s.name}>
                        <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              {s.photoUrl && <AvatarImage src={s.photoUrl} alt={s.name} />}
                              <AvatarFallback className="text-[9px]">{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(s.retailRevenue)}</BlurredAmount></TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums text-sm">{s.commissionRate}%</span>
                          {s.isOverride && <Badge variant="outline" className="ml-1 text-[9px]">Override</Badge>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium"><BlurredAmount>{formatCurrencyWhole(s.commissionEarned)}</BlurredAmount></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell />
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(staffCommissions.reduce((s, c) => s + c.retailRevenue, 0))}</BlurredAmount></TableCell>
                      <TableCell />
                      <TableCell className="text-right font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(staffCommissions.reduce((s, c) => s + c.commissionEarned, 0))}</BlurredAmount></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </PinnableCard>
      ) : commissionConfig ? (
        /* Phase B: Show commission config preview even with no sales */
        <PinnableCard elementKey="retail_commissions" elementName="Retail Commissions" category="Analytics Hub - Retail">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <Banknote className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">RETAIL COMMISSIONS</CardTitle>
                      <MetricInfoTooltip description="Estimated retail commission payouts based on your commission configuration. Configure rates in Settings → Retail Products." />
                    </div>
                    <CardDescription className="text-xs">Commission structure configured</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size={tokens.button.inline} className="text-xs gap-1 text-muted-foreground" onClick={() => navigate('/dashboard/admin/settings?category=retail-products')}>
                    <Settings2 className="w-3.5 h-3.5" /> Configure
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <span className="font-medium capitalize">{commissionConfig.commission_type === 'flat_rate' ? 'Flat Rate' : commissionConfig.commission_type === 'tiered' ? 'Tiered' : 'Per-Employee'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Default Rate:</span>{' '}
                    <span className="font-medium">{commissionConfig.default_rate}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">No retail sales data in this period. Commission payouts will appear once retail transactions are recorded.</p>
              </div>
            </CardContent>
          </Card>
        </PinnableCard>
      ) : null}

      {/* ─── Bundle Suggestions ─── */}
      <BundleSuggestionsCard locationId={locationId} filterContext={filterContext} movementRatings={productMovementRatings} />

      {/* ─── Replenishment Timeline ─── */}
      {allProducts && velocityMap && (
        <ReplenishmentTimelineCard products={allProducts} velocityMap={velocityMap} filterContext={filterContext} />
      )}

      {/* ─── Supplier Performance Summary ─── */}
      {supplierMetrics && supplierMetrics.length > 0 && (
        <PinnableCard elementKey="retail_supplier_performance" elementName="Supplier Performance" category="Analytics Hub - Retail">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">SUPPLIER PERFORMANCE</CardTitle>
                      <MetricInfoTooltip description="Supplier scorecard based on purchase order data. Grade combines fill rate (60%) and on-time delivery accuracy (40%). A = 90%+, B = 75%+, C = 60%+, D = below 60%." />
                    </div>
                    <CardDescription className="text-xs">{supplierMetrics.length} supplier{supplierMetrics.length !== 1 ? 's' : ''} tracked</CardDescription>
                  </div>
                </div>
                {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Fill Rate</TableHead>
                      <TableHead className="text-right">Avg Lead Time</TableHead>
                      <TableHead className="text-right">On-Time %</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierMetrics.map(s => {
                      const gradeColor = s.grade === 'A' ? 'text-emerald-600 dark:text-emerald-400' : s.grade === 'B' ? 'text-blue-600 dark:text-blue-400' : s.grade === 'C' ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400';
                      return (
                        <TableRow key={s.supplierName}>
                          <TableCell className="font-medium text-sm">{s.supplierName}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn('text-xs', gradeColor)}>{s.grade}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{s.totalOrders}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.fillRate}%</TableCell>
                          <TableCell className="text-right tabular-nums">{s.avgLeadTimeDays != null ? `${s.avgLeadTimeDays}d` : '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.leadTimeAccuracy != null ? `${s.leadTimeAccuracy}%` : '—'}</TableCell>
                          <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(s.totalSpend)}</BlurredAmount></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </PinnableCard>
      )}

      {/* ─── Inventory Valuation ─── */}
      {allProducts && (
        <InventoryValuationCard products={allProducts} movementRatings={productMovementRatings} filterContext={filterContext} />
      )}

      {/* ─── Expiry Alerts ─── */}
      {allProducts && (
        <ExpiryAlertCard products={allProducts} filterContext={filterContext} />
      )}

      {/* ─── Dead Stock Auto-Clearance Suggestions ─── */}
      {allProducts && (
        <DeadStockAlertCard products={allProducts} movementRatings={productMovementRatings} velocityMap={velocityMap ?? undefined} filterContext={filterContext} />
      )}

      {/* ─── Seasonal Demand Forecast ─── */}
      {allProducts && velocityMap && (
        <SeasonalForecastCard products={allProducts} velocityMap={velocityMap} filterContext={filterContext} />
      )}

      {/* ─── Shrinkage Report ─── */}
      <ShrinkageReportCard filterContext={filterContext} />

      {/* ─── Reorder Approval Queue ─── */}
      <ReorderApprovalCard />
    </div>
  );
}
