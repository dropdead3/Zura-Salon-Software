import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scissors, TrendingUp, DollarSign, ChevronDown, User, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts';
import { useServicePopularity } from '@/hooks/useSalesAnalytics';
import { ServiceMixLegend } from '@/components/dashboard/analytics/ServiceMixLegend';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsFilterBadge, FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { getCategoryColor, getGradientFromMarker, isGradientMarker } from '@/utils/categoryColors';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { formatCurrencyWhole as formatCurrencyWholeUtil, formatCurrency as formatCurrencyUtil } from '@/lib/formatCurrency';
import { useRevenueByCategoryDrilldown } from '@/hooks/useRevenueByCategoryDrilldown';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

let barIdCounter = 0;

const AnimatedBar = (props: any) => {
  const { x, y, width, height, fill, stroke, strokeWidth, index } = props;
  const [animWidth, setAnimWidth] = useState(0);
  const [clipId] = useState(() => `bar-clip-${barIdCounter++}`);

  useEffect(() => {
    const delay = (index || 0) * 60;
    const t = setTimeout(() => setAnimWidth(width || 0), delay + 50);
    return () => clearTimeout(t);
  }, [width, index]);

  const w = width || 0;
  const h = height || 0;
  const r = Math.min(4, w / 2, h / 2);

  if (h <= 0) return null;

  const clipPath = w > 0
    ? `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`
    : `M${x},${y} H${x} V${y + h} H${x} Z`;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={clipPath} />
        </clipPath>
      </defs>
      <rect
        x={x}
        y={y}
        width={animWidth}
        height={h}
        fill={fill}
        stroke={animWidth > 0 ? stroke : 'none'}
        strokeWidth={strokeWidth}
        clipPath={`url(#${clipId})`}
        style={{ transition: 'width 800ms cubic-bezier(0.25, 1, 0.5, 1)' }}
      />
    </g>
  );
};

