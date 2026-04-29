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
    // Enriched: per-client history (visits, top services with IDs, avg ticket,
    // contact reachability) plus a recommended successor (same stylist_level,
    // same location, lowest forward load, earliest hire_date).
    let stylistLevelOfArchived: string | null = null;
    let eligibleStylistsPayload: Array<{
      user_id: string;
      display_name: string | null;
      full_name: string | null;
      stylist_level: string | null;
      location_id: string | null;
      hire_date: string | null;
      daily_load: number[];
      qualified_service_ids: string[];
    }> = [];
    {
      // 10a) Total count (for overflow display)
      const { count: totalCount } = await supabaseAdmin
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("preferred_stylist_id", targetUserId);

      // 10b) Sample of clients (limited) — include contact fields for soft-notify triage
      const { data: clientRows } = await supabaseAdmin
        .from("clients")
        .select(
          "id, first_name, last_name, last_visit_date, visit_count, total_spend, average_spend, location_id, email_normalized, phone_normalized",
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

      // 10f) Forward-load histogram per stylist — daily count over next 14 days.
      // Lower = more capacity. Drives the inline capacity sparkline + smart split.
      const horizonMs = Date.now() + 14 * 24 * 60 * 60 * 1000;
      const horizonIso = new Date(horizonMs).toISOString();
      const todayMs = new Date(todayDate + "T00:00:00").getTime();
      const dailyLoadByUser = new Map<string, number[]>();
      const initDailyLoad = (uid: string) => {
        if (!dailyLoadByUser.has(uid)) {
          dailyLoadByUser.set(uid, new Array(14).fill(0));
        }
        return dailyLoadByUser.get(uid)!;
      };
      if (roster.length > 0) {
        const { data: loadRows } = await supabaseAdmin
          .from("appointments")
          .select("staff_user_id, start_time")
          .eq("organization_id", orgId)
          .in("staff_user_id", roster.map((r) => r.user_id))
          .gte("start_time", nowIso)
          .lte("start_time", horizonIso)
          .not("status", "in", "(cancelled,no_show,voided)");
        for (const row of (loadRows ?? []) as Array<{ staff_user_id: string | null; start_time: string | null }>) {
          if (!row.staff_user_id || !row.start_time) continue;
          const day = Math.floor((new Date(row.start_time).getTime() - todayMs) / (24 * 60 * 60 * 1000));
          if (day < 0 || day >= 14) continue;
          initDailyLoad(row.staff_user_id)[day] += 1;
        }
      }
      const totalLoadFor = (uid: string): number =>
        (dailyLoadByUser.get(uid) ?? []).reduce((a, b) => a + b, 0);

      // 10f.2) Skill matrix — which eligible stylists are qualified for which services.
      // Empty when the org doesn't track qualifications, so we never false-flag.
      const qualificationsByUser = new Map<string, Set<string>>();
      if (roster.length > 0) {
        const { data: qualRows } = await supabaseAdmin
          .from("staff_service_qualifications")
          .select("user_id, service_id")
          .in("user_id", roster.map((r) => r.user_id))
          .eq("is_active", true);
        for (const q of (qualRows ?? []) as Array<{ user_id: string; service_id: string }>) {
          if (!qualificationsByUser.has(q.user_id)) qualificationsByUser.set(q.user_id, new Set());
          qualificationsByUser.get(q.user_id)!.add(q.service_id);
        }
      }

      // 10f.3) Resolve service IDs for the union of all top service NAMES across clients.
      // One batched query, name -> id. Names with no match keep id=null (UI treats
      // as unknown — no skill check possible).
      const allServiceNames = new Set<string>();
      for (const entry of historyByClient.values()) {
        const top3 = Array.from(entry.services.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        for (const [name] of top3) allServiceNames.add(name);
      }
      const serviceNameToId = new Map<string, string>();
      if (allServiceNames.size > 0) {
        const { data: svcRows } = await supabaseAdmin
          .from("services")
          .select("id, name")
          .eq("organization_id", orgId)
          .in("name", Array.from(allServiceNames));
        for (const s of (svcRows ?? []) as Array<{ id: string; name: string }>) {
          // First match wins per name (services may legitimately repeat across locations)
          if (!serviceNameToId.has(s.name)) serviceNameToId.set(s.name, s.id);
        }
      }

      // 10g) Recommendation resolver — capacity word dropped from the reason
      // string (sparkline carries that signal in the UI).
      function recommendFor(clientLocationId: string | null): {
        userId: string | null;
        reason: string;
      } {
        if (roster.length === 0) return { userId: null, reason: "No eligible teammate" };
        const scored = roster.map((r) => {
          const sameLevel = stylistLevelOfArchived && r.stylist_level === stylistLevelOfArchived;
          const sameLoc = clientLocationId && (
            r.location_id === clientLocationId ||
            (r.location_ids ?? []).includes(clientLocationId)
          );
          const load = totalLoadFor(r.user_id);
          const score = (sameLevel ? 100 : 0) + (sameLoc ? 25 : 0) - load;
          return { r, score, load, sameLevel: !!sameLevel, sameLoc: !!sameLoc };
        });
        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const ah = a.r.hire_date ?? "9999-12-31";
          const bh = b.r.hire_date ?? "9999-12-31";
          return ah.localeCompare(bh);
        });
        const top = scored[0];
        const reasonParts: string[] = [];
        if (top.sameLevel) reasonParts.push("Same level");
        else if (stylistLevelOfArchived) reasonParts.push("Closest fit");
        if (top.sameLoc) reasonParts.push("Same location");
        if (reasonParts.length === 0) reasonParts.push("Best available match");
        return { userId: top.r.user_id, reason: reasonParts.join(" · ") };
      }

      // 10g.2) Build top-level eligibleStylists payload (capacity + skills baked in)
      eligibleStylistsPayload = roster.map((r) => ({
        user_id: r.user_id,
        display_name: r.display_name,
        full_name: r.full_name,
        stylist_level: r.stylist_level,
        location_id: r.location_id,
        hire_date: r.hire_date,
        daily_load: dailyLoadByUser.get(r.user_id) ?? new Array(14).fill(0),
        qualified_service_ids: Array.from(qualificationsByUser.get(r.user_id) ?? []),
      }));

      // 10h) Build enriched items
      const items = clientList.map((c) => {
        const hist = historyByClient.get(c.id as string);
        const topServices = hist
          ? Array.from(hist.services.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([name]) => ({ id: serviceNameToId.get(name) ?? null, name }))
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
          has_email: !!c.email_normalized,
          has_phone: !!c.phone_normalized,
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
