import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tokens } from '@/lib/design-tokens';
import { APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Download, Calendar } from 'lucide-react';
import { useAppointmentsHub, type HubFilters } from '@/hooks/useAppointmentsHub';
import { AppointmentDetailDrawer } from './AppointmentDetailDrawer';
import { useLocations } from '@/hooks/useLocations';

interface AppointmentsListProps {
  search: string;
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function AppointmentsList({ search }: AppointmentsListProps) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [selectedAppt, setSelectedAppt] = useState<any>(null);

  const { data: locations = [] } = useLocations();

  const filters: HubFilters = {
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    locationId: locationId !== 'all' ? locationId : undefined,
    page,
    pageSize: 50,
  };

  const { data, isLoading } = useAppointmentsHub(filters);
  const appointments = data?.appointments || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 50);

  const handleExportCSV = () => {
    if (appointments.length === 0) return;
    const headers = ['Date', 'Time', 'Client', 'Service', 'Stylist', 'Status', 'Price'];
    const rows = appointments.map((a: any) => [
      a.appointment_date,
      `${a.start_time}-${a.end_time}`,
      a.client_name || '',
      a.service_name || '',
      a.stylist_name || '',
      a.status || '',
      a.total_price ?? '',
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

  return (
    <>
      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[130px]">
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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <Button variant="outline" size={tokens.button.card} onClick={handleExportCSV} disabled={appointments.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={tokens.table.columnHeader}>Date</TableHead>
              <TableHead className={tokens.table.columnHeader}>Time</TableHead>
              <TableHead className={tokens.table.columnHeader}>Client</TableHead>
              <TableHead className={tokens.table.columnHeader}>Service</TableHead>
              <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
              <TableHead className={tokens.table.columnHeader}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
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
                    <TableCell className="text-sm">{appt.appointment_date}</TableCell>
                    <TableCell className="text-sm">{formatTime12h(appt.start_time)}</TableCell>
                    <TableCell className="text-sm font-medium">{appt.client_name || appt.phorest_clients?.name || 'Walk-in'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{appt.service_name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{appt.stylist_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', statusBadge.bg, statusBadge.text, statusBadge.border)}>
                        {statusBadge.label}
                      </Badge>
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
      </Card>

      {/* Detail Drawer */}
      <AppointmentDetailDrawer
        appointment={selectedAppt}
        open={!!selectedAppt}
        onOpenChange={(open) => { if (!open) setSelectedAppt(null); }}
      />
    </>
  );
}
