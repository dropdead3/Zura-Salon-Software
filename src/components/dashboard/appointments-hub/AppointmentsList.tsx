import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarWidget } from '@/components/ui/calendar';
import { tokens } from '@/lib/design-tokens';
import { APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Download, Calendar, History, Sun, ArrowRight, CalendarRange, List } from 'lucide-react';
import { useAppointmentsHub, type HubFilters } from '@/hooks/useAppointmentsHub';
import { HubSearchBar } from './HubSearchBar';
import { AppointmentDetailDrawer } from './AppointmentDetailDrawer';
import { AppointmentBatchBar } from './AppointmentBatchBar';
import { useLocations } from '@/hooks/useLocations';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatDisplayName } from '@/lib/utils';
import { TogglePill } from '@/components/ui/toggle-pill';

interface AppointmentsListProps {
  search: string;
  onSearchChange: (value: string) => void;
  enabled?: boolean;
}

type TimePeriod = 'all' | 'past' | 'today' | 'future' | 'custom';

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MM/dd/yyyy');
  } catch {
    return '—';
  }
}

function formatCreatedAt(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MM/dd/yyyy h:mm a');
  } catch {
    return '—';
  }
}

function getDateRange(period: TimePeriod, customRange?: { from?: Date; to?: Date }): { startDate?: string; endDate?: string } {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (period) {
    case 'all':
      return {};
    case 'past':
      return { endDate: fmt(subDays(now, 1)) };
    case 'today':
      return { startDate: fmt(now), endDate: fmt(now) };
    case 'future':
      return { startDate: fmt(addDays(now, 1)) };
    case 'custom':
      return {
        startDate: customRange?.from ? fmt(customRange.from) : undefined,
        endDate: customRange?.to ? fmt(customRange.to) : undefined,
      };
  }
}

const TIME_PERIOD_OPTIONS = [
  { value: 'all', label: 'All', icon: <List className="w-3.5 h-3.5" />, tooltip: 'All Appointments\nNo date filter' },
  { value: 'past', label: 'Past', icon: <History className="w-3.5 h-3.5" />, tooltip: 'Past Appointments\nBefore today' },
  { value: 'today', label: 'Today', icon: <Sun className="w-3.5 h-3.5" />, tooltip: "Today's Appointments" },
  { value: 'future', label: 'Future', icon: <ArrowRight className="w-3.5 h-3.5" />, tooltip: 'Future Appointments\nAfter today' },
  { value: 'custom', label: 'Range', icon: <CalendarRange className="w-3.5 h-3.5" />, tooltip: 'Custom Date Range' },
];

