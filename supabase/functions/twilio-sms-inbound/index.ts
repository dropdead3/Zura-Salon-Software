// Twilio inbound SMS webhook — handles STOP / UNSTOP opt-out lifecycle.
//
// Configure Twilio messaging webhook (POST, application/x-www-form-urlencoded) to:
//   https://<project-ref>.supabase.co/functions/v1/twilio-sms-inbound
//
// Recognized keywords (case-insensitive, trimmed):
//   STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT  -> insert into sms_opt_outs
//   START, UNSTOP, YES                              -> remove from sms_opt_outs
//
// Org resolution: look up the org by the destination Twilio number stored in
// `organization_secrets.twilio_phone_number`. If no match, log to console and 200.
// Returns Twilio-compliant TwiML so the carrier acknowledges the receipt.
//
// Security: this endpoint is public (Twilio cannot send a JWT). It only accepts
// the documented form fields and writes via service role to a single table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_WORDS = new Set(["START", "UNSTOP", "YES"]);

function twiml(body: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  let from = "";
  let to = "";
  let bodyText = "";
  try {
    const form = await req.formData();
    from = String(form.get("From") ?? "").trim();
    to = String(form.get("To") ?? "").trim();
    bodyText = String(form.get("Body") ?? "").trim();
  } catch (e) {
    console.warn("[twilio-sms-inbound] form parse failed:", e);
    return twiml("");
  }

  if (!from || !to) return twiml("");

  const keyword = bodyText.split(/\s+/)[0]?.toUpperCase() ?? "";
  const isStop = STOP_WORDS.has(keyword);
  const isStart = START_WORDS.has(keyword);
  if (!isStop && !isStart) return twiml("");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Resolve org by destination Twilio number
  const { data: orgSecret } = await supabase
    .from("organization_secrets")
    .select("organization_id")
    .eq("twilio_phone_number", to)
    .maybeSingle();
  if (!orgSecret?.organization_id) {
    console.warn("[twilio-sms-inbound] no org for To=", to);
    return twiml("");
  }
  const orgId = orgSecret.organization_id;

  if (isStop) {
    await supabase.from("sms_opt_outs").upsert({
      organization_id: orgId,
      phone: from,
      source: "sms_keyword",
      raw_message: bodyText.slice(0, 500),
      opted_out_at: new Date().toISOString(),
    }, { onConflict: "organization_id,phone" });

    await supabase.from("review_compliance_log").insert({
      organization_id: orgId,
      event_type: "sms_opt_out_received",
      payload: { phone: from, keyword, raw: bodyText.slice(0, 500) },
    });

    // Twilio carrier-required confirmation; many carriers auto-send their own,
    // but echoing keeps the audit clean.
    return twiml(
      "<Message>You have been unsubscribed and will no longer receive messages. Reply START to resubscribe.</Message>",
    );
  }

  if (isStart) {
    await supabase.from("sms_opt_outs")
      .delete()
      .eq("organization_id", orgId)
      .eq("phone", from);

    await supabase.from("review_compliance_log").insert({
      organization_id: orgId,
      event_type: "sms_opt_in_received",
      payload: { phone: from, keyword, raw: bodyText.slice(0, 500) },
    });

    return twiml(
      "<Message>You have been resubscribed and will receive messages again. Reply STOP to opt out.</Message>",
    );
  }

  return twiml("");
});
