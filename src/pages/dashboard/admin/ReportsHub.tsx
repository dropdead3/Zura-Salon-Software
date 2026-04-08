import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Building2 } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { ReportsTabContent } from '@/components/dashboard/analytics/ReportsTabContent';
import type { AnalyticsFilters, DateRangeType } from '@/pages/dashboard/admin/AnalyticsHub';

export default function ReportsHub() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [datePreset, setDatePreset] = useState<DateRangeType>('thisMonth');
  const [locationId, setLocationId] = useState<string>('all');
  const { data: locations } = useLocations();

  const filters: AnalyticsFilters = {
    locationId,
    dateRange: datePreset,
    dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
    dateTo: format(dateRange.to, 'yyyy-MM-dd'),
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <DashboardPageHeader
          title="Report Generator"
          description="Generate, schedule, and export business reports"
          backTo="/dashboard/admin/analytics"
          backLabel="Back to Analytics Hub"
          actions={
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size={tokens.button.card} className="min-w-[200px] justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 space-y-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size={tokens.button.inline} onClick={() => { setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }); setDatePreset('thisMonth'); }}>This Month</Button>
                      <Button variant="outline" size={tokens.button.inline} onClick={() => { setDateRange({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }); setDatePreset('lastMonth'); }}>Last Month</Button>
                    </div>
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => { if (range?.from && range?.to) { setDateRange({ from: range.from, to: range.to }); setDatePreset('custom'); } }}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
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
      </div>
    </DashboardLayout>
  );
}
