import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gusto API endpoints
const GUSTO_AUTH_URL = 'https://api.gusto.com/oauth/authorize';
const GUSTO_TOKEN_URL = 'https://api.gusto.com/oauth/token';
const GUSTO_API_BASE = 'https://api.gusto.com/v1';

// Simple encryption helpers (in production, use proper key management)
async function encrypt(text: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedText: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const combined = new Uint8Array(
    atob(encryptedText).split('').map((c: any) => c.charCodeAt(0))
  );
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gustoClientId = Deno.env.get('GUSTO_CLIENT_ID');
    const gustoClientSecret = Deno.env.get('GUSTO_CLIENT_SECRET');
    const encryptionKey = Deno.env.get('PAYROLL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: 'PAYROLL_ENCRYPTION_KEY is not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;
    
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    switch (action) {
      case 'start': {
        // Initiate OAuth flow
        if (!gustoClientId) {
          return new Response(
            JSON.stringify({ 
              error: 'Gusto integration not configured',
              message: 'GUSTO_CLIENT_ID is not set. Please configure Gusto credentials.'
            }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const body = await req.json();
        const { organizationId, redirectUri } = body;
        
        if (!organizationId || !redirectUri) {
          return new Response(
            JSON.stringify({ error: 'Missing organizationId or redirectUri' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Generate state token for CSRF protection
        const state = crypto.randomUUID();
        
        // Store state in database for verification
        await supabase.from('payroll_connections').upsert({
          organization_id: organizationId,
          provider: 'gusto',
          connection_status: 'pending',
          connected_by: userId,
          metadata: { state, redirectUri }
        }, { onConflict: 'organization_id' });
        
        // Build authorization URL
        const authUrl = new URL(GUSTO_AUTH_URL);
        authUrl.searchParams.set('client_id', gustoClientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', state);
        
        return new Response(
          JSON.stringify({ authorizationUrl: authUrl.toString(), state }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'callback': {
        // Handle OAuth callback
        if (!gustoClientId || !gustoClientSecret) {
          return new Response(
            JSON.stringify({ error: 'Gusto integration not configured' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const body = await req.json();
        const { code, state, organizationId, redirectUri } = body;
        
        if (!code || !state || !organizationId) {
          return new Response(
            JSON.stringify({ error: 'Missing code, state, or organizationId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Verify state token
        const { data: connection } = await supabase
          .from('payroll_connections')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('provider', 'gusto')
          .single();
        
        if (!connection || connection.metadata?.state !== state) {
          return new Response(
            JSON.stringify({ error: 'Invalid state token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Exchange code for tokens
        const tokenResponse = await fetch(GUSTO_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: gustoClientId,
            client_secret: gustoClientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri || connection.metadata?.redirectUri,
          }),
        });
        
        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error('Gusto token error:', error);
          
          await supabase.from('payroll_connections').update({
            connection_status: 'error',
            metadata: { ...connection.metadata, error: 'Token exchange failed' }
          }).eq('id', connection.id);
          
          return new Response(
            JSON.stringify({ error: 'Failed to exchange authorization code' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const tokens = await tokenResponse.json();
        
        // Get company info
        const companyResponse = await fetch(`${GUSTO_API_BASE}/me`, {
          headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        });
        
        let companyId = null;
        if (companyResponse.ok) {
          const meData = await companyResponse.json();
          companyId = meData.companies?.[0]?.uuid;
        }
        
        // Encrypt and store tokens
        const encryptedAccessToken = await encrypt(tokens.access_token, encryptionKey);
        const encryptedRefreshToken = await encrypt(tokens.refresh_token, encryptionKey);
        
        await supabase.from('payroll_connections').update({
          external_company_id: companyId,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          connection_status: 'connected',
          connected_at: new Date().toISOString(),
          connected_by: userId,
          metadata: { 
            ...connection.metadata, 
            state: undefined, // Clear state
            scope: tokens.scope 
          }
        }).eq('id', connection.id);
        
        return new Response(
          JSON.stringify({ success: true, companyId }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'disconnect': {
        const body = await req.json();
        const { organizationId } = body;
        
        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: 'Missing organizationId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get current connection for token revocation
        const { data: connection } = await supabase
          .from('payroll_connections')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('provider', 'gusto')
          .single();
        
        if (connection?.access_token_encrypted && gustoClientId && gustoClientSecret) {
          try {
            const accessToken = await decrypt(connection.access_token_encrypted, encryptionKey);
            
            // Revoke token with Gusto
            await fetch(`${GUSTO_API_BASE}/oauth/revoke`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${accessToken}`
              },
              body: new URLSearchParams({
                client_id: gustoClientId,
                client_secret: gustoClientSecret,
                token: accessToken,
              }),
            });
          } catch (e: any) {
            console.error('Error revoking Gusto token:', e);
          }
        }
        
        // Delete connection
        await supabase
          .from('payroll_connections')
          .delete()
          .eq('organization_id', organizationId)
          .eq('provider', 'gusto');
        
        // Clear external employee IDs
        await supabase
          .from('employee_payroll_settings')
          .update({ external_employee_id: null })
          .eq('organization_id', organizationId);
        
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'status': {
        const organizationId = url.searchParams.get('organizationId');
        
        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: 'Missing organizationId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data: connection } = await supabase
          .from('payroll_connections')
          .select('id, provider, connection_status, connected_at, last_synced_at, external_company_id')
          .eq('organization_id', organizationId)
          .eq('provider', 'gusto')
          .single();
        
        return new Response(
          JSON.stringify({ 
            configured: !!gustoClientId,
            connection: connection || null 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('Gusto OAuth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
