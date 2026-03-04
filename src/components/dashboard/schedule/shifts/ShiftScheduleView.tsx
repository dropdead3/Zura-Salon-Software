import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStaffShifts, useDeleteShift, type StaffShift } from '@/hooks/useStaffShifts';
import { ShiftEditorDialog } from './ShiftEditorDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

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
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShift | null>(null);
  const [editorDefaultDate, setEditorDefaultDate] = useState<Date | undefined>();
  const deleteShift = useDeleteShift();

  const weekEnd = addDays(weekStart, 6);
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: shifts = [] } = useStaffShifts(startStr, endStr);

  // Fetch staff profiles for names
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

  // Group shifts by user
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    shifts.forEach(s => ids.add(s.user_id));
    return Array.from(ids);
  }, [shifts]);

  const getName = (userId: string) => {
    const p = staffProfiles.find(s => s.user_id === userId);
    return p?.display_name || p?.full_name || 'Unknown';
  };

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
            <Button variant="ghost" size="sm" className="font-sans h-8" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              This Week
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="w-4 h-4" />
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
              <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-border">
                <div className="p-3" />
                {days.map(day => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'p-3 text-center border-l border-border',
                      isSameDay(day, new Date()) && 'bg-primary/5'
                    )}
                  >
                    <p className="font-display text-[10px] tracking-wider text-muted-foreground">
                      {format(day, 'EEE').toUpperCase()}
                    </p>
                    <p className={cn(
                      'font-sans text-sm mt-0.5',
                      isSameDay(day, new Date()) && 'text-primary'
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
                userIds.map(uid => (
                  <div key={uid} className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-border last:border-b-0">
                    <div className="p-3 flex items-center">
                      <span className="font-sans text-sm text-foreground truncate">{getName(uid)}</span>
                    </div>
                    {days.map(day => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = shifts.filter(s => s.user_id === uid && s.shift_date === dayStr);

                      return (
                        <div
                          key={dayStr}
                          className={cn(
                            'p-1.5 border-l border-border min-h-[56px] cursor-pointer hover:bg-muted/30 transition-colors',
                            isSameDay(day, new Date()) && 'bg-primary/5'
                          )}
                          onClick={() => dayShifts.length === 0 && handleNewShift(day)}
                        >
                          {dayShifts.map(shift => (
                            <button
                              key={shift.id}
                              onClick={(e) => { e.stopPropagation(); handleEditShift(shift); }}
                              className={cn(
                                'w-full text-left rounded-md px-2 py-1 border text-[11px] font-sans mb-1 transition-colors hover:opacity-80',
                                ROLE_COLORS[shift.role_context] || ROLE_COLORS.other
                              )}
                            >
                              <div className="truncate">{formatTime12(shift.start_time.slice(0, 5))}–{formatTime12(shift.end_time.slice(0, 5))}</div>
                              <div className="truncate opacity-70">{ROLE_LABELS[shift.role_context]}</div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))
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
      />
    </>
  );
}
