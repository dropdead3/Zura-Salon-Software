import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useBackfillOrgSetup } from "./useBackfillOrgSetup";

const BACKFILL_ATTEMPT_KEY = "zura.setup.backfill.attempted";
const BACKFILL_BANNER_KEY = "zura.setup.backfill.banner";

/**
 * useBackfillTrigger — runs once per legacy org per (user, org).
 *
 * Wave 12: state is mirrored to `org_setup_user_state` so switching browsers
 * doesn't re-trigger the backfill or re-show the banner. localStorage is a
 * write-through cache for offline resilience.
 */
export function useBackfillTrigger() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const backfill = useBackfillOrgSetup();
  const qc = useQueryClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (!user?.id || !effectiveOrganization?.id) return;
    const orgId = effectiveOrganization.id;
    const userId = user.id;
    const attemptKey = `${BACKFILL_ATTEMPT_KEY}.${userId}.${orgId}`;

    // Local cache short-circuit
    if (localStorage.getItem(attemptKey)) {
      ranRef.current = true;
      return;
    }
    ranRef.current = true;

    (async () => {
      try {
        // Wave 12: check DB-backed state first (cross-browser durability)
        const { data: stateRow } = await supabase
          .from("org_setup_user_state")
          .select("backfill_attempted_at")
          .eq("user_id", userId)
          .eq("organization_id", orgId)
          .maybeSingle();
        if (stateRow?.backfill_attempted_at) {
          localStorage.setItem(attemptKey, stateRow.backfill_attempted_at);
          return;
        }

        // Eligibility: setup not complete + has at least one active location
        const [{ data: org }, { count }] = await Promise.all([
          supabase
            .from("organizations")
            .select("id, setup_completed_at")
            .eq("id", orgId)
            .maybeSingle(),
          supabase
            .from("locations")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("is_active", true),
        ]);

        const stamp = new Date().toISOString();
        const markAttempted = async () => {
          localStorage.setItem(attemptKey, stamp);
          await supabase.from("org_setup_user_state").upsert(
            {
              user_id: userId,
              organization_id: orgId,
              backfill_attempted_at: stamp,
            },
            { onConflict: "user_id,organization_id" },
          );
        };

        if (!org || org.setup_completed_at) {
          await markAttempted();
          return;
        }
        if (!count || count < 1) {
          await markAttempted();
          return;
        }

        const result = await backfill.mutateAsync({ organization_id: orgId });
        await markAttempted();

        if (result?.backfilled > 0) {
          localStorage.setItem(
            `${BACKFILL_BANNER_KEY}.${userId}.${orgId}`,
            JSON.stringify({
              backfilled: result.backfilled,
              pending: result.pending,
              shown: false,
            }),
          );
          qc.invalidateQueries({ queryKey: ["org-setup-commit-log", orgId] });
        }
      } catch (err) {
        console.warn("[useBackfillTrigger] silent failure:", err);
        // Don't mark attempted on error — we'll retry next session.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, effectiveOrganization?.id]);
}

/** 24h in ms — snooze duration when the user X's the banner or bounces back from the wizard */
const SNOOZE_MS = 24 * 60 * 60 * 1000;

interface BannerState {
  backfilled?: number;
  pending?: number;
  /** Permanently hidden — only set when setup is fully completed */
  shown?: boolean;
  /** Soft-dismissed; banner returns after this timestamp */
  snoozedUntil?: number;
}

/** Read banner state for the current (user, org) pair */
export function readBackfillBanner(
  userId: string | undefined,
  orgId: string | undefined,
): BannerState | null {
  if (!userId || !orgId) return null;
  const raw = localStorage.getItem(`${BACKFILL_BANNER_KEY}.${userId}.${orgId}`);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as BannerState;
    // Snooze expired → treat as fresh
    if (state.snoozedUntil && state.snoozedUntil < Date.now()) {
      delete state.snoozedUntil;
    }
    return state;
  } catch {
    return null;
  }
}

/**
 * Hydrate banner state from the DB into localStorage. Call on app boot or
 * when (user, org) becomes known to ensure cross-browser parity.
 */
export async function hydrateBackfillStateFromDb(
  userId: string,
  orgId: string,
): Promise<void> {
  try {
    const { data } = await supabase
      .from("org_setup_user_state")
      .select("snoozed_until, dismissed_at")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (!data) return;

    const existing = readBackfillBanner(userId, orgId) ?? {};
    const merged: BannerState = { ...existing };

    if (data.dismissed_at) {
      merged.shown = true;
      delete merged.snoozedUntil;
    } else if (data.snoozed_until) {
      const ts = new Date(data.snoozed_until).getTime();
      if (ts > Date.now()) merged.snoozedUntil = ts;
    }

    localStorage.setItem(
      `${BACKFILL_BANNER_KEY}.${userId}.${orgId}`,
      JSON.stringify(merged),
    );
  } catch (err) {
    console.warn("[hydrateBackfillStateFromDb] failed:", err);
  }
}

/**
 * Soft-dismiss the banner — hides for 24h, then it returns automatically.
 * Use for the X button and "remind me" style exits so users can come back to setup.
 */
export function snoozeBackfillBanner(userId: string, orgId: string) {
  const existing = readBackfillBanner(userId, orgId) ?? {};
  const snoozedUntil = Date.now() + SNOOZE_MS;
  localStorage.setItem(
    `${BACKFILL_BANNER_KEY}.${userId}.${orgId}`,
    JSON.stringify({
      ...existing,
      shown: false,
      snoozedUntil,
    }),
  );
  // Mirror to DB (cross-browser durability)
  void supabase
    .from("org_setup_user_state")
    .upsert(
      {
        user_id: userId,
        organization_id: orgId,
        snoozed_until: new Date(snoozedUntil).toISOString(),
      },
      { onConflict: "user_id,organization_id" },
    )
    .then(({ error }) => {
      if (error) console.warn("[snoozeBackfillBanner] db mirror failed:", error);
    });
  supabase.functions
    .invoke("enqueue-setup-followup", { body: { organization_id: orgId } })
    .catch((err) =>
      console.warn("[snoozeBackfillBanner] enqueue failed:", err),
    );
}

/**
 * Permanently dismiss the banner. Reserved for true completion
 * (intent + apps committed). Once set, the banner never returns.
 */
export function dismissBackfillBanner(userId: string, orgId: string) {
  localStorage.setItem(
    `${BACKFILL_BANNER_KEY}.${userId}.${orgId}`,
    JSON.stringify({ shown: true }),
  );
  // Mirror to DB so other browsers honor the dismissal
  void supabase
    .from("org_setup_user_state")
    .upsert(
      {
        user_id: userId,
        organization_id: orgId,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,organization_id" },
    )
    .then(({ error }) => {
      if (error) console.warn("[dismissBackfillBanner] db mirror failed:", error);
    });
}
