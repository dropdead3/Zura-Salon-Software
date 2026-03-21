import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Calendar, TrendingUp, TrendingDown, Snowflake, Sun, Leaf, Flower2,
  ChevronDown, ChevronUp, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import type { Product } from '@/hooks/useProducts';
import type { ProductVelocityEntry } from '@/hooks/useProductVelocity';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SeasonalForecastCardProps {
  products: Product[];
  velocityMap: Map<string, ProductVelocityEntry>;
  filterContext?: FilterContext;
}

type Season = 'spring' | 'summer' | 'fall' | 'winter';

interface SeasonalProduct {
  name: string;
  brand: string;
  currentVelocity: number;
  weightedVelocity: number;
  velocityChange: number | null;
  projected30d: number;
  projected60d: number;
  projected90d: number;
  trend: 'rising' | 'falling' | 'stable';
  suggestedOrder: number;
  currentStock: number;
  stockoutRisk: boolean;
  costPrice: number;
  retailPrice: number;
}

const SEASON_CONFIG: Record<Season, { label: string; icon: typeof Sun; months: number[]; color: string }> = {
  spring: { label: 'Spring', icon: Flower2, months: [3, 4, 5], color: 'text-emerald-500' },
  summer: { label: 'Summer', icon: Sun, months: [6, 7, 8], color: 'text-amber-500' },
  fall: { label: 'Fall', icon: Leaf, months: [9, 10, 11], color: 'text-orange-500' },
  winter: { label: 'Winter', icon: Snowflake, months: [12, 1, 2], color: 'text-blue-500' },
};

function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if ([3, 4, 5].includes(month)) return 'spring';
  if ([6, 7, 8].includes(month)) return 'summer';
  if ([9, 10, 11].includes(month)) return 'fall';
  return 'winter';
}

function getNextSeason(s: Season): Season {
  const order: Season[] = ['spring', 'summer', 'fall', 'winter'];
  return order[(order.indexOf(s) + 1) % 4];
}

const BAR_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
];

