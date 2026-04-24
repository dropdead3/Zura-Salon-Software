import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Find changelog entries that are scheduled and due
    const now = new Date().toISOString();
    
    const { data: scheduledEntries, error: fetchError } = await supabase
      .from("changelog_entries")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_publish_at", now);

    if (fetchError) {
      throw fetchError;
    }

    if (!scheduledEntries || scheduledEntries.length === 0) {
      return new Response(
        JSON.stringify({ message: "No entries to publish", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${scheduledEntries.length} entries to publish`);

    let publishedCount = 0;

    for (const entry of scheduledEntries) {
      // Update status to published
      const { error: updateError } = await supabase
        .from("changelog_entries")
        .update({
          status: "published",
          published_at: now,
        })
        .eq("id", entry.id);

      if (updateError) {
        console.error(`Failed to publish entry ${entry.id}:`, updateError);
        continue;
      }

      // Send notifications if enabled
      if (entry.send_as_notification) {
        // Get all active users
        const { data: profiles } = await supabase
          .from("employee_profiles")
          .select("user_id")
          .eq("is_active", true);

        if (profiles && profiles.length > 0) {
          const notifications = profiles.map((p: { user_id: string }) => ({
            user_id: p.user_id,
            type: "changelog",
            title: entry.is_major ? `🎉 ${entry.title}` : entry.title,
            message: entry.content.substring(0, 150) + (entry.content.length > 150 ? "..." : ""),
            link: "/dashboard/changelog",
            metadata: {
              changelog_id: entry.id,
              version: entry.version,
              entry_type: entry.entry_type,
            },
          }));

          await supabase.from("notifications").insert(notifications);
        }

        // Mark notification as sent
        await supabase
          .from("changelog_entries")
          .update({ notification_sent: true })
          .eq("id", entry.id);
      }

      // Create announcement if enabled
      if (entry.send_as_announcement) {
        await supabase.from("announcements").insert({
          title: entry.title,
          content: entry.content,
          priority: entry.is_major ? "high" : "normal",
          is_pinned: entry.is_major,
          author_id: entry.author_id,
          link_url: "/dashboard/changelog",
          link_label: "View Details",
        });
      }

      publishedCount++;
      console.log(`Published entry: ${entry.title}`);
    }

    return new Response(
      JSON.stringify({ 
        message: `Published ${publishedCount} entries`, 
        count: publishedCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in publish-scheduled-changelog:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
