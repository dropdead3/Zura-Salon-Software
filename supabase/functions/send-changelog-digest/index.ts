import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestRequest {
  frequency: "weekly" | "monthly";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { frequency } = await req.json() as DigestRequest;

    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select(`user_id, changelog_digest_frequency, employee_profiles!inner(user_id, full_name, display_name, email, is_active)`)
      .eq("changelog_digest_enabled", true)
      .eq("changelog_digest_frequency", frequency);

    if (prefError) throw prefError;
    if (!preferences?.length) {
      return new Response(JSON.stringify({ message: "No users opted in", sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const startDate = new Date();
    if (frequency === "weekly") startDate.setDate(startDate.getDate() - 7);
    else startDate.setMonth(startDate.getMonth() - 1);

    const { data: entries, error: entriesError } = await supabase
      .from("changelog_entries").select("*").eq("status", "published")
      .gte("published_at", startDate.toISOString()).order("published_at", { ascending: false });

    if (entriesError) throw entriesError;
    if (!entries?.length) {
      return new Response(JSON.stringify({ message: "No new entries", sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: comingSoon } = await supabase.from("changelog_entries").select("*")
      .eq("status", "published").eq("entry_type", "coming_soon").limit(3);

    let sentCount = 0;
    const siteUrl = Deno.env.get("SITE_URL") || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}`;

    for (const pref of preferences) {
      const profile = (pref as any).employee_profiles;
      if (!profile?.is_active || !profile?.email) continue;

      const userName = profile.display_name || profile.full_name || "Team Member";
      const periodLabel = frequency === "weekly" ? "This Week" : "This Month";

      const updatesHtml = entries.map(e => `
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600;">${e.title}</div>
          <div style="color: #666; font-size: 14px; margin-top: 4px;">${e.content.substring(0, 100)}${e.content.length > 100 ? '...' : ''}</div>
          ${e.version ? `<div style="color: #999; font-size: 12px; margin-top: 4px;">${e.version}</div>` : ''}
        </td></tr>
      `).join("");

      const comingSoonHtml = comingSoon?.length ? `
        <h3 style="margin: 24px 0 12px; color: #7c3aed;">Coming Soon</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${comingSoon.map(c => `<li style="margin: 8px 0; color: #444;">${c.title}</li>`).join("")}
        </ul>` : "";

      const result = await sendEmail({
        to: [profile.email],
        subject: `${periodLabel}'s Updates - ${entries.length} new ${entries.length === 1 ? 'update' : 'updates'}`,
        html: `
          <h1 style="font-size: 24px; margin-bottom: 8px;">What's New ${periodLabel}</h1>
          <p style="color: #666; margin-bottom: 24px;">Hi ${userName}, here's what we've been working on:</p>
          <table style="width: 100%; border-collapse: collapse;">${updatesHtml}</table>
          ${comingSoonHtml}
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
            <a href="${siteUrl}/dashboard/changelog" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View All Updates
            </a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            You're receiving this because you opted in to ${frequency} changelog digests.
            <a href="${siteUrl}/dashboard/notifications" style="color: #666;">Update preferences</a>
          </p>
        `,
      });

      if (result.success) sentCount++;

      await supabase.from("email_digest_log").insert({
        user_id: pref.user_id, digest_type: `changelog_${frequency}`, entries_included: entries.map(e => e.id),
      });
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sentCount} ${frequency} digests`, sent: sentCount, entries: entries.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-changelog-digest:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