export function SeasonalForecastCard({ products, velocityMap, filterContext }: SeasonalForecastCardProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const [expanded, setExpanded] = useState(false);
  const currentSeason = getCurrentSeason();
  const nextSeason = getNextSeason(currentSeason);
  const seasonCfg = SEASON_CONFIG[currentSeason];
  const nextSeasonCfg = SEASON_CONFIG[nextSeason];
  const SeasonIcon = seasonCfg.icon;

  const forecastData = useMemo(() => {
    const results: SeasonalProduct[] = [];

    for (const product of products) {
      const key = (product.name || '').toLowerCase().trim();
      if (!key) continue;
      const velocity = velocityMap.get(key);
      if (!velocity) continue;

      // Use weighted velocity for more accurate recent-biased projection
      const dailyRate = velocity.weightedVelocity > 0 ? velocity.weightedVelocity : velocity.velocity;
      if (dailyRate <= 0) continue;

      // Apply trend multiplier based on velocity change
      let trendMultiplier = 1;
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (velocity.velocityChange != null) {
        if (velocity.velocityChange > 15) {
          trendMultiplier = 1 + Math.min(velocity.velocityChange / 200, 0.3); // cap at 30% uplift
          trend = 'rising';
        } else if (velocity.velocityChange < -15) {
          trendMultiplier = 1 + Math.max(velocity.velocityChange / 200, -0.3); // cap at 30% decrease
          trend = 'falling';
        }
      }

      const adjustedDaily = dailyRate * trendMultiplier;
      const projected30d = Math.round(adjustedDaily * 30);
      const projected60d = Math.round(adjustedDaily * 60);
      const projected90d = Math.round(adjustedDaily * 90);

      const currentStock = product.quantity_on_hand ?? 0;
      const daysOfStock = currentStock > 0 ? currentStock / adjustedDaily : 0;
      const stockoutRisk = daysOfStock < 30;

      // Suggested order: enough for 90 days minus current stock
      const suggestedOrder = Math.max(0, projected90d - currentStock);

      results.push({
        name: product.name,
        brand: product.brand || 'Unbranded',
        currentVelocity: dailyRate,
        weightedVelocity: velocity.weightedVelocity,
        velocityChange: velocity.velocityChange,
        projected30d,
        projected60d,
        projected90d,
        trend,
        suggestedOrder,
        currentStock,
        stockoutRisk,
        costPrice: product.cost_price ?? 0,
        retailPrice: product.retail_price ?? 0,
      });
    }

    // Sort by projected demand descending
    results.sort((a, b) => b.projected90d - a.projected90d);
    return results;
  }, [products, velocityMap]);

  const summary = useMemo(() => {
    const rising = forecastData.filter(p => p.trend === 'rising').length;
    const falling = forecastData.filter(p => p.trend === 'falling').length;
    const atRisk = forecastData.filter(p => p.stockoutRisk).length;
    const totalProjectedUnits = forecastData.reduce((sum, p) => sum + p.projected90d, 0);
    const totalProjectedRevenue = forecastData.reduce((sum, p) => sum + (p.projected90d * p.retailPrice), 0);
    const totalSuggestedInvestment = forecastData.reduce((sum, p) => sum + (p.suggestedOrder * p.costPrice), 0);
    return { rising, falling, atRisk, totalProjectedUnits, totalProjectedRevenue, totalSuggestedInvestment };
  }, [forecastData]);

  // Chart data: top 8 products by projected demand
  const chartData = useMemo(() =>
    forecastData.slice(0, 8).map(p => ({
      name: p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name,
      '30 Day': p.projected30d,
      '60 Day': p.projected60d,
      '90 Day': p.projected90d,
    })),
    [forecastData]
  );

  if (forecastData.length === 0) return null;

  const displayProducts = expanded ? forecastData : forecastData.slice(0, 10);

  return (
    <PinnableCard elementKey="retail_seasonal_forecast" elementName="Seasonal Demand Forecast" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">SEASONAL DEMAND FORECAST</CardTitle>
                  <MetricInfoTooltip description="Projects future product demand using weighted velocity (recent sales weighted 3x), trend momentum, and current stock levels. Suggested orders cover a 90-day replenishment horizon." />
                </div>
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <SeasonIcon className={cn('w-3.5 h-3.5', seasonCfg.color)} />
                  {seasonCfg.label} → {nextSeasonCfg.label} outlook · {forecastData.length} active product{forecastData.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
              {summary.atRisk > 0 && (
                <Badge variant="outline" className="text-xs text-red-600 border-red-200 dark:text-red-400 dark:border-red-800">
                  {summary.atRisk} stockout risk
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">90-Day Projected Units</p>
              <p className="text-lg font-display tracking-wide tabular-nums">{summary.totalProjectedUnits.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Projected Revenue</p>
              <p className="text-lg font-display tracking-wide tabular-nums"><BlurredAmount>{formatCurrencyWhole(summary.totalProjectedRevenue)}</BlurredAmount></p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Suggested Investment</p>
              <p className="text-lg font-display tracking-wide tabular-nums"><BlurredAmount>{formatCurrencyWhole(summary.totalSuggestedInvestment)}</BlurredAmount></p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Trending</p>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" /> {summary.rising}
                </span>
                <span className="inline-flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                  <TrendingDown className="w-3.5 h-3.5" /> {summary.falling}
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="30 Day" fill="hsl(var(--chart-1))" radius={[0, 2, 2, 0]} barSize={8} />
                  <Bar dataKey="60 Day" fill="hsl(var(--chart-2))" radius={[0, 2, 2, 0]} barSize={8} />
                  <Bar dataKey="90 Day" fill="hsl(var(--chart-3))" radius={[0, 2, 2, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Product table */}
          <ScrollArea className="max-h-[400px]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Velocity/Day</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="text-right">30d</TableHead>
                    <TableHead className="text-right">60d</TableHead>
                    <TableHead className="text-right">90d</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Suggested Order</TableHead>
                    <TableHead className="text-center">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayProducts.map(p => (
                    <TableRow key={p.name}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[180px]">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.brand}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{p.currentVelocity.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {p.trend === 'rising' ? (
                          <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-3 h-3" /> +{Math.round(p.velocityChange ?? 0)}%
                          </span>
                        ) : p.trend === 'falling' ? (
                          <span className="inline-flex items-center gap-0.5 text-xs text-red-500 dark:text-red-400">
                            <TrendingDown className="w-3 h-3" /> {Math.round(p.velocityChange ?? 0)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Stable</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{p.projected30d}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{p.projected60d}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{p.projected90d}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{p.currentStock}</TableCell>
                      <TableCell className="text-right">
                        {p.suggestedOrder > 0 ? (
                          <span className="tabular-nums text-sm font-medium">{p.suggestedOrder}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sufficient</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.stockoutRisk ? (
                          <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 dark:text-red-400 dark:border-red-800">
                            At Risk
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {forecastData.length > 10 && (
            <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
              {expanded ? 'Show less' : `Show all ${forecastData.length} products`}
            </Button>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
