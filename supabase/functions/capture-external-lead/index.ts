import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-callrail-signature',
};

interface ExternalLeadPayload {
  source: 'google_business' | 'facebook_lead' | 'instagram_lead' | 'phone_call';
  webhook_secret?: string;
  data: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    location?: string;
    service?: string;
    call_duration?: number;
    caller_number?: string;
    tracking_number?: string;
    form_id?: string;
    ad_id?: string;
    ad_name?: string;
    campaign_id?: string;
    conversation_id?: string;
  };
}

async function verifyCallRailSignature(body: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('CALLRAIL_WEBHOOK_SECRET');
  if (!secret) return true;
  if (!signature) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expected = Array.from(new Uint8Array(signatureBytes)).map((b: any) => b.toString(16).padStart(2, '0')).join('');
    return signature === expected;
  } catch { return false; }
}

async function verifyMetaSignature(body: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('META_APP_SECRET');
  if (!secret) return true;
  if (!signature?.startsWith('sha256=')) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computed = Array.from(new Uint8Array(signatureBytes)).map((b: any) => b.toString(16).padStart(2, '0')).join('');
    return signature.slice(7) === computed;
  } catch { return false; }
}

function normalizeLeadData(source: string, data: ExternalLeadPayload['data']) {
  return {
    source, status: 'new',
    name: data.name || 'Unknown',
    email: data.email || null,
    phone: data.phone || data.caller_number || null,
    message: data.message || null,
    preferred_location: data.location || null,
    preferred_service: data.service || null,
    source_detail: source === 'phone_call' && data.tracking_number ? `Call via ${data.tracking_number}` :
      (source === 'facebook_lead' || source === 'instagram_lead') && data.ad_name ? data.ad_name :
      source === 'google_business' && data.conversation_id ? `Conversation: ${data.conversation_id}` : null,
    utm_campaign: data.campaign_id || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const payload: ExternalLeadPayload = JSON.parse(rawBody);
    const { source, data } = payload;

    const validSources = ['google_business', 'facebook_lead', 'instagram_lead', 'phone_call'];
    if (!source || !validSources.includes(source)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid source' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify webhook signatures
    if (source === 'phone_call') {
      const sig = req.headers.get('x-callrail-signature');
      if (!await verifyCallRailSignature(rawBody, sig)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else if (source === 'facebook_lead' || source === 'instagram_lead') {
      const sig = req.headers.get('x-hub-signature-256');
      if (!await verifyMetaSignature(rawBody, sig)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (!data) {
      return new Response(JSON.stringify({ success: false, error: 'No data provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalizedLead = normalizeLeadData(source, data);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!) as any;

    const { data: insertedLead, error } = await supabase.from('salon_inquiries').insert(normalizedLead).select('id').single();
    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('inquiry_activity_log').insert({ inquiry_id: insertedLead.id, action: 'created', notes: `Lead captured from ${source}` });

    return new Response(JSON.stringify({ success: true, lead_id: insertedLead.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error processing external lead:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to process lead' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
