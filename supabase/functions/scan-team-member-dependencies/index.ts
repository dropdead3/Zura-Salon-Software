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
    // Enriched: per-client history (visits, top services, avg ticket) plus a
    // recommended successor (same stylist_level, same location, lowest forward
    // load, earliest hire_date).
    let stylistLevelOfArchived: string | null = null;
    {
      // 10a) Total count (for overflow display)
      const { count: totalCount } = await supabaseAdmin
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("preferred_stylist_id", targetUserId);

      // 10b) Sample of clients (limited)
      const { data: clientRows } = await supabaseAdmin
        .from("clients")
        .select(
          "id, first_name, last_name, last_visit_date, visit_count, total_spend, average_spend, location_id",
        )
        .eq("organization_id", orgId)
        .eq("preferred_stylist_id", targetUserId)
        .order("last_visit_date", { ascending: false, nullsFirst: false })
        .limit(SAMPLE_LIMIT);

      const clientList = clientRows ?? [];
      const clientIds = clientList.map((c) => c.id as string);

      // 10c) Pull history with the archived stylist for these clients
      // (last 12 months of completed appointments).
      const sinceIso = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      type ApptRow = {
        client_id: string | null;
        service_name: string | null;
        total_price: number | string | null;
        start_time: string | null;
      };
      const historyByClient = new Map<string, {
        services: Map<string, number>;
        totals: number[];
        lastVisit: string | null;
      }>();

      if (clientIds.length > 0) {
        const { data: apptRows } = await supabaseAdmin
          .from("appointments")
          .select("client_id, service_name, total_price, start_time")
          .eq("organization_id", orgId)
          .eq("staff_user_id", targetUserId)
          .in("client_id", clientIds)
          .gte("start_time", sinceIso)
          .limit(5000);

        for (const r of (apptRows ?? []) as ApptRow[]) {
          if (!r.client_id) continue;
          let entry = historyByClient.get(r.client_id);
          if (!entry) {
            entry = { services: new Map(), totals: [], lastVisit: null };
            historyByClient.set(r.client_id, entry);
          }
          if (r.service_name) {
            entry.services.set(r.service_name, (entry.services.get(r.service_name) ?? 0) + 1);
          }
          const tp = typeof r.total_price === "string" ? parseFloat(r.total_price) : r.total_price;
          if (tp != null && !Number.isNaN(tp)) entry.totals.push(Number(tp));
          if (r.start_time && (!entry.lastVisit || r.start_time > entry.lastVisit)) {
            entry.lastVisit = r.start_time;
          }
        }
      }

      // 10d) Resolve stylist_level of the archived user (for matching).
      const { data: archivedProfile } = await supabaseAdmin
        .from("employee_profiles")
        .select("stylist_level")
        .eq("organization_id", orgId)
        .eq("user_id", targetUserId)
        .maybeSingle();
      stylistLevelOfArchived = (archivedProfile?.stylist_level as string | null) ?? null;

      // 10e) Eligible roster for recommendation: active stylists in this org
      // (excluding the archived user). Pull stylist_level + hire_date +
      // location_id + name fields.
      const { data: rosterRows } = await supabaseAdmin
        .from("employee_profiles")
        .select("user_id, full_name, display_name, stylist_level, hire_date, location_id, location_ids, is_active, archived_at")
        .eq("organization_id", orgId)
        .neq("user_id", targetUserId)
        .eq("is_active", true)
        .is("archived_at", null);

      type RosterRow = {
        user_id: string;
        full_name: string | null;
        display_name: string | null;
        stylist_level: string | null;
        hire_date: string | null;
        location_id: string | null;
        location_ids: string[] | null;
      };
      const roster = (rosterRows ?? []) as RosterRow[];

      // 10f) Forward-load proxy — count of upcoming appointments per stylist
      // over the next 14 days. Lower = more capacity.
      const horizonIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const loadByUser = new Map<string, number>();
      if (roster.length > 0) {
        const { data: loadRows } = await supabaseAdmin
          .from("appointments")
          .select("staff_user_id")
          .eq("organization_id", orgId)
          .in("staff_user_id", roster.map((r) => r.user_id))
          .gte("start_time", nowIso)
          .lte("start_time", horizonIso)
          .not("status", "in", "(cancelled,no_show,voided)");
        for (const row of (loadRows ?? []) as Array<{ staff_user_id: string | null }>) {
          if (!row.staff_user_id) continue;
          loadByUser.set(row.staff_user_id, (loadByUser.get(row.staff_user_id) ?? 0) + 1);
        }
      }

      // 10g) Recommendation resolver
      function recommendFor(clientLocationId: string | null): {
        userId: string | null;
        reason: string;
      } {
        if (roster.length === 0) return { userId: null, reason: "No eligible teammate" };
        // Score: prefer same level (+100), same location (+25), lower forward load (-load),
        // earlier hire date (tiebreak via earliest date string).
        const scored = roster.map((r) => {
          const sameLevel = stylistLevelOfArchived && r.stylist_level === stylistLevelOfArchived;
          const sameLoc = clientLocationId && (
            r.location_id === clientLocationId ||
            (r.location_ids ?? []).includes(clientLocationId)
          );
          const load = loadByUser.get(r.user_id) ?? 0;
          const score = (sameLevel ? 100 : 0) + (sameLoc ? 25 : 0) - load;
          return { r, score, load, sameLevel: !!sameLevel, sameLoc: !!sameLoc };
        });
        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          // tiebreak: earliest hire_date (most senior)
          const ah = a.r.hire_date ?? "9999-12-31";
          const bh = b.r.hire_date ?? "9999-12-31";
          return ah.localeCompare(bh);
        });
        const top = scored[0];
        const reasonParts: string[] = [];
        if (top.sameLevel) reasonParts.push("Same level");
        else if (stylistLevelOfArchived) reasonParts.push("Closest fit");
        if (top.sameLoc) reasonParts.push("Same location");
        const capacityWord = top.load === 0
          ? "Wide open next 14 days"
          : `${top.load} booked next 14 days`;
        reasonParts.push(capacityWord);
        return { userId: top.r.user_id, reason: reasonParts.join(" · ") };
      }

      // 10h) Build enriched items
      const items = clientList.map((c) => {
        const hist = historyByClient.get(c.id as string);
        const topServices = hist
          ? Array.from(hist.services.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([name]) => name)
          : [];
        const avgTicket = hist && hist.totals.length > 0
          ? hist.totals.reduce((s, n) => s + n, 0) / hist.totals.length
          : (typeof c.average_spend === "string" ? parseFloat(c.average_spend) : (c.average_spend ?? 0));
        const lastVisitWithStylist = hist?.lastVisit ?? null;
        const recommendation = recommendFor(c.location_id as string | null);

        return {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          last_visit_date: c.last_visit_date,
          last_visit_with_stylist: lastVisitWithStylist,
          visit_count: c.visit_count ?? 0,
          avg_ticket: Number(avgTicket) || 0,
          top_services: topServices,
          location_id: c.location_id,
          recommended_user_id: recommendation.userId,
          recommendation_reason: recommendation.reason,
        };
      });

      buckets.push({
        key: "client_preferences",
        label: "Clients with this stylist as preferred",
        count: totalCount ?? items.length,
        items,
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
        stylistLevelOfArchived,
        buckets,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return authErrorResponse(err, corsHeaders);
  }
});
