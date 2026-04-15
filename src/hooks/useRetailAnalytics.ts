import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, subDays, format } from 'date-fns';
import { isAllLocations, parseLocationIds } from '@/lib/locationFilter';
import { isExtensionProduct } from '@/utils/serviceCategorization';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetailSummary {
  totalRevenue: number;
  priorRevenue: number;
  revenueChange: number;
  totalUnits: number;
  priorUnits: number;
  unitsChange: number;
  uniqueProducts: number;
  avgProductTicket: number;
  totalDiscount: number;
  discountRate: number;
  attachmentRate: number;
}

export interface ProductRow {
  name: string;
  category: string | null;
  brand: string | null;
  unitsSold: number;
  revenue: number;
  avgPrice: number;
  discount: number;
  priorRevenue: number;
  revenueTrend: number; // % change vs prior
  costPrice: number | null;
  margin: number | null;
  quantityOnHand: number | null;
  /** Daily revenue for product-level sparkline */
  dailyRevenue: { date: string; revenue: number }[];
}

export interface RedFlag {
  product: string;
  type: 'declining' | 'heavy_discount' | 'slow_mover';
  label: string;
  severity: 'warning' | 'danger';
  detail: string;
}

export interface CategoryRow {
  category: string;
  revenue: number;
  units: number;
  productCount: number;
  avgPrice: number;
  pctOfTotal: number;
}

export interface DailyTrend {
  date: string;
  revenue: number;
  units: number;
}

export interface StaffRetailRow {
  userId: string | null;
  name: string;
  photoUrl: string | null;
  productRevenue: number;
  unitsSold: number;
  attachmentRate: number;
  avgTicket: number;
}

export interface MarginRow {
  name: string;
  revenue: number;
  cost: number;
  margin: number;
  profit: number;
}

export interface MarginData {
  grossMarginPct: number;
  estimatedProfit: number;
  products: MarginRow[];
}

export interface BrandRow {
  brand: string;
  revenue: number;
  priorRevenue: number;
  revenueTrend: number;
  unitsSold: number;
  productCount: number;
  avgPrice: number;
  margin: number;
  topProduct: string;
  staleProducts: string[];
  /** All products sold under this brand with revenue + units */
  productBreakdown: { name: string; revenue: number; unitsSold: number; margin: number | null; quantityOnHand: number | null }[];
  /** Daily revenue for sparkline */
  dailyRevenue: { date: string; revenue: number }[];
}

export interface DeadStockRow {
  name: string;
  brand: string;
  category: string;
  retailPrice: number;
  quantityOnHand: number;
  lastSoldDate: string | null;
  daysStale: number;
  capitalTiedUp: number;
}

