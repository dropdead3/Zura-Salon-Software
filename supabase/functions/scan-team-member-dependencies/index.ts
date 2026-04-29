// Dependency scan for the Team Member Archive Wizard.
// Returns counts + first-N samples per "bucket" of work owned by a team member
// that would be orphaned if they were archived. Read-only.
//
// Auth: caller must be an org admin (super_admin/admin) of `organizationId`.

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

const SAMPLE_LIMIT = 200; // hard cap per bucket

interface Body {
  organizationId: string;
  userId: string;
}

interface BucketResult {
  key: string;
  label: string;
  count: number;
  items: Array<Record<string, unknown>>;
  /**
   * Hint to the UI for which roster filter applies to the destination
   * picker. 'stylist' | 'stylist_assistant' | 'manager' | 'any'
   */
  destinationRole: "stylist" | "stylist_assistant" | "manager" | "any";
  /** What the wizard is allowed to offer for this bucket. */
  actions: Array<"reassign" | "cancel" | "drop" | "end_date">;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, supabaseAdmin } = await requireAuth(req);
    const body = (await req.json()) as Body;

    if (!body.organizationId || !body.userId) {
      return new Response(
        JSON.stringify({ error: "organizationId and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await requireOrgAdmin(supabaseAdmin, user.id, body.organizationId);

    const orgId = body.organizationId;
    const targetUserId = body.userId;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);

    const buckets: BucketResult[] = [];

    // ---------- 1) Upcoming appointments (as primary stylist) ----------
    {
      const { data, count } = await supabaseAdmin
        .from("appointments")
        .select(
          "id, start_time, end_time, status, client_name, service_name",
          { count: "exact" },
        )
        .eq("organization_id", orgId)
        .eq("staff_user_id", targetUserId)
        .gte("start_time", nowIso)
        .not("status", "in", "(completed,cancelled,no_show,voided)")
        .order("start_time", { ascending: true })
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "appointments",
        label: "Upcoming appointments",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "stylist",
        actions: ["reassign", "cancel"],
      });
    }

    // ---------- 2) Service-line assignments on future appointments ----------
    {
      const { data, count } = await supabaseAdmin
        .from("appointment_service_assignments")
        .select(
          "id, service_name, appointment_id, assigned_staff_name, appointments!inner(start_time, status)",
          { count: "exact" },
        )
        .eq("organization_id", orgId)
        .eq("assigned_user_id", targetUserId)
        .gte("appointments.start_time", nowIso)
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "service_assignments",
        label: "Service-line assignments",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "stylist",
        actions: ["reassign", "drop"],
      });
    }

    // ---------- 3) Appointment assistant pairings ----------
    {
      const { data, count } = await supabaseAdmin
        .from("appointment_assistants")
        .select(
          "id, appointment_id, assist_duration_minutes, appointments!inner(start_time, client_name)",
          { count: "exact" },
        )
        .eq("organization_id", orgId)
        .eq("assistant_user_id", targetUserId)
        .gte("appointments.start_time", nowIso)
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "appointment_assistants",
        label: "Assistant pairings",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "stylist_assistant",
        actions: ["reassign", "drop"],
      });
    }

    // ---------- 4) Pending assistant requests (as stylist OR assistant) ----------
    {
      const { data, count } = await supabaseAdmin
        .from("assistant_requests")
        .select(
          "id, request_date, start_time, end_time, status, client_name, stylist_id, assistant_id",
          { count: "exact" },
        )
        .or(`stylist_id.eq.${targetUserId},assistant_id.eq.${targetUserId}`)
        .in("status", ["pending", "accepted", "assigned"])
        .gte("request_date", todayDate)
        .order("request_date", { ascending: true })
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "assistant_requests",
        label: "Pending assistant requests",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "stylist_assistant",
        actions: ["reassign", "cancel"],
      });
    }

    // ---------- 5) Open operational tasks ----------
    {
      const { data, count } = await supabaseAdmin
        .from("operational_tasks")
        .select("id, title, due_at, priority, status, task_type", {
          count: "exact",
        })
        .eq("organization_id", orgId)
        .eq("assigned_to", targetUserId)
        .not("status", "in", "(completed,resolved,cancelled,dismissed)")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "operational_tasks",
        label: "Open operational tasks",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "any",
        actions: ["reassign", "cancel"],
      });
    }

    // ---------- 6) Open SEO tasks ----------
    {
      const { data, count } = await supabaseAdmin
        .from("seo_tasks")
        .select("id, template_key, due_at, priority_score, status", {
          count: "exact",
        })
        .eq("organization_id", orgId)
        .eq("assigned_to", targetUserId)
        .not("status", "in", "(completed,verified,cancelled,dismissed)")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "seo_tasks",
        label: "Open SEO tasks",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "any",
        actions: ["reassign", "cancel"],
      });
    }

    // ---------- 7) Open shift swaps ----------
    {
      const { data, count } = await supabaseAdmin
        .from("shift_swaps")
        .select(
          "id, requester_id, claimer_id, manager_id, original_date, status",
          { count: "exact" },
        )
        .eq("organization_id", orgId)
        .or(
          `requester_id.eq.${targetUserId},claimer_id.eq.${targetUserId},manager_id.eq.${targetUserId}`,
        )
        .in("status", ["pending", "open", "approved"])
        .order("original_date", { ascending: true })
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "shift_swaps",
        label: "Open shift swaps",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "manager",
        actions: ["reassign", "cancel"],
      });
    }

    // ---------- 8) Pending meeting requests ----------
    {
      const { data, count } = await supabaseAdmin
        .from("meeting_requests")
        .select(
          "id, manager_id, team_member_id, reason, priority, status, expires_at",
          { count: "exact" },
        )
        .or(
          `manager_id.eq.${targetUserId},team_member_id.eq.${targetUserId}`,
        )
        .in("status", ["pending", "open", "scheduled"])
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "meeting_requests",
        label: "Pending meeting requests",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "manager",
        actions: ["reassign", "cancel"],
      });
    }

    // ---------- 9) Recurring location schedules ----------
    {
      const { data, count } = await supabaseAdmin
        .from("employee_location_schedules")
        .select("id, location_id, work_days", { count: "exact" })
        .eq("user_id", targetUserId)
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "employee_location_schedules",
        label: "Recurring schedules",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "any",
        actions: ["end_date"],
      });
    }

    // ---------- 10) Client preferences referencing this stylist ----------
    {
      const { count } = await supabaseAdmin
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("preferred_stylist_id", targetUserId);

      buckets.push({
        key: "client_preferences",
        label: "Clients with this stylist as preferred",
        count: count ?? 0,
        items: [],
        destinationRole: "stylist",
        actions: ["reassign", "drop"],
      });
    }

    // ---------- 11) Walk-in queue assignments (active only) ----------
    {
      const { data, count } = await supabaseAdmin
        .from("walk_in_queue")
        .select("id, client_name, status, created_at", { count: "exact" })
        .eq("organization_id", orgId)
        .eq("assigned_stylist_id", targetUserId)
        .in("status", ["queued", "assigned", "in_progress"])
        .limit(SAMPLE_LIMIT);

      buckets.push({
        key: "walk_in_queue",
        label: "Active walk-in assignments",
        count: count ?? data?.length ?? 0,
        items: data ?? [],
        destinationRole: "stylist",
        actions: ["reassign", "drop"],
      });
    }

    // Summary
    const totalBlocking = buckets
      .filter((b) =>
        ["appointments", "appointment_assistants", "assistant_requests"].includes(
          b.key,
        )
      )
      .reduce((s, b) => s + b.count, 0);

    return new Response(
      JSON.stringify({
        userId: targetUserId,
        organizationId: orgId,
        scannedAt: nowIso,
        totalBlocking,
        buckets,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return authErrorResponse(err, corsHeaders);
  }
});