// Hook to fetch stylist breakdown for a specific service
function useServiceStylistBreakdown(serviceName: string | null, dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['service-stylist-breakdown', serviceName, dateFrom, dateTo, locationId],
    queryFn: async () => {
      if (!serviceName) return [];
      
      let query = supabase
        .from('phorest_appointments')
        .select('phorest_staff_id, total_price')
        .eq('service_name', serviceName)
        .not('phorest_staff_id', 'is', null);

      if (dateFrom) query = query.gte('appointment_date', dateFrom);
      if (dateTo) query = query.lte('appointment_date', dateTo);
      if (locationId) query = query.eq('location_id', locationId);

      const { data, error } = await query;
      if (error) throw error;

      const byStaff: Record<string, { count: number; revenue: number }> = {};
      data?.forEach(row => {
        const id = row.phorest_staff_id;
        if (!id) return;
        if (!byStaff[id]) byStaff[id] = { count: 0, revenue: 0 };
        byStaff[id].count += 1;
        byStaff[id].revenue += Number(row.total_price) || 0;
      });

      const staffIds = Object.keys(byStaff);
      if (staffIds.length === 0) return [];

      const { data: mappings } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id, phorest_staff_name')
        .in('phorest_staff_id', staffIds);

      const nameMap: Record<string, string> = {};
      mappings?.forEach(m => {
        if (m.phorest_staff_id && m.phorest_staff_name) {
          nameMap[m.phorest_staff_id] = m.phorest_staff_name;
        }
      });

      return Object.entries(byStaff)
        .map(([staffId, stats]) => ({
          name: nameMap[staffId] || 'Unknown Stylist',
          count: stats.count,
          revenue: stats.revenue,
          avgPrice: stats.count > 0 ? stats.revenue / stats.count : 0,
        }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!serviceName && !!dateFrom && !!dateTo,
  });
}

const MAX_VISIBLE_STYLISTS = 5;

function StylistBreakdownPanel({ serviceName, dateFrom, dateTo, locationId }: {
  serviceName: string;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}) {
  const { formatCurrencyWhole: fmtWhole, formatCurrency: fmtCurrency } = useFormatCurrency();
  const { data: stylists, isLoading } = useServiceStylistBreakdown(serviceName, dateFrom, dateTo, locationId);
  const totalCount = stylists?.reduce((s, st) => s + st.count, 0) || 0;
  const [showAll, setShowAll] = useState(false);

  const visibleStylists = showAll ? stylists : stylists?.slice(0, MAX_VISIBLE_STYLISTS);
  const hasMore = (stylists?.length || 0) > MAX_VISIBLE_STYLISTS;
  const useScroll = showAll && (stylists?.length || 0) > 8;

  const renderRows = () => (
    <>
      {visibleStylists?.map((stylist, idx) => {
        const pct = totalCount > 0 ? ((stylist.count / totalCount) * 100).toFixed(0) : '0';
        return (
          <div
            key={idx}
            className="flex items-center justify-between py-2.5 px-3 border-l-2 border-primary/20"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary/10 flex items-center justify-center rounded-full">
                <User className="w-3 h-3 text-primary/50" />
              </div>
              <span className="text-sm text-muted-foreground">{stylist.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground/70 text-xs">{stylist.count}× · {pct}%</span>
              <Badge variant="secondary" className="text-xs">{fmtWhole(stylist.revenue)}</Badge>
              <span className="text-xs text-muted-foreground/60">avg {fmtWhole(Math.round(stylist.avgPrice))}</span>
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="pt-2 pb-1 pl-6 space-y-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : stylists && stylists.length > 0 ? (
          <>
            {useScroll ? (
              <ScrollArea className="max-h-[280px]">
                {renderRows()}
              </ScrollArea>
            ) : (
              renderRows()
            )}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 pl-3"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                {showAll ? 'Show less' : `Show all ${stylists.length} stylists`}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">No stylist data available</p>
        )}
      </div>
    </motion.div>
  );
}

interface ServicePopularityChartProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext?: FilterContext;
}

/**
 * Resolve a category color to a solid hex for SVG gradients.
 */
function resolveCategoryHex(colorMap: Record<string, { bg: string; text: string; abbr: string }>, category: string | null): string {
  if (!category) return '#6b7280';
  const info = getCategoryColor(category, colorMap);
  if (isGradientMarker(info.bg)) {
    const grad = getGradientFromMarker(info.bg);
    if (grad) {
      const match = grad.background.match(/#[0-9a-fA-F]{6}/);
      return match ? match[0] : '#6b7280';
    }
    return '#6b7280';
  }
  return info.bg;
}

export function ServicePopularityChart({ dateFrom, dateTo, locationId, filterContext }: ServicePopularityChartProps) {
  const { data, isLoading } = useServicePopularity(dateFrom, dateTo, locationId);
  const { data: categoryData, isLoading: categoryLoading } = useRevenueByCategoryDrilldown({ dateFrom, dateTo, locationId });
  const { formatCurrencyWhole } = useFormatCurrency();
  const [viewMode, setViewMode] = useState<'service' | 'category'>('service');
  const [serviceSortBy, setServiceSortBy] = useState<'frequency' | 'revenue'>('revenue');
  const [categorySortBy, setCategorySortBy] = useState<'revenue' | 'frequency'>('revenue');
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { colorMap } = useServiceCategoryColorsMap();

  // --- Service view data ---
  const sortedServiceData = [...(data || [])].sort((a, b) => 
    serviceSortBy === 'frequency' ? b.frequency - a.frequency : b.totalRevenue - a.totalRevenue
  ).slice(0, 10);

  const totalServices = data?.reduce((sum, s) => sum + s.frequency, 0) || 0;
  const totalServiceRevenue = data?.reduce((sum, s) => sum + s.totalRevenue, 0) || 0;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    data?.forEach(svc => {
      const cat = svc.category || 'Other';
      map[cat] = (map[cat] || 0) + svc.totalRevenue;
    });
    return map;
  }, [data]);

  const avgPriceMap: Record<string, number> = {};
  data?.forEach(s => { avgPriceMap[s.name] = s.avgPrice; });

  const serviceColors = useMemo(() => {
    return sortedServiceData.map(svc => resolveCategoryHex(colorMap, svc.category));
  }, [sortedServiceData, colorMap]);

  const serviceGradientDefs = useMemo(() => {
    const unique = [...new Set(serviceColors)];
    return unique.map(hex => ({
      id: `glass-${hex.replace('#', '')}`,
      hex,
    }));
  }, [serviceColors]);

  // --- Category view data ---
  const sortedCategoryData = useMemo(() => {
    if (!categoryData) return [];
    return [...categoryData].sort((a, b) =>
      categorySortBy === 'revenue' ? b.revenue - a.revenue : b.count - a.count
    );
  }, [categoryData, categorySortBy]);

  const totalCategoryRevenue = categoryData?.reduce((s, c) => s + c.revenue, 0) || 0;
  const totalCategoryCount = categoryData?.reduce((s, c) => s + c.count, 0) || 0;
  const categoryCount = categoryData?.length || 0;

  const categoryColors = useMemo(() => {
    return sortedCategoryData.map(c => resolveCategoryHex(colorMap, c.category));
  }, [sortedCategoryData, colorMap]);

  const categoryGradientDefs = useMemo(() => {
    const unique = [...new Set(categoryColors)];
    return unique.map(hex => ({
      id: `cat-glass-${hex.replace('#', '')}`,
      hex,
    }));
  }, [categoryColors]);

  // --- Shared loading state ---
  const isAnyLoading = viewMode === 'service' ? isLoading : categoryLoading;

  if (isAnyLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // --- Service bar chart renderer ---
  const renderServiceBarChart = (dataKey: string, isRevenue: boolean) => {
    const total = isRevenue ? totalServiceRevenue : totalServices;
    return (
      <div className="h-[400px]">
        {sortedServiceData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No service data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedServiceData} layout="vertical" barSize={28}>
              <defs>
                {serviceGradientDefs.map(({ id, hex }) => (
                  <linearGradient key={id} id={id} x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor={hex} stopOpacity={0.75} />
                    <stop offset="40%" stopColor={hex} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={hex} stopOpacity={0.35} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
              <XAxis type="number" tickFormatter={isRevenue ? (v) => formatCurrencyWholeUtil(v) : undefined} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={200}
                tick={{ fontSize: 13 }}
                tickMargin={12}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.15)' }}
                formatter={(value: number, _name: string, props: any) => {
                  if (isRevenue) {
                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                    const svcName = props.payload?.name;
                    const avg = svcName ? avgPriceMap[svcName] : 0;
                    return [`${formatCurrencyWholeUtil(value)} · ${pct}% · avg ${formatCurrencyWholeUtil(Math.round(avg || 0))}`, svcName || 'Revenue'];
                  }
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                  return [`${value} bookings · ${pct}%`, props.payload?.name || 'Service'];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey={dataKey}
                radius={[0, 4, 4, 0]}
                shape={<AnimatedBar />}
                isAnimationActive={false}
              >
                {sortedServiceData.map((_, i) => {
                  const hex = serviceColors[i];
                  const gradId = `glass-${hex.replace('#', '')}`;
                  return (
                    <Cell
                      key={i}
                      fill={`url(#${gradId})`}
                      stroke={`${hex}50`}
                      strokeWidth={1}
                    />
                  );
                })}
                <LabelList
                  dataKey={dataKey}
                  position="insideRight"
                  content={({ x, y, width, height, value, index }: any) => {
                    const barW = width || 0;
                    const barH = height || 0;
                    const padY = 3;
                    const padX = 4;
                    const badgeH = barH - padY * 2;
                    const label = isRevenue ? formatCurrencyWholeUtil(Number(value)) : `${value}`;
                    const badgeW = Math.max(label.length * (isRevenue ? 6.5 : 7) + (isRevenue ? 14 : 12), isRevenue ? 50 : 36);
                    if (badgeW + padX * 2 > barW) return null;
                    const bx = (x || 0) + barW - badgeW - padX;
                    const by = (y || 0) + padY;
                    const delay = (index || 0) * 60 + 650;
                    return (
                      <g opacity={0} style={{ animation: `svgFadeIn 350ms ease-out ${delay}ms forwards` }}>
                        <rect
                          x={bx}
                          y={by}
                          width={badgeW}
                          height={badgeH}
                          rx={3}
                          fill="hsl(var(--background) / 0.8)"
                        />
                        <text
                          x={bx + badgeW / 2}
                          y={by + badgeH / 2 + 4}
                          textAnchor="middle"
                          style={{ fontSize: isRevenue ? 10 : 11, fontWeight: 500, fill: 'hsl(var(--foreground))' }}
                        >
                          {label}
                        </text>
                      </g>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  // --- Category bar chart renderer ---
  const renderCategoryBarChart = (dataKey: 'revenue' | 'count', isRevenue: boolean) => {
    const total = isRevenue ? totalCategoryRevenue : totalCategoryCount;
    return (
      <div className="h-[320px]">
        {sortedCategoryData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No category data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedCategoryData} layout="vertical" barSize={32}>
              <defs>
                {categoryGradientDefs.map(({ id, hex }) => (
                  <linearGradient key={id} id={id} x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor={hex} stopOpacity={0.75} />
                    <stop offset="40%" stopColor={hex} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={hex} stopOpacity={0.35} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
              <XAxis type="number" tickFormatter={isRevenue ? (v) => formatCurrencyWholeUtil(v) : undefined} />
              <YAxis
                type="category"
                dataKey="category"
                width={160}
                tick={{ fontSize: 13 }}
                tickMargin={12}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.15)' }}
                formatter={(value: number, _name: string, props: any) => {
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                  if (isRevenue) {
                    return [`${formatCurrencyWholeUtil(value)} · ${pct}%`, props.payload?.category || 'Revenue'];
                  }
                  return [`${value} bookings · ${pct}%`, props.payload?.category || 'Category'];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey={dataKey}
                radius={[0, 4, 4, 0]}
                shape={<AnimatedBar />}
                isAnimationActive={false}
              >
                {sortedCategoryData.map((_, i) => {
                  const hex = categoryColors[i];
                  const gradId = `cat-glass-${hex.replace('#', '')}`;
                  return (
                    <Cell
                      key={i}
                      fill={`url(#${gradId})`}
                      stroke={`${hex}50`}
                      strokeWidth={1}
                    />
                  );
                })}
                <LabelList
                  dataKey={dataKey}
                  position="insideRight"
                  content={({ x, y, width, height, value, index }: any) => {
                    const barW = width || 0;
                    const barH = height || 0;
                    const padY = 3;
                    const padX = 4;
                    const badgeH = barH - padY * 2;
                    const label = isRevenue ? formatCurrencyWholeUtil(Number(value)) : `${value}`;
                    const badgeW = Math.max(label.length * (isRevenue ? 6.5 : 7) + (isRevenue ? 14 : 12), isRevenue ? 50 : 36);
                    if (badgeW + padX * 2 > barW) return null;
                    const bx = (x || 0) + barW - badgeW - padX;
                    const by = (y || 0) + padY;
                    const delay = (index || 0) * 80 + 650;
                    return (
                      <g opacity={0} style={{ animation: `svgFadeIn 350ms ease-out ${delay}ms forwards` }}>
                        <rect
                          x={bx}
                          y={by}
                          width={badgeW}
                          height={badgeH}
                          rx={3}
                          fill="hsl(var(--background) / 0.8)"
                        />
                        <text
                          x={bx + badgeW / 2}
                          y={by + badgeH / 2 + 4}
                          textAnchor="middle"
                          style={{ fontSize: isRevenue ? 10 : 11, fontWeight: 500, fill: 'hsl(var(--foreground))' }}
                        >
                          {label}
                        </text>
                      </g>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  // Dynamic header content based on view mode
  const badgeCount = viewMode === 'service'
    ? `${totalServices} services`
    : `${categoryCount} categories`;
  const badgeRevenue = viewMode === 'service' ? totalServiceRevenue : totalCategoryRevenue;
  const description = viewMode === 'service'
    ? 'Top services ranked by demand and revenue'
    : 'Service categories ranked by dominance — click to drill down';
  const tooltipDescription = viewMode === 'service'
    ? 'Ranks services by revenue or appointment count. Use this to identify your highest-demand and highest-revenue services.'
    : 'Ranks service categories by revenue or booking count. Click any category to drill into stylist breakdown, client mix, and concentration risk.';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Scissors className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base tracking-wide">SERVICE POPULARITY</CardTitle>
                <MetricInfoTooltip description={tooltipDescription} />
              </div>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {filterContext && (
              <AnalyticsFilterBadge 
                locationId={filterContext.locationId} 
                dateRange={filterContext.dateRange} 
              />
            )}
            <Badge variant="outline">{badgeCount}</Badge>
            <Badge variant="secondary"><BlurredAmount>{formatCurrencyWhole(badgeRevenue)}</BlurredAmount></Badge>
            <FilterTabsList>
              <FilterTabsTrigger
                value="service"
                data-state={viewMode === 'service' ? 'active' : 'inactive'}
                onClick={() => setViewMode('service')}
                className="flex items-center gap-1"
              >
                <Scissors className="w-3 h-3" />
                By Service
              </FilterTabsTrigger>
              <FilterTabsTrigger
                value="category"
                data-state={viewMode === 'category' ? 'active' : 'inactive'}
                onClick={() => setViewMode('category')}
                className="flex items-center gap-1"
              >
                <Users className="w-3 h-3" />
                By Category
              </FilterTabsTrigger>
            </FilterTabsList>
          </div>
        </div>
      </CardHeader>
      <CardContent>

        {/* Service view */}
        {viewMode === 'service' && (
          <>
            <Tabs value={serviceSortBy} onValueChange={(v) => setServiceSortBy(v as 'frequency' | 'revenue')}>
              <FilterTabsList className="mb-4">
                <FilterTabsTrigger value="revenue" className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  By Revenue
                </FilterTabsTrigger>
                <FilterTabsTrigger value="frequency" className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  By Frequency
                </FilterTabsTrigger>
              </FilterTabsList>

              <TabsContent value="frequency" className="mt-0">
                {renderServiceBarChart('frequency', false)}
              </TabsContent>

              <TabsContent value="revenue" className="mt-0">
                {renderServiceBarChart('totalRevenue', true)}
              </TabsContent>
            </Tabs>

            <ServiceMixLegend byCategory={byCategory} />

            {/* Expandable service detail rows */}
            {sortedServiceData.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">
                  STYLIST BREAKDOWN
                </p>
                {sortedServiceData.slice(0, 5).map((svc, i) => (
                  <div key={svc.name}>
                    <button
                      onClick={() => setExpandedService(expandedService === svc.name ? null : svc.name)}
                      className="w-full flex items-center justify-between p-2.5 bg-muted/20 hover:bg-muted/30 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: serviceColors[i] || '#6b7280' }}
                        />
                        <span className="text-sm font-medium">{svc.name}</span>
                        {svc.category && (
                          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{svc.category}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{svc.frequency}× · {formatCurrencyWhole(svc.totalRevenue)} · avg {formatCurrencyWhole(Math.round(svc.avgPrice))}</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expandedService === svc.name ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedService === svc.name && (
                        <StylistBreakdownPanel
                          serviceName={svc.name}
                          dateFrom={dateFrom}
                          dateTo={dateTo}
                          locationId={locationId}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Category view */}
        {viewMode === 'category' && (
          <>
            <Tabs value={categorySortBy} onValueChange={(v) => setCategorySortBy(v as 'revenue' | 'frequency')}>
              <FilterTabsList className="mb-4">
                <FilterTabsTrigger value="revenue" className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  By Revenue
                </FilterTabsTrigger>
                <FilterTabsTrigger value="frequency" className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  By Frequency
                </FilterTabsTrigger>
              </FilterTabsList>

              <TabsContent value="revenue" className="mt-0">
                {renderCategoryBarChart('revenue', true)}
              </TabsContent>

              <TabsContent value="frequency" className="mt-0">
                {renderCategoryBarChart('count', false)}
              </TabsContent>
            </Tabs>

            {/* Category drill-down rows */}
            {sortedCategoryData.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">
                  CATEGORY DRILL-DOWN
                </p>
                {sortedCategoryData.map((cat, i) => {
                  const isExpanded = expandedCategory === cat.category;
                  const topStylist = cat.stylists[0];
                  const concentrationRisk = topStylist && cat.stylists.length > 1 && topStylist.sharePercent > 70;
                  const totalNewClients = cat.stylists.reduce((s, st) => s + st.newClients, 0);
                  const totalReturningClients = cat.stylists.reduce((s, st) => s + st.returningClients, 0);
                  const totalClients = totalNewClients + totalReturningClients;
                  const newPct = totalClients > 0 ? Math.round((totalNewClients / totalClients) * 100) : 0;

                  return (
                    <div key={cat.category}>
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                        className="w-full flex items-center justify-between p-2.5 bg-muted/20 hover:bg-muted/30 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: categoryColors[i] || '#6b7280' }}
                          />
                          <span className="text-sm font-medium">{cat.category}</span>
                          {concentrationRisk && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {cat.count}× · <BlurredAmount>{formatCurrencyWhole(cat.revenue)}</BlurredAmount> · {cat.sharePercent}%
                          </span>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 pb-1 pl-6 space-y-3">
                              {/* Client mix + concentration risk */}
                              <div className="flex gap-4 text-xs flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" /> New clients: <strong>{newPct}%</strong> ({totalNewClients})
                                </span>
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3" /> Returning: <strong>{100 - newPct}%</strong> ({totalReturningClients})
                                </span>
                                {concentrationRisk && (
                                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="w-3 h-3" />
                                    Concentration risk: {topStylist.staffName} = {topStylist.sharePercent}% of revenue
                                  </span>
                                )}
                              </div>

                              {/* Stylist breakdown */}
                              <div>
                                <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">STYLIST BREAKDOWN</p>
                                {cat.stylists.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-2">No stylist data</p>
                                ) : (
                                  <div className="space-y-0">
                                    {cat.stylists.slice(0, 5).map((stylist) => (
                                      <div
                                        key={stylist.phorestStaffId}
                                        className="flex items-center justify-between py-2 px-3 border-l-2 border-primary/20"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 bg-primary/10 flex items-center justify-center rounded-full">
                                            <User className="w-3 h-3 text-primary/50" />
                                          </div>
                                          <span className="text-sm text-muted-foreground">{stylist.staffName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <span className="text-muted-foreground/70 text-xs">
                                            {stylist.count}× · {stylist.sharePercent}%
                                          </span>
                                          <Badge variant="secondary" className="text-xs">
                                            <BlurredAmount>{formatCurrencyWhole(stylist.revenue)}</BlurredAmount>
                                          </Badge>
                                          <span className="text-xs text-muted-foreground/60">
                                            {stylist.newClients} new · {stylist.returningClients} ret
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                    {cat.stylists.length > 5 && (
                                      <p className="text-xs text-muted-foreground pl-3 py-1.5">
                                        +{cat.stylists.length - 5} more stylists
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
