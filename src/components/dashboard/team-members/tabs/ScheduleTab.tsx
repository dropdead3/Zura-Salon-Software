import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useActiveLocations } from '@/hooks/useLocations';
import { usePTOBalances } from '@/hooks/usePTOBalances';
import { isStructurallyEqual } from '@/lib/stableStringify';

interface Props {
  userId: string;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S',
};

export function ScheduleTab({ userId }: Props) {
  const queryClient = useQueryClient();
  const { data: locations = [] } = useActiveLocations();
  const { balances } = usePTOBalances();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['team-member-schedules', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_location_schedules')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: pendingTimeOff } = useQuery({
    queryKey: ['team-member-time-off', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('id, status, request_type, start_date, end_date')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const [edits, setEdits] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (schedules) {
      const map: Record<string, string[]> = {};
      schedules.forEach(s => { map[s.location_id] = s.work_days || []; });
      setEdits(map);
    }
  }, [schedules]);

  const upsert = useMutation({
    mutationFn: async ({ locationId, workDays }: { locationId: string; workDays: string[] }) => {
      const { error } = await supabase
        .from('employee_location_schedules')
        .upsert({ user_id: userId, location_id: locationId, work_days: workDays }, { onConflict: 'user_id,location_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-schedules', userId] });
      toast.success('Schedule updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update schedule'),
  });

  const toggleDay = (locationId: string, day: string) => {
    setEdits(prev => {
      const current = prev[locationId] || [];
      const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
      return { ...prev, [locationId]: next };
    });
  };

  const userBalances = (balances.data || []).filter(b => b.user_id === userId);
  const pending = (pendingTimeOff || []).filter(r => r.status === 'pending');
  const upcoming = (pendingTimeOff || []).filter(r => r.status === 'approved' && new Date(r.end_date) >= new Date());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">WORK DAYS</CardTitle>
          </div>
          <CardDescription>Select which days this team member works at each location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : locations.length === 0 ? (
            <p className={tokens.body.muted + ' text-sm'}>No locations configured yet.</p>
          ) : (
            locations.map(loc => {
              const current = edits[loc.id] || [];
              const original = schedules?.find(s => s.location_id === loc.id)?.work_days || [];
              const dirty = !isStructurallyEqual(current.sort(), [...original].sort());
              return (
                <div key={loc.id} className="p-3 rounded-lg border border-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-sans text-sm font-medium text-foreground">{loc.name}</span>
                    {dirty && (
                      <Button
                        size="sm"
                        onClick={() => upsert.mutate({ locationId: loc.id, workDays: current })}
                        disabled={upsert.isPending}
                        className="gap-1.5 h-7"
                      >
                        {upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {DAYS.map(day => {
                      const active = current.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(loc.id, day)}
                          className={cn(
                            'h-9 w-9 rounded-md border text-xs font-medium transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border text-muted-foreground hover:bg-foreground/5',
                          )}
                          aria-label={day}
                        >
                          {DAY_LABELS[day]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">TIME OFF &amp; PTO</CardTitle>
          </div>
          <CardDescription>PTO balances, pending requests, and upcoming approved time off.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-sans text-sm font-medium text-foreground mb-2">PTO balances</p>
            {userBalances.length === 0 ? (
              <p className={tokens.body.muted + ' text-sm'}>No PTO balances tracked yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {userBalances.map(b => (
                  <div key={b.id} className="p-3 rounded-lg border border-border/60">
                    <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">Balance</p>
                    <p className="font-display text-2xl text-foreground">{Number(b.current_balance).toFixed(1)}h</p>
                    <p className="font-sans text-xs text-muted-foreground mt-1">
                      Accrued YTD: {Number(b.accrued_ytd).toFixed(1)}h · Used: {Number(b.used_ytd).toFixed(1)}h
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="font-sans text-sm font-medium text-foreground mb-2">
              Pending requests <Badge variant="outline" className="text-[10px] ml-1">{pending.length}</Badge>
            </p>
            {pending.length === 0 ? (
              <p className={tokens.body.muted + ' text-sm'}>No pending requests.</p>
            ) : (
              <div className="space-y-2">
                {pending.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-md border border-border/60 text-sm">
                    <span className="font-sans text-foreground capitalize">{r.request_type}</span>
                    <span className="font-sans text-muted-foreground">{r.start_date} → {r.end_date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {upcoming.length > 0 && (
            <div>
              <p className="font-sans text-sm font-medium text-foreground mb-2">
                Upcoming approved <Badge variant="outline" className="text-[10px] ml-1">{upcoming.length}</Badge>
              </p>
              <div className="space-y-2">
                {upcoming.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-md border border-border/60 text-sm">
                    <span className="font-sans text-foreground capitalize">{r.request_type}</span>
                    <span className="font-sans text-muted-foreground">{r.start_date} → {r.end_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
