import { formatMinutesToDuration } from '@/lib/formatDuration';
import { cn, formatDisplayName } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Video, MapPin, Monitor } from 'lucide-react';
import type { AdminMeeting, MeetingAttendee, MeetingMode } from '@/hooks/useAdminMeetings';

import { parseTimeToMinutes, formatTime12h } from '@/lib/schedule-utils';

const MEETING_TYPE_LABELS: Record<string, string> = {
  one_on_one: '1-on-1',
  interview: 'Interview',
  manager_meeting: 'Team Meeting',
  training: 'Training',
  other: 'Meeting',
};

const MODE_ICON: Record<MeetingMode, typeof Video> = {
  video: Video,
  in_person: MapPin,
  hybrid: Monitor,
};

// ─── Grid Card (for DayView) ──────────────────────────────────────
interface MeetingGridCardProps {
  meeting: AdminMeeting & { admin_meeting_attendees?: { user_id: string; rsvp_status: string }[] };
  hoursStart: number;
  rowHeight?: number;
  slotInterval?: number;
  onClick: () => void;
  attendeeProfiles?: Map<string, { display_name: string | null; full_name: string; photo_url: string | null }>;
}

export function MeetingGridCard({
  meeting,
  hoursStart,
  rowHeight = 20,
  slotInterval = 15,
  onClick,
  attendeeProfiles,
}: MeetingGridCardProps) {
  const startMinutes = parseTimeToMinutes(meeting.start_time);
  const endMinutes = parseTimeToMinutes(meeting.end_time);
  const startOffset = startMinutes - (hoursStart * 60);
  const duration = endMinutes - startMinutes;
  const top = (startOffset / slotInterval) * rowHeight;
  const height = Math.max((duration / slotInterval) * rowHeight, rowHeight * 2);

  const ModeIcon = MODE_ICON[meeting.meeting_mode];
  const attendeeCount = meeting.admin_meeting_attendees?.length || 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-1 right-1 rounded-lg border-l-[3px] border-l-chart-1 z-10',
        'bg-chart-1/10 dark:bg-chart-1/15 border border-chart-1/30',
        'hover:brightness-[1.08] transition-all cursor-pointer',
        'flex flex-col p-1.5 overflow-hidden text-left'
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div className="flex items-center gap-1 min-w-0">
        <Users className="w-3 h-3 shrink-0 text-chart-1" />
        <span className="text-[11px] font-sans font-medium text-foreground truncate">
          {meeting.title}
        </span>
      </div>
      {height > 40 && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground font-sans">
            {formatTime12h(meeting.start_time)}
          </span>
          <ModeIcon className="w-2.5 h-2.5 text-muted-foreground" />
          {attendeeCount > 0 && (
            <span className="text-[10px] text-muted-foreground font-sans">
              +{attendeeCount}
            </span>
          )}
        </div>
      )}
      {height > 70 && (
        <div className="flex items-center gap-1 mt-1">
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-chart-1/30 text-chart-1">
            {MEETING_TYPE_LABELS[meeting.meeting_type] || 'Meeting'}
          </Badge>
        </div>
      )}
    </button>
  );
}

// ─── Agenda Card (for AgendaView) ─────────────────────────────────
interface MeetingAgendaCardProps {
  meeting: AdminMeeting & { admin_meeting_attendees?: { user_id: string; rsvp_status: string }[] };
  onClick: () => void;
  attendeeProfiles?: Map<string, { display_name: string | null; full_name: string; photo_url: string | null }>;
}

export function MeetingAgendaCard({ meeting, onClick, attendeeProfiles }: MeetingAgendaCardProps) {
  const ModeIcon = MODE_ICON[meeting.meeting_mode];
  const attendees = meeting.admin_meeting_attendees || [];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border border-chart-1/30',
        'bg-chart-1/5 dark:bg-chart-1/10 hover:bg-chart-1/10 transition-colors text-left'
      )}
    >
      <div className="text-center shrink-0 w-16">
        <div className="text-sm font-medium font-sans">{formatTime12h(meeting.start_time).replace(' ', '')}</div>
        <div className="text-xs text-muted-foreground font-sans">
          {formatMinutesToDuration(meeting.duration_minutes)}
        </div>
      </div>
      <div className="w-1 self-stretch rounded-full bg-chart-1/40" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-chart-1 shrink-0" />
          <span className="text-sm font-medium font-sans truncate">{meeting.title}</span>
          <Badge variant="outline" className="text-[10px] border-chart-1/30 text-chart-1 shrink-0">
            {MEETING_TYPE_LABELS[meeting.meeting_type] || 'Meeting'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <ModeIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-sans">
            {formatTime12h(meeting.start_time)} — {formatTime12h(meeting.end_time)}
          </span>
          {attendees.length > 0 && (
            <span className="text-xs text-muted-foreground font-sans">
              · {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {attendeeProfiles && attendees.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            {attendees.slice(0, 4).map(att => {
              const profile = attendeeProfiles.get(att.user_id);
              return (
                <Avatar key={att.user_id} className="w-5 h-5">
                  <AvatarImage src={profile?.photo_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {formatDisplayName(profile?.full_name || '', profile?.display_name).slice(0, 2).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {attendees.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{attendees.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
