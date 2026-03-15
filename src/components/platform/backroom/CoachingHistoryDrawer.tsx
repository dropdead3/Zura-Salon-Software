import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Mail, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { formatRelativeTime } from '@/lib/format';

interface CoachingHistoryDrawerProps {
  orgId: string | null;
  orgName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CoachingLogEntry {
  id: string;
  created_at: string;
  user_id: string | null;
  details: Record<string, unknown>;
  senderName?: string;
}

export function CoachingHistoryDrawer({ orgId, orgName, open, onOpenChange }: CoachingHistoryDrawerProps) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['coaching-history', orgId],
    enabled: !!orgId && open,
    queryFn: async (): Promise<CoachingLogEntry[]> => {
      const { data, error } = await supabase
        .from('platform_audit_log')
        .select('id, created_at, user_id, details')
        .eq('action', 'coaching_email_sent')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = [...new Set((data || []).map((e) => e.user_id).filter(Boolean))] as string[];
      let userMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (profiles) {
          userMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.full_name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return (data || []).map((e) => ({
        id: e.id,
        created_at: e.created_at,
        user_id: e.user_id,
        details: (e.details as Record<string, unknown>) || {},
        senderName: e.user_id ? userMap[e.user_id] : undefined,
      }));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide uppercase">
            Coaching History
          </DialogTitle>
          <DialogDescription className="font-sans text-sm text-muted-foreground">
            {orgName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className={cn(tokens.empty.container, 'py-12')}>
            <Mail className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No coaching history</h3>
            <p className={tokens.empty.description}>No coaching emails have been sent to this organization yet.</p>
          </div>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            {entries.map((entry) => {
              const reason = (entry.details?.reason as string) || 'Coaching outreach';
              const reweighPct = entry.details?.reweigh_pct as number | undefined;
              const wastePct = entry.details?.waste_pct as number | undefined;

              return (
                <div key={entry.id} className="relative flex gap-3 py-3 pl-0">
                  <div className="relative z-10 flex-shrink-0 w-[30px] flex items-start justify-center pt-0.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-sans text-sm text-foreground truncate">
                        {entry.senderName || 'Platform Admin'}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-muted-foreground">{reason}</p>
                    {(reweighPct != null || wastePct != null) && (
                      <div className="flex gap-3 font-sans text-[11px] text-muted-foreground/70">
                        {reweighPct != null && <span>Reweigh: {reweighPct.toFixed(0)}%</span>}
                        {wastePct != null && <span>Waste: {wastePct.toFixed(1)}%</span>}
                      </div>
                    )}
                    <p className="font-sans text-[11px] text-muted-foreground/50">
                      {formatRelativeTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
