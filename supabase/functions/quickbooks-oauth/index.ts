import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// QuickBooks/Intuit API endpoints
const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QB_REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';

// Simple encryption helpers
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const qbClientId = Deno.env.get('QUICKBOOKS_CLIENT_ID');
    const qbClientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET');
    const encryptionKey = Deno.env.get('PAYROLL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: 'PAYROLL_ENCRYPTION_KEY is not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;
    
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    switch (action) {
      case 'start': {
        if (!qbClientId) {
          return new Response(
            JSON.stringify({ 
              error: 'QuickBooks integration not configured',
              message: 'QUICKBOOKS_CLIENT_ID is not set. Please configure QuickBooks credentials.'
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
        
        const state = crypto.randomUUID();
        
        // Check if there's an existing connection with a different provider
        const { data: existingConnection } = await supabase
          .from('payroll_connections')
          .select('provider')
          .eq('organization_id', organizationId)
          .single();
        
        if (existingConnection && existingConnection.provider !== 'quickbooks') {
          return new Response(
            JSON.stringify({ 
              error: 'Another payroll provider is connected',
              message: `Please disconnect ${existingConnection.provider} before connecting QuickBooks.`
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        await supabase.from('payroll_connections').upsert({
          organization_id: organizationId,
          provider: 'quickbooks',
          connection_status: 'pending',
          connected_by: userId,
          metadata: { state, redirectUri }
        }, { onConflict: 'organization_id' });
        
        // Build QuickBooks authorization URL
        const authUrl = new URL(QB_AUTH_URL);
        authUrl.searchParams.set('client_id', qbClientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'com.intuit.quickbooks.payroll com.intuit.quickbooks.accounting openid profile email');
        authUrl.searchParams.set('state', state);
        
        return new Response(
          JSON.stringify({ authorizationUrl: authUrl.toString(), state }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'callback': {
        if (!qbClientId || !qbClientSecret) {
          return new Response(
            JSON.stringify({ error: 'QuickBooks integration not configured' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const body = await req.json();
        const { code, state, realmId, organizationId, redirectUri } = body;
        
        if (!code || !state || !organizationId) {
          return new Response(
            JSON.stringify({ error: 'Missing code, state, or organizationId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data: connection } = await supabase
          .from('payroll_connections')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('provider', 'quickbooks')
          .single();
        
        if (!connection || connection.metadata?.state !== state) {
          return new Response(
            JSON.stringify({ error: 'Invalid state token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Exchange code for tokens
        const basicAuth = btoa(`${qbClientId}:${qbClientSecret}`);
        
        const tokenResponse = await fetch(QB_TOKEN_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri || connection.metadata?.redirectUri,
          }),
        });
        
        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error('QuickBooks token error:', error);
          
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
        
        // Encrypt and store tokens
        const encryptedAccessToken = await encrypt(tokens.access_token, encryptionKey);
        const encryptedRefreshToken = await encrypt(tokens.refresh_token, encryptionKey);
        
        // Token expires in 1 hour for QuickBooks
        const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
        
        await supabase.from('payroll_connections').update({
          external_company_id: realmId,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt.toISOString(),
          connection_status: 'connected',
          connected_at: new Date().toISOString(),
          connected_by: userId,
          metadata: { 
            ...connection.metadata, 
            state: undefined,
            realmId,
            tokenType: tokens.token_type,
            refreshTokenExpiresIn: tokens.x_refresh_token_expires_in
          }
        }).eq('id', connection.id);
        
        return new Response(
          JSON.stringify({ success: true, realmId }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'refresh': {
        // QuickBooks tokens expire in 1 hour, so we need to refresh more frequently
        const body = await req.json();
        const { organizationId } = body;
        
        if (!organizationId || !qbClientId || !qbClientSecret) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters or configuration' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data: connection } = await supabase
          .from('payroll_connections')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('provider', 'quickbooks')
          .single();
        
        if (!connection?.refresh_token_encrypted) {
          return new Response(
            JSON.stringify({ error: 'No refresh token available' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const refreshToken = await decrypt(connection.refresh_token_encrypted, encryptionKey);
        const basicAuth = btoa(`${qbClientId}:${qbClientSecret}`);
        
        const tokenResponse = await fetch(QB_TOKEN_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        
        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error('QuickBooks refresh error:', error);
          
          await supabase.from('payroll_connections').update({
            connection_status: 'error',
            metadata: { ...connection.metadata, error: 'Token refresh failed' }
          }).eq('id', connection.id);
          
          return new Response(
            JSON.stringify({ error: 'Failed to refresh token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const tokens = await tokenResponse.json();
        
        // QuickBooks rotates refresh tokens - must store the new one
        const encryptedAccessToken = await encrypt(tokens.access_token, encryptionKey);
        const encryptedRefreshToken = await encrypt(tokens.refresh_token, encryptionKey);
        
        await supabase.from('payroll_connections').update({
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
          last_synced_at: new Date().toISOString(),
        }).eq('id', connection.id);
        
        return new Response(
          JSON.stringify({ success: true }),
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
        
        const { data: connection } = await supabase
          .from('payroll_connections')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('provider', 'quickbooks')
          .single();
        
        if (connection?.refresh_token_encrypted && qbClientId && qbClientSecret) {
          try {
            const refreshToken = await decrypt(connection.refresh_token_encrypted, encryptionKey);
            const basicAuth = btoa(`${qbClientId}:${qbClientSecret}`);
            
            // Revoke token
            await fetch(QB_REVOKE_URL, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`,
              },
              body: JSON.stringify({ token: refreshToken }),
            });
          } catch (e: any) {
            console.error('Error revoking QuickBooks token:', e);
          }
        }
        
        await supabase
          .from('payroll_connections')
          .delete()
          .eq('organization_id', organizationId)
          .eq('provider', 'quickbooks');
        
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
          .select('id, provider, connection_status, connected_at, last_synced_at, external_company_id, metadata')
          .eq('organization_id', organizationId)
          .eq('provider', 'quickbooks')
          .single();
        
        return new Response(
          JSON.stringify({ 
            configured: !!qbClientId,
            connection: connection ? {
              ...connection,
              realmId: connection.metadata?.realmId
            } : null 
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
    console.error('QuickBooks OAuth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
