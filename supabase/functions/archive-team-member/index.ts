// Archive a team member with a reassignment ledger.
// Auth: caller must be an org admin of `organizationId`.
// Behavior:
//   1. Apply each reassignment row.
//   2. End-date recurring schedules (delete forward rows).
//   3. Mark profile is_active=false, deactivated_*, archived_*.
//   4. Wipe login PIN.
//   5. Insert one row into team_member_archive_log.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  requireAuth,
  requireOrgAdmin,
  authErrorResponse,
} from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "reassign" | "cancel" | "drop" | "end_date";

interface Reassignment {
  bucket: string;
  itemId: string;
  destinationUserId: string | null;
  action: Action;
}

interface Body {
  organizationId: string;
  userId: string;
  reason: string;
  effectiveDate?: string; // YYYY-MM-DD
  reassignments: Reassignment[];
  notifyReassignedClients?: boolean;
}

async function applyReassignment(
  supabase: any,
  orgId: string,
  archivedUserId: string,
  r: Reassignment,
): Promise<{ ok: boolean; error?: string }> {
  try {
    switch (r.bucket) {
      case "appointments": {
        if (r.action === "reassign" && r.destinationUserId) {
          await supabase
            .from("appointments")
            .update({ staff_user_id: r.destinationUserId })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        } else if (r.action === "cancel") {
          await supabase
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        }
        return { ok: true };
      }
      case "service_assignments": {
        if (r.action === "reassign" && r.destinationUserId) {
          await supabase
            .from("appointment_service_assignments")
            .update({ assigned_user_id: r.destinationUserId })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        } else if (r.action === "drop") {
          await supabase
            .from("appointment_service_assignments")
            .delete()
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        }
        return { ok: true };
      }
      case "appointment_assistants": {
        if (r.action === "reassign" && r.destinationUserId) {
          await supabase
            .from("appointment_assistants")
            .update({ assistant_user_id: r.destinationUserId })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        } else if (r.action === "drop") {
          await supabase
            .from("appointment_assistants")
            .delete()
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        }
        return { ok: true };
      }
      case "assistant_requests": {
        if (r.action === "reassign" && r.destinationUserId) {
          await supabase
            .from("assistant_requests")
            .update({ assistant_id: r.destinationUserId })
            .eq("id", r.itemId);
        } else if (r.action === "cancel") {
          await supabase
            .from("assistant_requests")
            .update({ status: "cancelled" })
            .eq("id", r.itemId);
        }
        return { ok: true };
      }
      case "operational_tasks": {
        if (r.action === "reassign" && r.destinationUserId) {
          await supabase
            .from("operational_tasks")
            .update({ assigned_to: r.destinationUserId })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        } else if (r.action === "cancel") {
          await supabase
            .from("operational_tasks")
            .update({ status: "cancelled" })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        }
        return { ok: true };
      }
      case "seo_tasks": {
        if (r.action === "reassign" && r.destinationUserId) {
          await supabase
            .from("seo_tasks")
            .update({ assigned_to: r.destinationUserId })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        } else if (r.action === "cancel") {
          await supabase
            .from("seo_tasks")
            .update({ status: "cancelled" })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        }
        return { ok: true };
      }
      case "shift_swaps": {
        if (r.action === "reassign" && r.destinationUserId) {
          // Only manager_id is reassignable in practice.
          await supabase
            .from("shift_swaps")
            .update({ manager_id: r.destinationUserId })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        } else if (r.action === "cancel") {
          await supabase
            .from("shift_swaps")
            .update({ status: "cancelled" })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        }
        return { ok: true };
      }
      case "meeting_requests": {
        if (r.action === "reassign" && r.destinationUserId) {
          await supabase
            .from("meeting_requests")
            .update({ manager_id: r.destinationUserId })
            .eq("id", r.itemId);
        } else if (r.action === "cancel") {
          await supabase
            .from("meeting_requests")
            .update({ status: "cancelled" })
            .eq("id", r.itemId);
        }
        return { ok: true };
      }
      case "employee_location_schedules": {
        // We "end-date" by deleting; the table has no end_date column.
        if (r.action === "end_date" || r.action === "drop") {
          await supabase
            .from("employee_location_schedules")
            .delete()
            .eq("id", r.itemId)
            .eq("user_id", archivedUserId);
        }
        return { ok: true };
      }
      case "client_preferences": {
        // Bulk op. itemId is unused; we update all matching rows.
        if (r.action === "reassign" && r.destinationUserId) {
          await supabase
            .from("clients")
            .update({ preferred_stylist_id: r.destinationUserId })
            .eq("organization_id", orgId)
            .eq("preferred_stylist_id", archivedUserId);
        } else if (r.action === "drop") {
          await supabase
            .from("clients")
            .update({ preferred_stylist_id: null })
            .eq("organization_id", orgId)
            .eq("preferred_stylist_id", archivedUserId);
        }
        return { ok: true };
      }
      case "walk_in_queue": {
        if (r.action === "reassign" && r.destinationUserId) {
          await supabase
            .from("walk_in_queue")
            .update({ assigned_stylist_id: r.destinationUserId })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        } else if (r.action === "drop") {
          await supabase
            .from("walk_in_queue")
            .update({ assigned_stylist_id: null })
            .eq("id", r.itemId)
            .eq("organization_id", orgId);
        }
        return { ok: true };
      }
      default:
        return { ok: false, error: `Unknown bucket: ${r.bucket}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, supabaseAdmin } = await requireAuth(req);
    const body = (await req.json()) as Body;

    if (!body.organizationId || !body.userId || !body.reason) {
      return new Response(
        JSON.stringify({ error: "organizationId, userId, and reason are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await requireOrgAdmin(supabaseAdmin, user.id, body.organizationId);

    if (body.userId === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot archive your own account from here." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Confirm the target user actually belongs to this org.
    const { data: targetProfile, error: profileErr } = await supabaseAdmin
      .from("employee_profiles")
      .select("user_id, organization_id, archived_at")
      .eq("user_id", body.userId)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!targetProfile || targetProfile.organization_id !== body.organizationId) {
      return new Response(
        JSON.stringify({ error: "Target user is not part of this organization." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (targetProfile.archived_at) {
      return new Response(
        JSON.stringify({ error: "User is already archived." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Apply reassignments serially so failures are reportable.
    const ledger: Array<Reassignment & { ok: boolean; error?: string }> = [];
    for (const r of body.reassignments ?? []) {
      const result = await applyReassignment(
        supabaseAdmin,
        body.organizationId,
        body.userId,
        r,
      );
      ledger.push({ ...r, ...result });
    }

    const failed = ledger.filter((l) => !l.ok);
    if (failed.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Some reassignments failed; archive aborted.",
          failed,
          ledger,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark profile archived + deactivated.
    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from("employee_profiles")
      .update({
        is_active: false,
        deactivated_at: nowIso,
        deactivated_by: user.id,
        archived_at: nowIso,
        archived_by: user.id,
        archive_reason: body.reason,
        last_day_worked: body.effectiveDate ?? new Date().toISOString().slice(0, 10),
      })
      .eq("user_id", body.userId)
      .eq("organization_id", body.organizationId);
    if (updErr) throw updErr;

    // Wipe login PIN to revoke quick-login.
    await supabaseAdmin
      .from("employee_pins")
      .update({ login_pin: null })
      .eq("user_id", body.userId)
      .eq("organization_id", body.organizationId);

    // Write the archive log.
    const { data: logRow, error: logErr } = await supabaseAdmin
      .from("team_member_archive_log")
      .insert({
        organization_id: body.organizationId,
        user_id: body.userId,
        archived_by: user.id,
        reason: body.reason,
        effective_date: body.effectiveDate ?? null,
        reassignment_ledger: ledger,
      })
      .select()
      .single();
    if (logErr) throw logErr;

    return new Response(
      JSON.stringify({
        ok: true,
        archive_log_id: logRow.id,
        ledger,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return authErrorResponse(err, corsHeaders);
  }
});
