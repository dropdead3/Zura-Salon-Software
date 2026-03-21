import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GitCompare, Lightbulb } from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useLocations } from '@/hooks/useLocations';
import { useComparisonData, getPresetPeriods, type CompareMode } from '@/hooks/useComparisonData';
import { CompareTypeSelector } from './CompareTypeSelector';
import { PeriodSelector } from './PeriodSelector';
import { ComparisonResultsGrid } from './ComparisonResultsGrid';
import { ComparisonChart } from './ComparisonChart';
import { ComparisonBreakdownTable } from './ComparisonBreakdownTable';
import { LocationComparisonView } from './LocationComparisonView';
import { CategoryComparisonTable } from './CategoryComparisonTable';
import { WaterfallChart } from '@/components/dashboard/analytics/charts/WaterfallChart';
import { DailyOverlayChart } from './DailyOverlayChart';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';

const COMPARE_MODE_KEY = 'zura-compare-mode';

interface CompareTabContentProps {
  filters: {
    dateFrom: string;
    dateTo: string;
    locationId: string;
    dateRange: string;
  };
  filterContext?: FilterContext;
}

export function CompareTabContent({ filters, filterContext }: CompareTabContentProps) {
  const { formatDate } = useFormatDate();
  const { data: locations } = useLocations();
  
  // Persisted state
  const [mode, setMode] = useState<CompareMode>(() => {
    try { return (localStorage.getItem(COMPARE_MODE_KEY) as CompareMode) || 'time'; } catch { return 'time'; }
  });
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  
  // Period state
  const defaultPeriods = getPresetPeriods('thisMonth-lastMonth');
  const [periodA, setPeriodA] = useState(defaultPeriods.periodA);
  const [periodB, setPeriodB] = useState(defaultPeriods.periodB);

  // Persist mode
  useEffect(() => {
    try { localStorage.setItem(COMPARE_MODE_KEY, mode); } catch {}
  }, [mode]);

  // Update periods when mode changes to YoY
  useEffect(() => {
    if (mode === 'yoy') {
      const yoyPeriods = getPresetPeriods('thisYear-lastYear');
      setPeriodA(yoyPeriods.periodA);
      setPeriodB(yoyPeriods.periodB);
    }
  }, [mode]);

  // Initialize selected locations
  useEffect(() => {
    if (locations && locations.length > 0 && selectedLocationIds.length === 0) {
      setSelectedLocationIds(locations.slice(0, 2).map(l => l.id));
    }
  }, [locations]);

  // Get comparison data
  const { data, isLoading } = useComparisonData({
    mode,
    periodA,
    periodB,
    locationIds: mode === 'location' ? selectedLocationIds : (filters.locationId !== 'all' ? [filters.locationId] : undefined),
  });

  const handlePeriodsChange = (newPeriodA: typeof periodA, newPeriodB: typeof periodB) => {
    setPeriodA(newPeriodA);
    setPeriodB(newPeriodB);
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds(prev => 
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  // Generate period labels
  const periodALabel = `${formatDate(new Date(periodA.dateFrom), 'MMM d')} – ${formatDate(new Date(periodA.dateTo), 'MMM d, yyyy')}`;
  const periodBLabel = `${formatDate(new Date(periodB.dateFrom), 'MMM d')} – ${formatDate(new Date(periodB.dateTo), 'MMM d, yyyy')}`;

  // Generate insight text
  const insight = useMemo(() => {
    if (!data) return null;
    const revChange = data.changes.totalRevenue;
    const svcChange = data.changes.serviceRevenue;
    const prdChange = data.changes.productRevenue;
    const txnChange = data.changes.totalTransactions;

    const parts: string[] = [];

    // Main revenue direction
    if (Math.abs(revChange) < 0.5) {
      parts.push('Revenue is flat between periods');
    } else {
      parts.push(`Revenue ${revChange > 0 ? 'grew' : 'declined'} ${Math.abs(revChange).toFixed(1)}%`);
    }

    // What drove it
    if (Math.abs(svcChange) > Math.abs(prdChange) && Math.abs(svcChange) > 1) {
      parts.push(`services ${svcChange > 0 ? 'led the gain' : 'drove the decline'} (${svcChange > 0 ? '+' : ''}${svcChange.toFixed(1)}%)`);
    } else if (Math.abs(prdChange) > 1) {
      parts.push(`products ${prdChange > 0 ? 'led the gain' : 'drove the decline'} (${prdChange > 0 ? '+' : ''}${prdChange.toFixed(1)}%)`);
    }

    // Transactions
    if (Math.abs(txnChange) > 2) {
      parts.push(`transactions ${txnChange > 0 ? 'up' : 'down'} ${Math.abs(txnChange).toFixed(1)}%`);
    }

    return parts.join(' · ');
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <GitCompare className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="font-display text-base tracking-wide">COMPARISON BUILDER</CardTitle>
            </div>
            {filterContext && (
              <AnalyticsFilterBadge 
                locationId={filterContext.locationId} 
                dateRange={filterContext.dateRange} 
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mode Selector */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Compare by:</p>
            <CompareTypeSelector value={mode} onChange={setMode} />
          </div>

          {/* Location Selector (only in location mode) */}
          {mode === 'location' && locations && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Select locations to compare:</p>
              <div className="flex flex-wrap gap-3">
                {locations.map(location => (
                  <div key={location.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={location.id}
                      checked={selectedLocationIds.includes(location.id)}
                      onCheckedChange={() => toggleLocation(location.id)}
                    />
                    <Label htmlFor={location.id} className="text-sm cursor-pointer">
                      {location.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Period Selector */}
          <PeriodSelector
            periodA={periodA}
            periodB={periodB}
            onPeriodsChange={handlePeriodsChange}
            mode={mode}
          />
        </CardContent>
      </Card>

      {/* Insight Banner */}
      {insight && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
          <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">{insight}</p>
        </div>
      )}

      {/* Results Section - Based on Mode */}
      {mode === 'location' ? (
        <LocationComparisonView 
          locations={data?.locationBreakdown} 
          isLoading={isLoading} 
        />
      ) : mode === 'category' ? (
        <>
          <ComparisonResultsGrid
            data={data}
            isLoading={isLoading}
            periodALabel={periodALabel}
            periodBLabel={periodBLabel}
          />
          <CategoryComparisonTable 
            categories={data?.categoryBreakdown}
            isLoading={isLoading}
            periodALabel={periodALabel}
            periodBLabel={periodBLabel}
          />
        </>
      ) : (
        <>
          {/* Results Grid with real date labels */}
          <ComparisonResultsGrid
            data={data}
            isLoading={isLoading}
            periodALabel={periodALabel}
            periodBLabel={periodBLabel}
          />

          {/* Daily Overlay Chart */}
          {data?.dailyOverlay && data.dailyOverlay.length > 1 && (
            <DailyOverlayChart
              data={data.dailyOverlay}
              isLoading={isLoading}
              periodALabel={periodALabel}
              periodBLabel={periodBLabel}
            />
          )}

          {/* Waterfall Chart */}
          {data?.waterfall && data.waterfall.length > 0 && (
            <WaterfallChart
              data={data.waterfall}
              startValue={data.periodB.totalRevenue}
              endValue={data.periodA.totalRevenue}
              periodALabel={periodBLabel}
              periodBLabel={periodALabel}
              isLoading={isLoading}
              title="Revenue Change Breakdown"
            />
          )}

          {/* Chart and Table */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ComparisonChart 
              data={data} 
              isLoading={isLoading}
              periodALabel={periodALabel}
              periodBLabel={periodBLabel}
            />
            <ComparisonBreakdownTable 
              data={data} 
              isLoading={isLoading}
              periodALabel={periodALabel}
              periodBLabel={periodBLabel}
            />
          </div>
        </>
      )}
    </div>
  );
}
