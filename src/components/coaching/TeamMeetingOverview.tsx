import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Users, CalendarPlus, FileText, CheckCircle2, AlertTriangle, Clock, UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useTeamMeetingOverview, type MeetingStatus } from '@/hooks/useTeamMeetingOverview';
import { CadenceSettingsDialog } from '@/components/coaching/CadenceSettingsDialog';

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  'on-track': {
    label: 'On Track',
    color: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
    icon: CheckCircle2,
  },
  'due-soon': {
    label: 'Due Soon',
    color: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
    icon: Clock,
  },
  'overdue': {
    label: 'Overdue',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: AlertTriangle,
  },
  'never-met': {
    label: 'Never Met',
    color: 'bg-muted text-muted-foreground border-border',
    icon: UserX,
  },
};

function StatusBadge({ status }: { status: MeetingStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium gap-1', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function SummaryPill({ count, label, colorClass }: { count: number; label: string; colorClass: string }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', colorClass)}>
      <span className="text-lg font-display tabular-nums">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function TeamMeetingOverview() {
  const {
    staff, summary, cadence, isLoading, updateCadence, removeCadenceOverride, isUpdating,
  } = useTeamMeetingOverview();
  const { formatDate } = useFormatDate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (staff.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">TEAM MEETING OVERVIEW</CardTitle>
              <CardDescription>Cadence tracking and coaching status for your team</CardDescription>
            </div>
          </div>
          <CadenceSettingsDialog
            staff={staff}
            cadence={cadence}
            onUpdateCadence={updateCadence}
            onRemoveOverride={removeCadenceOverride}
            isUpdating={isUpdating}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <SummaryPill count={summary.overdue} label="Overdue" colorClass="border-destructive/20 bg-destructive/5" />
          <SummaryPill count={summary.dueSoon} label="Due Soon" colorClass="border-chart-4/20 bg-chart-4/5" />
          <SummaryPill count={summary.neverMet} label="Never Met" colorClass="border-border bg-muted/50" />
          <SummaryPill count={summary.onTrack} label="On Track" colorClass="border-chart-2/20 bg-chart-2/5" />
        </div>

        {/* Staff Roster */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Meeting</TableHead>
                <TableHead>Next Scheduled</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map(s => {
                const daysSinceText = s.daysSinceLastMeeting !== null
                  ? `${s.daysSinceLastMeeting}d ago`
                  : null;

                return (
                  <TableRow key={s.userId} className={cn(
                    s.status === 'overdue' && 'bg-destructive/5',
                    s.status === 'due-soon' && 'bg-chart-4/5',
                  )}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7">
                          {s.photoUrl && <AvatarImage src={s.photoUrl} />}
                          <AvatarFallback className="text-[9px]">{getInitials(s.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none">{s.name}</p>
                          {s.role && (
                            <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{s.role}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      {s.lastMeetingDate ? (
                        <div>
                          <span className="text-sm">{formatDate(new Date(s.lastMeetingDate), 'MMM d, yyyy')}</span>
                          {daysSinceText && (
                            <span className={cn(
                              'text-[10px] ml-1.5',
                              s.status === 'overdue' ? 'text-destructive font-medium' :
                              s.status === 'due-soon' ? 'text-chart-4' :
                              'text-muted-foreground'
                            )}>
                              ({daysSinceText})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.nextMeetingDate ? (
                        <Link to={`/dashboard/meeting/${s.nextMeetingId}`} className="text-sm text-primary hover:underline">
                          {formatDate(new Date(s.nextMeetingDate), 'MMM d')}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {s.cadenceDays}d
                        {s.hasOverride && (
                          <Badge variant="outline" className="text-[8px] ml-1 py-0 px-1">custom</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/dashboard/schedule-meeting/new?staffId=${s.userId}`}>
                          <Button variant="ghost" size={tokens.button.inline} className="h-7 text-xs gap-1">
                            <CalendarPlus className="w-3 h-3" />
                            Schedule
                          </Button>
                        </Link>
                        <Link to={`/dashboard/admin/analytics?tab=reports&report=individual-staff&staffId=${s.userId}`}>
                          <Button variant="ghost" size={tokens.button.inline} className="h-7 text-xs gap-1">
                            <FileText className="w-3 h-3" />
                            Prep
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-muted-foreground mt-3">
          Cadence tracks coaching and check-in meetings only. Confirmed meetings with past dates count as completed.
        </p>
      </CardContent>
    </Card>
  );
}
