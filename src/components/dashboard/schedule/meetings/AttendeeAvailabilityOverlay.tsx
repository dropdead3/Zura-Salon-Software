import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn, formatDisplayName } from '@/lib/utils';
import { useMemo } from 'react';

interface BusyBlock {
  start: number;
  end: number;
  type: 'appointment' | 'meeting';
}

interface AttendeeAvailabilityOverlayProps {
  date: string;
  attendeeUserIds: string[];
  teamMembers: { user_id: string; display_name: string | null; full_name: string | null; photo_url?: string | null }[];
  startTime?: string;
  endTime?: string;
}

const DAY_START = 7; // 7 AM
const DAY_END = 21;  // 9 PM
const TOTAL_HOURS = DAY_END - DAY_START;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function AttendeeAvailabilityOverlay({
  date,
  attendeeUserIds,
  teamMembers,
  startTime,
  endTime,
}: AttendeeAvailabilityOverlayProps) {
  const { data: busyData } = useQuery({
    queryKey: ['availability-overlay', date, attendeeUserIds],
    queryFn: async () => {
      const blocks = new Map<string, BusyBlock[]>();

      const { data: phorest } = await supabase
        .from('v_all_appointments' as any)
        .select('stylist_user_id, start_time, end_time')
        .eq('appointment_date', date)
        .in('stylist_user_id', attendeeUserIds)
        .not('status', 'in', '("cancelled","no_show")')
        .eq('is_demo', false);

      for (const a of (phorest as any[] || []) as any[]) {
        if (!a.stylist_user_id) continue;
        const arr = blocks.get(a.stylist_user_id) || [];
        arr.push({ start: timeToMinutes(a.start_time), end: timeToMinutes(a.end_time), type: 'appointment' });
        blocks.set(a.stylist_user_id, arr);
      }

      const { data: native } = await supabase
        .from('appointments')
        .select('staff_user_id, start_time, end_time')
        .eq('appointment_date', date)
        .in('staff_user_id', attendeeUserIds)
        .not('status', 'in', '("cancelled","no_show")');

      for (const a of native || []) {
        if (!a.staff_user_id) continue;
        const arr = blocks.get(a.staff_user_id) || [];
        arr.push({ start: timeToMinutes(a.start_time), end: timeToMinutes(a.end_time), type: 'appointment' });
        blocks.set(a.staff_user_id, arr);
      }

      const { data: meetings } = await supabase
        .from('admin_meetings')
        .select('id, start_time, end_time, organizer_user_id, admin_meeting_attendees(user_id)')
        .eq('start_date', date)
        .eq('status', 'scheduled');

      for (const m of meetings || []) {
        const mStart = timeToMinutes(m.start_time);
        const mEnd = timeToMinutes(m.end_time);

        if (attendeeUserIds.includes(m.organizer_user_id)) {
          const arr = blocks.get(m.organizer_user_id) || [];
          arr.push({ start: mStart, end: mEnd, type: 'meeting' });
          blocks.set(m.organizer_user_id, arr);
        }

        const attendees = m.admin_meeting_attendees as { user_id: string }[] | null;
        for (const att of attendees || []) {
          if (attendeeUserIds.includes(att.user_id)) {
            const arr = blocks.get(att.user_id) || [];
            arr.push({ start: mStart, end: mEnd, type: 'meeting' });
            blocks.set(att.user_id, arr);
          }
        }
      }

      return blocks;
    },
    enabled: !!date && attendeeUserIds.length > 0,
    staleTime: 30000,
  });

  const selectedRange = useMemo(() => {
    if (!startTime || !endTime) return null;
    const s = timeToMinutes(startTime);
    const e = timeToMinutes(endTime);
    return { start: s, end: e };
  }, [startTime, endTime]);

  if (attendeeUserIds.length === 0) return null;

  const dayStartMin = DAY_START * 60;
  const dayEndMin = DAY_END * 60;
  const totalMin = dayEndMin - dayStartMin;

  const getPositionPercent = (mins: number) => {
    return Math.max(0, Math.min(100, ((mins - dayStartMin) / totalMin) * 100));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-sans text-muted-foreground">Attendee availability</p>

      {/* Hour labels */}
      <div className="relative h-4 ml-24">
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
          const hour = DAY_START + i;
          if (i % 2 !== 0 && i !== TOTAL_HOURS) return null;
          return (
            <span
              key={hour}
              className="absolute text-[10px] text-muted-foreground -translate-x-1/2 font-sans"
              style={{ left: `${(i / TOTAL_HOURS) * 100}%` }}
            >
              {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'p' : 'a'}
            </span>
          );
        })}
      </div>

      {/* Rows */}
      {attendeeUserIds.map((uid) => {
        const member = teamMembers.find(t => t.user_id === uid);
        const name = member ? formatDisplayName(member.full_name || '', member.display_name) : 'Unknown';
        const blocks = busyData?.get(uid) || [];

        return (
          <div key={uid} className="flex items-center gap-2">
            <span className="text-xs font-sans text-foreground truncate w-22 shrink-0 text-right">
              {name.split(' ')[0]}
            </span>
            <div className="relative flex-1 h-6 bg-muted/40 rounded-md overflow-hidden border border-border/50">
              {/* Busy blocks */}
              {blocks.map((b, i) => {
                const left = getPositionPercent(b.start);
                const width = getPositionPercent(b.end) - left;
                return (
                  <div
                    key={i}
                    className={cn(
                      'absolute top-0 h-full rounded-sm opacity-60',
                      b.type === 'appointment' ? 'bg-destructive/50' : 'bg-chart-1/50'
                    )}
                    style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                  />
                );
              })}

              {/* Selected time range highlight */}
              {selectedRange && (
                <div
                  className="absolute top-0 h-full border-2 border-primary/60 rounded-sm bg-primary/10"
                  style={{
                    left: `${getPositionPercent(selectedRange.start)}%`,
                    width: `${Math.max(getPositionPercent(selectedRange.end) - getPositionPercent(selectedRange.start), 0.5)}%`,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-destructive/50" />
          <span className="text-[10px] font-sans text-muted-foreground">Client</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-chart-1/50" />
          <span className="text-[10px] font-sans text-muted-foreground">Meeting</span>
        </div>
      </div>
    </div>
  );
}
