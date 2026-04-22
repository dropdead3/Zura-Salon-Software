import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ChevronDown, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePaginatedSort } from '@/hooks/usePaginatedSort';
import { TablePagination } from '@/components/ui/TablePagination';
import { SortableColumnHeader } from '@/components/ui/SortableColumnHeader';
import { usePinChangelog } from '@/hooks/useUserPin';
import { useFormatDate } from '@/hooks/useFormatDate';

function PinChangelogTable({ changelog, formatDate }: { changelog: any[]; formatDate: (d: Date, f: string) => string }) {
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
    data: changelog,
    defaultPageSize: 15,
    defaultSortField: 'changed_at' as any,
    defaultSortDirection: 'desc',
  });

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableColumnHeader label="Date" sortKey="changed_at" currentSortField={sortField} onToggleSort={toggleSort} />
            <SortableColumnHeader label="Changed By" sortKey="changer_name" currentSortField={sortField} onToggleSort={toggleSort} />
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-sm">
                {formatDate(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
              </TableCell>
              <TableCell className="text-sm">{entry.changer_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {entry.reason || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={setCurrentPage}
      />
    </>
  );
}

/**
 * Collapsible PIN Activity panel mounted under the Roster (Table mode only).
 * Defaults to closed; expands automatically when `?activity=pins` is present.
 *
 * Replaces the dedicated PIN Management tab's bottom changelog card.
 */
export function PinActivityPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activityParam = searchParams.get('activity');
  const [open, setOpen] = useState(activityParam === 'pins');
  const { data: changelog = [] } = usePinChangelog();
  const { formatDate } = useFormatDate();

  // Sync external param changes (e.g., legacy redirect) into local state
  useEffect(() => {
    if (activityParam === 'pins') setOpen(true);
  }, [activityParam]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    const params = new URLSearchParams(searchParams);
    if (next) {
      params.set('activity', 'pins');
    } else if (params.get('activity') === 'pins') {
      params.delete('activity');
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <Card className="bg-muted/20 border-muted/50">
        <CardHeader className="pb-4">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex items-center justify-between w-full text-left">
              <div>
                <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  PIN Activity
                </CardTitle>
                <CardDescription className="mt-1">
                  Recent PIN changes across the organization
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{changelog.length} event{changelog.length === 1 ? '' : 's'}</span>
                <ChevronDown className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  !open && '-rotate-90',
                )} />
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {changelog.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No PIN changes recorded</p>
            ) : (
              <PinChangelogTable changelog={changelog} formatDate={formatDate} />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
