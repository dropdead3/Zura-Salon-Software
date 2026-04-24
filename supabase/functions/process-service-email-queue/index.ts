import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Process Service Email Queue
 * 
 * Cron-based processor (every 15 minutes) that:
 * 1. Finds all pending queue items where scheduled_at <= now()
 * 2. Groups same-client, same-day sends for consolidation
 * 3. Resolves location-specific content overrides
 * 4. Sends via sendOrgEmail (respects opt-out, rate limiting, unsubscribe)
 * 5. Updates queue status
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Fetch all pending queue items that are due
    const { data: pendingItems, error: fetchError } = await supabase
      .from("service_email_queue")
      .select(`
        id, organization_id, appointment_id, client_id, step_id, scheduled_at,
        appointments!inner(
          client_name, client_email, appointment_date, start_time,
          service_name, service_category, staff_name, location_id
        )
      `)
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at")
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-queue] Processing ${pendingItems.length} pending items`);

    // Fetch step details for all items
    const stepIds = [...new Set(pendingItems.map((i: any) => i.step_id))];
    const { data: steps } = await supabase
      .from("service_email_flow_steps")
      .select("id, subject, html_body, timing_type, timing_value, flow_id")
      .in("id", stepIds);

    const stepMap = new Map<string, any>(steps?.map((s: any) => [s.id, s]) || []);

    // Fetch location overrides
    const locationIds = [...new Set(
      pendingItems.map((i: any) => (i.appointments as any)?.location_id).filter(Boolean)
    )];
    let overrideMap = new Map<string, any>();
    if (locationIds.length > 0) {
      const { data: overrides } = await supabase
        .from("service_email_flow_step_overrides")
        .select("step_id, location_id, subject, html_body")
        .in("step_id", stepIds)
        .in("location_id", locationIds);

      overrides?.forEach((o: any) => {
        overrideMap.set(`${o.step_id}:${o.location_id}`, o);
      });
    }

    // Fetch location names for template variables
    let locationNameMap = new Map<string, string>();
    if (locationIds.length > 0) {
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name")
        .in("id", locationIds);
      locations?.forEach((l: any) => locationNameMap.set(l.id, l.name));
    }

    // Group by (client_id + date) for same-day consolidation
    type GroupKey = string;
    const groups = new Map<GroupKey, typeof pendingItems>();

    for (const item of pendingItems) {
      const scheduledDate = new Date(item.scheduled_at).toISOString().split("T")[0];
      const key: GroupKey = `${item.client_id}:${scheduledDate}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    let totalSent = 0;
    let totalMerged = 0;
    let totalSkipped = 0;

    for (const [, groupItems] of groups) {
      const first = groupItems[0];
      const appt = first.appointments as any;

      if (!appt?.client_email) {
        // Mark all as skipped - no email address
        await supabase
          .from("service_email_queue")
          .update({ status: "skipped", error_message: "No client email" })
          .in("id", groupItems.map((i: any) => i.id));
        totalSkipped += groupItems.length;
        continue;
      }

      // Build consolidated email content
      const sections: string[] = [];
      let consolidatedSubject = "";

      for (const item of groupItems) {
        const step = stepMap.get(item.step_id);
        if (!step) continue;

        const itemAppt = item.appointments as any;
        const locationId = itemAppt?.location_id;
        const override = locationId ? overrideMap.get(`${item.step_id}:${locationId}`) : null;

        const subject = override?.subject || step.subject;
        const body = override?.html_body || step.html_body;

        // Replace template variables
        const processedBody = replaceVariables(body, {
          first_name: itemAppt?.client_name?.split(" ")[0] || "there",
          client_name: itemAppt?.client_name || "Valued Client",
          service_name: itemAppt?.service_name || "your service",
          stylist_name: itemAppt?.staff_name || "your stylist",
          appointment_date: formatDate(itemAppt?.appointment_date),
          appointment_time: formatTime(itemAppt?.start_time),
          location_name: locationId ? (locationNameMap.get(locationId) || "") : "",
        });

        if (!consolidatedSubject) {
          consolidatedSubject = replaceVariables(subject, {
            first_name: itemAppt?.client_name?.split(" ")[0] || "there",
            service_name: itemAppt?.service_name || "your service",
            appointment_date: formatDate(itemAppt?.appointment_date),
          });
        }

        if (groupItems.length > 1) {
          // Wrap each service section with a header
          sections.push(`
            <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e4e4e7;">
              <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #18181b;">
                ${itemAppt?.service_name || "Service"}
              </h3>
              ${processedBody}
            </div>
          `);
        } else {
          sections.push(processedBody);
        }
      }

      // Adjust subject for multi-service consolidation
      if (groupItems.length > 1) {
        const serviceNames = groupItems
          .map((i: any) => (i.appointments as any)?.service_name)
          .filter(Boolean);
        consolidatedSubject = `Information about your upcoming services: ${serviceNames.join(", ")}`;
      }

      const finalHtml = sections.join("\n");

      // Send via sendOrgEmail — use "service_flow" type to bypass 48h rate limit
      const result = await sendOrgEmail(supabase, first.organization_id, {
        to: [appt.client_email],
        subject: consolidatedSubject,
        html: finalHtml,
        clientId: first.client_id || undefined,
        emailType: "service_flow",
      });

      if (result.success && !result.skipped) {
        // Mark primary as sent, others as merged
        const primaryId = groupItems[0].id;
        await supabase
          .from("service_email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString(), message_id: result.messageId })
          .eq("id", primaryId);

        if (groupItems.length > 1) {
          const mergedIds = groupItems.slice(1).map((i: any) => i.id);
          await supabase
            .from("service_email_queue")
            .update({ status: "merged", merged_into_id: primaryId })
            .in("id", mergedIds);
          totalMerged += mergedIds.length;
        }
        totalSent++;
      } else if (result.skipped) {
        await supabase
          .from("service_email_queue")
          .update({ status: "skipped", error_message: result.skipReason || "skipped" })
          .in("id", groupItems.map((i: any) => i.id));
        totalSkipped += groupItems.length;
      } else {
        await supabase
          .from("service_email_queue")
          .update({ status: "skipped", error_message: result.error || "send failed" })
          .in("id", groupItems.map((i: any) => i.id));
        totalSkipped += groupItems.length;
      }
    }

    console.log(`[process-queue] Done: sent=${totalSent}, merged=${totalMerged}, skipped=${totalSkipped}`);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, merged: totalMerged, skipped: totalSkipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[process-queue] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
