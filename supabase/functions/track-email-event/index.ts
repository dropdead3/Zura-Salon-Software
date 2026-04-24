import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Track Email Event (open/click)
 * 
 * - GET with ?t=open&qid=<queue_item_id>&oid=<org_id> → returns 1x1 tracking pixel
 * - GET with ?t=click&qid=<queue_item_id>&oid=<org_id>&url=<destination> → redirects to URL
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const url = new URL(req.url);
    const eventType = url.searchParams.get("t"); // 'open' or 'click'
    const queueItemId = url.searchParams.get("qid");
    const organizationId = url.searchParams.get("oid");
    const destinationUrl = url.searchParams.get("url");
    const messageId = url.searchParams.get("mid");

    if (!eventType || !organizationId) {
      return new Response("Bad request", { status: 400 });
    }

    // Record the event (fire-and-forget, don't block response)
    const userAgent = req.headers.get("user-agent") || null;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    supabase.from("email_tracking_events").insert({
      queue_item_id: queueItemId || null,
      message_id: messageId || null,
      organization_id: organizationId,
      event_type: eventType,
      link_url: destinationUrl || null,
      user_agent: userAgent,
      ip_address: ip,
    }).then(({ error }) => {
      if (error) console.error("[track-email] Insert error:", error.message);
    });

    if (eventType === "open") {
      // Return 1x1 transparent GIF
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
        0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
        0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3b,
      ]);
      return new Response(pixel, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    if (eventType === "click" && destinationUrl) {
      return new Response(null, {
        status: 302,
        headers: { Location: destinationUrl },
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("[track-email] Error:", error);
    return new Response("Error", { status: 500 });
  }
});
