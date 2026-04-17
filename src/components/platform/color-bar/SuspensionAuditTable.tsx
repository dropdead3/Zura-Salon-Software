/**
 * SuspensionAuditTable — Network Intelligence audit viewer for the
 * Color Bar suspension lifecycle. Sortable, with a 7d/30d/90d/All window.
 */

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpDown, History, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import {
  PlatformTable,
  PlatformTableHeader,
  PlatformTableBody,
  PlatformTableRow,
  PlatformTableHead,
  PlatformTableCell,
} from '@/components/platform/ui/PlatformTable';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import {
  PlatformCard,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
  PlatformCardContent,
} from '@/components/platform/ui/PlatformCard';
import {
  useColorBarSuspensionEvents,
  type SuspensionEventWindow,
  type SuspensionEventRow,
} from '@/hooks/color-bar/useColorBarSuspensionEvents';

type SortField = 'created_at' | 'organization_name' | 'event_type';
type SortDir = 'asc' | 'desc';

const WINDOWS: { value: SuspensionEventWindow; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All' },
];

export function SuspensionAuditTable() {
  const [window, setWindow] = useState<SuspensionEventWindow>('30d');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: events = [], isLoading } = useColorBarSuspensionEvents(window);

  const sorted = useMemo(() => {
    const copy = [...events];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'organization_name') {
        cmp = a.organization_name.localeCompare(b.organization_name);
      } else if (sortField === 'event_type') {
        cmp = a.event_type.localeCompare(b.event_type);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [events, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const suspendedCount = events.filter((e) => e.event_type === 'suspended').length;
  const reactivatedCount = events.filter((e) => e.event_type === 'reactivated').length;

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <History className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <PlatformCardTitle>Suspension Audit</PlatformCardTitle>
            <PlatformCardDescription>
              {events.length} events · {suspendedCount} suspended · {reactivatedCount} reactivated
            </PlatformCardDescription>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-[hsl(var(--platform-border)/0.5)] p-0.5 bg-[hsl(var(--platform-bg-hover)/0.3)]">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindow(w.value)}
              className={cn(
                'px-3 py-1 text-xs font-sans rounded-md transition-colors',
                window === w.value
                  ? 'bg-violet-600 text-white'
                  : 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </PlatformCardHeader>
      <PlatformCardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : sorted.length === 0 ? (
          <div className={tokens.empty.container}>
            <History className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No suspension activity in this window</h3>
            <p className={tokens.empty.description}>
              When orgs suspend or reactivate Color Bar, the events will appear here.
            </p>
          </div>
        ) : (
          <PlatformTable>
            <PlatformTableHeader>
              <PlatformTableRow>
                <SortHead label="Date" field="created_at" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                <SortHead label="Organization" field="organization_name" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                <SortHead label="Event" field="event_type" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                <PlatformTableHead className="font-sans">Reason</PlatformTableHead>
                <PlatformTableHead className="font-sans text-right">Locations</PlatformTableHead>
                <PlatformTableHead className="font-sans">Actor</PlatformTableHead>
              </PlatformTableRow>
            </PlatformTableHeader>
            <PlatformTableBody>
              {sorted.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </PlatformTableBody>
          </PlatformTable>
        )}
      </PlatformCardContent>
    </PlatformCard>
  );
}

function SortHead({
  label,
  field,
  sortField,
  sortDir,
  onToggle,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onToggle: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <PlatformTableHead className="font-sans">
      <button
        onClick={() => onToggle(field)}
        className="inline-flex items-center gap-1 select-none hover:text-[hsl(var(--platform-foreground))] transition-colors"
      >
        {label}
        <ArrowUpDown
          className={cn(
            'w-3 h-3 transition-transform',
            active ? 'text-violet-400' : 'text-[hsl(var(--platform-foreground-muted)/0.4)]',
            active && sortDir === 'asc' && 'rotate-180'
          )}
        />
      </button>
    </PlatformTableHead>
  );
}

function EventRow({ event }: { event: SuspensionEventRow }) {
  const isSuspended = event.event_type === 'suspended';
  const formattedReason =
    event.reason && event.reason.trim().length > 0
      ? event.reason
      : isSuspended
        ? <span className="text-[hsl(var(--platform-foreground-muted)/0.6)] italic">Unspecified</span>
        : <span className="text-[hsl(var(--platform-foreground-muted)/0.6)]">—</span>;

  return (
    <PlatformTableRow>
      <PlatformTableCell className="whitespace-nowrap text-xs">
        <div>{format(new Date(event.created_at), 'MMM d, yyyy')}</div>
        <div className="text-[hsl(var(--platform-foreground-muted)/0.7)]">
          {format(new Date(event.created_at), 'h:mm a')}
        </div>
      </PlatformTableCell>
      <PlatformTableCell className="font-medium">
        {event.organization_name}
        {event.organization_slug && (
          <div className="text-xs text-[hsl(var(--platform-foreground-muted)/0.6)]">
            /{event.organization_slug}
          </div>
        )}
      </PlatformTableCell>
      <PlatformTableCell>
        <PlatformBadge variant={isSuspended ? 'warning' : 'success'}>
          {isSuspended ? 'Suspended' : 'Reactivated'}
        </PlatformBadge>
      </PlatformTableCell>
      <PlatformTableCell className="max-w-[280px] text-sm">
        <div className="truncate" title={event.reason ?? undefined}>
          {formattedReason}
        </div>
        {event.notes && (
          <div className="text-xs text-[hsl(var(--platform-foreground-muted)/0.7)] truncate" title={event.notes}>
            {event.notes}
          </div>
        )}
      </PlatformTableCell>
      <PlatformTableCell className="text-right tabular-nums">
        {event.affected_location_count}
      </PlatformTableCell>
      <PlatformTableCell className="text-sm">{event.actor_name}</PlatformTableCell>
    </PlatformTableRow>
  );
}
