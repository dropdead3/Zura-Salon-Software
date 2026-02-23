import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { tokens } from '@/lib/design-tokens';
import { APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Download, Calendar, History, Sun, ArrowRight } from 'lucide-react';
import { useAppointmentsHub, type HubFilters } from '@/hooks/useAppointmentsHub';
import { HubSearchBar } from './HubSearchBar';
import { AppointmentDetailDrawer } from './AppointmentDetailDrawer';
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
}

type TimePeriod = 'past' | 'today' | 'future';

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

function getDateRange(period: TimePeriod): { startDate?: string; endDate?: string } {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (period) {
    case 'past':
      return { endDate: fmt(subDays(now, 1)) };
    case 'today':
      return { startDate: fmt(now), endDate: fmt(now) };
    case 'future':
      return { startDate: fmt(addDays(now, 1)) };
  }
}

const TIME_PERIOD_OPTIONS = [
  { value: 'past', label: 'Past', icon: <History className="w-3.5 h-3.5" />, tooltip: 'Past Appointments\nBefore today' },
  { value: 'today', label: 'Today', icon: <Sun className="w-3.5 h-3.5" />, tooltip: "Today's Appointments" },
  { value: 'future', label: 'Future', icon: <ArrowRight className="w-3.5 h-3.5" />, tooltip: 'Future Appointments\nAfter today' },
];

export function AppointmentsList({ search, onSearchChange }: AppointmentsListProps) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [stylistId, setStylistId] = useState('all');
  const [selectedAppt, setSelectedAppt] = useState<any>(null);

  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations();
  const { data: teamMembers = [] } = useTeamDirectory(undefined, { organizationId: effectiveOrganization?.id || undefined });

  const dateRange = getDateRange(timePeriod);

  const filters: HubFilters = {
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    locationId: locationId !== 'all' ? locationId : undefined,
    stylistUserId: stylistId !== 'all' ? stylistId : undefined,
    ...dateRange,
    page,
    pageSize: 50,
  };

  const { data, isLoading } = useAppointmentsHub(filters);
  const appointments = data?.appointments || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 50);

  const handleExportCSV = () => {
    if (appointments.length === 0) return;
    const headers = ['Date', 'Time', 'Client', 'Phone', 'Email', 'Service', 'Stylist', 'Status', 'Price', 'Created', 'Created By'];
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
      formatCreatedAt(a.created_at),
      a.created_by_name || '',
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

  // Stylists for the filter dropdown
  const stylistOptions = teamMembers
    .filter((m: any) => m.user_id)
    .map((m: any) => ({
      id: m.user_id,
      name: formatDisplayName(m.full_name, m.display_name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const COL_COUNT = 11;

  return (
    <div className="space-y-4">
      {/* Row 1: Search + Time Period Toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-0 max-w-[640px]">
          <HubSearchBar value={search} onChange={onSearchChange} />
        </div>

        <TogglePill
          options={TIME_PERIOD_OPTIONS}
          value={timePeriod}
          onChange={(v) => { setTimePeriod(v as TimePeriod); setPage(0); }}
          size="sm"
          variant="solid"
        />
      </div>

      {/* Row 2: Filters + CSV */}
      <div className="flex flex-wrap gap-3 items-center">
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

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={tokens.table.columnHeader}>Date</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden sm:table-cell')}>Time</TableHead>
              <TableHead className={tokens.table.columnHeader}>Client</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Phone</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden xl:table-cell')}>Email</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Service</TableHead>
              <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden md:table-cell whitespace-nowrap')}>Status</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden md:table-cell')}>Price</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden xl:table-cell')}>Created</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'hidden 2xl:table-cell')}>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
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
                return (
                  <TableRow
                    key={appt.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedAppt(appt)}
                  >
                    <TableCell className="text-sm whitespace-nowrap">{formatDateDisplay(appt.appointment_date)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap hidden sm:table-cell">{formatTime12h(appt.start_time)}</TableCell>
                    <TableCell className="text-sm font-medium">{appt.client_name || 'Walk-in'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{appt.client_phone || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate hidden xl:table-cell">
                      {appt.client_email ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block">{appt.client_email}</span>
                          </TooltipTrigger>
                          <TooltipContent>{appt.client_email}</TooltipContent>
                        </Tooltip>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px] hidden lg:table-cell">{appt.service_name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{appt.stylist_name || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap">
                      <Badge variant="outline" className={cn('text-[10px]', statusBadge.bg, statusBadge.text, statusBadge.border)}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right hidden md:table-cell whitespace-nowrap">
                      {appt.total_price != null ? (
                        <BlurredAmount>${appt.total_price}</BlurredAmount>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap hidden xl:table-cell">
                      {formatCreatedAt(appt.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden 2xl:table-cell">{appt.created_by_name || '—'}</TableCell>
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
