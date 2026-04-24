import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MentionRequest {
  sourceType: "chat" | "account_note" | "task" | "announcement";
  sourceId: string;
  content: string;
  authorId: string;
  organizationId: string;
  channelId?: string;
}

// Parse @[Name](userId) format and extract user IDs
function extractMentionedUserIds(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const userIds: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const userId = match[2];
    if (userId && !userIds.includes(userId)) {
      userIds.push(userId);
    }
  }

  return userIds;
}

// Get first 150 chars of content as preview, strip mention markup
function getContextPreview(content: string): string {
  const cleanContent = content.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
  return cleanContent.length > 150 ? cleanContent.substring(0, 147) + "..." : cleanContent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const body: MentionRequest = await req.json();
    const { sourceType, sourceId, content, authorId, organizationId, channelId } = body;

    if (!content || !authorId || !organizationId || !sourceId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract mentioned users
    const mentionedUserIds = extractMentionedUserIds(content);

    if (mentionedUserIds.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No mentions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contextPreview = getContextPreview(content);
    let notificationsSent = 0;

    for (const userId of mentionedUserIds) {
      // Skip self-mentions
      if (userId === authorId) continue;

      // Check user notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("mention_enabled, email_notifications_enabled")
        .eq("user_id", userId)
        .maybeSingle();

      // Default to enabled if no preferences set
      const mentionEnabled = prefs?.mention_enabled ?? true;

      // Insert mention record
      const { error: insertError } = await supabase.from("user_mentions").insert({
        organization_id: organizationId,
        user_id: userId,
        mentioned_by: authorId,
        source_type: sourceType,
        source_id: sourceId,
        channel_id: channelId || null,
        source_context: contextPreview,
        notified_at: mentionEnabled ? new Date().toISOString() : null,
      });

      if (insertError) {
        console.error("Error inserting mention:", insertError);
        continue;
      }

      // Send push notification if enabled
      if (mentionEnabled) {
        // Get author name for notification
        const { data: author } = await supabase
          .from("employee_profiles")
          .select("full_name, display_name")
          .eq("user_id", authorId)
          .maybeSingle();

        const authorName = author?.display_name || author?.full_name || "Someone";

        // Get source URL based on type
        let url = "/dashboard";
        if (sourceType === "chat" && channelId) {
          url = `/dashboard/team-chat?channel=${channelId}`;
        } else if (sourceType === "account_note") {
          url = `/dashboard/account-notes`;
        }

        // Call send-push-notification
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: userId,
              title: `${authorName} mentioned you`,
              body: contextPreview,
              url,
            },
          });
          notificationsSent++;
        } catch (pushError: any) {
          console.error("Error sending push notification:", pushError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        processed: mentionedUserIds.length,
        notifications_sent: notificationsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing mentions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
