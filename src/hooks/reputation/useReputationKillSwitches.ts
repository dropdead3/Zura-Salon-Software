/**
 * useReputationKillSwitches — Platform-staff hook for reading and mutating
 * the singleton `reputation_kill_switches` row. Mirrors the Color Bar
 * platform-control pattern but for the Reputation engine.
 *
 * Three independent flags:
 *   - dispatch_disabled        → halts the hourly dispatch cron
 *   - manual_send_disabled     → blocks operator-triggered manual sends
 *   - webhook_processing_disabled → no-ops the Stripe reputation branch
 *
 * Edge functions read these via the `_shared/reputation-kill-switch.ts`
 * helper. Setting a flag also writes a `reputation_admin_actions` audit row.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReputationKillSwitchKey =
  | 'dispatch_disabled'
  | 'manual_send_disabled'
  | 'webhook_processing_disabled';

export interface ReputationKillSwitchesRow {
  id: string;
  dispatch_disabled: boolean;
  manual_send_disabled: boolean;
  webhook_processing_disabled: boolean;
  disabled_reason: string | null;
  disabled_by: string | null;
  disabled_at: string | null;
  updated_at: string;
}

const QUERY_KEY = ['platform-reputation-kill-switches'] as const;

export function useReputationKillSwitches() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ReputationKillSwitchesRow | null> => {
      const { data, error } = await supabase
        .from('reputation_kill_switches' as any)
        .select('*')
        .eq('singleton', true)
        .maybeSingle();
      if (error) throw error;
      return (data as ReputationKillSwitchesRow) ?? null;
    },
    staleTime: 30_000,
  });
}

export function useToggleReputationKillSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      key: ReputationKillSwitchKey;
      enabled: boolean;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = {
        [args.key]: args.enabled,
        updated_at: new Date().toISOString(),
      };
      // Stamp actor/reason whenever any switch is being engaged
      if (args.enabled) {
        patch.disabled_by = user?.id ?? null;
        patch.disabled_at = new Date().toISOString();
        if (args.reason) patch.disabled_reason = args.reason;
      }
      const { error } = await supabase
        .from('reputation_kill_switches' as any)
        .update(patch)
        .eq('singleton', true);
      if (error) throw error;

      // Best-effort audit insert
      await supabase.from('reputation_admin_actions' as any).insert({
        actor_user_id: user?.id ?? null,
        action_type: `kill_switch.${args.key}.${args.enabled ? 'engaged' : 'cleared'}`,
        reason: args.reason ?? null,
        metadata: { key: args.key, enabled: args.enabled },
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(
        vars.enabled
          ? `Kill switch engaged: ${vars.key.replace('_disabled', '')}`
          : `Kill switch cleared: ${vars.key.replace('_disabled', '')}`,
      );
    },
    onError: (err: any) => {
      toast.error('Could not update kill switch: ' + (err?.message ?? 'unknown'));
    },
  });
}
