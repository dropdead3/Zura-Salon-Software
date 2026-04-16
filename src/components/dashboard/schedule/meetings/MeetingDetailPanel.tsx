import { format } from 'date-fns';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Users, Video, MapPin, Monitor, Clock, CalendarIcon, X,
  CheckCircle, XCircle, HelpCircle, Copy, ExternalLink,
} from 'lucide-react';
import { cn, formatDisplayName } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateMeetingStatus, useUpdateRsvp, type AdminMeeting, type MeetingAttendee, type MeetingMode } from '@/hooks/useAdminMeetings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const MEETING_TYPE_LABELS: Record<string, string> = {
  one_on_one: '1-on-1',
  interview: 'Interview',
  manager_meeting: 'Team Meeting',
  training: 'Training',
  other: 'Meeting',
};

const MODE_LABELS: Record<MeetingMode, { label: string; Icon: typeof Video }> = {
  video: { label: 'Video Call', Icon: Video },
  in_person: { label: 'In Person', Icon: MapPin },
  hybrid: { label: 'Hybrid', Icon: Monitor },
};

const RSVP_CONFIG: Record<string, { label: string; Icon: typeof CheckCircle; className: string }> = {
  accepted: { label: 'Accepted', Icon: CheckCircle, className: 'text-chart-2' },
  declined: { label: 'Declined', Icon: XCircle, className: 'text-destructive' },
  pending: { label: 'Pending', Icon: HelpCircle, className: 'text-muted-foreground' },
};

import { formatTime12h } from '@/lib/schedule-utils';

interface MeetingDetailPanelProps {
  meeting: (AdminMeeting & { admin_meeting_attendees?: { user_id: string; rsvp_status: string }[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeetingDetailPanel({ meeting, open, onOpenChange }: MeetingDetailPanelProps) {
  const { user } = useAuth();
  const updateStatus = useUpdateMeetingStatus();
  const updateRsvp = useUpdateRsvp();

  // Fetch attendee profiles
  const attendeeIds = meeting?.admin_meeting_attendees?.map(a => a.user_id) || [];
  const { data: attendeeProfiles = [] } = useQuery({
    queryKey: ['meeting-attendee-profiles', meeting?.id],
    queryFn: async () => {
      if (attendeeIds.length === 0) return [];
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url, email')
        .in('user_id', attendeeIds);
      return data || [];
    },
    enabled: !!meeting && attendeeIds.length > 0,
  });

  // Fetch organizer profile
  const { data: organizerProfile } = useQuery({
    queryKey: ['meeting-organizer-profile', meeting?.organizer_user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('user_id', meeting!.organizer_user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!meeting,
  });

  if (!meeting) return null;

  const modeInfo = MODE_LABELS[meeting.meeting_mode];
  const isOrganizer = user?.id === meeting.organizer_user_id;
  const myAttendee = meeting.admin_meeting_attendees?.find(a => a.user_id === user?.id);

  const handleRsvp = (status: 'accepted' | 'declined') => {
    updateRsvp.mutate({ meetingId: meeting.id, rsvpStatus: status });
  };

  const handleCancel = () => {
    updateStatus.mutate({ meetingId: meeting.id, status: 'cancelled' });
    onOpenChange(false);
  };

  const handleComplete = () => {
    updateStatus.mutate({ meetingId: meeting.id, status: 'completed' });
    onOpenChange(false);
  };

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="26rem">
      <div className="flex flex-col h-full max-h-[85vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Badge variant="outline" className="text-[10px] border-chart-1/30 text-chart-1 mb-2">
                {MEETING_TYPE_LABELS[meeting.meeting_type] || 'Meeting'}
              </Badge>
              <h2 className="font-display text-base tracking-wide truncate">{meeting.title}</h2>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground font-sans">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{format(new Date(meeting.start_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-sans">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime12h(meeting.start_time)} — {formatTime12h(meeting.end_time)} ({meeting.duration_minutes}m)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Mode & Location */}
          <div className="flex items-center gap-2">
            <modeInfo.Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-sans">{modeInfo.label}</span>
            {meeting.video_link && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(meeting.video_link!);
                  toast.success('Link copied');
                }}
              >
                <Copy className="w-3 h-3" />
                Copy Link
              </Button>
            )}
          </div>

          {meeting.video_link && (
            <a
              href={meeting.video_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline font-sans"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Join Video Call
            </a>
          )}

          <Separator />

          {/* Organizer */}
          <div>
            <p className="text-xs text-muted-foreground font-sans mb-2">Organized by</p>
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={organizerProfile?.photo_url || undefined} />
                <AvatarFallback className="text-xs">
                  {formatDisplayName(organizerProfile?.full_name || '', organizerProfile?.display_name).slice(0, 2).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-sans">
                {formatDisplayName(organizerProfile?.full_name || '', organizerProfile?.display_name) || 'Unknown'}
                {isOrganizer && <span className="text-muted-foreground ml-1">(you)</span>}
              </span>
            </div>
          </div>

          <Separator />

          {/* Attendees */}
          <div>
            <p className="text-xs text-muted-foreground font-sans mb-2">
              Attendees ({attendeeIds.length})
            </p>
            <div className="space-y-2">
              {meeting.admin_meeting_attendees?.map(att => {
                const profile = attendeeProfiles.find(p => p.user_id === att.user_id);
                const rsvp = RSVP_CONFIG[att.rsvp_status] || RSVP_CONFIG.pending;
                return (
                  <div key={att.user_id} className="flex items-center gap-3">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={profile?.photo_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {formatDisplayName(profile?.full_name || '', profile?.display_name).slice(0, 2).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-sans flex-1 truncate">
                      {formatDisplayName(profile?.full_name || '', profile?.display_name) || 'Unknown'}
                      {att.user_id === user?.id && <span className="text-muted-foreground ml-1">(you)</span>}
                    </span>
                    <div className={cn('flex items-center gap-1', rsvp.className)}>
                      <rsvp.Icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-sans">{rsvp.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {meeting.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground font-sans mb-1">Notes</p>
                <p className="text-sm font-sans text-foreground whitespace-pre-wrap">{meeting.notes}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border space-y-2">
          {/* RSVP for attendees */}
          {myAttendee && !isOrganizer && meeting.status === 'scheduled' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={myAttendee.rsvp_status === 'accepted' ? 'default' : 'outline'}
                className="flex-1 gap-1"
                onClick={() => handleRsvp('accepted')}
                disabled={updateRsvp.isPending}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Accept
              </Button>
              <Button
                size="sm"
                variant={myAttendee.rsvp_status === 'declined' ? 'destructive' : 'outline'}
                className="flex-1 gap-1"
                onClick={() => handleRsvp('declined')}
                disabled={updateRsvp.isPending}
              >
                <XCircle className="w-3.5 h-3.5" />
                Decline
              </Button>
            </div>
          )}

          {/* Organizer actions */}
          {isOrganizer && meeting.status === 'scheduled' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={handleComplete}>
                <CheckCircle className="w-3.5 h-3.5" />
                Complete
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive" onClick={handleCancel}>
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}