export interface RetailAnalyticsResult {
  summary: RetailSummary;
  products: ProductRow[];
  redFlags: RedFlag[];
  categories: CategoryRow[];
  dailyTrend: DailyTrend[];
  staffRetail: StaffRetailRow[];
  marginData: MarginData | null;
  brandPerformance: BrandRow[];
  deadStock: DeadStockRow[];
  /** Sales velocity: product name (lowercase) -> units per day */
  salesVelocity: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Helper – product item_type variants
// ---------------------------------------------------------------------------
const PRODUCT_TYPES = ['Product', 'product', 'PRODUCT', 'Retail', 'retail', 'RETAIL'];
const SERVICE_TYPES = ['Service', 'service', 'SERVICE'];

// ---------------------------------------------------------------------------
// CSV Export utility
// ---------------------------------------------------------------------------
export function exportRetailCSV(data: RetailAnalyticsResult, section: 'products' | 'brands' | 'deadstock' | 'staff' | 'categories') {
  let csv = '';
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  if (section === 'products') {
    csv = 'Product,Category,Brand,Units Sold,Revenue,Avg Price,Discount,Trend %,Cost,Margin %,Stock\n';
    data.products.forEach(p => {
      csv += [p.name, p.category, p.brand, p.unitsSold, p.revenue.toFixed(2), p.avgPrice.toFixed(2), p.discount.toFixed(2), p.revenueTrend.toFixed(1), p.costPrice?.toFixed(2) ?? '', p.margin?.toFixed(1) ?? '', p.quantityOnHand ?? ''].map(escape).join(',') + '\n';
    });
  } else if (section === 'brands') {
    csv = 'Brand,Revenue,Prior Revenue,Trend %,Units,Products,Avg Price,Margin %\n';
    data.brandPerformance.forEach(b => {
      csv += [b.brand, b.revenue.toFixed(2), b.priorRevenue.toFixed(2), b.revenueTrend.toFixed(1), b.unitsSold, b.productCount, b.avgPrice.toFixed(2), b.margin.toFixed(1)].map(escape).join(',') + '\n';
    });
  } else if (section === 'deadstock') {
    csv = 'Product,Brand,Category,Retail Price,Stock,Capital Tied Up,Last Sold,Days Stale\n';
    data.deadStock.forEach(d => {
      csv += [d.name, d.brand, d.category, d.retailPrice.toFixed(2), d.quantityOnHand, d.capitalTiedUp.toFixed(2), d.lastSoldDate || 'Never', d.daysStale].map(escape).join(',') + '\n';
    });
  } else if (section === 'staff') {
    csv = 'Staff,Revenue,Units,Attachment Rate %,Avg Ticket\n';
    data.staffRetail.forEach(s => {
      csv += [s.name, s.productRevenue.toFixed(2), s.unitsSold, s.attachmentRate, s.avgTicket.toFixed(2)].map(escape).join(',') + '\n';
    });
  } else if (section === 'categories') {
    csv = 'Category,Revenue,Units,Products,Avg Price,% of Total\n';
    data.categories.forEach(c => {
      csv += [c.category, c.revenue.toFixed(2), c.units, c.productCount, c.avgPrice.toFixed(2), c.pctOfTotal.toFixed(1)].map(escape).join(',') + '\n';
    });
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `retail-${section}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Paginated fetch helper (bypasses 1000-row limit)
// ---------------------------------------------------------------------------
async function fetchAllRows<T>(
  queryBuilder: () => any,
  batchSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await (queryBuilder() as any).range(offset, offset + batchSize - 1);
    if (error) throw error;
    const rows = (data || []) as T[];
    all.push(...rows);
    hasMore = rows.length === batchSize;
    offset += batchSize;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRetailAnalytics(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['retail-analytics', dateFrom, dateTo, locationId || 'all'],
    queryFn: async (): Promise<RetailAnalyticsResult> => {
      if (!dateFrom || !dateTo) {
        return emptyResult();
      }

      const from = parseISO(dateFrom);
      const to = parseISO(dateTo);
      const span = differenceInDays(to, from) + 1;
      const priorFrom = format(subDays(from, span), 'yyyy-MM-dd');
      const priorTo = format(subDays(from, 1), 'yyyy-MM-dd');

      // ── Fetch current period phorest transaction items (paginated) ──
      const currentItems = await fetchAllRows<any>(() => {
        let q = supabase
          .from('v_all_transaction_items' as any)
          .select('item_name, item_category, item_type, quantity, unit_price, discount, total_amount, transaction_date, transaction_id, staff_user_id')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo);
        if (!isAllLocations(locationId)) {
          const ids = parseLocationIds(locationId);
          q = ids.length === 1 ? q.eq('location_id', ids[0]) : q.in('location_id', ids);
        }
        return q;
      });

      // ── Fetch prior period (paginated) ──
      const priorItems = await fetchAllRows<any>(() => {
        let q = supabase
          .from('v_all_transaction_items' as any)
          .select('item_name, item_type, quantity, total_amount, transaction_id, staff_user_id')
          .gte('transaction_date', priorFrom)
          .lte('transaction_date', priorTo);
        if (!isAllLocations(locationId)) {
          const ids = parseLocationIds(locationId);
          q = ids.length === 1 ? q.eq('location_id', ids[0]) : q.in('location_id', ids);
        }
        return q;
      });

      // ── Fetch native retail_sale_items for the period ──
      let nativeSaleItems: any[] = [];
      try {
        const nativeItems = await fetchAllRows<any>(() => {
          let q = supabase
            .from('retail_sale_items' as any)
            .select('product_name, quantity, unit_price, discount, total_amount, sale_id, created_at');
          return q;
        });
        // Filter by date range via created_at and get sale details
        if (nativeItems.length > 0) {
          const saleIds = [...new Set(nativeItems.map((i: any) => i.sale_id))];
          // Fetch sales to get dates and location/staff
          const batchSize = 200;
          const allSales: any[] = [];
          for (let i = 0; i < saleIds.length; i += batchSize) {
            const batch = saleIds.slice(i, i + batchSize);
            let salesQ = supabase
              .from('retail_sales' as any)
              .select('id, location_id, staff_id, created_at')
              .in('id', batch);
            const { data: salesData } = await salesQ;
            if (salesData) allSales.push(...salesData);
          }
          const salesMap = new Map(allSales.map((s: any) => [s.id, s]));

          // Filter items within date range and location
          nativeSaleItems = nativeItems.filter((item: any) => {
            const sale = salesMap.get(item.sale_id);
            if (!sale) return false;
            const saleDate = (sale.created_at as string).split('T')[0];
            if (saleDate < dateFrom || saleDate > dateTo) return false;
            // Location filter
            if (locationId && locationId !== 'all') {
              const ids = locationId.split(',').filter(Boolean);
              if (!ids.includes(sale.location_id)) return false;
            }
            // Attach date and staff for downstream use
            item._saleDate = saleDate;
            item._staffId = sale.staff_id;
            return true;
          });
        }
      } catch {
        // retail_sale_items table may not exist yet – silently skip
      }

      // ── Fetch product catalog for margin + brand data ──
      const { data: catalogData } = await supabase
        .from('products')
        .select('name, cost_price, retail_price, brand, category, quantity_on_hand')
        .eq('is_active', true);

      const catalog = catalogData || [];

      // Build cost lookup and brand/category lookup from products catalog
      const costMap = new Map<string, number>();
      const brandMap = new Map<string, string>();
      const catalogProducts = new Map<string, { brand: string; category: string; retailPrice: number; quantityOnHand: number; costPrice: number }>();
      let hasCostData = false;
      catalog.forEach((p: any) => {
        const lowerName = p.name?.toLowerCase();
        if (p.cost_price != null && p.cost_price > 0) {
          hasCostData = true;
          costMap.set(lowerName, Number(p.cost_price));
        }
        brandMap.set(lowerName, p.brand || 'Uncategorized');
        catalogProducts.set(lowerName, {
          brand: p.brand || 'Uncategorized',
          category: p.category || 'Uncategorized',
          retailPrice: Number(p.retail_price) || 0,
          quantityOnHand: Number(p.quantity_on_hand) || 0,
          costPrice: Number(p.cost_price) || 0,
        });
      });

      // ── Aggregate current period products ──
      const prodMap = new Map<string, { name: string; category: string | null; units: number; revenue: number; discount: number; prices: number[]; dailyRevenue: Map<string, number> }>();
      const dailyMap = new Map<string, { revenue: number; units: number }>();
      const staffMap = new Map<string, { revenue: number; units: number; serviceTxs: Set<string>; productTxs: Set<string> }>();
      let totalProductRevenue = 0;
      let totalProductUnits = 0;
      let totalDiscount = 0;
      const allServiceTxs = new Set<string>();
      const allProductTxs = new Set<string>();
      // Track last sold date per product (lowercase name -> most recent date)
      const lastSoldMap = new Map<string, string>();

      const processItem = (item: { item_name: string; item_category?: string; item_type: string; quantity: number; unit_price?: number; discount?: number; total_amount: number; transaction_date?: string; transaction_id?: string; phorest_staff_id?: string; _saleDate?: string; _staffId?: string }, source: 'phorest' | 'native') => {
        const isProduct = source === 'native' || PRODUCT_TYPES.includes(item.item_type);
        const isService = source === 'phorest' && SERVICE_TYPES.includes(item.item_type);
        const txId = item.transaction_id || item._saleDate; // native items use sale date as pseudo-tx
        const staffId = item.phorest_staff_id || item._staffId;
        const txDate = item.transaction_date || item._saleDate;

        // Track all service/product transactions for attachment rate
        if (isService && txId) allServiceTxs.add(txId);
        if (isProduct && txId && !isExtensionProduct(item.item_name)) allProductTxs.add(txId);

        // Staff tracking
        if (staffId) {
          if (!staffMap.has(staffId)) {
            staffMap.set(staffId, { revenue: 0, units: 0, serviceTxs: new Set(), productTxs: new Set() });
          }
          const s = staffMap.get(staffId)!;
          if (isService && txId) s.serviceTxs.add(txId);
          if (isProduct) {
            s.revenue += Number(item.total_amount) || 0;
            s.units += item.quantity || 1;
            if (txId && !isExtensionProduct(item.item_name)) s.productTxs.add(txId);
          }
        }

        if (!isProduct) return;

        const name = item.item_name || 'Unknown';
        const qty = item.quantity || 1;
        const rev = Number(item.total_amount) || 0;
        const disc = Number(item.discount) || 0;

        totalProductRevenue += rev;
        totalProductUnits += qty;
        totalDiscount += disc;

        // Track last sold date
        if (txDate) {
          const lowerName = name.toLowerCase();
          const existing = lastSoldMap.get(lowerName);
          if (!existing || txDate > existing) lastSoldMap.set(lowerName, txDate);
        }

        // Product aggregation
        if (!prodMap.has(name)) {
          prodMap.set(name, { name, category: item.item_category || null, units: 0, revenue: 0, discount: 0, prices: [], dailyRevenue: new Map() });
        }
        const p = prodMap.get(name)!;
        p.units += qty;
        p.revenue += rev;
        p.discount += disc;
        p.prices.push(Number(item.unit_price) || rev / qty);

        // Daily trend
        if (txDate) {
          if (!dailyMap.has(txDate)) dailyMap.set(txDate, { revenue: 0, units: 0 });
          const day = dailyMap.get(txDate)!;
          day.revenue += rev;
          day.units += qty;

          // Per-product daily (for brand sparklines)
          p.dailyRevenue.set(txDate, (p.dailyRevenue.get(txDate) || 0) + rev);
        }
      };

      // Process phorest items
      currentItems.forEach((item: any) => processItem(item, 'phorest'));
      // Process native items
      nativeSaleItems.forEach((item: any) => processItem({
        item_name: item.product_name,
        item_type: 'Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total_amount: item.total_amount,
        _saleDate: item._saleDate,
        _staffId: item._staffId,
      }, 'native'));

      // ── Aggregate prior period for comparison ──
      const priorProdMap = new Map<string, { revenue: number; units: number }>();
      let priorTotalRevenue = 0;
      let priorTotalUnits = 0;

      priorItems.forEach((item: any) => {
        if (!PRODUCT_TYPES.includes(item.item_type)) return;
        const name = item.item_name || 'Unknown';
        const rev = Number(item.total_amount) || 0;
        const qty = item.quantity || 1;
        priorTotalRevenue += rev;
        priorTotalUnits += qty;
        if (!priorProdMap.has(name)) priorProdMap.set(name, { revenue: 0, units: 0 });
        const pp = priorProdMap.get(name)!;
        pp.revenue += rev;
        pp.units += qty;
      });

      // ── Build product rows ──
      const products: ProductRow[] = Array.from(prodMap.values()).map(p => {
        const prior = priorProdMap.get(p.name);
        const priorRev = prior?.revenue ?? 0;
        const trend = priorRev > 0 ? ((p.revenue - priorRev) / priorRev) * 100 : (p.revenue > 0 ? 100 : 0);
        const lowerName = p.name.toLowerCase();
        const cost = costMap.get(lowerName);
        const cp = catalogProducts.get(lowerName);
        const totalCost = cost != null ? cost * p.units : null;
        const margin = totalCost != null && p.revenue > 0 ? ((p.revenue - totalCost) / p.revenue) * 100 : null;
        // Build product-level daily sparkline
        const prodDailyRevenue = Array.from(p.dailyRevenue.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => a.date.localeCompare(b.date));

        return {
          name: p.name,
          category: p.category,
          brand: brandMap.get(lowerName) || null,
          unitsSold: p.units,
          revenue: p.revenue,
          avgPrice: p.units > 0 ? p.revenue / p.units : 0,
          discount: p.discount,
          priorRevenue: priorRev,
          revenueTrend: trend,
          costPrice: cost ?? null,
          margin,
          quantityOnHand: cp?.quantityOnHand ?? null,
          dailyRevenue: prodDailyRevenue,
        };
      }).sort((a, b) => b.revenue - a.revenue);

      // ── Red flags ──
      const redFlags: RedFlag[] = [];
      products.forEach(p => {
        if (p.priorRevenue > 0 && p.revenueTrend < -20) {
          redFlags.push({
            product: p.name,
            type: 'declining',
            label: 'Declining Sales',
            severity: p.revenueTrend < -50 ? 'danger' : 'warning',
            detail: `Revenue down ${Math.abs(Math.round(p.revenueTrend))}% vs prior period`,
          });
        }
        if (p.discount > 0 && p.revenue > 0) {
          const discPct = (p.discount / (p.revenue + p.discount)) * 100;
          if (discPct > 15) {
            redFlags.push({
              product: p.name,
              type: 'heavy_discount',
              label: 'Heavy Discounting',
              severity: discPct > 30 ? 'danger' : 'warning',
              detail: `${Math.round(discPct)}% of retail value discounted`,
            });
          }
        }
        if (p.unitsSold < 3 && span >= 14) {
          redFlags.push({
            product: p.name,
            type: 'slow_mover',
            label: 'Slow Mover',
            severity: p.unitsSold <= 1 ? 'danger' : 'warning',
            detail: `Only ${p.unitsSold} unit${p.unitsSold !== 1 ? 's' : ''} sold in ${span} days`,
          });
        }
      });

      // ── Category breakdown ──
      const catMap = new Map<string, { revenue: number; units: number; products: Set<string> }>();
      products.forEach(p => {
        const cat = p.category || 'Uncategorized';
        if (!catMap.has(cat)) catMap.set(cat, { revenue: 0, units: 0, products: new Set() });
        const c = catMap.get(cat)!;
        c.revenue += p.revenue;
        c.units += p.unitsSold;
        c.products.add(p.name);
      });
      const categories: CategoryRow[] = Array.from(catMap.entries())
        .map(([cat, d]) => ({
          category: cat,
          revenue: d.revenue,
          units: d.units,
          productCount: d.products.size,
          avgPrice: d.units > 0 ? d.revenue / d.units : 0,
          pctOfTotal: totalProductRevenue > 0 ? (d.revenue / totalProductRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // ── Daily trend (sorted by date) ──
      const dailyTrend: DailyTrend[] = Array.from(dailyMap.entries())
        .map(([date, d]) => ({ date, revenue: d.revenue, units: d.units }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // ── Staff retail performance ──
      const staffIds = Array.from(staffMap.keys());
      let staffRetail: StaffRetailRow[] = [];
      if (staffIds.length > 0) {
        const { data: mappings } = await supabase
          .from('v_all_staff' as any)
          .select('phorest_staff_id, user_id, phorest_staff_name')
          .in('phorest_staff_id', staffIds);

        const userIds = (mappings || []).map((m: any) => m.user_id).filter(Boolean);
        const { data: profiles } = userIds.length > 0
          ? await supabase
              .from('employee_profiles')
              .select('user_id, full_name, display_name, photo_url')
              .in('user_id', userIds)
          : { data: [] };

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        const mappingMap = new Map((mappings || []).map((m: any) => [m.phorest_staff_id, m]));

        staffRetail = staffIds.map(sid => {
          const d = staffMap.get(sid)!;
          const mapping = mappingMap.get(sid) as any;
          const profile = mapping?.user_id ? profileMap.get(mapping.user_id) as any : null;

          let attached = 0;
          d.serviceTxs.forEach(tx => { if (d.productTxs.has(tx)) attached++; });
          const rate = d.serviceTxs.size > 0 ? (attached / d.serviceTxs.size) * 100 : 0;

          return {
            userId: mapping?.user_id || null,
            name: profile ? formatDisplayName(profile.full_name || '', profile.display_name) : (mapping?.phorest_staff_name || 'Unknown'),
            photoUrl: profile?.photo_url || null,
            productRevenue: d.revenue,
            unitsSold: d.units,
            attachmentRate: Math.round(rate),
            avgTicket: d.units > 0 ? d.revenue / d.units : 0,
          };
        })
        .filter(s => s.productRevenue > 0)
        .sort((a, b) => b.productRevenue - a.productRevenue);
      }

      // ── Attachment rate ──
      let attachedCount = 0;
      allServiceTxs.forEach(tx => { if (allProductTxs.has(tx)) attachedCount++; });
      const attachmentRate = allServiceTxs.size > 0 ? Math.round((attachedCount / allServiceTxs.size) * 100) : 0;

      // ── Margin data (conditional) ──
      let marginData: MarginData | null = null;
      if (hasCostData) {
        let totalCost = 0;
        const marginProducts: MarginRow[] = [];
        products.forEach(p => {
          const cost = costMap.get(p.name.toLowerCase());
          if (cost != null) {
            const totalCostForProduct = cost * p.unitsSold;
            totalCost += totalCostForProduct;
            const profit = p.revenue - totalCostForProduct;
            const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
            marginProducts.push({ name: p.name, revenue: p.revenue, cost: totalCostForProduct, margin, profit });
          }
        });
        marginProducts.sort((a, b) => b.profit - a.profit);
        const totalMarginRevenue = marginProducts.reduce((s, m) => s + m.revenue, 0);
        const totalProfit = totalMarginRevenue - totalCost;
        marginData = {
          grossMarginPct: totalMarginRevenue > 0 ? (totalProfit / totalMarginRevenue) * 100 : 0,
          estimatedProfit: totalProfit,
          products: marginProducts,
        };
      }

      // ── Summary ──
      const revenueChange = priorTotalRevenue > 0
        ? ((totalProductRevenue - priorTotalRevenue) / priorTotalRevenue) * 100
        : (totalProductRevenue > 0 ? 100 : 0);
      const unitsChange = priorTotalUnits > 0
        ? ((totalProductUnits - priorTotalUnits) / priorTotalUnits) * 100
        : (totalProductUnits > 0 ? 100 : 0);

      const summary: RetailSummary = {
        totalRevenue: totalProductRevenue,
        priorRevenue: priorTotalRevenue,
        revenueChange,
        totalUnits: totalProductUnits,
        priorUnits: priorTotalUnits,
        unitsChange,
        uniqueProducts: prodMap.size,
        avgProductTicket: totalProductUnits > 0 ? totalProductRevenue / totalProductUnits : 0,
        totalDiscount,
        discountRate: totalProductRevenue + totalDiscount > 0
          ? (totalDiscount / (totalProductRevenue + totalDiscount)) * 100
          : 0,
        attachmentRate,
      };

      // ── Brand Performance ──
      const brandAgg = new Map<string, {
        revenue: number; priorRevenue: number; units: number;
        products: Set<string>; soldProducts: Map<string, { revenue: number; units: number }>;
        cost: number; dailyRevenue: Map<string, number>;
      }>();
      const soldProductNames = new Set<string>();

      products.forEach(p => {
        const brand = brandMap.get(p.name.toLowerCase()) || 'Uncategorized';
        if (!brandAgg.has(brand)) brandAgg.set(brand, { revenue: 0, priorRevenue: 0, units: 0, products: new Set(), soldProducts: new Map(), cost: 0, dailyRevenue: new Map() });
        const b = brandAgg.get(brand)!;
        b.revenue += p.revenue;
        b.units += p.unitsSold;
        b.products.add(p.name);
        b.soldProducts.set(p.name, { revenue: p.revenue, units: p.unitsSold });
        soldProductNames.add(p.name.toLowerCase());
        const cost = costMap.get(p.name.toLowerCase());
        if (cost != null) b.cost += cost * p.unitsSold;

        // Merge daily revenue into brand
        const prodEntry = prodMap.get(p.name);
        if (prodEntry) {
          prodEntry.dailyRevenue.forEach((rev, date) => {
            b.dailyRevenue.set(date, (b.dailyRevenue.get(date) || 0) + rev);
          });
        }

        // Prior period
        const prior = priorProdMap.get(p.name);
        if (prior) b.priorRevenue += prior.revenue;
      });

      const brandPerformance: BrandRow[] = Array.from(brandAgg.entries()).map(([brand, d]) => {
        const trend = d.priorRevenue > 0 ? ((d.revenue - d.priorRevenue) / d.priorRevenue) * 100 : (d.revenue > 0 ? 100 : 0);
        const margin = d.revenue > 0 && d.cost > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0;
        let topProduct = '';
        let topRev = 0;
        const productBreakdown: BrandRow['productBreakdown'] = [];
        d.soldProducts.forEach((pd, name) => {
          if (pd.revenue > topRev) { topRev = pd.revenue; topProduct = name; }
          const lowerName = name.toLowerCase();
          const cp = catalogProducts.get(lowerName);
          const cost = costMap.get(lowerName);
          const totalCost = cost != null ? cost * pd.units : null;
          const pMargin = totalCost != null && pd.revenue > 0 ? ((pd.revenue - totalCost) / pd.revenue) * 100 : null;
          productBreakdown.push({
            name,
            revenue: pd.revenue,
            unitsSold: pd.units,
            margin: pMargin,
            quantityOnHand: cp?.quantityOnHand ?? null,
          });
        });
        productBreakdown.sort((a, b) => b.revenue - a.revenue);

        const staleProducts: string[] = [];
        catalogProducts.forEach((cp, lowerName) => {
          if (cp.brand === brand && !soldProductNames.has(lowerName)) {
            staleProducts.push(catalog.find((c: any) => c.name?.toLowerCase() === lowerName)?.name || lowerName);
          }
        });

        // Daily revenue for sparkline
        const dailyRevenue = Array.from(d.dailyRevenue.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => a.date.localeCompare(b.date));

        return {
          brand,
          revenue: d.revenue,
          priorRevenue: d.priorRevenue,
          revenueTrend: trend,
          unitsSold: d.units,
          productCount: d.products.size,
          avgPrice: d.units > 0 ? d.revenue / d.units : 0,
          margin,
          topProduct,
          staleProducts,
          productBreakdown,
          dailyRevenue,
        };
      }).sort((a, b) => b.revenue - a.revenue);

      // ── Dead Stock (with real lastSoldDate) ──
      const today = new Date();
      const deadStock: DeadStockRow[] = [];
      catalogProducts.forEach((cp, lowerName) => {
        if (!soldProductNames.has(lowerName) && cp.quantityOnHand > 0) {
          const lastSold = lastSoldMap.get(lowerName) || null;
          // If we have no sale in current period, check if there's a prior-period sale
          const priorLastSold = !lastSold ? (priorProdMap.has(catalog.find((c: any) => c.name?.toLowerCase() === lowerName)?.name || '') ? priorTo : null) : lastSold;
          const daysStale = priorLastSold ? differenceInDays(today, parseISO(priorLastSold)) : span;

          deadStock.push({
            name: catalog.find((c: any) => c.name?.toLowerCase() === lowerName)?.name || lowerName,
            brand: cp.brand,
            category: cp.category,
            retailPrice: cp.retailPrice,
            quantityOnHand: cp.quantityOnHand,
            lastSoldDate: priorLastSold,
            daysStale,
            capitalTiedUp: cp.retailPrice * cp.quantityOnHand,
          });
        }
      });
      // ── Sales velocity (units per day per product) ──
      const salesVelocity = new Map<string, number>();
      prodMap.forEach((p, name) => {
        salesVelocity.set(name.toLowerCase(), span > 0 ? p.units / span : 0);
      });

      return { summary, products, redFlags, categories, dailyTrend, staffRetail, marginData, brandPerformance, deadStock, salesVelocity };
    },
    enabled: !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000,
  });
}

function emptyResult(): RetailAnalyticsResult {
  return {
    summary: { totalRevenue: 0, priorRevenue: 0, revenueChange: 0, totalUnits: 0, priorUnits: 0, unitsChange: 0, uniqueProducts: 0, avgProductTicket: 0, totalDiscount: 0, discountRate: 0, attachmentRate: 0 },
    products: [],
    redFlags: [],
    categories: [],
    dailyTrend: [],
    staffRetail: [],
    marginData: null,
    brandPerformance: [],
    deadStock: [],
    salesVelocity: new Map(),
  };
}
