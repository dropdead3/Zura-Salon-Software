import { useState } from 'react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { tokens } from '@/lib/design-tokens';
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfWeek, startOfYear, min } from 'date-fns';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Building2, Package } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { ReportsTabContent } from '@/components/dashboard/analytics/ReportsTabContent';
import { BatchReportDialog } from '@/components/dashboard/reports/batch/BatchReportDialog';
import type { AnalyticsFilters, DateRangeType } from '@/pages/dashboard/admin/AnalyticsHub';

const PRESETS: { key: DateRangeType; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '90d', label: 'Last 90 Days' },
  { key: 'thisWeek', label: 'Week to Date' },
  { key: 'thisMonth', label: 'Month to Date' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'ytd', label: 'Year to Date' },
  { key: 'custom', label: 'Custom Range' },
];

function computeRange(key: DateRangeType): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const y = subDays(today, 1);
      return { from: y, to: y };
    }
    case '7d':
      return { from: subDays(today, 6), to: today };
    case '30d':
      return { from: subDays(today, 29), to: today };
    case '90d':
      return { from: subDays(today, 89), to: today };
    case 'thisWeek':
      return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
    case 'thisMonth':
      return { from: startOfMonth(today), to: today };
    case 'lastMonth': {
      const prev = subMonths(today, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case 'ytd':
      return { from: startOfYear(today), to: today };
    default:
      return { from: startOfMonth(today), to: today };
  }
}

export default function ReportsHub() {
  const { dashPath } = useOrgDashboardPath();
  const today = new Date();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(today),
    to: min([endOfMonth(today), today]),
  });
  const [datePreset, setDatePreset] = useState<DateRangeType>('thisMonth');
  const [locationId, setLocationId] = useState<string>('all');
  const [batchOpen, setBatchOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { data: locations } = useLocations();

  const filters: AnalyticsFilters = {
    locationId,
    dateRange: datePreset,
    dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
    dateTo: format(dateRange.to, 'yyyy-MM-dd'),
  };

  const handlePresetClick = (key: DateRangeType) => {
    setDatePreset(key);
    if (key !== 'custom') {
      setDateRange(computeRange(key));
      setPopoverOpen(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <DashboardPageHeader
          title="Report Generator"
          description="Generate, schedule, and export business reports"
          backTo={dashPath('/admin/analytics')}
          backLabel="Back to Analytics Hub"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size={tokens.button.card} onClick={() => setBatchOpen(true)}>
                <Package className="w-4 h-4 mr-2" />
                Report Pack
              </Button>

              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size={tokens.button.card} className="min-w-[200px] justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dateRange.from, 'MMM d')} – {format(dateRange.to, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex">
                    <div className="w-[160px] border-r border-border p-2 space-y-0.5">
                      {PRESETS.map((p) => (
                        <button
                          key={p.key}
                          onClick={() => handlePresetClick(p.key)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-sans transition-colors ${
                            datePreset === p.key
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="p-3">
                      <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            setDateRange({ from: range.from, to: range.to });
                            setDatePreset('custom');
                          }
                        }}
                        toDate={new Date()}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        <ReportsTabContent filters={filters} isStandalone />

        <BatchReportDialog
          open={batchOpen}
          onOpenChange={setBatchOpen}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          locationId={filters.locationId === 'all' ? undefined : filters.locationId}
        />
      </div>
    </DashboardLayout>
  );
}