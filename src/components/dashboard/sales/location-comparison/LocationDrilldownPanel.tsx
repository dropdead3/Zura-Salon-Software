import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useServiceProductDrilldown } from '@/hooks/useServiceProductDrilldown';
import { useCapacityReport } from '@/hooks/useCapacityReport';
import { useSalesComparison } from '@/hooks/useSalesComparison';
import { useRetailAttachmentRate } from '@/hooks/useRetailAttachmentRate';
import { TrendingUp, TrendingDown, Clock, Users, Minus, Zap, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface LocationDrilldownPanelProps {
  locationId: string;
  dateFrom: string;
  dateTo: string;
  serviceRevenue: number;
  productRevenue: number;
  isOpen: boolean;
}

function useLocationTeamSize(locationId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['location-team-size', locationId],
    queryFn: async () => {
      // Service providers: commission + independent stylists at this location
      // Check both location_ids array and legacy location_id field
      const { data: byArray } = await supabase
        .from('employee_profiles')
        .select('user_id')
        .eq('is_active', true)
        .in('stylist_type', ['commission', 'independent'])
        .contains('location_ids', [locationId]);

      const { data: byLegacy } = await supabase
        .from('employee_profiles')
        .select('user_id')
        .eq('is_active', true)
        .in('stylist_type', ['commission', 'independent'])
        .eq('location_id', locationId);

      // Deduplicate by user_id
      const allIds = new Set<string>();
      byArray?.forEach(r => allIds.add(r.user_id));
      byLegacy?.forEach(r => allIds.add(r.user_id));
      return allIds.size;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function LocationDrilldownPanel({
  locationId,
  dateFrom,
  dateTo,
  serviceRevenue,
  productRevenue,
  isOpen,
}: LocationDrilldownPanelProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { data: drilldown, isLoading: drilldownLoading } = useServiceProductDrilldown({
    dateFrom,
    dateTo,
    locationId,
  });

  const { data: capacity, isLoading: capacityLoading } = useCapacityReport(
    dateFrom,
    dateTo,
    locationId,
  );

  const { data: comparison, isLoading: comparisonLoading } = useSalesComparison(
    dateFrom,
    dateTo,
    locationId,
  );

  const { data: teamSize, isLoading: teamLoading } = useLocationTeamSize(locationId, isOpen);

  const { data: attachmentData, isLoading: attachmentLoading } = useRetailAttachmentRate({
    dateFrom,
    dateTo,
    locationId,
  });

  const totalSplit = serviceRevenue + productRevenue;
  const servicePct = totalSplit > 0 ? (serviceRevenue / totalSplit) * 100 : 0;
  const productPct = totalSplit > 0 ? (productRevenue / totalSplit) * 100 : 0;

  const topStylists = useMemo(() => {
    if (!drilldown?.staffData) return [];
    return [...drilldown.staffData]
      .sort((a, b) => b.serviceRevenue - a.serviceRevenue)
      .slice(0, 3);
  }, [drilldown]);

  const revenueChange = comparison?.percentChange?.totalRevenue;

  const revenuePerProvider = useMemo(() => {
    if (!teamSize || teamSize === 0) return 0;
    return Math.round((serviceRevenue + productRevenue) / teamSize);
  }, [teamSize, serviceRevenue, productRevenue]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pt-4 pb-2 space-y-4">
            {/* Revenue Breakdown */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-medium">
                  Revenue Split
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex bg-muted/50">
                <motion.div
                  className="h-full bg-primary/70 rounded-l-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${servicePct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
                <motion.div
                  className="h-full bg-accent/70 rounded-r-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${productPct}%` }}
                  transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                <span>Services <BlurredAmount>{formatCurrencyWhole(Math.round(serviceRevenue))}</BlurredAmount> ({Math.round(servicePct)}%)</span>
                <span>Products <BlurredAmount>{formatCurrencyWhole(Math.round(productRevenue))}</BlurredAmount> ({Math.round(productPct)}%)</span>
              </div>
            </div>

            {/* Top 3 Stylists */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-medium">
                  Top Stylists
                </span>
              </div>
              {drilldownLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                </div>
              ) : topStylists.length > 0 ? (
                <div className="space-y-1.5">
                  {topStylists.map((stylist, i) => (
                    <motion.div
                      key={stylist.phorestStaffId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                      <ZuraAvatar size="sm" />
                      <span className="text-sm font-medium flex-1 truncate">{stylist.staffName}</span>
                      <span className="text-sm font-display tabular-nums">
                        <BlurredAmount>{formatCurrencyWhole(Math.round(stylist.serviceRevenue))}</BlurredAmount>
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground px-2">No stylist data available</p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Team Size */}
              <div className="p-3 rounded-lg border border-border/30 bg-card-inner">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Team Size</span>
                </div>
                {teamLoading ? (
                  <Skeleton className="h-6 w-10 rounded" />
                ) : (
                  <p className="text-lg font-display">{teamSize ?? 0}</p>
                )}
              </div>

              {/* Rev / Provider */}
              <div className="p-3 rounded-lg border border-border/30 bg-card-inner">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Rev / Provider</span>
                </div>
                {teamLoading ? (
                  <Skeleton className="h-6 w-16 rounded" />
                ) : (
                  <p className="text-lg font-display tabular-nums">
                    <BlurredAmount>{formatCurrencyWhole(revenuePerProvider)}</BlurredAmount>
                  </p>
                )}
              </div>

              {/* Peak Hour */}
              <div className="p-3 rounded-lg border border-border/30 bg-card-inner">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Peak Hour</span>
                </div>
                {capacityLoading ? (
                  <Skeleton className="h-6 w-16 rounded" />
                ) : (
                  <p className="text-lg font-display">{capacity?.peakHour || 'N/A'}</p>
                )}
              </div>

              {/* Period Comparison */}
              <div className="p-3 rounded-lg border border-border/30 bg-card-inner">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">vs Prior Period</span>
                </div>
                {comparisonLoading ? (
                  <Skeleton className="h-6 w-16 rounded" />
                ) : revenueChange !== undefined ? (
                  <div className="flex items-center gap-1.5">
                    {revenueChange > 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ) : revenueChange < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={cn(
                      'text-lg font-display',
                      revenueChange > 0 && 'text-emerald-500',
                      revenueChange < 0 && 'text-red-400',
                    )}>
                      {revenueChange > 0 ? '+' : ''}{Math.round(revenueChange)}%
                    </span>
                  </div>
                ) : (
                  <p className="text-lg font-display text-muted-foreground">—</p>
                )}
              </div>

              {/* Retail Attach Rate */}
              <div className="p-3 rounded-lg border border-border/30 bg-card-inner">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Attach Rate</span>
                </div>
                {attachmentLoading ? (
                  <Skeleton className="h-6 w-12 rounded" />
                ) : attachmentData ? (
                  <p className="text-lg font-display tabular-nums">{attachmentData.attachmentRate}%</p>
                ) : (
                  <p className="text-lg font-display text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
