import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { tokens } from '@/lib/design-tokens';
import { MoreHorizontal, Phone, Mail, Clock, CalendarDays, User } from 'lucide-react';
import type { WaitlistEntry } from '@/hooks/useWaitlist';
import { useUpdateWaitlistStatus } from '@/hooks/useWaitlist';
import { usePaginatedSort } from '@/hooks/usePaginatedSort';
import { TablePagination } from '@/components/ui/TablePagination';
import { SortableColumnHeader } from '@/components/ui/SortableColumnHeader';

const STATUS_STYLES: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  offered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  booked: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

interface WaitlistTableProps {
  entries: WaitlistEntry[];
  isLoading: boolean;
}

export function WaitlistTable({ entries, isLoading }: WaitlistTableProps) {
  const updateStatus = useUpdateWaitlistStatus();

  const {
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    showingFrom,
    showingTo,
    sortField,
    toggleSort,
  } = usePaginatedSort({
    data: entries,
    defaultPageSize: 25,
    defaultSortField: 'preferred_date_start' as any,
    defaultSortDirection: 'asc',
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className={tokens.loading.skeleton} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!entries.length) {
    return (
      <div className={tokens.empty.container}>
        <CalendarDays className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No waitlist entries</h3>
        <p className={tokens.empty.description}>Add clients to the waitlist when they want a cancelled slot</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableColumnHeader label="Client" sortKey="client_name" currentSortField={sortField} onToggleSort={toggleSort} />
              <TableHead className={tokens.table.columnHeader}>Service</TableHead>
              <SortableColumnHeader label="Preferred Dates" sortKey="preferred_date_start" currentSortField={sortField} onToggleSort={toggleSort} />
              <TableHead className={tokens.table.columnHeader}>Time Window</TableHead>
              <SortableColumnHeader label="Priority" sortKey="priority" currentSortField={sortField} onToggleSort={toggleSort} />
              <SortableColumnHeader label="Status" sortKey="status" currentSortField={sortField} onToggleSort={toggleSort} />
              <TableHead className={tokens.table.columnHeader}>Contact</TableHead>
              <TableHead className={tokens.table.columnHeader} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-sans text-sm">{entry.client_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {entry.service_name || '—'}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(parseISO(entry.preferred_date_start), 'MMM d')}
                    {entry.preferred_date_end && (
                      <> – {format(parseISO(entry.preferred_date_end), 'MMM d')}</>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {entry.preferred_time_start && entry.preferred_time_end ? (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {entry.preferred_time_start.slice(0, 5)} – {entry.preferred_time_end.slice(0, 5)}
                    </div>
                  ) : 'Any time'}
                </TableCell>
                <TableCell>
                  {entry.priority > 0 ? (
                    <Badge variant="outline" className="text-xs">{entry.priority}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Normal</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_STYLES[entry.status] || ''} variant="secondary">
                    {entry.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {entry.client_phone && (
                      <a href={`tel:${entry.client_phone}`} className="text-muted-foreground hover:text-foreground">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {entry.client_email && (
                      <a href={`mailto:${entry.client_email}`} className="text-muted-foreground hover:text-foreground">
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {entry.status === 'waiting' && (
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: entry.id, status: 'offered' })}>
                          Mark as Offered
                        </DropdownMenuItem>
                      )}
                      {(entry.status === 'waiting' || entry.status === 'offered') && (
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: entry.id, status: 'booked' })}>
                          Mark as Booked
                        </DropdownMenuItem>
                      )}
                      {(entry.status === 'waiting' || entry.status === 'offered') && (
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: entry.id, status: 'cancelled' })} className="text-destructive">
                          Cancel
                        </DropdownMenuItem>
                      )}
                      {entry.status === 'waiting' && (
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: entry.id, status: 'expired' })}>
                          Mark Expired
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 pb-4">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            showingFrom={showingFrom}
            showingTo={showingTo}
            onPageChange={setCurrentPage}
          />
        </div>
      </CardContent>
    </Card>
  );
}