export function AppointmentsList({ search, onSearchChange, enabled = true }: AppointmentsListProps) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [stylistId, setStylistId] = useState('all');
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [rangePopoverOpen, setRangePopoverOpen] = useState(false);

  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations();
  const { data: teamMembers = [] } = useTeamDirectory(undefined, { organizationId: effectiveOrganization?.id || undefined });

  const dateRange = getDateRange(timePeriod, customRange);

  const filters: HubFilters = {
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    locationId: locationId !== 'all' ? locationId : undefined,
    stylistUserId: stylistId !== 'all' ? stylistId : undefined,
    ...dateRange,
    page,
    pageSize: 50,
  };

  const { data, isLoading } = useAppointmentsHub(filters, { enabled });
  const appointments = data?.appointments || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 50);

  // Clear selection when filters/page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, status, locationId, stylistId, timePeriod, search]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === appointments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(appointments.map((a: any) => a.id)));
    }
  }, [appointments, selectedIds.size]);

  const selectedAppointments = appointments.filter((a: any) => selectedIds.has(a.id));

  // Stylists for the filter dropdown
  const stylistOptions = teamMembers
    .filter((m: any) => m.user_id)
    .map((m: any) => ({
      id: m.user_id,
      name: formatDisplayName(m.full_name, m.display_name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filterDescription = useMemo(() => {
    // Time period
    let timePart = '';
    switch (timePeriod) {
      case 'all': timePart = 'all'; break;
      case 'past': timePart = 'past'; break;
      case 'today': timePart = "today's"; break;
      case 'future': timePart = 'future'; break;
      case 'custom':
        if (customRange.from) {
          const from = format(customRange.from, 'MMM d');
          const to = customRange.to ? format(customRange.to, 'MMM d') : '';
          timePart = to ? `from ${from} – ${to}` : `from ${from}`;
        } else {
          timePart = 'all';
        }
        break;
    }

    // Status
    const statusPart = status !== 'all' ? status.replace('_', ' ') : '';

    // Build "Showing X [time] [status] appointments"
    const countStr = totalCount > 0 ? `${totalCount} ` : '';
    const timeBefore = timePeriod === 'custom' ? '' : `${timePart} `;
    const statusStr = statusPart ? `${statusPart} ` : '';
    let desc = `Showing ${countStr}${timeBefore}${statusStr}appointments`;
    if (timePeriod === 'custom' && timePart !== 'all') {
      desc += ` ${timePart}`;
    }

    // Location
    if (locationId !== 'all') {
      const loc = locations.find(l => l.id === locationId);
      if (loc) desc += ` at ${loc.name}`;
    }

    // Stylist
    if (stylistId !== 'all') {
      const sty = stylistOptions.find(s => s.id === stylistId);
      if (sty) desc += ` for ${sty.name}`;
    }

    // Search
    if (search) {
      desc += ` matching "${search}"`;
    }

    // Sort
    desc += ', sorted by date (newest first)';

    return desc;
  }, [timePeriod, customRange, status, locationId, stylistId, search, totalCount, locations, stylistOptions]);

  const handleExportCSV = () => {
    if (appointments.length === 0) return;
    const headers = ['Date', 'Time', 'Client', 'Phone', 'Email', 'Service', 'Stylist', 'Status', 'Price', 'Total Paid'];
    const rows = appointments.map((a: any) => [
      formatDateDisplay(a.appointment_date),
      `${a.start_time}-${a.end_time}`,
      a.client_name || '',
      a.client_phone || '',
      a.client_email || '',
      a.service_name || '',
      a.stylist_name || '',
      a.status || '',
      a.total_price ?? '',
      a.total_paid ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTimePeriodChange = (v: string) => {
    const period = v as TimePeriod;
    setTimePeriod(period);
    setPage(0);
    if (period === 'custom') {
      setRangePopoverOpen(true);
    }
  };

  const COL_COUNT = 12;

  const allSelected = appointments.length > 0 && selectedIds.size === appointments.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < appointments.length;

  return (
    <div className="space-y-4">
      {/* Row 1: Search + Time Period Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="w-full sm:flex-1 sm:min-w-0 sm:max-w-[640px]">
          <HubSearchBar value={search} onChange={onSearchChange} />
        </div>

        <div className="w-full sm:w-auto overflow-x-auto scrollbar-hide flex items-center gap-2">
          <TogglePill
            options={TIME_PERIOD_OPTIONS}
            value={timePeriod}
            onChange={handleTimePeriodChange}
            size="sm"
            variant="solid"
          />

          {/* Date Range Popover (shown when custom is selected) */}
          {timePeriod === 'custom' && (
            <Popover open={rangePopoverOpen} onOpenChange={setRangePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size={tokens.button.card} className="gap-2 text-xs">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {customRange.from
                    ? `${format(customRange.from, 'MMM d')}${customRange.to ? ` – ${format(customRange.to, 'MMM d')}` : ''}`
                    : 'Pick dates'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" side="bottom">
                <CalendarWidget
                  mode="range"
                  selected={customRange.from ? customRange as { from: Date; to?: Date } : undefined}
                  onSelect={(range: any) => {
                    setCustomRange(range || {});
                    if (range?.to) setRangePopoverOpen(false);
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {/* Filters + CSV */}
        <div className="flex flex-wrap gap-3 items-center p-4 pb-2">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className={cn("w-auto", tokens.input.filter)}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>

          <Select value={locationId} onValueChange={(v) => { setLocationId(v); setPage(0); }}>
            <SelectTrigger className={cn("w-auto", tokens.input.filter)}>
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stylistId} onValueChange={(v) => { setStylistId(v); setPage(0); }}>
            <SelectTrigger className={cn("w-auto", tokens.input.filter)}>
              <SelectValue placeholder="Stylist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stylists</SelectItem>
              {stylistOptions.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size={tokens.button.card} onClick={handleExportCSV} disabled={appointments.length === 0} className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>

        {/* Filter Description */}
        <p className="text-sm text-muted-foreground font-sans px-4 pb-3">
          {filterDescription}
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] pr-0">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = someSelected;
                    }}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {someSelected ? `${selectedIds.size} selected` : 'All'}
                  </span>
                </label>
              </TableHead>
              <TableHead className={tokens.table.columnHeader}>Date</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden md:table-cell')}>Time</TableHead>
              <TableHead className={tokens.table.columnHeader}>Client</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden xl:table-cell')}>Phone</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden 2xl:table-cell')}>Email</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden xl:table-cell')}>Service</TableHead>
              <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'whitespace-nowrap')}>Status</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden lg:table-cell')}>Price</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden lg:table-cell')}>Total Paid</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell className="w-10 pr-0"><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                   <TableCell className="w-8" />
                </TableRow>
              ))
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COL_COUNT}>
                  <div className={tokens.empty.container}>
                    <Calendar className={tokens.empty.icon} />
                    <p className={tokens.empty.description}>No appointments found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appt: any) => {
                const statusBadge = APPOINTMENT_STATUS_BADGE[appt.status as keyof typeof APPOINTMENT_STATUS_BADGE] || APPOINTMENT_STATUS_BADGE.booked;
                const isSelected = selectedIds.has(appt.id);
                return (
                  <TableRow
                    key={appt.id}
                    className={cn('cursor-pointer group hover:bg-muted/40 transition-colors', isSelected && 'bg-muted/50')}
                    onClick={() => setSelectedAppt(appt)}
                  >
                    <TableCell className="w-10 pr-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(appt.id)}
                        aria-label={`Select ${appt.client_name || 'appointment'}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatDateDisplay(appt.appointment_date)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap hidden md:table-cell">{formatTime12h(appt.start_time)}</TableCell>
                    <TableCell className="text-sm font-medium">{appt.client_name || 'Walk-in'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">{appt.client_phone || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate hidden 2xl:table-cell">
                      {appt.client_email ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block">{appt.client_email}</span>
                          </TooltipTrigger>
                          <TooltipContent>{appt.client_email}</TooltipContent>
                        </Tooltip>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px] hidden xl:table-cell">{appt.service_name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{appt.stylist_name || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn('text-[10px]', statusBadge.bg, statusBadge.text, statusBadge.border)}>
                          {statusBadge.label}
                        </Badge>
                        {appt.has_transaction && appt.status !== 'completed' && appt.status !== 'cancelled' && appt.status !== 'no_show' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                Paid
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Transaction found in POS — this appointment was likely completed</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-right hidden lg:table-cell whitespace-nowrap">
                      {appt.total_price != null ? (
                        <BlurredAmount>${appt.total_price}</BlurredAmount>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-right hidden lg:table-cell whitespace-nowrap">
                      {appt.total_paid != null ? (
                        <BlurredAmount>${appt.total_paid.toFixed(2)}</BlurredAmount>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="w-8 pr-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {totalCount} total · Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Batch Action Bar */}
        <AppointmentBatchBar
          selectedAppointments={selectedAppointments}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      </Card>

      {/* Detail Drawer */}
      <AppointmentDetailDrawer
        appointment={selectedAppt}
        open={!!selectedAppt}
        onOpenChange={(open) => { if (!open) setSelectedAppt(null); }}
      />
    </div>
  );
}
