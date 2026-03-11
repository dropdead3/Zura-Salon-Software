import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, differenceInMinutes, parse } from 'date-fns';
import { useOrgNow } from '@/hooks/useOrgNow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ChevronLeft, ChevronRight, RefreshCw, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStaffShifts, useDeleteShift, useDeleteRecurringShifts, useCopyPreviousWeek, type StaffShift } from '@/hooks/useStaffShifts';
import { ShiftEditorDialog } from './ShiftEditorDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ROLE_LABELS: Record<string, string> = {
  front_desk: 'Front Desk',
  receptionist: 'Receptionist',
  coordinator: 'Coordinator',
  other: 'Other',
};

const ROLE_COLORS: Record<string, string> = {
  front_desk: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  receptionist: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  coordinator: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  other: 'bg-muted text-muted-foreground border-border',
};

interface ShiftScheduleViewProps {
  locationId?: string;
}

export function ShiftScheduleView({ locationId }: ShiftScheduleViewProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { isToday: shiftIsToday, todayDate: shiftToday } = useOrgNow();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(shiftToday, { weekStartsOn: 1 }));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShift | null>(null);
  const [editorDefaultDate, setEditorDefaultDate] = useState<Date | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<StaffShift | null>(null);

  const deleteShift = useDeleteShift();
  const deleteRecurring = useDeleteRecurringShifts();
  const copyWeek = useCopyPreviousWeek();

  const weekEnd = addDays(weekStart, 6);
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: shifts = [] } = useStaffShifts(startStr, endStr);

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['shift-staff-profiles', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name')
        .eq('organization_id', orgId!)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!orgId,
  });

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    shifts.forEach(s => ids.add(s.user_id));
    return Array.from(ids);
  }, [shifts]);

  const getName = (userId: string) => {
    const p = staffProfiles.find(s => s.user_id === userId);
    return p?.display_name || p?.full_name || 'Unknown';
  };

  // Calculate weekly hours per user
  const weeklyHours = useMemo(() => {
    const map: Record<string, number> = {};
    shifts.forEach(s => {
      const start = parse(s.start_time.slice(0, 5), 'HH:mm', new Date());
      const end = parse(s.end_time.slice(0, 5), 'HH:mm', new Date());
      const mins = differenceInMinutes(end, start);
      map[s.user_id] = (map[s.user_id] || 0) + mins;
    });
    return map;
  }, [shifts]);

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleNewShift = (date?: Date) => {
    setEditingShift(null);
    setEditorDefaultDate(date);
    setEditorOpen(true);
  };

  const handleEditShift = (shift: StaffShift) => {
    setEditingShift(shift);
    setEditorOpen(true);
  };

  const handleDeleteConfirm = (mode: 'single' | 'series') => {
    if (!deleteTarget) return;
    if (mode === 'series') {
      deleteRecurring.mutate({ shift: deleteTarget }, { onSuccess: () => setDeleteTarget(null) });
    } else {
      deleteShift.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  return (
    <>
      <Card className="rounded-xl border-border bg-card/80 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="font-display text-base tracking-wide">Staff Shifts</CardTitle>
            <CardDescription className="font-sans text-sm">
              {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="font-sans h-8" onClick={() => setWeekStart(startOfWeek(shiftToday, { weekStartsOn: 1 }))}>
              This Week
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-sans h-8 gap-1.5"
              onClick={() => copyWeek.mutate({ currentWeekStart: startStr })}
              disabled={copyWeek.isPending}
            >
              {copyWeek.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Last Week
            </Button>
            <Button size="sm" onClick={() => handleNewShift()} className="font-sans gap-1.5">
              <Plus className="w-4 h-4" />
              Add Shift
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-border">
                <div className="p-3" />
                {days.map(day => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'p-3 text-center border-l border-border',
                      shiftIsToday(day) && 'bg-primary/5'
                    )}
                  >
                    <p className="font-display text-[10px] tracking-wider text-muted-foreground">
                      {format(day, 'EEE').toUpperCase()}
                    </p>
                    <p className={cn(
                      'font-sans text-sm mt-0.5',
                      shiftIsToday(day) && 'text-primary'
                    )}>
                      {format(day, 'd')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Shift rows */}
              {userIds.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-sans text-muted-foreground">No shifts scheduled this week.</p>
                  <Button variant="outline" size="sm" className="mt-3 font-sans" onClick={() => handleNewShift()}>
                    <Plus className="w-4 h-4 mr-1" /> Create First Shift
                  </Button>
                </div>
              ) : (
                userIds.map(uid => {
                  const hours = weeklyHours[uid] || 0;
                  const hoursDisplay = `${Math.floor(hours / 60)}h${hours % 60 > 0 ? ` ${hours % 60}m` : ''}`;

                  return (
                    <div key={uid} className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-border last:border-b-0">
                      <div className="p-3 flex flex-col justify-center">
                        <span className="font-sans text-sm text-foreground truncate">{getName(uid)}</span>
                        <span className="font-sans text-[11px] text-muted-foreground">{hoursDisplay}</span>
                      </div>
                      {days.map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const dayShifts = shifts.filter(s => s.user_id === uid && s.shift_date === dayStr);

                        return (
                          <div
                            key={dayStr}
                            className={cn(
                              'p-1.5 border-l border-border min-h-[56px] cursor-pointer hover:bg-muted/30 transition-colors',
                              shiftIsToday(day) && 'bg-primary/5'
                            )}
                            onClick={() => dayShifts.length === 0 && handleNewShift(day)}
                          >
                            {dayShifts.map(shift => (
                              <button
                                key={shift.id}
                                onClick={(e) => { e.stopPropagation(); handleEditShift(shift); }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeleteTarget(shift);
                                }}
                                className={cn(
                                  'w-full text-left rounded-md px-2 py-1 border text-[11px] font-sans mb-1 transition-colors hover:opacity-80 relative group',
                                  ROLE_COLORS[shift.role_context] || ROLE_COLORS.other
                                )}
                              >
                                <div className="flex items-center gap-1 truncate">
                                  {shift.is_recurring && <RefreshCw className="h-2.5 w-2.5 shrink-0 opacity-60" />}
                                  <span className="truncate">{formatTime12(shift.start_time.slice(0, 5))}–{formatTime12(shift.end_time.slice(0, 5))}</span>
                                </div>
                                <div className="truncate opacity-70">{ROLE_LABELS[shift.role_context]}</div>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ShiftEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        staffMembers={staffProfiles}
        locationId={locationId}
        existingShift={editingShift}
        defaultDate={editorDefaultDate}
        existingShifts={shifts}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-base tracking-wide">Cancel Shift</AlertDialogTitle>
            <AlertDialogDescription className="font-sans">
              {deleteTarget?.is_recurring
                ? 'This shift is part of a recurring series. How would you like to proceed?'
                : 'Are you sure you want to cancel this shift?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-sans">Keep Shift</AlertDialogCancel>
            {deleteTarget?.is_recurring && (
              <AlertDialogAction
                onClick={() => handleDeleteConfirm('series')}
                className="font-sans bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel All Future
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={() => handleDeleteConfirm('single')}
              className="font-sans"
            >
              {deleteTarget?.is_recurring ? 'This Shift Only' : 'Cancel Shift'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
