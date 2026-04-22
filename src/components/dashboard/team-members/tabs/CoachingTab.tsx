import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, GraduationCap, Trophy, MessageSquare, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface Props {
  userId: string;
}

export function CoachingTab({ userId }: Props) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Active program enrollment + linked coach
  const { data: enrollment, isLoading: enrLoading } = useQuery({
    queryKey: ['coaching-enrollment', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylist_program_enrollment')
        .select('id, status, current_day, coach_id, started_at, program_id')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const coachId = enrollment?.coach_id;
  const { data: coach } = useQuery({
    queryKey: ['coaching-coach-profile', coachId],
    queryFn: async () => {
      if (!coachId) return null;
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url')
        .eq('user_id', coachId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!coachId,
  });

  // Recent 1:1 meetings (requester or coach side)
  const { data: meetings } = useQuery({
    queryKey: ['coaching-meetings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('one_on_one_meetings')
        .select('id, meeting_date, start_time, status, meeting_type, notes')
        .or(`requester_id.eq.${userId},coach_id.eq.${userId}`)
        .order('meeting_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Ring the bell entries this month
  const { data: bellEntries } = useQuery({
    queryKey: ['coaching-bell', userId, orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('ring_the_bell_entries')
        .select('id, service_booked, ticket_value, closing_script, created_at')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .gte('created_at', monthStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!orgId,
  });

  if (enrLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">COACH & PROGRAM</CardTitle>
          </div>
          <CardDescription>Active program enrollment and the coach guiding this team member.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {coach ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60">
              <div>
                <p className="font-sans text-sm font-medium text-foreground">{coach.display_name || coach.full_name}</p>
                <p className="font-sans text-xs text-muted-foreground">Active coach</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(dashPath('/admin/graduation-tracker'))} className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Manage
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashed border-border/60">
              <p className={tokens.body.muted + ' text-sm'}>No coach assigned.</p>
              <Button variant="outline" size="sm" onClick={() => navigate(dashPath('/admin/graduation-tracker'))} className="gap-1.5">
                Assign coach
              </Button>
            </div>
          )}

          {enrollment ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60">
              <div>
                <p className="font-sans text-sm font-medium text-foreground">90-day program</p>
                <p className="font-sans text-xs text-muted-foreground">
                  Day {enrollment.current_day ?? 0} · <span className="capitalize">{enrollment.status || 'active'}</span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(dashPath('/admin/program-editor'))} className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </Button>
            </div>
          ) : (
            <p className={tokens.body.muted + ' text-sm italic'}>Not enrolled in a program.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">RECENT 1:1S</CardTitle>
          </div>
          <CardDescription>The most recent one-on-one meetings.</CardDescription>
        </CardHeader>
        <CardContent>
          {!meetings || meetings.length === 0 ? (
            <p className={tokens.body.muted + ' text-sm italic'}>No 1:1 meetings recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {meetings.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-md border border-border/60 text-sm">
                  <span className="font-sans text-foreground">
                    {m.meeting_date ? format(new Date(m.meeting_date), 'MMM d, yyyy') : 'Unscheduled'}
                    {m.start_time ? ` · ${m.start_time.slice(0, 5)}` : ''}
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize">{m.status || 'pending'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">RECOGNITION</CardTitle>
          </div>
          <CardDescription>Bell rings and celebrations this month.</CardDescription>
        </CardHeader>
        <CardContent>
          {!bellEntries || bellEntries.length === 0 ? (
            <p className={tokens.body.muted + ' text-sm italic'}>No recognition entries this month.</p>
          ) : (
            <div className="space-y-2">
              <p className="font-display text-sm tracking-wide text-foreground">
                {bellEntries.length} bell ring{bellEntries.length === 1 ? '' : 's'} this month
              </p>
              {bellEntries.map((b) => (
                <div key={b.id} className="p-2 rounded-md border border-border/60 text-sm">
                  <p className="font-sans text-foreground">{b.service_booked}</p>
                  <p className="font-sans text-xs text-muted-foreground">
                    ${Number(b.ticket_value || 0).toFixed(0)} · {format(new Date(b.created_at), 'MMM d')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
