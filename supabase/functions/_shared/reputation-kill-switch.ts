// Shared kill-switch helper for the Reputation engine.
//
// Provides a single source of truth for platform-wide disable flags.
// Edge functions short-circuit when the relevant flag is true, returning
// a structured `{ skipped: true, reason }` payload so callers/cron can
// treat it as a non-error no-op.
//
// Reads the singleton row from `public.reputation_kill_switches`. If the
// row is missing or the query fails, kill switches are treated as OFF
// (fail-open) so an outage in this read path never silently halts dispatch.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ReputationKillSwitchKey =
  | "dispatch_disabled"
  | "manual_send_disabled"
  | "webhook_processing_disabled";

export interface ReputationKillSwitches {
  dispatch_disabled: boolean;
  manual_send_disabled: boolean;
  webhook_processing_disabled: boolean;
  disabled_reason: string | null;
}

const DEFAULT_SWITCHES: ReputationKillSwitches = {
  dispatch_disabled: false,
  manual_send_disabled: false,
  webhook_processing_disabled: false,
  disabled_reason: null,
};

export async function fetchReputationKillSwitches(
  supabase?: SupabaseClient,
): Promise<ReputationKillSwitches> {
  const client = supabase ?? createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await client
    .from("reputation_kill_switches")
    .select("dispatch_disabled, manual_send_disabled, webhook_processing_disabled, disabled_reason")
    .eq("singleton", true)
    .maybeSingle();
  if (error || !data) return DEFAULT_SWITCHES;
  return data as ReputationKillSwitches;
}

export interface KillSwitchGuardResult {
  blocked: boolean;
  reason?: string;
  message?: string;
}

export async function checkReputationKillSwitch(
  key: ReputationKillSwitchKey,
  supabase?: SupabaseClient,
): Promise<KillSwitchGuardResult> {
  const switches = await fetchReputationKillSwitches(supabase);
  if (switches[key]) {
    return {
      blocked: true,
      reason: `${key.replace("_disabled", "")}_globally_disabled`,
      message: switches.disabled_reason ?? "Reputation engine temporarily disabled by Zura platform staff.",
    };
  }
  return { blocked: false };
}
