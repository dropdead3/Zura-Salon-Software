import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useBackfillOrgSetup } from "./useBackfillOrgSetup";

const BACKFILL_ATTEMPT_KEY = "zura.setup.backfill.attempted";
const BACKFILL_BANNER_KEY = "zura.setup.backfill.banner";

/**
 * useBackfillTrigger — runs once per legacy org per browser.
 *
 * Eligibility (all must be true):
 * - User is authenticated and an org admin
 * - Organization has setup_completed_at = null
 * - Organization has at least 1 active location (non-empty operation)
 * - We haven't attempted backfill for this (user, org) pair this browser
 *
 * On success it sets a per-(user,org) banner key so the welcome banner can
 * surface exactly once. Idempotent on the server side too.
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
    const attemptKey = `${BACKFILL_ATTEMPT_KEY}.${user.id}.${orgId}`;

    // Already attempted in this browser — never retry.
    if (localStorage.getItem(attemptKey)) {
      ranRef.current = true;
      return;
    }
    ranRef.current = true;

    (async () => {
      try {
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

        if (!org || org.setup_completed_at) {
          localStorage.setItem(attemptKey, new Date().toISOString());
          return;
        }
        if (!count || count < 1) {
          // Empty operation — let them go through the wizard normally.
          localStorage.setItem(attemptKey, new Date().toISOString());
          return;
        }

        const result = await backfill.mutateAsync({ organization_id: orgId });
        localStorage.setItem(attemptKey, new Date().toISOString());

        if (result?.backfilled > 0) {
          localStorage.setItem(
            `${BACKFILL_BANNER_KEY}.${user.id}.${orgId}`,
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

/** Read banner state for the current (user, org) pair */
export function readBackfillBanner(
  userId: string | undefined,
  orgId: string | undefined,
): { backfilled: number; pending: number; shown: boolean } | null {
  if (!userId || !orgId) return null;
  const raw = localStorage.getItem(`${BACKFILL_BANNER_KEY}.${userId}.${orgId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Mark banner dismissed and enqueue a 48h follow-up nudge (fire-and-forget) */
export function dismissBackfillBanner(userId: string, orgId: string) {
  localStorage.setItem(
    `${BACKFILL_BANNER_KEY}.${userId}.${orgId}`,
    JSON.stringify({ shown: true }),
  );
  supabase.functions
    .invoke("enqueue-setup-followup", { body: { organization_id: orgId } })
    .catch((err) =>
      console.warn("[dismissBackfillBanner] enqueue failed:", err),
    );
}
