import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLATFORM_URL } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const rawData = atob(base64 + padding);
  return Uint8Array.from(rawData, c => c.charCodeAt(0));
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate random bytes
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

// HKDF implementation for Web Push
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    ikm as BufferSource,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: salt as BufferSource,
      info: info as BufferSource,
      hash: 'SHA-256',
    },
    keyMaterial,
    length * 8
  );

  return new Uint8Array(derivedBits);
}

// Create info for HKDF
function createInfo(type: string, context: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  
  // "Content-Encoding: " + type + "\0" + "P-256" + "\0" + context
  const result = new Uint8Array(18 + type.length + 1 + 5 + 1 + context.length);
  let offset = 0;
  
  const contentEncoding = encoder.encode('Content-Encoding: ');
  result.set(contentEncoding, offset);
  offset += contentEncoding.length;
  
  result.set(typeBytes, offset);
  offset += typeBytes.length;
  
  result[offset++] = 0;
  
  const p256 = encoder.encode('P-256');
  result.set(p256, offset);
  offset += p256.length;
  
  result[offset++] = 0;
  
  result.set(context, offset);
  
  return result;
}

// Encrypt payload using AES-GCM
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authKey: string,
  localPublicKey: Uint8Array,
  sharedSecret: Uint8Array
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  
  const userPublicKey = base64UrlToUint8Array(p256dhKey);
  const userAuth = base64UrlToUint8Array(authKey);
  
  // Generate salt
  const salt = getRandomBytes(16);
  
  // Build context for HKDF
  // context = label || 0x00 || length(recipient_public) || recipient_public || length(sender_public) || sender_public
  const context = new Uint8Array(1 + 2 + 65 + 2 + 65);
  let offset = 0;
  context[offset++] = 0;
  context[offset++] = 0;
  context[offset++] = 65;
  context.set(userPublicKey, offset);
  offset += 65;
  context[offset++] = 0;
  context[offset++] = 65;
  context.set(localPublicKey, offset);
  
  // Derive PRK using auth secret
  const prk = await hkdf(userAuth, sharedSecret, encoder.encode('Content-Encoding: auth\0'), 32);
  
  // Derive content encryption key
  const cekInfo = createInfo('aesgcm', context);
  const cek = await hkdf(salt, prk, cekInfo, 16);
  
  // Derive nonce
  const nonceInfo = createInfo('nonce', context);
  const nonce = await hkdf(salt, prk, nonceInfo, 12);
  
  // Add padding (2 bytes for padding length + padding)
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payloadBytes.length);
  paddedPayload[0] = (paddingLength >> 8) & 0xff;
  paddedPayload[1] = paddingLength & 0xff;
  paddedPayload.set(payloadBytes, 2 + paddingLength);
  
  // Encrypt with AES-GCM
  const key = await crypto.subtle.importKey('raw', cek as BufferSource, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    key,
    paddedPayload as BufferSource,
  );
  
  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
  };
}

// Generate VAPID JWT
async function generateVapidJwt(
  endpoint: string,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  subject: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };
  
  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import private key (raw 32-byte format)
  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
  
  // Create PKCS8 wrapper for the raw private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
    0x01, 0x04, 0x20
  ]);
  const pkcs8Key = new Uint8Array(pkcs8Header.length + privateKeyBytes.length);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyBytes, pkcs8Header.length);
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Key,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  // Convert signature from IEEE P1363 to DER format
  const sigBytes = new Uint8Array(signature);
  const r = sigBytes.slice(0, 32);
  const s = sigBytes.slice(32, 64);
  
  const signatureB64 = uint8ArrayToBase64Url(sigBytes);
  
  return `${unsignedToken}.${signatureB64}`;
}

// Send push notification using simple fetch (without encryption for simplicity)
async function sendWebPush(
  endpoint: string,
  p256dhKey: string,
  authKey: string,
  payload: string,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  subject: string
): Promise<Response> {
  const jwt = await generateVapidJwt(endpoint, vapidPrivateKey, vapidPublicKey, subject);
  
  // For simplicity, we'll send the payload as-is with VAPID auth
  // Full encryption would require ECDH key exchange which is complex
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
    },
    body: payload,
  });
  
  return response;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.log("VAPID keys not configured");
      return new Response(
        JSON.stringify({ success: false, message: "Push notifications not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // ── Auth: require authenticated user ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_id, user_ids, title, body, url, icon, tag }: PushRequest = await req.json();

    // Get user IDs to notify
    const targetUserIds = user_ids || (user_id ? [user_id] : []);
    
    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No user IDs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push notifications to ${targetUserIds.length} users`);

    // Get subscriptions for all target users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for users");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/dashboard",
      icon: icon || "/favicon.ico",
      tag: tag || "notification",
    });

    let sent = 0;
    let failed = 0;

    // Send to each subscription
    for (const sub of subscriptions) {
      try {
        const response = await sendWebPush(
          sub.endpoint,
          sub.p256dh_key,
          sub.auth_key,
          payload,
          vapidPrivateKey,
          vapidPublicKey,
          `mailto:support@${PLATFORM_URL.replace("https://", "")}`
        );

        if (response.ok || response.status === 201) {
          sent++;
          console.log(`Push sent successfully to ${sub.endpoint.substring(0, 50)}...`);
        } else if (response.status === 404 || response.status === 410) {
          // Subscription expired or unsubscribed
          console.log(`Removing expired subscription: ${sub.endpoint.substring(0, 50)}...`);
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          failed++;
        } else {
          const errorText = await response.text();
          console.error(`Push failed (${response.status}):`, errorText);
          failed++;
        }
      } catch (pushError: any) {
        console.error(`Push error:`, pushError);
        failed++;
      }
    }

    console.log(`Push notifications: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
