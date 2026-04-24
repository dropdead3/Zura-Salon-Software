import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";
import { PLATFORM_URL } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyRequest {
  block_id: string;
  event_type: "created" | "accepted" | "declined";
  actor_user_id: string;
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes.slice(0, 2)} ${ampm}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const { block_id, event_type, actor_user_id }: NotifyRequest =
      await req.json();

    if (!block_id || !event_type || !actor_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the block
    const { data: block, error: blockErr } = await supabase
      .from("assistant_time_blocks")
      .select("*")
      .eq("id", block_id)
      .single();

    if (blockErr || !block) {
      return new Response(
        JSON.stringify({ error: "Block not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rate limiting: no duplicate notification for same block+event within 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("type", "assistant_time_block")
      .contains("metadata", { time_block_id: block_id, event_type })
      .gte("created_at", fiveMinAgo);

    if ((recentCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Rate limited: duplicate within 5 minutes",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine notification targets
    const targetUserIds: string[] = [];
    let title = "";
    let body = "";
    const timeRange = `${formatTime12h(block.start_time)} – ${formatTime12h(block.end_time)}`;

    // Fetch actor name
    const { data: actorProfile } = await supabase
      .from("employee_profiles")
      .select("display_name, full_name")
      .eq("user_id", actor_user_id)
      .single();
    const actorName =
      actorProfile?.display_name || actorProfile?.full_name || "Someone";

    switch (event_type) {
      case "created":
        // Notify assigned assistant (if directly assigned)
        if (block.assistant_user_id && block.assistant_user_id !== actor_user_id) {
          targetUserIds.push(block.assistant_user_id);
          title = "Assistant Coverage Requested";
          body = `${actorName} requested your help on ${block.date} from ${timeRange}`;
        }
        break;

      case "accepted":
        // Notify the requester
        if (block.requesting_user_id !== actor_user_id) {
          targetUserIds.push(block.requesting_user_id);
          title = "Assistant Confirmed";
          body = `${actorName} accepted your coverage request for ${block.date} (${timeRange})`;
        }
        break;

      case "declined":
        // Notify the requester
        if (block.requesting_user_id !== actor_user_id) {
          targetUserIds.push(block.requesting_user_id);
          title = "Assistant Unavailable";
          body = `${actorName} declined your coverage request for ${block.date} (${timeRange}). It's back in the pool.`;
        }
        break;
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "No targets" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send push notifications via existing edge function
    try {
      const pushPayload = {
        user_ids: targetUserIds,
        title,
        body,
        url: "/dashboard/schedule",
        tag: `assistant-block-${block_id}`,
      };

      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(pushPayload),
      });
    } catch (pushErr) {
      console.warn("[notify-assistant-block] Push send failed:", pushErr);
    }

    // Send email notifications
    for (const userId of targetUserIds) {
      try {
        const { data: profile } = await supabase
          .from("employee_profiles")
          .select("email")
          .eq("user_id", userId)
          .single();

        if (profile?.email) {
          const emailHtml = `
            <h2 style="font-size: 18px; margin: 0 0 16px; color: #1a1a1a;">${title}</h2>
            <p style="font-size: 14px; color: #4a4a4a; line-height: 1.6; margin: 0 0 8px;">${body}</p>
            <p style="font-size: 13px; color: #6b6b6b; margin: 0 0 24px;">
              <strong>Date:</strong> ${block.date}<br/>
              <strong>Time:</strong> ${timeRange}
              ${block.notes ? `<br/><strong>Notes:</strong> ${block.notes}` : ""}
            </p>
            <a href="${PLATFORM_URL}/dashboard/schedule"
               style="display: inline-block; padding: 10px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">
              View Schedule
            </a>
          `;

          await sendOrgEmail(supabase, block.organization_id, {
            to: [profile.email],
            subject: title,
            html: emailHtml,
            emailType: "transactional",
          });
        }
      } catch (emailErr) {
        console.warn(
          `[notify-assistant-block] Email failed for ${userId}:`,
          emailErr
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: targetUserIds.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[notify-assistant-block] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
